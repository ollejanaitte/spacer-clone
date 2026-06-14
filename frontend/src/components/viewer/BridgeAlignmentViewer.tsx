import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { RoadAlignment, RoadAlignmentPoint } from "../../bridge/types";
import { computeAlignmentExtent, summarizeAlignment } from "./alignmentSummary";
import {
  ALIGNMENT_AXIS_LABELS,
  computeAlignmentBBox,
  gridPlaneFor,
  toAlignmentViewerPoint,
  type AlignmentCoordinateMode,
} from "./alignmentCoordinateTransform";

export type BridgeAlignmentViewerProps = {
  alignment: RoadAlignment;
  height?: number;
  /**
   * 自動フィットを強制する tick。
   * CSV 読込直後など、明示的にフィットし直したいときに親から +1 する。
   */
  fitRequest?: number;
  /**
   * 個別測点ラベルを表示するか。点数が多すぎる場合は false に。
   */
  showStationLabels?: boolean;
  /**
   * 表示座標モード (display-only)。
   * - `world`  : モデル (x, y, z) をそのまま描画。
   * - `spacer` : 表示上 (x, z, y) として描画 (=橋軸×横断=水平面, 標高=鉛直)。
   *
   * 注: モデルデータ (roadAlignment.points) や Backend 送信 payload は変更しない。
   */
  mode?: AlignmentCoordinateMode;
  /**
   * モード切替ハンドラ (省略可)。トグル UI を外側に置きたい場合に使用。
   */
  onModeChange?: (mode: AlignmentCoordinateMode) => void;
  className?: string;
};

const X_COLOR = 0xc0392b; // red
const Y_COLOR = 0x27ae60; // green
const Z_COLOR = 0x2980b9; // blue
const CENTERLINE_COLOR = 0x1f3a55; // dark navy
const CENTERLINE_HEAD_COLOR = 0x1f3a55;
const CENTERLINE_TAIL_COLOR = 0xe67e22; // orange-ish (terminus)
const GRID_COLOR_MAJOR = 0xb7c5d3;
const GRID_COLOR_MINOR = 0xd8e0e8;

/**
 * 道路中心線形を 3D 表示する共通ビューア。
 *
 * 設計方針:
 *  - モデル空間 = 描画空間 (座標変換なし)。
 *    CSV の x, y, z をそのまま Three.js の X, Y, Z に対応させる。
 *  - 回転 / パン / ズームを OrbitControls で提供。
 *  - 初期視点はアイソメ (1, -1, 0.8) 方向。
 *  - XYZ 軸 / XY 平面 (Z=0) のグリッド / 測点ラベル / 情報パネルを内包。
 *  - 中心線長に応じてグリッドサイズを自動調整。
 *
 * 将来拡張: 支承 / FEM モデル / 走行ライン / 部材は別レイヤとしてこのシーンに
 * 追加できる構造 (useEffect 内で別 THREE.Group を作成して scene.add する)。
 */
