import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type {
  BridgeLine,
  BridgeLineType,
  BridgeProject,
  RoadAlignment,
  SupportPoint,
  ViewerModelPayload,
} from "../types";
import { xPositionsFor, yPositionsFor } from "../BridgeWizardState";
import {
  buildFemGridPoints,
  buildGridPoints,
  computeTopViewBox,
  fitTopViewToBox,
  GRID_PICK_RADIUS_DEFAULT,
  pickNearestGridPoint,
  type Step4GridPoint,
} from "./step4View";

export type ViewerMode = "view" | "draw_line" | "select" | "delete";

type Props = {
  project: BridgeProject;
  mode: ViewerMode;
  selectedLineId: string | null;
  onSelectLine: (id: string | null) => void;
  onCreateLine: (line: Omit<BridgeLine, "id">) => void;
  femModel?: ViewerModelPayload | null;
  /** Step1 で入力された道路中心線形 (任意)。 */
  alignment?: RoadAlignment | null;
  /** Step2 で入力された支点列 (任意)。 */
  supportPoints?: SupportPoint[] | null;
  /**
   * 上面図モード。true の間はカメラを XY 平面真上視点に固定し、
   * 回転とパンを無効化、ズームのみ許可する。SPACER 座標系表示トグルとは
   * 独立で、Step4 内部のローカル表現。モデルデータには影響しない。
   */
  topView?: boolean;
};

const TYPE_COLOR: Record<BridgeLineType, number> = {
  traffic: 0x22a06b,
  load: 0xc0392b,
  reference: 0x7f8c8d,
};

const Z_UP = new THREE.Vector3(0, 0, 1);
const X_AXIS = new THREE.Vector3(1, 0, 0);
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const PENDING_START_COLOR = 0xf1c40f;
const GRID_NODE_COLOR = 0x6f7c8c;
const GRID_NODE_SELECTED_COLOR = 0xf1c40f;

