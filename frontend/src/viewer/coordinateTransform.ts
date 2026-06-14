/**
 * Viewer 表示専用の座標変換ユーティリティ。
 *
 * 重要: モデルデータ自体 (project.json, 解析結果, Backend への送信 payload) は
 *        一切変更しない。Three.js へ渡したり 2D SVG に描く直前にだけ適用する。
 *
 * - `normal` (既定): モデル座標 (x, y, z) をそのまま viewer 座標 (x, y, z) として扱う。
 * - `spacer`     : 旧 SPACER 由来のモデルなど、Y/Z を視覚的に入れ替えたい場合。
 *                  viewer 上では (x, z, y) として表示する。
 */
export type ViewerCoordinateMode = "normal" | "spacer";

export type Vec3Like = {
  x: number;
  y: number;
  z: number;
};

export function toViewerPoint(
  point: Vec3Like,
  mode: ViewerCoordinateMode,
): Vec3Like {
  if (mode === "spacer") {
    return { x: point.x, y: point.z, z: point.y };
  }
  return { x: point.x, y: point.y, z: point.z };
}

export function toViewerVector(
  vector: Vec3Like,
  mode: ViewerCoordinateMode,
): Vec3Like {
  // 位置ベクトルと方向ベクトルは同じ変換で OK (平行移動は原点 0 のときに等価)
  return toViewerPoint(vector, mode);
}

/**
 * ローカルストレージキー。
 * 表示専用トグルなので個人設定として永続化する。
 */
export const COORDINATE_MODE_STORAGE_KEY = "spacerClone.viewerCoordinateMode";

export function loadViewerCoordinateMode(): ViewerCoordinateMode {
  if (typeof window === "undefined" || !window.localStorage) {
    return "normal";
  }
  try {
    const raw = window.localStorage.getItem(COORDINATE_MODE_STORAGE_KEY);
    if (raw === "spacer" || raw === "normal") return raw;
  } catch {
    // localStorage access can throw in private mode or restricted iframes; fall through
  }
  return "normal";
}

export function saveViewerCoordinateMode(mode: ViewerCoordinateMode): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(COORDINATE_MODE_STORAGE_KEY, mode);
  } catch {
    // ignore
  }
}

export const VIEWER_COORDINATE_MODE_LABELS: Record<ViewerCoordinateMode, string> = {
  normal: "通常",
  spacer: "SPACER (Y/Z 入替)",
};
