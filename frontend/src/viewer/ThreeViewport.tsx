import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { createSceneGroups, rebuildModelScene } from "./SceneBuilder";
import { withNodeDisplacement } from "./animation";
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

type ImperativeHandle = {
  getCameraState: () => { position: { x: number; y: number; z: number }; target: { x: number; y: number; z: number }; zoom: number; fov: number } | null;
  applyCameraState: (state: { position: { x: number; y: number; z: number }; target: { x: number; y: number; z: number }; zoom: number; fov: number }) => void;
  fitToProject: () => void;
};

const ThreeViewportInner = (props: ThreeViewportProps, ref: React.ForwardedRef<ImperativeHandle>) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const contextRef = useRef<ThreeContext | null>(null);
  const propsRef = useRef(props);
  propsRef.current = props;

  // Local animation clock. CompareShell drives the clock from above via
  // `externalAnimationClockSeconds`; otherwise we tick our own clock
  // locally so the standalone ThreeViewport can animate on its own.
  const [localClockSeconds, setLocalClockSeconds] = useState<number | null>(null);
  const animationEnabled = Boolean(props.animationOptions?.enabled);
  const usesExternalClock = props.externalAnimationClockSeconds !== undefined && props.externalAnimationClockSeconds !== null;
  const effectiveClockSeconds = usesExternalClock
    ? props.externalAnimationClockSeconds ?? null
    : localClockSeconds;

  useEffect(() => {
    if (usesExternalClock) return undefined;
    if (!animationEnabled) {
      setLocalClockSeconds(null);
      return undefined;
    }
    let frame = 0;
    const start = performance.now();
    const tick = () => {
      const elapsed = (performance.now() - start) / 1000;
      setLocalClockSeconds(elapsed);
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [animationEnabled, usesExternalClock]);

  // Build (or rebuild) the renderer, scene, controls, and the model
  // geometry. This effect only runs once per mount.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas: document.createElement("canvas"),
        antialias: false,
        alpha: false,
        powerPreference: "default",
        preserveDrawingBuffer: false,
        failIfMajorPerformanceCaveat: false,
      });
    } catch (error) {
      propsRef.current.onInitializationError(error);
      return undefined;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#f7fafc");
    const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 10000);
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

  // Rebuild the model scene whenever a non-animation prop changes.
  useEffect(() => {
    const context = contextRef.current;
    if (!context) return;
    const override = animationOverrideFor(props, effectiveClockSeconds);
    rebuildModelScene(context.groups, props, override);
    applyVisibility(context, props);
  }, [
    props.project,
    props.result,
    props.selectedSection,
    props.visibility,
    props.scales,
    props.selection,
    props.selectedLoadCaseId,
    props.selectedEigenMode,
    props.selectedResponseSpectrumResult,
  ]);

  // Rebuild the model scene on every animation clock tick so the model
  // visibly animates. We rebuild via the same path used for static
  // property changes; the renderer is cheap relative to the rAF loop.
  useEffect(() => {
    const context = contextRef.current;
    if (!context) return;
    const override = animationOverrideFor(props, effectiveClockSeconds);
    rebuildModelScene(context.groups, props, override);
  }, [effectiveClockSeconds, props.animationOptions?.enabled, props.animationOptions?.scale, props.animationOptions?.speed, props.animationOptions?.useDemo, props.animationOptions?.demoDirection, props.animationOptions?.modeNo]);

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

function animationOverrideFor(
  props: ThreeViewportProps,
  clockSeconds: number | null,
): Map<string, { x: number; y: number; z: number }> | null {
  if (!props.animationOptions) return null;
  if (!props.animationOptions.enabled) return null;
  if (clockSeconds === null || clockSeconds === undefined) return null;
  return withNodeDisplacement(props.project, props.animationOptions, clockSeconds);
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
    props.result?.eigenResult && !props.result.responseSpectrumResult
      ? props.scales.modeScale
      : props.scales.deformationScale,
    props.selectedLoadCaseId,
    props.selectedEigenMode ?? 1,
    props.selectedResponseSpectrumResult ?? "SRSS",
  );
  fitCameraToBox(context.camera, context.controls, box, direction);
}

function directionForPreset(preset: CameraPreset): THREE.Vector3 {
  if (preset === "xy") return new THREE.Vector3(0, 0, 1);
  if (preset === "yz") return new THREE.Vector3(1, 0, 0);
  if (preset === "xz") return new THREE.Vector3(0, 1, 0);
  return new THREE.Vector3(1, 0.75, 1);
}

export const ThreeViewport = forwardRef<ImperativeHandle, ThreeViewportProps>(ThreeViewportInner);
export type { ImperativeHandle };
