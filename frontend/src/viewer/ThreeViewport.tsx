import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { createSceneGroups, rebuildModelScene } from "./SceneBuilder";
import { withNodeDisplacement } from "./animation";
import type { CameraPreset, SceneGroups, ThreeViewportProps } from "./types";
import { APOLLO_MODEL_UP, computeApolloVisualizationBox, computeModelBox, disposeObject, fitCameraToBox, MODEL_UP, resolveCameraViewForPreset, resolveOrbitControlsBindings } from "./threeUtils";
import type { ForceColorModeData } from "./memberForceColorMap";
import { cullOverlappingLabels, type LabelCandidate } from "./labelCollisionAvoidance";
import { createUnavailableWebGlDiagnostics } from "./runtimeDiagnostics";

type ThreeContext = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  groups: SceneGroups;
  grid: THREE.GridHelper;
  axes: THREE.AxesHelper;
  frameId: number;
  fallbackActive: boolean;
  raycaster: THREE.Raycaster;
  pointer: THREE.Vector2;
  lastPreset: CameraPreset | "free";
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
    scene.background = new THREE.Color("#ffffff");
    const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 10000);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    const initialBindings = resolveOrbitControlsBindings(Boolean(propsRef.current.apolloVisualizationModel));
    controls.screenSpacePanning = initialBindings.screenSpacePanning;
    controls.mouseButtons.LEFT = initialBindings.mouseButtons.LEFT;
    controls.mouseButtons.MIDDLE = initialBindings.mouseButtons.MIDDLE;
    controls.mouseButtons.RIGHT = initialBindings.mouseButtons.RIGHT;
    controls.touches.ONE = initialBindings.touches.ONE;
    controls.touches.TWO = initialBindings.touches.TWO;

    const ambient = new THREE.HemisphereLight(0xffffff, 0x9aa7b3, 2.4);
    scene.add(ambient);
    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(5, 8, 6);
    scene.add(key);

    const grid = new THREE.GridHelper(20, 20, 0xd0d0d0, 0xd0d0d0);
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
      fallbackActive: false,
      raycaster: new THREE.Raycaster(),
      pointer: new THREE.Vector2(),
      lastPreset: "iso",
    };
    contextRef.current = context;
    emitRuntimeDiagnostics(context, propsRef.current, "three", "none");

    const resize = () => {
      const rect = host.getBoundingClientRect();
      const width = Math.max(Math.floor(rect.width), 1);
      const height = Math.max(Math.floor(rect.height), 1);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      updateWideLineResolution(groups.root, width, height);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();
    safeRebuildModelScene(context, propsRef.current);
    applyVisibility(context, propsRef.current);
    fitCamera(context, propsRef.current, "iso");

    const animate = () => {
      context.frameId = window.requestAnimationFrame(animate);
      try {
        controls.update();
        renderer.render(scene, camera);
      } catch (error) {
        activateViewerFallback(context, propsRef.current, error);
      }
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
    const handleControlsStart = () => {
      context.lastPreset = "free";
      emitRuntimeDiagnostics(context, propsRef.current, context.fallbackActive ? "line-only" : "three", context.fallbackActive ? "renderer-error" : "none");
    };
    const handleControlsChange = () => {
      emitRuntimeDiagnostics(context, propsRef.current, context.fallbackActive ? "line-only" : "three", context.fallbackActive ? "renderer-error" : "none");
    };
    renderer.domElement.addEventListener("pointermove", handlePointer);
    renderer.domElement.addEventListener("click", handleClick);
    controls.addEventListener("start", handleControlsStart);
    controls.addEventListener("change", handleControlsChange);

    return () => {
      renderer.domElement.removeEventListener("pointermove", handlePointer);
      renderer.domElement.removeEventListener("click", handleClick);
      controls.removeEventListener("start", handleControlsStart);
      controls.removeEventListener("change", handleControlsChange);
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

  // Rebuild the model scene whenever a structural prop changes (not visibility).
  useEffect(() => {
    const context = contextRef.current;
    if (!context) return;
    const override = animationOverrideFor(props, effectiveClockSeconds);
    safeRebuildModelScene(context, props, override);
    applyVisibility(context, props);
  }, [
    props.apolloVisualizationModel,
    props.project,
    props.result,
    props.selectedSection,
    props.scales,
    props.selection,
    props.selectedLoadCaseId,
    props.selectedEigenMode,
    props.selectedResponseSpectrumResult,
    props.spacerAxisSwap,
    props.viewerDisplayPolicy,
    props.forceColorMode,
  ]);

  // Toggle group visibility without rebuilding the entire scene.
  useEffect(() => {
    const context = contextRef.current;
    if (!context) return;
    context.groups.labels.visible = props.visibility.labels;
    context.groups.nodes.visible = props.visibility.nodes && props.visibility.apolloLineModel !== false;
    context.groups.members.visible = props.visibility.members && props.visibility.apolloLineModel !== false;
    context.groups.supports.visible = props.visibility.supports && props.visibility.apolloLineModel !== false;
    context.groups.apolloGirders.visible = props.visibility.apolloSolidModel !== false && props.visibility.apolloGirders !== false;
    context.groups.apolloCrossBeams.visible = props.visibility.apolloSolidModel !== false && props.visibility.apolloCrossBeams !== false;
    context.groups.apolloBracings.visible = props.visibility.apolloSolidModel !== false && props.visibility.apolloBracings !== false;
    context.groups.apolloDeck.visible = props.visibility.apolloSolidModel !== false && props.visibility.apolloDeck !== false;
    context.groups.apolloBearings.visible = props.visibility.apolloSolidModel !== false && props.visibility.apolloBearings !== false;
    context.groups.apolloMarkers.visible = props.visibility.apolloSolidModel !== false && props.visibility.apolloMarkers !== false;
    context.groups.apolloAppurtenances.visible =
      props.visibility.apolloSolidModel !== false && props.visibility.apolloAppurtenances !== false;
    context.groups.apolloHaunches.visible =
      props.visibility.apolloSolidModel !== false && props.visibility.apolloHaunches !== false;
    context.groups.apolloPavement.visible =
      props.visibility.apolloSolidModel !== false && props.visibility.apolloPavement !== false;
    context.groups.apolloRoadMarkings.visible =
      props.visibility.apolloSolidModel !== false && props.visibility.apolloRoadMarkings !== false;
    context.groups.loads.visible = props.visibility.loads;
    context.groups.deformed.visible = props.visibility.deformedShape;
    context.groups.resultDiagrams.visible = true;
    if (props.visibility.labels) {
      applyLabelCollisionAvoidance(context, props);
    }
  }, [props.visibility]);

  // Rebuild the model scene on every animation clock tick so the model
  // visibly animates. We rebuild via the same path used for static
  // property changes; the renderer is cheap relative to the rAF loop.
  useEffect(() => {
    const context = contextRef.current;
    if (!context) return;
    const override = animationOverrideFor(props, effectiveClockSeconds);
    safeRebuildModelScene(context, props, override);
  }, [effectiveClockSeconds, props.animationOptions?.enabled, props.animationOptions?.scale, props.animationOptions?.speed, props.animationOptions?.useDemo, props.animationOptions?.demoDirection, props.animationOptions?.modeNo, props.timeHistoryNodeOverride, props.spacerAxisSwap, props.viewerDisplayPolicy]);

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
  // Time history deformation override takes priority over the eigen /
  // demo animation. The override is a transient, display-only value
  // computed by the time history animation layer; it never mutates
  // the project payload or the existing animation options.
  if (props.timeHistoryNodeOverride && props.timeHistoryNodeOverride.size > 0) {
    return props.timeHistoryNodeOverride;
  }
  if (!props.animationOptions) return null;
  if (!props.animationOptions.enabled) return null;
  if (clockSeconds === null || clockSeconds === undefined) return null;
  return withNodeDisplacement(props.project, props.animationOptions, clockSeconds, props.result, props.selectedEigenMode);
}

function applyVisibility(context: ThreeContext, props: ThreeViewportProps): void {
  applyApolloPresentation(context, props);
  context.grid.visible = props.visibility.grid;
  context.axes.visible = props.visibility.axes;
  emitRuntimeDiagnostics(context, props, context.fallbackActive ? "line-only" : "three", context.fallbackActive ? "renderer-error" : "none");
}

function safeRebuildModelScene(
  context: ThreeContext,
  props: ThreeViewportProps,
  override?: Map<string, { x: number; y: number; z: number }> | null,
): void {
  try {
    rebuildModelScene(context.groups, props, override, props.forceColorMode);
    const size = context.renderer.getSize(new THREE.Vector2());
    updateWideLineResolution(context.groups.root, size.x, size.y);
    context.groups.labels.visible = props.visibility.labels;
    context.groups.nodes.visible = props.visibility.nodes && props.visibility.apolloLineModel !== false;
    context.groups.members.visible = props.visibility.members && props.visibility.apolloLineModel !== false;
    context.groups.supports.visible = props.visibility.supports && props.visibility.apolloLineModel !== false;
    context.groups.apolloGirders.visible = props.visibility.apolloSolidModel !== false && props.visibility.apolloGirders !== false;
    context.groups.apolloCrossBeams.visible = props.visibility.apolloSolidModel !== false && props.visibility.apolloCrossBeams !== false;
    context.groups.apolloBracings.visible = props.visibility.apolloSolidModel !== false && props.visibility.apolloBracings !== false;
    context.groups.apolloDeck.visible = props.visibility.apolloSolidModel !== false && props.visibility.apolloDeck !== false;
    context.groups.apolloBearings.visible = props.visibility.apolloSolidModel !== false && props.visibility.apolloBearings !== false;
    context.groups.apolloMarkers.visible = props.visibility.apolloSolidModel !== false && props.visibility.apolloMarkers !== false;
    context.groups.apolloAppurtenances.visible =
      props.visibility.apolloSolidModel !== false && props.visibility.apolloAppurtenances !== false;
    context.groups.apolloHaunches.visible =
      props.visibility.apolloSolidModel !== false && props.visibility.apolloHaunches !== false;
    context.groups.apolloPavement.visible =
      props.visibility.apolloSolidModel !== false && props.visibility.apolloPavement !== false;
    context.groups.apolloRoadMarkings.visible =
      props.visibility.apolloSolidModel !== false && props.visibility.apolloRoadMarkings !== false;
    context.groups.loads.visible = props.visibility.loads;
    context.groups.deformed.visible = props.visibility.deformedShape;
    context.groups.resultDiagrams.visible = true;
    applyLabelCollisionAvoidance(context, props);
    context.fallbackActive = false;
    emitRuntimeDiagnostics(context, props, "three", "none");
  } catch (error) {
    activateViewerFallback(context, props, error);
  }
}

function applyLabelCollisionAvoidance(context: ThreeContext, props: ThreeViewportProps): void {
  if (!props.visibility.labels) return;
  const labelsGroup = context.groups.labels;
  const size = context.renderer.getSize(new THREE.Vector2());
  const candidates: LabelCandidate[] = [];

  labelsGroup.traverse((child) => {
    if (!(child as THREE.Sprite).isSprite) return;
    const ud = child.userData;
    const priority = ud.labelPriority as LabelCandidate["priority"] | undefined;
    if (!priority) {
      candidates.push({ object: child, priority: "node", ownerId: ud.id });
      return;
    }
    candidates.push({
      object: child,
      priority,
      ownerId: ud.ownerId ?? ud.id,
      ownerType: ud.ownerType,
    });
  });

  const selectedId = props.selection?.id ?? null;
  const hidden = cullOverlappingLabels(candidates, context.camera, { width: size.x, height: size.y }, selectedId);

  labelsGroup.traverse((child) => {
    child.visible = !hidden.has(child);
  });
}

function updateWideLineResolution(root: THREE.Object3D, width: number, height: number): void {
  root.traverse((object) => {
    const material = (object as THREE.Mesh).material ?? (object as THREE.Line).material;
    const materials = Array.isArray(material) ? material : material ? [material] : [];
    for (const item of materials) {
      if (!item) continue;
      const resolution = (item as THREE.Material & { resolution?: THREE.Vector2 }).resolution;
      resolution?.set(width, height);
    }
  });
}

function activateViewerFallback(context: ThreeContext, props: ThreeViewportProps, error: unknown): void {
  console.error("ThreeViewport rendering failed; switching to line-only fallback.", error);
  if (context.fallbackActive) return;
  context.fallbackActive = true;
  context.groups.labels.visible = false;
  context.groups.nodes.visible = false;
  context.groups.supports.visible = false;
  context.groups.loads.visible = false;
  context.groups.deformed.visible = false;
  context.groups.resultDiagrams.visible = false;
  context.groups.members.visible = true;
  emitRuntimeDiagnostics(context, props, "line-only", "renderer-error");
}

function fitCamera(context: ThreeContext, props: ThreeViewportProps, preset: CameraPreset): void {
  const apolloView = Boolean(props.apolloVisualizationModel);
  const view = resolveCameraViewForPreset(preset, apolloView);
  const box = props.apolloVisualizationModel
    ? computeApolloVisualizationBox(props.apolloVisualizationModel, {
        includeLabels: false,
        includeMarkers: false,
        visibility: props.visibility,
      })
    : computeModelBox(
        props.project,
        props.result,
        props.result?.eigenResult && !props.result.responseSpectrumResult
          ? props.scales.modeScale
          : props.scales.deformationScale,
        props.selectedLoadCaseId,
        props.selectedEigenMode ?? 1,
        props.selectedResponseSpectrumResult ?? "SRSS",
        props.spacerAxisSwap ?? "off",
        undefined,
        props.viewerDisplayPolicy ?? "general",
      );
  fitCameraToBox(context.camera, context.controls, box, view);
  context.lastPreset = preset;
  emitRuntimeDiagnostics(context, props, "three", context.fallbackActive ? "renderer-error" : "none");
}

function applyApolloPresentation(context: ThreeContext, props: ThreeViewportProps): void {
  const apolloView = Boolean(props.apolloVisualizationModel);
  context.grid.rotation.x = apolloView ? Math.PI / 2 : 0;
  const bindings = resolveOrbitControlsBindings(apolloView);
  context.controls.screenSpacePanning = bindings.screenSpacePanning;
  context.controls.mouseButtons.LEFT = bindings.mouseButtons.LEFT;
  context.controls.mouseButtons.MIDDLE = bindings.mouseButtons.MIDDLE;
  context.controls.mouseButtons.RIGHT = bindings.mouseButtons.RIGHT;
  context.controls.touches.ONE = bindings.touches.ONE;
  context.controls.touches.TWO = bindings.touches.TWO;
  if (apolloView) {
    if (props.cameraRequest !== "xy") {
      context.camera.up.copy(APOLLO_MODEL_UP);
    }
  } else {
    context.camera.up.copy(MODEL_UP);
  }
}

function emitRuntimeDiagnostics(
  context: ThreeContext,
  props: ThreeViewportProps,
  viewerMode: "three" | "line-only",
  fallbackReason: "none" | "renderer-error",
): void {
  props.onRuntimeDiagnosticsChange?.({
    viewerMode,
    fallbackReason,
    webgl: readWebGlDiagnostics(context.renderer),
    camera: {
      position: vectorToObject(context.camera.position),
      target: vectorToObject(context.controls.target),
      up: vectorToObject(context.camera.up),
      preset: context.lastPreset,
    },
    currentViewPreset: context.lastPreset,
  });
}

function vectorToObject(vector: THREE.Vector3) {
  return { x: vector.x, y: vector.y, z: vector.z };
}

function readWebGlDiagnostics(renderer: THREE.WebGLRenderer) {
  const context = renderer.getContext();
  if (!context) {
    return createUnavailableWebGlDiagnostics();
  }
  const gl = context as WebGLRenderingContext;
  const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
  const safeGet = (name: number) => {
    try {
      const value = gl.getParameter(name);
      return typeof value === "string" && value.length > 0 ? value : String(value ?? "Unavailable");
    } catch {
      return "Unavailable";
    }
  };
  return {
    available: true,
    renderer: safeGet(gl.RENDERER),
    vendor: safeGet(gl.VENDOR),
    version: safeGet(gl.VERSION),
    shadingLanguageVersion: safeGet(gl.SHADING_LANGUAGE_VERSION),
    unmaskedRenderer: debugInfo ? safeGet(debugInfo.UNMASKED_RENDERER_WEBGL) : "Unavailable",
    unmaskedVendor: debugInfo ? safeGet(debugInfo.UNMASKED_VENDOR_WEBGL) : "Unavailable",
  };
}

export const ThreeViewport = forwardRef<ImperativeHandle, ThreeViewportProps>(ThreeViewportInner);
export type { ImperativeHandle };
