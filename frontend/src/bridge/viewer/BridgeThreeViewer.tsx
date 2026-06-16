import { useEffect, useRef, useState } from "react";
import { ja } from "../../i18n/ja";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type {
  BridgeLine,
  BridgeLineType,
  BridgeProject,
  ViewerModelPayload,
} from "../types";
import { xPositionsFor, yPositionsFor } from "../BridgeWizardState";

export type ViewerMode = "view" | "draw_line" | "select" | "delete";

type Props = {
  project: BridgeProject;
  mode: ViewerMode;
  selectedLineId: string | null;
  onSelectLine: (id: string | null) => void;
  onCreateLine: (line: Omit<BridgeLine, "id">) => void;
  femModel?: ViewerModelPayload | null;
};

const TYPE_COLOR: Record<BridgeLineType, number> = {
  traffic: 0x22a06b,
  load: 0xc0392b,
  reference: 0x7f8c8d,
};

const Z_UP = new THREE.Vector3(0, 0, 1);
const X_AXIS = new THREE.Vector3(1, 0, 0);
const Y_AXIS = new THREE.Vector3(0, 1, 0);

export function BridgeThreeViewer({
  project,
  mode,
  selectedLineId,
  onSelectLine,
  onCreateLine,
  femModel,
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [pendingStart, setPendingStart] = useState<[number, number, number] | null>(null);

  // Refs to keep current props/state accessible inside the long-lived handlers
  const stateRef = useRef({
    project,
    mode,
    selectedLineId,
    pendingStart,
    onCreateLine,
    onSelectLine,
    femModel,
  });
  stateRef.current = { project, mode, selectedLineId, pendingStart, onCreateLine, onSelectLine, femModel };

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#eef5fb");
    const camera = new THREE.PerspectiveCamera(45, host.clientWidth / host.clientHeight || 1, 0.01, 10000);
    camera.position.set(20, 25, 30);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(host.clientWidth, host.clientHeight);
    host.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.target.set(15, 0, 0);

    const ambient = new THREE.HemisphereLight(0xffffff, 0xb6c2cc, 2.0);
    scene.add(ambient);
    const key = new THREE.DirectionalLight(0xffffff, 1.0);
    key.position.set(20, 30, 15);
    scene.add(key);

    // Plane for the road deck
    const xs = xPositionsFor(project.spans, project.generationSettings.mesh_division);
    const ys = yPositionsFor(project.crossSection);
    const totalLength = xs[xs.length - 1] || 1;
    const halfWidth = Math.max(...ys.map((v) => Math.abs(v))) || 5;

    const planeGeo = new THREE.PlaneGeometry(totalLength + 4, halfWidth * 2 + 4);
    const planeMat = new THREE.MeshStandardMaterial({ color: 0xe8edf2, roughness: 0.9 });
    const plane = new THREE.Mesh(planeGeo, planeMat);
    plane.position.set(totalLength / 2, 0, -0.01);
    scene.add(plane);

    // Grid
    const grid = new THREE.GridHelper(Math.max(totalLength + 10, 30), Math.max(10, Math.round((totalLength + 10) / 2)), 0x99a8b5, 0xc6d1db);
    grid.position.set(totalLength / 2, -halfWidth - 1, 0);
    scene.add(grid);

    // Axes
    scene.add(new THREE.AxesHelper(2));

    // Layer groups
    const nodesGroup = new THREE.Group();
    const elementsGroup = new THREE.Group();
    const linesGroup = new THREE.Group();
    const interactionGroup = new THREE.Group();
    scene.add(nodesGroup, elementsGroup, linesGroup, interactionGroup);

    // Plane raycaster plane (z=0)
    const raycastPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const intersectionPoint = new THREE.Vector3();

    function snap(point: THREE.Vector3): THREE.Vector3 {
      // snap to grid in 1m increments
      const sx = Math.round(point.x);
      const sy = Math.round(point.y);
      return new THREE.Vector3(sx, sy, 0);
    }

    function redrawFEM() {
      nodesGroup.clear();
      elementsGroup.clear();
      const fem = stateRef.current.femModel;
      if (!fem) return;
      const nodeMap = new Map<string, [number, number, number]>();
      fem.nodes.forEach((n, i) => nodeMap.set(`N${i + 1}`, n as [number, number, number]));
      const nodeGeo = new THREE.SphereGeometry(0.18, 12, 8);
      const nodeMat = new THREE.MeshStandardMaterial({ color: 0xd45d50 });
      fem.nodes.forEach((n) => {
        const [x, y, z] = n;
        const mesh = new THREE.Mesh(nodeGeo, nodeMat);
        mesh.position.set(x, y, z);
        nodesGroup.add(mesh);
      });
      const positions: number[] = [];
      fem.edges.forEach(([a, b]) => {
        const na = fem.nodes[a];
        const nb = fem.nodes[b];
        if (!na || !nb) return;
        positions.push(na[0], na[1], na[2], nb[0], nb[1], nb[2]);
      });
      const lineGeo = new THREE.BufferGeometry();
      lineGeo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      const lineMat = new THREE.LineBasicMaterial({ color: 0x1f3a55 });
      const lines = new THREE.LineSegments(lineGeo, lineMat);
      elementsGroup.add(lines);
    }

    function redrawBridgeLines() {
      linesGroup.clear();
      const bridgeLines = stateRef.current.project.lines;
      bridgeLines.forEach((line) => {
        const color = stateRef.current.selectedLineId === line.id ? 0xf1c40f : TYPE_COLOR[line.type] ?? 0x34495e;
        const mat = new THREE.LineBasicMaterial({ color, linewidth: 2 });
        const pts: THREE.Vector3[] = line.points.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        const obj = new THREE.Line(geo, mat);
        obj.userData = { type: "line", id: line.id };
        linesGroup.add(obj);
        // Add small sphere at start
        const sphere = new THREE.Mesh(
          new THREE.SphereGeometry(0.18, 10, 6),
          new THREE.MeshStandardMaterial({ color, emissive: 0x000000 }),
        );
        sphere.position.copy(pts[0]);
        sphere.userData = { type: "line", id: line.id };
        linesGroup.add(sphere);
      });
    }

    redrawFEM();
    redrawBridgeLines();

    function onPointerMove(e: PointerEvent) {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    }

    function onClick(e: MouseEvent) {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const m = stateRef.current.mode;
      // Try line intersection first
      const lineHits = raycaster.intersectObjects(linesGroup.children, true);
      if (m === "select" && lineHits.length > 0) {
        const obj = lineHits[0].object;
        const id = obj.userData?.id;
        if (typeof id === "string") {
          stateRef.current.onSelectLine(id);
          return;
        }
      }
      if (m === "delete" && lineHits.length > 0) {
        const obj = lineHits[0].object;
        const id = obj.userData?.id;
        if (typeof id === "string") {
          stateRef.current.onSelectLine(null);
          // remove via project state
          const evt = new CustomEvent("bw:delete-line", { detail: { id } });
          window.dispatchEvent(evt);
          return;
        }
      }
      // ground plane
      if (m === "draw_line") {
        const hit = raycaster.ray.intersectPlane(raycastPlane, intersectionPoint);
        if (hit) {
          const snapped = snap(intersectionPoint);
          const current = stateRef.current.pendingStart;
          if (current == null) {
            setPendingStart([snapped.x, snapped.y, snapped.z]);
          } else {
            const start: [number, number, number] = current;
            const end: [number, number, number] = [snapped.x, snapped.y, snapped.z];
            if (start[0] !== end[0] || start[1] !== end[1]) {
              const defaultType: BridgeLineType = "traffic";
              stateRef.current.onCreateLine({
                type: defaultType,
                name: ja.bridgeViewer.defaultLineName(stateRef.current.project.lines.length + 1),
                points: [start, end],
              });
            }
            setPendingStart(null);
          }
        }
      }
    }

    function onResize() {
      if (!host) return;
      const w = host.clientWidth;
      const h = host.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }

    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("click", onClick);
    const ro = new ResizeObserver(onResize);
    ro.observe(host);

    let frame = 0;
    const tick = () => {
      controls.update();
      renderer.render(scene, camera);
      frame = requestAnimationFrame(tick);
    };
    tick();

    // Helper: redraw when project lines change (we attach window event)
    const onRedraw = () => redrawBridgeLines();
    window.addEventListener("bw:redraw", onRedraw);
    const onFemChange = () => redrawFEM();
    window.addEventListener("bw:redraw-fem", onFemChange);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("bw:redraw", onRedraw);
      window.removeEventListener("bw:redraw-fem", onFemChange);
      ro.disconnect();
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("click", onClick);
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === host) {
        host.removeChild(renderer.domElement);
      }
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m) => m?.dispose?.());
        }
      });
    };
  }, []);

  // Redraw on project/fem changes
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("bw:redraw"));
  }, [project.lines, selectedLineId]);
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("bw:redraw-fem"));
  }, [femModel]);

  // Listen for delete events from inside the viewer
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ id: string }>).detail;
      const id = detail?.id;
      if (typeof id === "string") {
        const evt = new CustomEvent("bw:request-delete-line", { detail: { id } });
        window.dispatchEvent(evt);
      }
    };
    window.addEventListener("bw:delete-line", handler);
    return () => window.removeEventListener("bw:delete-line", handler);
  }, []);

  return (
    <div className="bw-viewer">
      <div ref={hostRef} className="bw-viewer-canvas" />
      <div className="bw-viewer-hint">
        <span>{ja.bridgeViewer.hintMode}: <strong>{mode}</strong></span>
        {pendingStart && <span>{ja.bridgeViewer.hintStart}: {pendingStart.map((v) => v.toFixed(2)).join(", ")} — {ja.bridgeViewer.hintClickEnd}</span>}
        {!pendingStart && mode === "draw_line" && <span>{ja.bridgeViewer.hintClickStart}</span>}
      </div>
    </div>
  );
}
