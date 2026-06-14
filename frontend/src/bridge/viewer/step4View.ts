/**
 * Step4「活荷重走行ライン設定」用の表示・幾何ヘルパ。
 *
 * 方針:
 *  - データ(project.lines / femModel / 格子点)には一切触らない。
 *  - 描画は常に「XY 平面の真上 = 平面図」目線に統一する。
 *  - 既存 Viewer3D 側の SPACER座標系表示トグル(Y/Z 入替)とは独立で、
 *    Step4 ではモデル座標=描画座標として扱う(SPACERモードでも同じ見え方)。
 *  - それでも SPACER 座標系表示が ON になったときに物理的な破綻を
 *    生まないよう、カメラ/コントロールはローカルに閉じている。
 */
import * as THREE from "three";

export type Step4GridPoint = {
  id: string;
  position: [number, number, number];
  /** fem 由来 / preview 由来 / 主桁上の代表点 などのソース識別 */
  source: "fem" | "preview" | "girder";
};

export const GRID_PICK_RADIUS_DEFAULT = 0.6;

export function buildGridPoints(
  xs: number[],
  ys: number[],
  z = 0,
): Step4GridPoint[] {
  const out: Step4GridPoint[] = [];
  for (let i = 0; i < xs.length; i += 1) {
    for (let j = 0; j < ys.length; j += 1) {
      out.push({
        id: `g-${i}-${j}`,
        position: [xs[i], ys[j], z],
        source: "preview",
      });
    }
  }
  return out;
}

export function buildFemGridPoints(
  femNodes: ReadonlyArray<readonly [number, number, number]>,
): Step4GridPoint[] {
  return femNodes.map((n, i) => ({
    id: `fem-${i}`,
    position: [n[0], n[1], n[2]],
    source: "fem" as const,
  }));
}

/**
 * マウス NDC と「格子点スフィア中心群のスクリーン距離」から
 * 最も近い格子点を返す。threshold 内なら採用、外なら null。
 */
export function pickNearestGridPoint(
  candidatePoints: ReadonlyArray<Step4GridPoint>,
  raycaster: THREE.Raycaster,
  ndc: THREE.Vector2,
  camera: THREE.Camera,
  canvasWidth: number,
  canvasHeight: number,
  thresholdPx: number = GRID_PICK_RADIUS_DEFAULT * 50,
): Step4GridPoint | null {
  let best: { pt: Step4GridPoint; dist: number } | null = null;
  for (const pt of candidatePoints) {
    const projected = projectToScreen(pt.position, camera, canvasWidth, canvasHeight);
    if (!projected) continue;
    const dx = projected.x - ndcToPx(ndc.x, canvasWidth);
    const dy = projected.y - ndcToPx(ndc.y, canvasHeight);
    const dist = Math.hypot(dx, dy);
    if (best == null || dist < best.dist) {
      best = { pt, dist };
    }
  }
  if (best == null) return null;
  return best.dist <= thresholdPx ? best.pt : null;
}

/**
 * モデル座標→スクリーン(px)座標。
 * Step4 では XY 平面の真上視点なので、Z=0 平面だけ見えれば十分だが、
 * 将来 Z が動いても破綻しないように depth はそのまま使う。
 */
function projectToScreen(
  modelPos: [number, number, number],
  camera: THREE.Camera,
  width: number,
  height: number,
): { x: number; y: number } | null {
  const v = new THREE.Vector3(modelPos[0], modelPos[1], modelPos[2]);
  v.project(camera);
  if (!Number.isFinite(v.x) || !Number.isFinite(v.y)) return null;
  return { x: ndcToPx(v.x, width), y: ndcToPx(v.y, height) };
}

function ndcToPx(ndc: number, size: number): number {
  return ((ndc + 1) * size) / 2;
}

/**
 * 上面図のカメラを bbox にフィットさせる。
 * 視点は常に +Z 方向から。OrbitControls の up は +Y。
 */
export function fitTopViewToBox(
  camera: THREE.PerspectiveCamera,
  controls: { target: THREE.Vector3; update: () => void },
  box: THREE.Box3,
): void {
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const radius = Math.max(Math.max(size.x, size.y) * 0.5, 1);
  const distance = radius / Math.sin(THREE.MathUtils.degToRad(camera.fov * 0.5)) * 1.18;
  camera.position.set(center.x, center.y, center.z + Math.max(distance, 1));
  camera.up.set(0, 1, 0);
  camera.near = Math.max(distance / 1000, 0.01);
  camera.far = Math.max(distance * 100, 1000);
  camera.updateProjectionMatrix();
  controls.target.copy(center);
  controls.update();
}

export function computeTopViewBox(
  xs: number[],
  ys: number[],
  z = 0,
): THREE.Box3 {
  const box = new THREE.Box3();
  if (xs.length === 0 || ys.length === 0) {
    box.expandByPoint(new THREE.Vector3(-1, -1, z - 0.1));
    box.expandByPoint(new THREE.Vector3(1, 1, z + 0.1));
    return box;
  }
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  box.expandByPoint(new THREE.Vector3(minX, minY, z));
  box.expandByPoint(new THREE.Vector3(maxX, maxY, z));
  return box;
}