export function BridgeAlignmentViewer({
  alignment,
  height = 360,
  fitRequest = 0,
  showStationLabels = true,
  mode = "spacer",
  onModeChange,
  className,
}: BridgeAlignmentViewerProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef({ alignment, mode });
  stateRef.current = { alignment, mode };

  const summary = useMemo(() => summarizeAlignment(alignment), [alignment]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#eef5fb");

    const camera = new THREE.PerspectiveCamera(45, host.clientWidth / host.clientHeight || 1, 0.01, 10000);
    camera.position.set(1, -1, 0.8);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(host.clientWidth, host.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.screenSpacePanning = true;

    const ambient = new THREE.HemisphereLight(0xffffff, 0xb6c2cc, 1.6);
    scene.add(ambient);
    const key = new THREE.DirectionalLight(0xffffff, 0.9);
    key.position.set(10, 15, 12);
    scene.add(key);

    const gridLayer = new THREE.Group();
    gridLayer.name = "AlignmentGroundGrid";
    scene.add(gridLayer);

    const centerlineLayer = new THREE.Group();
    centerlineLayer.name = "CenterlineLayer";
    scene.add(centerlineLayer);

    function buildAxes(
      unit: number,
      labelSize: number,
      labels: { x: string; y: string; z: string },
    ): THREE.Group {
      const g = new THREE.Group();
      g.name = "AxesHelper";
      const size = unit;
      const xGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(size, 0, 0),
      ]);
      g.add(new THREE.Line(xGeo, new THREE.LineBasicMaterial({ color: X_COLOR })));
      const yGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, size, 0),
      ]);
      g.add(new THREE.Line(yGeo, new THREE.LineBasicMaterial({ color: Y_COLOR })));
      const zGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, size),
      ]);
      g.add(new THREE.Line(zGeo, new THREE.LineBasicMaterial({ color: Z_COLOR })));
      g.add(createTextSprite(labels.x, "#c0392b", labelSize));
      g.add(createTextSprite(labels.y, "#27ae60", labelSize));
      g.add(createTextSprite(labels.z, "#2980b9", labelSize));
      return g;
    }

    function rebuildGrid() {
      for (const c of [...gridLayer.children]) {
        gridLayer.remove(c);
        disposeObject(c);
      }
      const { alignment, mode: m } = stateRef.current;
      const bbox = computeAlignmentBBox(alignment.points, m);
      // 表示座標での span。X/Y/Z のうち最大の伸びを使う。
      const span = Math.max(bbox.span, 10);
      const div = Math.max(2, Math.min(40, Math.round(span)));
      const size = span * 1.4;
      const grid = new THREE.GridHelper(size, div, GRID_COLOR_MAJOR, GRID_COLOR_MINOR);
      const plane = gridPlaneFor(m);
      if (plane === "xz") {
        // XZ 平面を水平面として見せるため、GridHelper を X 軸まわりに -90度倒す。
        // 元の GridHelper は XY 平面上にあるので、rotateX(-PI/2) で XZ 平面になる。
        grid.rotation.x = -Math.PI / 2;
        grid.position.set(bbox.centerX, 0, bbox.centerZ);
      } else {
        grid.position.set(bbox.centerX, bbox.centerY, 0);
      }
      gridLayer.add(grid);
    }

    function rebuildAxes() {
      const old = scene.getObjectByName("AxesHelper");
      if (old) {
        scene.remove(old);
        disposeObject(old);
      }
      const { alignment, mode: m } = stateRef.current;
      const bbox = computeAlignmentBBox(alignment.points, m);
      const unit = Math.max(bbox.span * 0.25, 2);
      const labelSize = Math.max(unit * 0.25, 0.5);
      const axes = buildAxes(unit, labelSize, ALIGNMENT_AXIS_LABELS[m]);
      const plane = gridPlaneFor(m);
      if (plane === "xz") {
        axes.position.set(bbox.minX, 0, bbox.minZ);
      } else {
        axes.position.set(bbox.minX, bbox.minY, 0);
      }
      scene.add(axes);
    }

    function rebuildCenterline() {
      for (const c of [...centerlineLayer.children]) {
        centerlineLayer.remove(c);
        disposeObject(c);
      }
      const { alignment, mode: m } = stateRef.current;
      if (alignment.points.length < 2) return;
      const pts = alignment.points.map((p) => {
        const v = toAlignmentViewerPoint(p, m);
        return new THREE.Vector3(v.x, v.y, v.z);
      });
      const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
      const lineMat = new THREE.LineBasicMaterial({ color: CENTERLINE_COLOR, linewidth: 2 });
      const line = new THREE.Line(lineGeo, lineMat);
      line.name = "CenterlinePolyline";
      centerlineLayer.add(line);
      const sphereGeo = new THREE.SphereGeometry(0.22, 12, 8);
      alignment.points.forEach((p, idx) => {
        const v = toAlignmentViewerPoint(p, m);
        const isStart = idx === 0;
        const isEnd = idx === alignment.points.length - 1;
        const color = isStart || isEnd ? CENTERLINE_TAIL_COLOR : CENTERLINE_HEAD_COLOR;
        const mesh = new THREE.Mesh(
          sphereGeo,
          new THREE.MeshStandardMaterial({ color, emissive: isStart || isEnd ? 0x331a00 : 0x000000 }),
        );
        mesh.position.set(v.x, v.y, v.z);
        centerlineLayer.add(mesh);
        if (showStationLabels) {
          const labelText = `${idx}: s=${p.station.toFixed(2)}m`;
          const sprite = createTextSprite(labelText, "#243447", 0.9);
          // ラベルは model z 方向 (標高) に少し浮かせる。world/spacer どちらでも
          // モデル Z に対応する表示軸上にオフセットを置きたいので、入力 z を
          // そのまま spacer モード時の Y に足し、world モード時の Z として使う。
          const labelOffset = toAlignmentViewerPoint({ x: 0, y: 0, z: 0.6 }, m);
          sprite.position.set(v.x + labelOffset.x, v.y + labelOffset.y, v.z + labelOffset.z);
          centerlineLayer.add(sprite);
        }
      });
    }

    function fitToBounds() {
      const { alignment, mode: m } = stateRef.current;
      const bbox = computeAlignmentBBox(alignment.points, m);
      const box = new THREE.Box3(
        new THREE.Vector3(bbox.minX, bbox.minY, bbox.minZ),
        new THREE.Vector3(bbox.maxX, bbox.maxY, bbox.maxZ),
      );
      // グリッド面 (世界 XY or 表示 XZ) を含むよう 0 面まで広げる
      if (gridPlaneFor(m) === "xz") {
        box.expandByPoint(new THREE.Vector3(box.min.x, 0, box.min.z));
        box.expandByPoint(new THREE.Vector3(box.max.x, 0, box.max.z));
      } else {
        box.expandByPoint(new THREE.Vector3(box.min.x, box.min.y, 0));
        box.expandByPoint(new THREE.Vector3(box.max.x, box.max.y, 0));
      }
      if (box.isEmpty()) {
        box.expandByPoint(new THREE.Vector3(-1, -1, -1));
        box.expandByPoint(new THREE.Vector3(1, 1, 1));
      }
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const radius = Math.max(size.length() * 0.5, 1);
      const distance = radius / Math.sin(THREE.MathUtils.degToRad(camera.fov * 0.5)) * 1.5;
      // 視点方向:
      //  - world : (1, -1, 0.8)  … 既存と同じ斜め上
      //  - spacer: (1, 0.8, 1)   … 標高方向(Y)と横断方向(Z)が画面上下に分担される
      const dir = (m === "spacer"
        ? new THREE.Vector3(1, 0.8, 1)
        : new THREE.Vector3(1, -1, 0.8)
      ).normalize();
      camera.position.copy(center).addScaledVector(dir, Math.max(distance, 1));
      // world モードは up=Y(標高) / spacer モードは up=Z(横断) で画面上方向を
      // 直感的な意味に揃える。
      camera.up.copy(m === "spacer" ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 1, 0));
      camera.near = Math.max(distance / 1000, 0.01);
      camera.far = Math.max(distance * 100, 1000);
      camera.updateProjectionMatrix();
      controls.target.copy(center);
      controls.update();
    }

    rebuildGrid();
    rebuildAxes();
    rebuildCenterline();
    fitToBounds();

    function onResize() {
      if (!host) return;
      const w = host.clientWidth;
      const h = host.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    const ro = new ResizeObserver(onResize);
    ro.observe(host);

    let frame = 0;
    const tick = () => {
      controls.update();
      renderer.render(scene, camera);
      frame = requestAnimationFrame(tick);
    };
    tick();

    const onRebuild = () => {
      rebuildGrid();
      rebuildAxes();
      rebuildCenterline();
    };
    const onFit = () => fitToBounds();
    window.addEventListener("bw:align-rebuild", onRebuild);
    window.addEventListener("bw:align-fit", onFit);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("bw:align-rebuild", onRebuild);
      window.removeEventListener("bw:align-fit", onFit);
      ro.disconnect();
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
  }, [showStationLabels, mode]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("bw:align-rebuild"));
  }, [alignment, mode]);

  useEffect(() => {
    if (fitRequest > 0) {
      window.dispatchEvent(new CustomEvent("bw:align-fit"));
    }
  }, [fitRequest]);

  return (
    <div className={`bw-align-viewer ${className ?? ""}`} aria-label="中心線 3D ビュー">
      <div ref={hostRef} className="bw-align-viewer-canvas" style={{ height: `${height}px` }} />
      <div className="bw-align-legend" role="note" aria-label="表示モード凡例">
        <div className="bw-align-legend-title">表示モード: {mode === "spacer" ? "SPACER座標系" : "通常"}</div>
        <div className="bw-align-legend-rows">
          <span><i style={{ background: "#c0392b" }} />{ALIGNMENT_AXIS_LABELS[mode].x}</span>
          <span><i style={{ background: "#27ae60" }} />{ALIGNMENT_AXIS_LABELS[mode].y}</span>
          <span><i style={{ background: "#2980b9" }} />{ALIGNMENT_AXIS_LABELS[mode].z}</span>
        </div>
        {onModeChange && (
          <button
            type="button"
            className={mode === "spacer" ? "bw-align-toggle active" : "bw-align-toggle"}
            aria-pressed={mode === "spacer"}
            onClick={() => onModeChange(mode === "spacer" ? "world" : "spacer")}
          >
            SPACER座標系表示 {mode === "spacer" ? "ON" : "OFF"}
          </button>
        )}
      </div>
      <div className="bw-align-info" role="status" aria-label="中心線情報">
        <div>
          <span>中心線点数</span>
          <strong>{summary.pointCount}</strong>
        </div>
        <div>
          <span>中心線長</span>
          <strong>{summary.totalLength.toFixed(2)} m</strong>
        </div>
        <div>
          <span>始点標高</span>
          <strong>{summary.startElev.toFixed(2)} m</strong>
        </div>
        <div>
          <span>終点標高</span>
          <strong>{summary.endElev.toFixed(2)} m</strong>
        </div>
        <div>
          <span>最大勾配</span>
          <strong>{(summary.maxSlope * 100).toFixed(2)} %</strong>
        </div>
        <div>
          <span>始点 → 終点</span>
          <strong>
            ({summary.startX.toFixed(1)}, {summary.startY.toFixed(1)}) → ({summary.endX.toFixed(1)}, {summary.endY.toFixed(1)})
          </strong>
        </div>
      </div>
    </div>
  );
}

