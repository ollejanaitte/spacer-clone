// Phase C1 (M2-01) SolidNode / SolidGroup → THREE 変換層（純粋・Renderer 変換）
// 下部工は x-longitudinal / y-transverse / z-up（Z-up）座標系。
// 表示は既存 Viewer と合わせ Y-up へ変換する（swap: (x,y,z) → (x,z,y)）。
// M1 の pure model / geometry を変更せず、描画境界でのみ座標変換を行う。

import * as THREE from "three";
import type { SolidGroup, SolidNode, SolidTransform } from "../geometryBase";

/** Z-up → Y-up 表示変換。 */
export function swapToYUp(v: { x: number; y: number; z: number }): THREE.Vector3 {
  return new THREE.Vector3(v.x, v.z, v.y);
}

/** ワールド基底（xAxis/yAxis/zAxis）を表示座標（Y-up）の行列へ変換。 */
export function transformToMatrix4(transform: SolidTransform): THREE.Matrix4 {
  const xAxis = swapToYUp(transform.xAxis);
  const yAxis = swapToYUp(transform.yAxis);
  const zAxis = swapToYUp(transform.zAxis);
  const origin = swapToYUp(transform.origin);
  const m = new THREE.Matrix4();
  m.makeBasis(xAxis, yAxis, zAxis);
  m.setPosition(origin);
  return m;
}

/** box SolidNode → メッシュジオメトリ（ローカル中心原点、表示Y-upは親行列で反映）。 */
export function boxGeometry(node: SolidNode): THREE.BufferGeometry {
  const { x: sx, y: sy, z: sz } = node.localSize;
  const g = new THREE.BoxGeometry(sx, sy, sz);
  g.translate(node.localCenter.x, node.localCenter.y, node.localCenter.z);
  return g;
}

/** cylinder SolidNode → メッシュジオメトリ（軸はローカル z）。three 既定は Y 軸のため X軸回り90度回転。 */
export function cylinderGeometry(node: SolidNode): THREE.BufferGeometry {
  const radius = Math.max(node.localSize.x, node.localSize.y) / 2;
  const height = node.localSize.z;
  const g = new THREE.CylinderGeometry(radius, radius, height, 24, 1);
  g.rotateX(Math.PI / 2);
  g.translate(node.localCenter.x, node.localCenter.y, node.localCenter.z);
  return g;
}

export interface SolidMeshOutput {
  /** メッシュ自体（matrixAutoUpdate=false で行列を確定配置） */
  mesh: THREE.Mesh;
  /** M1 安定ID（sourceObjectId） */
  id: string;
  /** 所属 support の supportId */
  supportId: string;
  entity: string;
}

const ENTITY_COLORS: Record<string, number> = {
  abutment: 0x8aa8a8,
  pier: 0xc9ae7a,
  footing: 0x7aa88a,
  pile: 0x8f7a6a,
  bearingSeat: 0xb08ad0,
  bearing: 0xb08ad0,
  superstructure: 0x6f8fbf,
};

function materialFor(node: SolidNode, selected: boolean): THREE.MeshStandardMaterial {
  const color = ENTITY_COLORS[node.entity] ?? 0x9aa0a6;
  return new THREE.MeshStandardMaterial({
    color,
    emissive: selected ? new THREE.Color(0xffd54d) : new THREE.Color(0x000000),
    emissiveIntensity: selected ? 0.55 : 0,
  });
}

/**
 * 1 ソリッド → THREE.Mesh。ワールド配置は group 行列で行い、
 * メッシュ自体はローカル座標のジオメトリを持つ（selection や highlight の重複を避ける）。
 */
export function solidToMesh(
  node: SolidNode,
  selected = false,
): { mesh: THREE.Mesh; geometry: THREE.BufferGeometry } {
  const geometry =
    node.kind === "cylinder" ? cylinderGeometry(node) : boxGeometry(node);
  const material = materialFor(node, selected);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = node.id;
  mesh.userData.id = node.id;
  mesh.userData.entity = node.entity;
  return { mesh, geometry };
}

export interface SceneBuildOptions {
  /** 選択された supportId（この support 配下は highlight） */
  selectedSupportId?: string | null;
  /** 非表示にする supportId 集合 */
  hiddenSupportIds?: ReadonlySet<string>;
  /** 非表示にする entity 種類 */
  hiddenEntities?: ReadonlySet<string>;
}

/**
 * SolidGroup[] → シーン階層（Group 単位: support）。
 * 各 support は transform の行列で 1 回配置し、配下メッシュはローカル座標のまま。
 * 重複シーン・ノードを作らない（1 SolidNode = 1 Mesh）。
 */
export function buildScene(
  groups: readonly SolidGroup[],
  options: SceneBuildOptions = {},
): { root: THREE.Group; meshIndex: Map<string, THREE.Mesh> } {
  const root = new THREE.Group();
  root.name = "SubstructureScene";
  const meshIndex = new Map<string, THREE.Mesh>();

  for (const group of groups) {
    const supportGroup = new THREE.Group();
    supportGroup.name = group.supportId;
    supportGroup.userData.supportId = group.supportId;
    supportGroup.matrixAutoUpdate = false;
    supportGroup.matrix.copy(transformToMatrix4(group.transform));
    supportGroup.updateMatrixWorld(true);

    if (options.hiddenSupportIds?.has(group.supportId)) {
      supportGroup.visible = false;
    }

    const selected =
      options.selectedSupportId === group.supportId ||
      options.selectedSupportId === undefined;

    for (const node of group.solids) {
      if (options.hiddenEntities?.has(node.entity)) {
        continue;
      }
      const { mesh } = solidToMesh(node, selected);
      mesh.userData.supportId = group.supportId;
      supportGroup.add(mesh);
      meshIndex.set(node.id, mesh);
    }
    root.add(supportGroup);
  }

  root.updateMatrixWorld(true);
  return { root, meshIndex };
}

/** 全ソリッドの表示座標バウンディングボックス（Fit All 用）。 */
export function computeSceneBounds(
  groups: readonly SolidGroup[],
): THREE.Box3 {
  const box = new THREE.Box3();
  for (const group of groups) {
    const m = transformToMatrix4(group.transform);
    for (const node of group.solids) {
      const geometry =
        node.kind === "cylinder" ? cylinderGeometry(node) : boxGeometry(node);
      if (!geometry.boundingBox) geometry.computeBoundingBox();
      const local = geometry.boundingBox!.clone();
      const world = local.applyMatrix4(m);
      box.union(world);
    }
  }
  if (box.isEmpty()) {
    box.makeEmpty();
  }
  return box;
}

/** 選択 support のみのバウンディングボックス（Fit Selection 用）。 */
export function computeSelectionBounds(
  groups: readonly SolidGroup[],
  supportId: string,
): THREE.Box3 {
  const subset = groups.filter((g) => g.supportId === supportId);
  return computeSceneBounds(subset);
}
