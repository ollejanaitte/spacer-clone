// 3Dジオメトリ生成（パラメトリック）。Three.js メッシュを部材ごとに生成する。
// 安定IDを Object3D.name に付与し、寸法変更時は再構築する。座標系 x-longitudinal-y-transverse-z-up。
import * as THREE from "three";
import type { Project, Support, Pier, Abutment, BearingSeat, PileGroup } from "./model";

export interface SceneGraph {
  root: THREE.Group;
  parts: Map<string, THREE.Object3D>;
}

// 部材ごとの標準色
const COLORS = {
  column: 0x8a8ac8,
  cap: 0x7aa07a,
  seat: 0xd0b080,
  bearing: 0x7a9ad0,
  footing: 0xb09050,
  pile: 0xa08040,
  abutment: 0x9aab9a,
  wing: 0x8aa88a,
  superstructure: 0x70a0b0,
  ground: 0x60aa60,
};

function makeMesh(
  geo: THREE.BufferGeometry,
  color: number,
  name: string
): THREE.Mesh {
  const mat = new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function addBox(
  parent: THREE.Object3D,
  name: string,
  sx: number,
  sy: number,
  sz: number,
  cx: number,
  cy: number,
  cz: number,
  color: number
): THREE.Mesh {
  const mesh = makeMesh(new THREE.BoxGeometry(sx, sy, sz), color, name);
  mesh.position.set(cx, cy, cz);
  parent.add(mesh);
  return mesh;
}

function addCylinder(
  parent: THREE.Object3D,
  name: string,
  radius: number,
  height: number,
  cx: number,
  cy: number,
  cz: number,
  color: number
): THREE.Mesh {
  const mesh = makeMesh(new THREE.CylinderGeometry(radius, radius, height, 16), color, name);
  mesh.position.set(cx, cy, cz);
  parent.add(mesh);
  return mesh;
}

function buildPiles(
  parent: THREE.Object3D,
  piles: PileGroup,
  footingTopZ: number,
  groundZ: number
): void {
  const n = piles.pileCount;
  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);
  let idx = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (idx >= n) break;
      const id = `PILE-${String(idx + 1).padStart(2, "0")}`;
      const cx = (c - (cols - 1) / 2) * piles.spacing.x;
      const cy = (r - (rows - 1) / 2) * piles.spacing.y;
      const cz = footingTopZ - piles.length / 2;
      addCylinder(parent, id, piles.diameter / 2, piles.length, cx, cy, cz, COLORS.pile);
      idx++;
    }
  }
}

function buildBearingSeat(
  parent: THREE.Object3D,
  seat: BearingSeat,
  color: number
): void {
  const d = seat.dimensions;
  const topZ = seat.position.z;
  addBox(parent, seat.seatId, d.w, d.d, d.h, seat.position.x, seat.position.y, topZ - d.h / 2, color);
  const bh = seat.bearing.height;
  addBox(
    parent,
    seat.bearing.id,
    d.w * 0.8,
    d.d * 0.8,
    bh,
    seat.position.x,
    seat.position.y,
    topZ + bh / 2,
    COLORS.bearing
  );
}

function buildPier(parent: THREE.Object3D, support: Support, pier: Pier, groundZ: number): void {
  const foot = pier.footing;
  const col = pier.column;
  const cap = pier.cap;

  // フーチング: 天端 z=0、中心は z=-thickness/2
  addBox(
    parent,
    foot.id,
    foot.length,
    foot.width,
    foot.thickness,
    0,
    0,
    -foot.thickness / 2,
    COLORS.footing
  );

  // 柱: フーチング上面(z=0)から柱高
  addBox(
    parent,
    col.id,
    col.width,
    col.depth,
    col.height,
    0,
    0,
    col.height / 2,
    COLORS.column
  );

  // 梁: 柱天端の上
  const capZ = col.height + cap.height / 2;
  addBox(
    parent,
    cap.id,
    cap.width,
    cap.depth,
    cap.height,
    0,
    0,
    capZ,
    COLORS.cap
  );

  // 支承座（梁天端上）
  for (const seat of support.bearingSeats ?? []) {
    buildBearingSeat(parent, seat, COLORS.seat);
  }

  // 杭
  if (pier.piles) {
    buildPiles(parent, pier.piles, 0, groundZ);
  }
}

