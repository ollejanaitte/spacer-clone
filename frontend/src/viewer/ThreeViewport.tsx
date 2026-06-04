import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { createSceneGroups, rebuildModelScene } from "./SceneBuilder";
import type { CameraPreset, SceneGroups, ThreeViewportProps } from "./types";
import { computeModelBox, disposeObject, fitCameraToBox } from "./threeUtils";

type ThreeContext = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  groups: SceneGroups;
  grid: THREE.GridHelper;
  axes: THREE.AxesHelper;
  frameId: number;
  raycaster: THREE.Raycaster;
  pointer: THREE.Vector2;
};

export function ThreeViewport(props: ThreeViewportProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const contextRef = useRef<ThreeContext | null>(null);
  const propsRef = useRef(props);
  propsRef.current = props;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#f7fafc");
    const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 10000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.screenSpacePanning = false;

    const ambient = new THREE.HemisphereLight(0xffffff, 0x9aa7b3, 2.4);
    scene.add(ambient);
    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(5, 8, 6);
    scene.add(key);

    const grid = new THREE.GridHelper(20, 20, 0xb7c5d3, 0xd8e0e8);
    const axes = new THREE.AxesHelper(2.5);
    const groups = createSceneGroups();
    scene.add(grid, axes, groups.root);

    const context: ThreeContext = {
      scene,
      camera,
      renderer,
      controls,
      groups,
      grid,
      axes,
      frameId: 0,
      raycaster: new THREE.Raycaster(),
      pointer: new THREE.Vector2(),
    };
    contextRef.current = context;

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
    rebuildModelScene(groups, propsRef.current);
    applyVisibility(context, propsRef.current);
    fitCamera(context, propsRef.current, "iso");

    const animate = () => {
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
      const hits = context.raycaster.intersectObjects(groups.root.children, true);
      const hit = hits.find((item) => item.object.userData?.selectable);
      if (!hit) {
        propsRef.current.onSelectionChange(null);
        return;
      }
      propsRef.current.onSelectionChange({
        type: hit.object.userData.type,
        id: hit.object.userData.id,
      });
    };
    renderer.domElement.addEventListener("pointermove", handlePointer);
    renderer.domElement.addEventListener("click", handleClick);

    return () => {
      renderer.domElement.removeEventListener("pointermove", handlePointer);
      renderer.domElement.removeEventListener("click", handleClick);
      observer.disconnect();
      window.cancelAnimationFrame(context.frameId);
      controls.dispose();
      disposeObject(groups.root);
      scene.clear();
      renderer.dispose();
      renderer.domElement.remove();
      contextRef.current = null;
    };
  }, []);

  useEffect(() => {
    const context = contextRef.current;
    if (!context) return;
    rebuildModelScene(context.groups, props);
    applyVisibility(context, props);
  }, [
    props.project,
    props.result,
    props.selectedSection,
    props.visibility,
    props.scales,
    props.selection,
    props.selectedLoadCaseId,
  ]);

  useEffect(() => {
    const context = contextRef.current;
    if (context) fitCamera(context, props, props.cameraRequest ?? "iso");
  }, [props.fitRequest]);

  useEffect(() => {
    const context = contextRef.current;
    if (context && props.cameraRequest) fitCamera(context, props, props.cameraRequest);
  }, [props.cameraRequest]);

  return <div ref={hostRef} className="three-viewport" aria-label="3D model viewport" />;
}

function applyVisibility(context: ThreeContext, props: ThreeViewportProps): void {
  context.grid.visible = props.visibility.grid;
  context.axes.visible = props.visibility.axes;
}

function fitCamera(context: ThreeContext, props: ThreeViewportProps, preset: CameraPreset): void {
  const direction = directionForPreset(preset);
  const box = computeModelBox(
    props.project,
    props.result,
    props.scales.deformationScale,
    props.selectedLoadCaseId,
  );
  fitCameraToBox(context.camera, context.controls, box, direction);
}

function directionForPreset(preset: CameraPreset): THREE.Vector3 {
  if (preset === "xy") return new THREE.Vector3(0, 0, 1);
  if (preset === "yz") return new THREE.Vector3(1, 0, 0);
  if (preset === "xz") return new THREE.Vector3(0, 1, 0);
  return new THREE.Vector3(1, 0.75, 1);
}
