/**
 * CIM Integrated 3D viewer (Phase 8-01 FROZEN / Phase 8-02 WP-A).
 *
 * Renders the derived CIM scene with per-layer visibility, raycast selection
 * (resolving CimEntityMetadata), camera fit/reset and view presets
 * (perspective / plan / side). All geometry lives in the shared Render
 * Coordinate space (domain -> three).
 */

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { resolveCimMetadata, type CimEntityMetadata, type CimLayerId, type Integrated3DScene } from "../modules/cim/integrated3dScene";

export interface Cim3DViewerProps {
  readonly scene: Integrated3DScene;
  readonly layerState: Record<CimLayerId, boolean>;
  readonly onSelect?: (metadata: CimEntityMetadata | null) => void;
  readonly background?: number;
}

export function Cim3DViewer({ scene, layerState, onSelect, background = 0xe8eef4 }: Cim3DViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const layerClonesRef = useRef<Map<CimLayerId, THREE.Group>>(new Map());
  const fitRef = useRef<((box?: THREE.Box3) => void) | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let disposed = false;
    let frameId = 0;
    let renderer: THREE.WebGLRenderer | null = null;
    let controls: OrbitControls | null = null;
    let camera: THREE.PerspectiveCamera | null = null;

    try {
    const resize = () => {
      if (!renderer || !camera) return;
      const w = container.clientWidth || 300;
      const h = container.clientHeight || 240;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };

    const threeScene = new THREE.Scene();
    threeScene.background = new THREE.Color(background);
    sceneRef.current = threeScene;

    camera = new THREE.PerspectiveCamera(60, 1, 0.1, 2000000);
    cameraRef.current = camera;
    renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controlsRef.current = controls;

    threeScene.add(new THREE.AmbientLight(0xffffff, 1.0));
    const hemisphere = new THREE.HemisphereLight(0xbfd4ff, 0x7a9c5e, 0.85);
    threeScene.add(hemisphere);
    const directional = new THREE.DirectionalLight(0xffffff, 1.25);
    directional.position.set(300, 600, 300);
    threeScene.add(directional);
    const fill = new THREE.DirectionalLight(0xffffff, 0.5);
    fill.position.set(-300, 150, -300);
    threeScene.add(fill);

    // Build the scene group from the derived layers (clones so re-renders
    // never mutate the layer objects owned by the scene).
    const sceneGroup = new THREE.Group();
    for (const [layer, sub] of Object.entries(scene.layers) as [CimLayerId, THREE.Group][]) {
      const clone = sub.clone();
      clone.visible = layerState[layer] ?? false;
      clone.name = layer;
      layerClonesRef.current.set(layer, clone);
      sceneGroup.add(clone);
    }
    threeScene.add(sceneGroup);


    const fitCamera = (boundsBox?: THREE.Box3) => {
      if (!camera || !controls) return;
      const box = boundsBox ? boundsBox.clone() : (scene.bounds ? scene.bounds.clone() : null);
      if (!box || box.isEmpty()) {
        box?.setFromObject(sceneGroup);
      }
      if (!box || box.isEmpty()) return;
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const radius = Math.max(size.x, size.y, size.z) * 0.5;
      camera.near = Math.max(0.01, radius / 10000);
      camera.far = Math.max(1000, radius * 400);
      camera.position.set(
        center.x + size.x * 0.65,
        center.y + Math.max(size.z, size.y) * 0.75,
        center.z + size.x * 0.65 + radius,
      );
      camera.lookAt(center);
      controls.target.copy(center);
      controls.update();
    };
    fitRef.current = fitCamera;

    const initialBox = scene.bounds ? scene.bounds.clone() : new THREE.Box3().setFromObject(sceneGroup);
    fitCamera(initialBox);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const onPointerDown = (event: PointerEvent) => {
      if (!renderer) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };
    const onClick = (event: MouseEvent) => {
      if (!renderer || !camera) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObject(sceneGroup, true);
      const hit = hits[0] ?? null;
      const meta = hit ? resolveCimMetadata(hit.object) : null;
      onSelectRef.current?.(meta);
    };
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("click", onClick);

    resize();
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(resize);
      ro.observe(container);
    }
    window.addEventListener("resize", resize);

    const animate = () => {
      if (disposed) return;
      frameId = requestAnimationFrame(animate);
      controls?.update();
      renderer?.render(threeScene, camera!);
    };
    animate();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
      renderer?.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer?.domElement.removeEventListener("click", onClick);
      renderer?.dispose();
      controls?.dispose();
      if (renderer?.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
    } catch (error) {
      setRenderError(error instanceof Error ? error.message : "CIM scene render error");
      return undefined;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, scene.bounds, layerState]);

  useEffect(() => {
    for (const [layer, clone] of layerClonesRef.current.entries()) {
      clone.visible = layerState[layer] ?? false;
    }
  }, [scene, layerState]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: 560, position: "relative" }}
      data-testid="cim-3d-viewer"
    >
      {renderError !== null && (
        <div className="next-error" data-testid="cim-3d-error">{renderError}</div>
      )}
      <div className="cim-viewer-tools" data-testid="cim-viewer-tools">
        <button
          type="button"
          className="next-secondary"
          data-testid="cim-fit-all"
          onClick={() => fitRef.current?.()}
        >
          Fit（全体）
        </button>
        <button
          type="button"
          className="next-secondary"
          data-testid="cim-fit-road"
          onClick={() => {
            const road = layerClonesRef.current.get("roadPavement");
            if (!road) return;
            const box = new THREE.Box3().setFromObject(road);
            if (!box.isEmpty()) {
              fitRef.current?.(box);
            }
          }}
        >
          Fit（道路）
        </button>
      </div>
    </div>
  );
}