function buildAbutment(parent: THREE.Object3D, support: Support, ab: Abutment): void {
  const bw = ab.backwall;
  const seatZ = bw.seatElevation;

  // 背壁: 下端0から seatElevation まで（支点基準のローカル座標）
  addBox(
    parent,
    bw.id,
    bw.thickness,
    bw.width,
    seatZ,
    0,
    0,
    seatZ / 2,
    COLORS.abutment
  );

  // 翼壁: 左右
  const wingL = ab.wingWallL;
  const wingR = ab.wingWallR;
  for (const [wing, sign] of [
    [wingL, -1] as const,
    [wingR, 1] as const,
  ]) {
    addBox(
      parent,
      wing.id,
      wing.length,
      wing.thickness,
      wing.height,
      (bw.thickness + wing.length) / 2,
      sign * (bw.width / 2 + wing.thickness / 2),
      wing.height / 2,
      COLORS.wing
    );
  }

  // 支承座
  for (const seat of support.bearingSeats ?? []) {
    buildBearingSeat(parent, seat, COLORS.seat);
  }
}

// 上部工簡易外形（橋軸方向の箱、全支点を覆う）
function buildSuperstructure(parent: THREE.Object3D, supports: Support[]): void {
  if (supports.length < 2) return;
  const xs = supports.map((s) => s.position.x);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const ys = supports.flatMap((s) => (s.bearingSeats ?? []).map((b) => b.position.y));
  const zs = supports.flatMap((s) => (s.bearingSeats ?? []).map((b) => b.position.z));
  if (ys.length === 0 || zs.length === 0) return;
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const maxZ = Math.max(...zs);

  const length = maxX - minX + 6;
  const width = maxY - minY + 4;
  const thickness = 1.2;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const cz = maxZ + thickness / 2;
  const mesh = makeMesh(new THREE.BoxGeometry(length, width, thickness), COLORS.superstructure, "SUPERSTRUCTURE-ENVELOPE");
  mesh.layers.set(1); // ピッキング対象外（補助表示）
  mesh.position.set(cx, cy, cz);
  parent.add(mesh);
}

function buildGround(parent: THREE.Object3D, supports: Support[], z: number): void {
  const xs = supports.map((s) => s.position.x);
  const ys = supports.map((s) => s.position.y);
  const minX = Math.min(...xs) - 15;
  const maxX = Math.max(...xs) + 15;
  const minY = Math.min(...ys) - 15;
  const maxY = Math.max(...ys) + 15;
  const w = maxX - minX;
  const d = maxY - minY;
  const mat = new THREE.MeshStandardMaterial({ color: COLORS.ground, transparent: true, opacity: 0.4, side: THREE.DoubleSide });
  const geo = new THREE.PlaneGeometry(w, d);
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = "GROUND";
  mesh.layers.set(1);
  mesh.position.set((minX + maxX) / 2, (minY + maxY) / 2, z);
  parent.add(mesh);
}

export function buildScene(project: Project): SceneGraph {
  const root = new THREE.Group();
  const parts = new Map<string, THREE.Object3D>();

  const group = new THREE.Group();
  group.name = "SUBSTRUCTURES";
  for (const support of project.supports) {
    const sub = new THREE.Group();
    sub.name = support.supportId;
    sub.position.set(support.position.x, support.position.y, 0);
    if (support.skewAngle) {
      sub.rotation.z = (support.skewAngle * Math.PI) / 180;
    }
    if (support.pier) {
      buildPier(sub, support, support.pier, project.origin.z);
    } else if (support.abutment) {
      buildAbutment(sub, support, support.abutment);
    }
    group.add(sub);
    collectParts(sub, parts);
  }
  root.add(group);

  buildSuperstructure(root, project.supports);
  buildGround(root, project.supports, project.origin.z);

  collectParts(root, parts);
  return { root, parts };
}

function collectParts(node: THREE.Object3D, parts: Map<string, THREE.Object3D>): void {
  if (node.name) parts.set(node.name, node);
  node.children.forEach((c) => collectParts(c, parts));
}

// シーンを破棄
export function disposeScene(scene: SceneGraph): void {
  scene.root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      m.geometry?.dispose();
      const mat = m.material as THREE.Material | THREE.Material[];
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
      else mat?.dispose();
    }
  });
}

// 光・カメラ設定を除いた再生成用ヘルパー
export function reorderByName(root: THREE.Group, map: Map<string, THREE.Object3D>): void {
  map.clear();
  collectParts(root, map);
}