import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { buildLayerScene } from "../layers/buildLayerScene";
import type { LayerSelection, UnifiedViewerModel } from "../layers/layerContract";

export type UnifiedViewerHandle = {
  setLayerVisible: (layerId: string, visible: boolean) => void;
  fitToScene: () => void;
  getCameraState: () => { position: { x: number; y: number; z: number }; target: { x: number; y: number; z: number } } | null;
};

export interface UnifiedViewerProps {
  readonly model: UnifiedViewerModel;
  readonly className?: string;
  readonly showGrid?: boolean;
  readonly onSelectionChange?: (selection: LayerSelection) => void;
  readonly onRenderError?: (message: string) => void;
}

type ViewerContext = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  sceneGroup: THREE.Group;
  bounds: THREE.Box3;
  grid: THREE.GridHelper;
  frameId: number;
  raycaster: THREE.Raycaster;
  pointer: THREE.Vector2;
  disposed: boolean;
};

function disposeSceneTree(group: THREE.Group): void {
  group.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const material = (mesh as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(material)) {
      for (const m of material) m.dispose();
    } else if (material) {
      material.dispose();
    }
  });
}

const UnifiedViewerInner = (props: UnifiedViewerProps, ref: React.ForwardedRef<UnifiedViewerHandle>) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const contextRef = useRef<ViewerContext | null>(null);
  const propsRef = useRef(props);
  propsRef.current = props;
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "WebGL unavailable";
      setRenderError(message);
      propsRef.current.onRenderError?.(message);
      return undefined;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#e7ecf1");
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200000);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    host.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;

    const ambient = new THREE.HemisphereLight(0xffffff, 0x9aa7b3, 2.2);
    scene.add(ambient);
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(80, 160, 60);
    scene.add(key);

    const initialScene = buildLayerScene(propsRef.current.model);
    const grid = new THREE.GridHelper(10, 10, 0x9aa7b3, 0xb9c4cd);
    grid.visible = propsRef.current.showGrid ?? true;
    scene.add(grid, initialScene.root);

    const context: ViewerContext = {
      scene,
      camera,
      renderer,
      controls,
      sceneGroup: initialScene.root,
      bounds: initialScene.bounds,
      grid,
      frameId: 0,
      raycaster: new THREE.Raycaster(),
      pointer: new THREE.Vector2(),
      disposed: false,
    };
    contextRef.current = context;

    const fit = () => fitCameraToBounds(context, grid);
    fit();

    const resize = () => {
      const rect = host.getBoundingClientRect();
      const width = Math.max(Math.floor(rect.width), 1);
      const height = Math.max(Math.floor(rect.height), 1);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    const animate = () => {
      if (context.disposed) return;
      context.frameId = window.requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handlePointer = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      context.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      context.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };
    const handleClick = (event: PointerEvent) => {
      handlePointer(event);
      context.raycaster.setFromCamera(context.pointer, camera);
      const hits = context.raycaster.intersectObjects(context.sceneGroup.children, true);
      const hit = hits.find((item) => item.object.userData?.selectable);
      if (!hit) {
        propsRef.current.onSelectionChange?.(null);
        return;
      }
      const ud = hit.object.userData;
      propsRef.current.onSelectionChange?.({
        layerId: ud.layerId as string,
        entityId: ud.entityId as string,
        label: ud.kind as string,
      });
    };
    renderer.domElement.addEventListener("pointermove", handlePointer);
    renderer.domElement.addEventListener("click", handleClick);
    controls.addEventListener("change", () => undefined);

    return () => {
      context.disposed = true;
      renderer.domElement.removeEventListener("pointermove", handlePointer);
      renderer.domElement.removeEventListener("click", handleClick);
      observer.disconnect();
      window.cancelAnimationFrame(context.frameId);
      controls.dispose();
      disposeSceneTree(context.sceneGroup);
      grid.geometry.dispose();
      scene.clear();
      renderer.dispose();
      if (renderer.domElement.parentElement === host) {
        host.removeChild(renderer.domElement);
      }
      contextRef.current = null;
    };
  }, []);

  useEffect(() => {
    const context = contextRef.current;
    if (!context) return;
    const next = buildLayerScene(props.model);
    context.scene.remove(context.sceneGroup);
    disposeSceneTree(context.sceneGroup);
    context.sceneGroup = next.root;
    context.bounds = next.bounds;
    context.scene.add(next.root);
    fitCameraToBounds(context, context.grid);
  }, [props.model]);

  useImperativeHandle(
    ref,
    () => ({
      setLayerVisible: (layerId, visible) => {
        const context = contextRef.current;
        if (!context) return;
        for (const child of context.sceneGroup.children) {
          if (child.userData?.layerId === layerId) {
            child.visible = visible;
          }
        }
      },
      fitToScene: () => {
        const context = contextRef.current;
        if (context) fitCameraToBounds(context, context.grid);
      },
      getCameraState: () => {
        const context = contextRef.current;
        if (!context) return null;
        return {
          position: { x: context.camera.position.x, y: context.camera.position.y, z: context.camera.position.z },
          target: { x: context.controls.target.x, y: context.controls.target.y, z: context.controls.target.z },
        };
      },
    }),
    [],
  );

  return (
    <div ref={hostRef} className={`unified-viewer ${props.className ?? ""}`} data-testid="unified-viewer">
      {renderError !== null && (
        <div className="unified-viewer-error" role="alert" data-testid="unified-viewer-error">
          {renderError}
        </div>
      )}
    </div>
  );
};

function fitCameraToBounds(context: ViewerContext, grid: THREE.GridHelper): void {
  const box = context.bounds;
  const empty = !box || box.isEmpty();
  if (empty) {
    context.camera.position.set(120, 120, 120);
    context.camera.lookAt(0, 0, 0);
    context.controls.target.set(0, 0, 0);
    return;
  }
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const radius = Math.max(size.x, size.y, size.z) * 0.5;
  context.camera.near = Math.max(0.01, radius / 10000);
  context.camera.far = Math.max(1000, radius * 400);
  context.camera.position.set(
    center.x + size.x * 0.9,
    center.y + Math.max(size.z, size.y) * 0.9,
    center.z + size.x * 0.9 + radius,
  );
  context.camera.lookAt(center);
  context.controls.target.copy(center);
  context.controls.update();

  const footprint = Math.max(size.x, size.z) * 1.25;
  const oldGridGeometry = grid.geometry;
  grid.geometry = new THREE.GridHelper(footprint, 24, 0x9aa7b3, 0xb9c4cd).geometry;
  oldGridGeometry.dispose();
  grid.position.set(center.x, box.min.y - 0.5, center.z);
}

export const UnifiedViewer = forwardRef<UnifiedViewerHandle, UnifiedViewerProps>(UnifiedViewerInner);
export type { ViewerContext };