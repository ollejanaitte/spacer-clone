/**
 * CIM Integrated 3D viewer (Phase 8-01 FROZEN / Phase 8-02 WP-A / WP-I).
 *
 * Renders the derived CIM scene with per-layer visibility, raycast selection
 * (resolving CimEntityMetadata), camera fit/reset and view presets
 * (perspective / plan / side / iso) plus a transparency slider. All geometry
 * lives in the shared Render Coordinate space (domain -> three).
 */

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { resolveCimMetadata, type CimEntityMetadata, type CimLayerId, type Integrated3DScene } from "../modules/cim/integrated3dScene";

export type CimViewPreset = "perspective" | "plan" | "side" | "iso";

export interface Cim3DViewerProps {
  readonly scene: Integrated3DScene;
  readonly layerState: Record<CimLayerId, boolean>;
  readonly onSelect?: (metadata: CimEntityMetadata | null) => void;
  readonly background?: number;
  /** Optional camera preset (perspective / plan / side / iso). */
  readonly viewPreset?: CimViewPreset;
  /** Optional global transparency (0..1 opacity). */
  readonly transparency?: number;
  /** Called with the new transparency (slider value 0..1, 1 = transparent). */
  readonly onTransparencyChange?: (transparency: number) => void;
}

function applyTransparency(root: THREE.Object3D, opacity: number): void {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh && Array.isArray(mesh.material)) {
      for (const m of mesh.material) {
        m.transparent = opacity < 1;
        m.opacity = opacity;
      }
    } else if (mesh.isMesh && mesh.material) {
      const mat = mesh.material as THREE.Material & { transparent?: boolean; opacity?: number };
      mat.transparent = opacity < 1;
      mat.opacity = opacity;
    }
  });
}

export function Cim3DViewer({ scene, layerState, onSelect, background = 0xe8eef4, viewPreset = "perspective", transparency = 1, onTransparencyChange }: Cim3DViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const layerClonesRef = useRef<Map<CimLayerId, THREE.Group>>(new Map());
  const fitRef = useRef<((box?: THREE.Box3) => void) | null>(null);
  const presetRef = useRef<((preset: CimViewPreset) => void) | null>(null);
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
      // FOV-based framing so the box fills ~85% of the viewport.
      const aspect = (container.clientWidth || 800) / (container.clientHeight || 600);
      const fovY = (camera.fov * Math.PI) / 180;
      const fovX = 2 * Math.atan(Math.tan(fovY / 2) * Math.max(aspect, 0.1));
      const fitAngle = Math.min(fovX, fovY);
      const dist = (radius / Math.sin(fitAngle / 2)) * 0.85;
      const dx = dist * 0.62;
      const dy = dist * 0.45;
      const dz = dist * 0.62;
      camera.position.set(center.x + dx, center.y + dy, center.z + dz);
      camera.lookAt(center);
      controls.target.copy(center);
      controls.update();
    };
    fitRef.current = fitCamera;

    const setViewPreset = (preset: CimViewPreset) => {
      if (!camera || !controls) return;
      const box = scene.bounds ? scene.bounds.clone() : new THREE.Box3().setFromObject(sceneGroup);
      if (box.isEmpty()) return;
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const radius = Math.max(size.x, size.y, size.z) * 0.5;
      camera.near = Math.max(0.01, radius / 10000);
      camera.far = Math.max(1000, radius * 400);
      const aspect = (container.clientWidth || 800) / (container.clientHeight || 600);
      const fovY = (camera.fov * Math.PI) / 180;
      const fovX = 2 * Math.atan(Math.tan(fovY / 2) * Math.max(aspect, 0.1));
      const fitAngle = Math.min(fovX, fovY);
      const dist = (radius / Math.sin(fitAngle / 2)) * 0.8;
      let pos: [number, number, number];
      if (preset === "plan") {
        pos = [center.x, center.y + dist * 1.2, center.z];
      } else if (preset === "side") {
        pos = [center.x, center.y, center.z + dist * 1.2];
      } else if (preset === "iso") {
        pos = [center.x + dist * 0.75, center.y + dist * 0.75, center.z + dist * 0.75];
      } else {
        pos = [center.x + dist * 0.62, center.y + dist * 0.45, center.z + dist * 0.62];
      }
      camera.position.set(...pos);
      camera.lookAt(center);
      controls.target.copy(center);
      controls.update();
    };
    presetRef.current = setViewPreset;

    // Prefer framing the bridge (superstructure + bridge layout) so the bridge
    // fills the viewport instead of the whole terrain. (Substructure may carry
    // display-fallback solids at approximated positions, so it is excluded.)
    const initialBox = (() => {
      const tryLayer = (layer: CimLayerId): THREE.Box3 | null => {
        const group = layerClonesRef.current.get(layer);
        if (!group || group.children.length === 0) return null;
        const box = new THREE.Box3().setFromObject(group);
        return box.isEmpty() ? null : box;
      };
      // Prefer the road (the bridge lives along it), then the bridge layers.
      return tryLayer("roadPavement")
        ?? tryLayer("superstructure")
        ?? tryLayer("bridgeLayout")
        ?? (scene.bounds ? scene.bounds.clone() : new THREE.Box3().setFromObject(sceneGroup));
    })();
    if (viewPreset === "perspective") {
      fitCamera(initialBox);
    } else {
      setViewPreset(viewPreset);
    }

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
      // Skip invisible objects (Three.js raycast does not filter visibility).
      const visibleHit = hits.find((hit) => {
        let current: THREE.Object3D | null = hit.object;
        while (current) {
          if (current.visible === false) return false;
          current = current.parent;
        }
        return true;
      }) ?? null;
      const meta = visibleHit ? resolveCimMetadata(visibleHit.object) : null;
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
  }, [scene, scene.bounds, layerState, viewPreset]);

  useEffect(() => {
    for (const [layer, clone] of layerClonesRef.current.entries()) {
      clone.visible = layerState[layer] ?? false;
    }
  }, [scene, layerState]);

  useEffect(() => {
    for (const clone of layerClonesRef.current.values()) {
      applyTransparency(clone, transparency);
    }
  }, [scene, transparency]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "calc(100vh - 250px)", minHeight: 480, position: "relative" }}
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
        <button
          type="button"
          className="next-secondary"
          data-testid="cim-fit-structure"
          onClick={() => {
            const box = new THREE.Box3();
            let any = false;
            for (const layer of ["superstructure", "bridgeLayout", "bearing"]) {
              const group = layerClonesRef.current.get(layer as CimLayerId);
              if (group && group.children.length > 0) {
                box.union(new THREE.Box3().setFromObject(group));
                any = true;
              }
            }
            if (any && !box.isEmpty()) {
              fitRef.current?.(box);
            }
          }}
        >
          Fit（橋梁）
        </button>
        <button type="button" className="next-secondary" data-testid="cim-view-perspective" onClick={() => presetRef.current?.("perspective")}>透視</button>
        <button type="button" className="next-secondary" data-testid="cim-view-plan" onClick={() => presetRef.current?.("plan")}>平面</button>
        <button type="button" className="next-secondary" data-testid="cim-view-side" onClick={() => presetRef.current?.("side")}>側面</button>
        <button type="button" className="next-secondary" data-testid="cim-view-iso" onClick={() => presetRef.current?.("iso")}>等角</button>
      </div>
      <div className="cim-transparency" data-testid="cim-transparency">
        <label>
          <span>透明度</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={1 - transparency}
            data-testid="cim-transparency-input"
            onChange={(e) => onTransparencyChange?.(Number(e.target.value))}
          />
        </label>
      </div>
    </div>
  );
}
