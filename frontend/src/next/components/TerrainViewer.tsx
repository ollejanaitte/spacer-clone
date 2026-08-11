import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { buildTerrainThreeScene, applyDomainToThreeTransform } from "../modules/terrain/terrainViewerBuilder";
import type { TerrainMesh } from "../modules/terrain/terrainSurface";

export interface TerrainViewerProps {
  readonly mesh: TerrainMesh | null;
  readonly localOrigin?: { x: number; y: number; z: number } | null;
  readonly showWireframe?: boolean;
}

export function TerrainViewer({ mesh, localOrigin, showWireframe = false }: TerrainViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let disposed = false;
    let frameId = 0;
    let renderer: THREE.WebGLRenderer | null = null;
    let controls: OrbitControls | null = null;
    let terrainGroup: THREE.Group | null = null;
    try {
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xdfe8f0);

      const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 20000);
      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(window.devicePixelRatio);
      container.appendChild(renderer.domElement);

      controls = new OrbitControls(camera, renderer.domElement);

      const ambient = new THREE.AmbientLight(0xffffff, 0.7);
      scene.add(ambient);
      const directional = new THREE.DirectionalLight(0xffffff, 0.8);
      directional.position.set(200, 400, 200);
      scene.add(directional);

      const grid = new THREE.GridHelper(1000, 20, 0x8899aa, 0xaabbcc);
      scene.add(grid);

      if (mesh && mesh.vertices.length > 0) {
        const built = buildTerrainThreeScene(mesh);
        applyDomainToThreeTransform(built.mesh, localOrigin ?? null);
        applyDomainToThreeTransform(built.wireframe, localOrigin ?? null);
        built.wireframe.visible = showWireframe;
        terrainGroup = new THREE.Group();
        terrainGroup.add(built.mesh);
        terrainGroup.add(built.wireframe);
        scene.add(terrainGroup);

        const box = new THREE.Box3().setFromObject(terrainGroup);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const radius = Math.max(size.x, size.y, size.z) * 1.5;
        camera.near = Math.max(0.01, radius / 1000);
        camera.far = radius * 100;
        camera.position.set(center.x + size.x * 0.8, center.y + size.z * 1.2, center.z + size.x * 0.8);
        camera.lookAt(center);
        controls.target.copy(center);
      } else {
        camera.position.set(100, 100, 100);
        camera.lookAt(0, 0, 0);
      }

      const handleResize = () => {
        if (!renderer) return;
        const w = container.clientWidth || 300;
        const h = container.clientHeight || 200;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      handleResize();
      window.addEventListener("resize", handleResize);

      const animate = () => {
        if (disposed) return;
        frameId = requestAnimationFrame(animate);
        controls?.update();
        renderer?.render(scene, camera);
      };
      animate();
    } catch (err) {
      setRenderError(err instanceof Error ? err.message : "terrain render error");
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", () => {});
      if (terrainGroup) {
        terrainGroup.traverse((obj) => {
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
  }, [mesh, localOrigin, showWireframe]);

  return (
    <div
      ref={containerRef}
      className="next-terrain-viewer"
      data-testid="terrain-viewer"
      style={{ width: "100%", height: 360, background: "#dfe8f0", borderRadius: 8 }}
    >
      {renderError !== null && (
        <div className="next-error" data-testid="terrain-render-error">
          {renderError}
        </div>
      )}
    </div>
  );
}