export function BridgeThreeViewer({
  project,
  mode,
  selectedLineId,
  onSelectLine,
  onCreateLine,
  femModel,
  alignment = null,
  supportPoints = null,
  topView = true,
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const topViewRef = useRef<((enabled: boolean) => void) | null>(null);
  const [pendingStart, setPendingStart] = useState<[number, number, number] | null>(null);
  const [pickMessage, setPickMessage] = useState<string | null>(null);

  const stateRef = useRef({
    project,
    mode,
    selectedLineId,
    pendingStart,
    onCreateLine,
    onSelectLine,
    femModel,
    topView,
    alignment,
    supportPoints,
  });
  stateRef.current = { project, mode, selectedLineId, pendingStart, onCreateLine, onSelectLine, femModel, topView, alignment, supportPoints };

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#eef5fb");
    const camera = new THREE.PerspectiveCamera(45, host.clientWidth / host.clientHeight || 1, 0.01, 10000);
    camera.position.set(20, 0, 30);

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
    const gridPointsGroup = new THREE.Group();
    const pendingStartGroup = new THREE.Group();
    const contextGroup = new THREE.Group();
    contextGroup.name = "ContextLayer";
    scene.add(nodesGroup, elementsGroup, linesGroup, gridPointsGroup, pendingStartGroup, contextGroup);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const applyTopView = (enabled: boolean) => {
      controls.enableRotate = !enabled;
      controls.enablePan = !enabled;
      controls.enableZoom = true;
      controls.minPolarAngle = enabled ? 0 : 0;
      controls.maxPolarAngle = enabled ? 0.0001 : Math.PI;
      if (enabled) {
        const center = controls.target.clone();
        const offset = camera.position.clone().sub(center);
        const flat = new THREE.Vector3(offset.x, 0, offset.z);
        const dist = Math.max(flat.length(), 1);
        camera.position.set(center.x, center.y, center.z + dist);
        camera.up.set(0, 1, 0);
      }
      controls.update();
    };
    applyTopView(stateRef.current.topView);
    topViewRef.current = applyTopView;

    function buildGridPointMeshes(points: Step4GridPoint[]): THREE.Object3D[] {
      const geo = new THREE.SphereGeometry(0.18, 12, 8);
      const mat = new THREE.MeshStandardMaterial({
        color: GRID_NODE_COLOR,
        emissive: 0x000000,
        transparent: true,
        opacity: 0.85,
      });
      return points.map((pt) => {
        const mesh = new THREE.Mesh(geo, mat.clone());
        mesh.position.set(pt.position[0], pt.position[1], pt.position[2]);
        mesh.userData = { type: "grid", id: pt.id, source: pt.source, position: pt.position };
        return mesh;
      });
    }

    function refreshGridPoints() {
      gridPointsGroup.clear();
      const fem = stateRef.current.femModel;
      const proj = stateRef.current.project;
      const localXs = xPositionsFor(proj.spans, proj.generationSettings.mesh_division);
      const localYs = yPositionsFor(proj.crossSection);
      let candidates: Step4GridPoint[];
      if (fem && fem.nodes && fem.nodes.length > 0) {
        candidates = buildFemGridPoints(fem.nodes as unknown as ReadonlyArray<readonly [number, number, number]>);
      } else {
        candidates = buildGridPoints(localXs, localYs, 0);
      }
      const meshes = buildGridPointMeshes(candidates);
      meshes.forEach((m) => gridPointsGroup.add(m));
    }

    function refreshPendingStartMarker() {
      pendingStartGroup.clear();
      const current = stateRef.current.pendingStart;
      if (!current) return;
      const geo = new THREE.SphereGeometry(0.28, 14, 10);
      const mat = new THREE.MeshStandardMaterial({
        color: PENDING_START_COLOR,
        emissive: 0x553a00,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(current[0], current[1], current[2] + 0.05);
      pendingStartGroup.add(mesh);
    }

    function redrawContext() {
      contextGroup.clear();
      const a = stateRef.current.alignment;
      const sps = stateRef.current.supportPoints;
      // 道路中心線形 (折れ線)
      if (a && a.points.length >= 2) {
        const mat = new THREE.LineBasicMaterial({ color: 0x1f3a55, linewidth: 3 });
        const geo = new THREE.BufferGeometry().setFromPoints(
          a.points.map((p) => new THREE.Vector3(p.x, p.y, p.z)),
        );
        const ln = new THREE.Line(geo, mat);
        contextGroup.add(ln);
        // 接頭点スフィア
        const headMat = new THREE.MeshStandardMaterial({ color: 0x1f3a55 });
        a.points.forEach((p, i) => {
          const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 6), headMat);
          sphere.position.set(p.x, p.y, p.z);
          sphere.userData = { type: "alignment", index: i };
          contextGroup.add(sphere);
        });
      }
      // 支点列 (abutment=橙 / pier=緑)
      if (sps && sps.length > 0) {
        sps.forEach((sp) => {
          const pos = a ? interpolateAlignmentPoint(a, sp.station) : null;
          if (!pos) return;
          const color = sp.type === "abutment" ? 0xe67e22 : 0x27ae60;
          const sphere = new THREE.Mesh(
            new THREE.SphereGeometry(0.32, 14, 10),
            new THREE.MeshStandardMaterial({ color, emissive: 0x000000 }),
          );
          sphere.position.set(pos[0], pos[1], pos[2] + 0.05);
          sphere.userData = { type: "support", name: sp.name, kind: sp.type };
          contextGroup.add(sphere);
        });
      }
    }

    function interpolateAlignmentPoint(
      a: { points: ReadonlyArray<{ station: number; x: number; y: number; z: number }> },
      s: number,
    ): [number, number, number] | null {
      const pts = a.points;
      if (pts.length === 0) return null;
      if (pts.length === 1) return [pts[0].x, pts[0].y, pts[0].z];
      if (s <= pts[0].station) return [pts[0].x, pts[0].y, pts[0].z];
      if (s >= pts[pts.length - 1].station) {
        const last = pts[pts.length - 1];
        return [last.x, last.y, last.z];
      }
      for (let i = 1; i < pts.length; i += 1) {
        const a0 = pts[i - 1];
        const a1 = pts[i];
        if (s >= a0.station && s <= a1.station) {
          const span = a1.station - a0.station;
          const t = span <= 0 ? 0 : (s - a0.station) / span;
          return [a0.x + (a1.x - a0.x) * t, a0.y + (a1.y - a0.y) * t, a0.z + (a1.z - a0.z) * t];
        }
      }
      return null;
    }

    function redrawFEM() {
      nodesGroup.clear();
      elementsGroup.clear();
      const fem = stateRef.current.femModel;
      if (!fem) {
        // femModel 未生成のときの主桁格子プレビュー
        const proj = stateRef.current.project;
        const xsPreview = xPositionsFor(proj.spans, proj.generationSettings.mesh_division);
        const ysPreview = yPositionsFor(proj.crossSection);
        if (xsPreview.length < 2 || ysPreview.length < 1) return;
        const previewMat = new THREE.LineBasicMaterial({ color: 0x9aa7b3, transparent: true, opacity: 0.45 });
        for (const y of ysPreview) {
          const pts = xsPreview.map((x) => new THREE.Vector3(x, y, 0));
          const geo = new THREE.BufferGeometry().setFromPoints(pts);
          elementsGroup.add(new THREE.Line(geo, previewMat));
        }
        for (const x of xsPreview) {
          const pts = ysPreview.map((y) => new THREE.Vector3(x, y, 0));
          const geo = new THREE.BufferGeometry().setFromPoints(pts);
          elementsGroup.add(new THREE.Line(geo, previewMat));
        }
        return;
      }
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
      elementsGroup.add(new THREE.LineSegments(lineGeo, lineMat));
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
        // endpoints
        pts.forEach((p, idx) => {
          const sphere = new THREE.Mesh(
            new THREE.SphereGeometry(0.18, 10, 6),
            new THREE.MeshStandardMaterial({ color, emissive: 0x000000 }),
          );
          sphere.position.copy(p);
          sphere.userData = { type: "line", id: line.id, endIndex: idx };
          linesGroup.add(sphere);
        });
      });
    }

    function fitIfTopView() {
      if (!stateRef.current.topView) return;
      const proj = stateRef.current.project;
      const a = stateRef.current.alignment;
      const sps = stateRef.current.supportPoints;
      // xs (橋軸距離) および alignment の world x/y を含む bbox を構成
      const box = new THREE.Box3();
      const xsNow = xPositionsFor(proj.spans, proj.generationSettings.mesh_division);
      const ysNow = yPositionsFor(proj.crossSection);
      for (const x of xsNow) {
        for (const y of ysNow) box.expandByPoint(new THREE.Vector3(x, y, 0));
      }
      if (a) {
        for (const p of a.points) box.expandByPoint(new THREE.Vector3(p.x, p.y, p.z));
      }
      if (sps) {
        for (const sp of sps) {
          const pos = a ? interpolateAlignmentPoint(a, sp.station) : null;
          if (pos) box.expandByPoint(new THREE.Vector3(pos[0], pos[1], pos[2]));
        }
      }
      if (box.isEmpty()) {
        box.expandByPoint(new THREE.Vector3(-1, -1, 0));
        box.expandByPoint(new THREE.Vector3(1, 1, 0));
      }
      fitTopViewToBox(camera, controls, box);
    }

    redrawFEM();
    redrawBridgeLines();
    redrawContext();
    refreshGridPoints();
    refreshPendingStartMarker();
    fitIfTopView();

    function setMessage(text: string | null) {
      // schedule via microtask to avoid setState during render
      queueMicrotask(() => {
        // we cannot call setPickMessage directly inside Three.js handlers
        // that run synchronously without coupling to React; use a window event
        if (text == null) {
          window.dispatchEvent(new CustomEvent("bw:pick-message", { detail: { text: null } }));
        } else {
          window.dispatchEvent(new CustomEvent("bw:pick-message", { detail: { text } }));
        }
      });
    }

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

      // 既存ライン(交差する 3D オブジェクト)→ select / delete
      const lineHits = raycaster.intersectObjects(linesGroup.children, true);
      if (m === "select" && lineHits.length > 0) {
        const obj = lineHits[0].object;
        const id = obj.userData?.id;
        if (typeof id === "string") {
          stateRef.current.onSelectLine(id);
          setMessage(null);
          return;
        }
      }
      if (m === "delete" && lineHits.length > 0) {
        const obj = lineHits[0].object;
        const id = obj.userData?.id;
        if (typeof id === "string") {
          stateRef.current.onSelectLine(null);
          window.dispatchEvent(new CustomEvent("bw:delete-line", { detail: { id } }));
          setMessage(null);
          return;
        }
      }

      // draw_line: 格子点だけをピックする
      if (m === "draw_line") {
        const candidates: Step4GridPoint[] = gridPointsGroup.children
          .map((obj) => {
            const u = obj.userData as { id?: string; position?: [number, number, number]; source?: Step4GridPoint["source"] } | undefined;
            if (!u || !u.id || !u.position || !u.source) return null;
            return { id: u.id, position: u.position, source: u.source };
          })
          .filter((v): v is Step4GridPoint => v != null);
        const picked = pickNearestGridPoint(
          candidates,
          raycaster,
          pointer,
          camera,
          rect.width,
          rect.height,
          GRID_PICK_RADIUS_DEFAULT * 50,
        );
        if (!picked) {
          setMessage("格子点をクリックしてください");
          return;
        }
        setMessage(null);
        const current = stateRef.current.pendingStart;
        if (current == null) {
          setPendingStart([picked.position[0], picked.position[1], picked.position[2]]);
        } else {
          const start: [number, number, number] = current;
          const end: [number, number, number] = [picked.position[0], picked.position[1], picked.position[2]];
          if (start[0] !== end[0] || start[1] !== end[1]) {
            const defaultType: BridgeLineType = "traffic";
            stateRef.current.onCreateLine({
              type: defaultType,
              name: `ライン ${stateRef.current.project.lines.length + 1}`,
              points: [start, end],
            });
          }
          setPendingStart(null);
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

    const onRedraw = () => redrawBridgeLines();
    window.addEventListener("bw:redraw", onRedraw);
    const onFemChange = () => redrawFEM();
    window.addEventListener("bw:redraw-fem", onFemChange);
    const onContextChange = () => redrawContext();
    window.addEventListener("bw:redraw-context", onContextChange);
    const onPendingStart = () => refreshPendingStartMarker();
    window.addEventListener("bw:refresh-pending", onPendingStart);
    const onGridRefresh = () => refreshGridPoints();
    window.addEventListener("bw:refresh-grid", onGridRefresh);
    const onFitTopView = () => fitIfTopView();
    window.addEventListener("bw:fit-top-view", onFitTopView);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("bw:redraw", onRedraw);
      window.removeEventListener("bw:redraw-fem", onFemChange);
      window.removeEventListener("bw:redraw-context", onContextChange);
      window.removeEventListener("bw:refresh-pending", onPendingStart);
      window.removeEventListener("bw:refresh-grid", onGridRefresh);
      window.removeEventListener("bw:fit-top-view", onFitTopView);
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

  // topView 切替時にカメラとコントロールを再適用
  useEffect(() => {
    topViewRef.current?.(topView);
    if (topView) {
      window.dispatchEvent(new CustomEvent("bw:fit-top-view"));
    }
  }, [topView]);

  // pendingStart が変わったら 3D 側のマーカーを更新
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("bw:refresh-pending"));
  }, [pendingStart]);

  // femModel 変更時は gridPoints と fem 表示を再構築
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("bw:redraw-fem"));
    window.dispatchEvent(new CustomEvent("bw:refresh-grid"));
    if (topView) {
      window.dispatchEvent(new CustomEvent("bw:fit-top-view"));
    }
  }, [femModel, topView]);

  // bridge line 変更時の redraw
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("bw:redraw"));
  }, [project.lines, selectedLineId]);


  // 種別・モード切替時に親からリセット指示
  useEffect(() => {
    const handler = () => setPendingStart(null);
    window.addEventListener("bw:reset-pending", handler);
    return () => window.removeEventListener("bw:reset-pending", handler);
  }, []);

  // bw:pick-message listener
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ text: string | null }>).detail;
      setPickMessage(detail?.text ?? null);
    };
    window.addEventListener("bw:pick-message", handler);
    return () => window.removeEventListener("bw:pick-message", handler);
  }, []);

  // bw:delete-line listener
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ id: string }>).detail;
      const id = detail?.id;
      if (typeof id === "string") {
        window.dispatchEvent(new CustomEvent("bw:request-delete-line", { detail: { id } }));
      }
    };
    window.addEventListener("bw:delete-line", handler);
    return () => window.removeEventListener("bw:delete-line", handler);
  }, []);

  return (
    <div className="bw-viewer">
      <div ref={hostRef} className="bw-viewer-canvas" />
      <div className="bw-viewer-hint">
        <span>モード: <strong>{mode}</strong></span>
        {pendingStart && (
          <span>
            1点目選択中: {pendingStart.map((v) => v.toFixed(2)).join(", ")} — 2点目の格子点をクリック
          </span>
        )}
        {!pendingStart && mode === "draw_line" && <span>格子点をクリックして 1点目を選択</span>}
        {mode === "view" && <span>閲覧モード: ラインと格子点を確認できます</span>}
        {mode === "select" && <span>ラインをクリックして選択</span>}
        {mode === "delete" && <span>ラインをクリックして削除</span>}
      </div>
      {pickMessage && (
        <div className="bw-viewer-toast" role="status">{pickMessage}</div>
      )}
    </div>
  );
}
