import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export interface SceneBuildResult {
  readonly group: THREE.Group;
  readonly bounds: THREE.Box3;
  /** Optional tighter camera framing box (defaults to bounds). */
  readonly focusBounds?: THREE.Box3 | null;
}

export interface SceneViewerProps {
  /** Stable scene builder (memoize in the parent keyed on scene inputs). */
  readonly buildScene: () => SceneBuildResult;
  /** Extra CSS class(es) appended to the viewer container. */
  readonly className?: string;
  readonly testId?: string;
  /** Render an auto-sized grid helper at the scene footprint. */
  readonly showGrid?: boolean;
  readonly background?: number;
  /** Camera framing override: frame this tighter box instead of the whole scene. */
  readonly focusBounds?: THREE.Box3 | null;
}

/**
 * Shared Three.js viewer host used by TerrainViewer and IntegratedSceneViewer.
 * Owns renderer / camera / OrbitControls / resize / dispose / fit-to-bounds so
 * every viewer shares one camera + rendering behavior. Scenes are expected to
 * already be in the shared Render Coordinate space (domain -> three mapping is
 * applied by the scene builders, never re-implemented here).
 */
export function SceneViewer({ buildScene, className = "", testId, showGrid = false, background = 0xdfe8f0, focusBounds = null }: SceneViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let disposed = false;
    let frameId = 0;
    let renderer: THREE.WebGLRenderer | null = null;
    let controls: OrbitControls | null = null;
    let sceneGroup: THREE.Group | null = null;
    let grid: THREE.GridHelper | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let camera: THREE.PerspectiveCamera | null = null;

    const resize = () => {
      if (!renderer || !camera) return;
      const w = container.clientWidth || 300;
      const h = container.clientHeight || 240;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };

    try {
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(background);

      camera = new THREE.PerspectiveCamera(60, 1, 0.1, 2000000);
      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(window.devicePixelRatio);
      container.appendChild(renderer.domElement);

      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;

      scene.add(new THREE.AmbientLight(0xffffff, 0.7));
      const directional = new THREE.DirectionalLight(0xffffff, 0.8);
      directional.position.set(200, 400, 200);
      scene.add(directional);

      const built = buildScene();
      sceneGroup = built.group;
      scene.add(sceneGroup);

      const builtBox = built.bounds.isEmpty() ? new THREE.Box3().setFromObject(sceneGroup) : built.bounds;
      const builtFocus = built.focusBounds ?? null;
      const box = focusBounds !== null && !focusBounds.isEmpty() ? focusBounds
        : builtFocus !== null && !builtFocus.isEmpty() ? builtFocus
        : builtBox;
      const hasBounds = !box.isEmpty();
      if (hasBounds) {
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const radius = Math.max(size.x, size.y, size.z) * 0.5;
        camera.near = Math.max(0.01, radius / 10000);
        camera.far = Math.max(1000, radius * 400);
        camera.position.set(
          center.x + size.x * 0.9,
          center.y + Math.max(size.z, size.y) * 0.9,
          center.z + size.x * 0.9 + radius,
        );
        camera.lookAt(center);
        controls.target.copy(center);
        controls.update();

      if (showGrid) {
        const footprint = Math.max(size.x, size.z) * 1.25;
        const g = new THREE.GridHelper(footprint, 24, 0x8899aa, 0xaabbcc);
        g.position.set(center.x, box.min.y, center.z);
        grid = g;
        scene.add(g);
      }
      } else {
        camera.position.set(120, 120, 120);
        camera.lookAt(0, 0, 0);
        controls.target.set(0, 0, 0);
        if (showGrid) {
          const g = new THREE.GridHelper(100, 10, 0x8899aa, 0xaabbcc);
          grid = g;
          scene.add(g);
        }
      }

      resize();
      if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(container);
      }
      window.addEventListener("resize", resize);

      const animate = () => {
        if (disposed) return;
        frameId = requestAnimationFrame(animate);
        controls?.update();
        renderer?.render(scene, camera!);
      };
      animate();
    } catch (err) {
      setRenderError(err instanceof Error ? err.message : "scene render error");
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
      resizeObserver?.disconnect();
      if (grid) {
        grid.geometry?.dispose();
      }
      if (sceneGroup) {
        sceneGroup.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            obj.geometry?.dispose();
            const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
            for (const m of mats) m?.dispose();
          }
        });
      }
      renderer?.dispose();
      if (renderer?.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [buildScene, showGrid, background, focusBounds]);

  return (
    <div ref={containerRef} className={`next-scene-viewer ${className}`} data-testid={testId}>
      {renderError !== null && (
        <div className="next-error" data-testid="scene-render-error">
          {renderError}
        </div>
      )}
    </div>
  );
}
