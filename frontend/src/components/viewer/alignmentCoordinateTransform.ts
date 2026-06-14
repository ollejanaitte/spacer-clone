/**
 * BridgeAlignmentViewer (Step1 3D プレビュー) 専用の表示座標変換。
 *
 * 重要:
 *  - モデル座標 (roadAlignment.points) は **絶対に変更しない**。
 *  - project.json / Backend API / FEM 生成 / 解析データも変更しない。
 *  - Three.js シーンへ渡す「描画座標」と bbox 計算だけに変換を適用する。
 *
 * - `world` (既定) : CSV の (x, y, z) をそのまま (X, Y, Z) として描画。
 *   - X = 橋軸、Y = 横断、Z = 標高、土木測量座標そのまま確認する用途。
 *   - グリッド面 = XY 平面 (Z=0)。
 * - `spacer` : 旧 SPACER 由来のモデルなど、Y/Z を視覚的に入れ替えたい場合。
 *   - 表示上 (X, Z, Y) として描画 (=画面手前=モデル y、横断方向)。
 *   - グリッド面 = XZ 平面相当 (Y=0) を水平面として表示。
 *
 * 既存のメイン 3D Viewer (frontend/src/viewer/coordinateTransform.ts) の
 *  `ViewerCoordinateMode` とは独立したキー (`spacerClone.alignmentViewerCoordinateMode`)
 *  を使い、衝突しないようにしている。
 */

export type AlignmentCoordinateMode = "world" | "spacer";

export type Vec3Like = {
  x: number;
  y: number;
  z: number;
};

/**
 * 表示用に (x, y, z) をモードに応じて入れ替える。
 */
export function toAlignmentViewerPoint(
  point: Vec3Like,
  mode: AlignmentCoordinateMode,
): Vec3Like {
  if (mode === "spacer") {
    return { x: point.x, y: point.z, z: point.y };
  }
  return { x: point.x, y: point.y, z: point.z };
}

/**
 * モデル座標 (x, y, z) のリストから、表示座標モード適用後の bbox を計算する。
 * Viewer の fitToBounds およびグリッドサイズ算出で使う。
 */
export type AlignmentBBox = {
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
  span: number; // max extent (X / Y / Z のうち最大の幅)
  centerX: number;
  centerY: number;
  centerZ: number;
};

export const EMPTY_BBOX: AlignmentBBox = {
  minX: 0,
  minY: 0,
  minZ: 0,
  maxX: 0,
  maxY: 0,
  maxZ: 0,
  span: 1,
  centerX: 0,
  centerY: 0,
  centerZ: 0,
};

export function computeAlignmentBBox(
  points: ReadonlyArray<Vec3Like>,
  mode: AlignmentCoordinateMode,
): AlignmentBBox {
  if (points.length === 0) return { ...EMPTY_BBOX };
  const first = toAlignmentViewerPoint(points[0], mode);
  let minX = first.x;
  let maxX = first.x;
  let minY = first.y;
  let maxY = first.y;
  let minZ = first.z;
  let maxZ = first.z;
  for (let i = 1; i < points.length; i += 1) {
    const p = toAlignmentViewerPoint(points[i], mode);
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
    if (p.z < minZ) minZ = p.z;
    if (p.z > maxZ) maxZ = p.z;
  }
  const spanX = maxX - minX;
  const spanY = maxY - minY;
  const spanZ = maxZ - minZ;
  const span = Math.max(spanX, spanY, spanZ, 1);
  return {
    minX,
    minY,
    minZ,
    maxX,
    maxY,
    maxZ,
    span,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
    centerZ: (minZ + maxZ) / 2,
  };
}

/**
 * グリッド面の平面を識別する。
 *  - `world`  : XY 平面 (Z = 0)
 *  - `spacer` : XZ 平面 (Y = 0)  … 橋軸 × 横断を画面上の水平面に見せる
 */
export type GridPlane = "xy" | "xz";

export function gridPlaneFor(mode: AlignmentCoordinateMode): GridPlane {
  return mode === "spacer" ? "xz" : "xy";
}

/**
 * 軸ラベル (凡例用)。
 * world : X / Y / Z
 * spacer: X = 橋軸, Y = 標高, Z = 横断
 */
export const ALIGNMENT_AXIS_LABELS: Record<
  AlignmentCoordinateMode,
  { x: string; y: string; z: string }
> = {
  world: { x: "X", y: "Y", z: "Z" },
  spacer: { x: "X 橋軸", y: "Y 標高", z: "Z 横断" },
};

export const ALIGNMENT_MODE_LABELS: Record<AlignmentCoordinateMode, string> = {
  world: "通常 (X=橋軸 / Y=横断 / Z=標高)",
  spacer: "SPACER (X=橋軸 / Y=標高 / Z=横断)",
};

/**
 * ローカルストレージキー。
 * 既存のメイン 3D Viewer (spacerClone.viewerCoordinateMode) と衝突しない別キーを使う。
 */
export const ALIGNMENT_COORDINATE_MODE_STORAGE_KEY =
  "spacerClone.alignmentViewerCoordinateMode";

export function loadAlignmentCoordinateMode(): AlignmentCoordinateMode {
  if (typeof window === "undefined" || !window.localStorage) {
    return "spacer";
  }
  try {
    const raw = window.localStorage.getItem(ALIGNMENT_COORDINATE_MODE_STORAGE_KEY);
    if (raw === "world" || raw === "spacer") return raw;
  } catch {
    // localStorage access can throw in private mode or restricted iframes
  }
  // 初期値は SPACER モード (橋梁平面が画面水平に見える推奨設定)
  return "spacer";
}

export function saveAlignmentCoordinateMode(mode: AlignmentCoordinateMode): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(ALIGNMENT_COORDINATE_MODE_STORAGE_KEY, mode);
  } catch {
    // ignore
  }
}