function createTextSprite(text: string, color: string, worldSize: number): THREE.Sprite {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const fontSize = 48;
  const padding = 12;
  const safe = text.slice(0, 40);
  canvas.width = Math.max(128, safe.length * 26 + padding * 2);
  canvas.height = 80;
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(248, 250, 252, 0.92)";
    roundRect(ctx, 2, 8, canvas.width - 4, canvas.height - 16, 12);
    ctx.fill();
    ctx.strokeStyle = "rgba(82, 103, 125, 0.45)";
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.font = `600 ${fontSize}px Inter, Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(safe, canvas.width / 2, canvas.height / 2 + 1);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(material);
  const aspect = canvas.width / canvas.height;
  sprite.scale.set(aspect * worldSize, worldSize, 1);
  sprite.renderOrder = 10;
  return sprite;
}

function roundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

function disposeObject(object: THREE.Object3D): void {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    const line = child as THREE.Line;
    const sprite = child as THREE.Sprite;
    const geometry = mesh.geometry ?? line.geometry;
    if (geometry && "dispose" in geometry) geometry.dispose();
    const material = mesh.material ?? line.material ?? sprite.material;
    const materials = Array.isArray(material) ? material : material ? [material] : [];
    for (const item of materials) {
      const maybeMap = item as THREE.Material & { map?: THREE.Texture };
      maybeMap.map?.dispose();
      item.dispose();
    }
  });
}

export type { RoadAlignment, RoadAlignmentPoint };
