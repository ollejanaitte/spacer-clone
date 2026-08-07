// Phase C1 (I04) 2D Plan Projection — 下部工 Model → LINER 平面図用 2D 中間表現
// LINER renderer に橋台・橋脚・杭固有ロジックを埋め込まないため、
// ここで SolidGroup (3D) を汎用2Dプリミティブへ変換する。
// 投影: 上から見下ろし (−z)。box → footprint polygon、cylinder → circle。
// 世界座標は P02 の x-longitudinal / y-transverse 平面（skew は transform に反映済）。

import {
  type SolidGroup,
  type SolidTransform,
  type SolidNode,
} from "./geometryBase";

export type PlanPrimitiveType = "polygon" | "circle" | "line" | "text" | "center";

export interface Vec2 {
  x: number;
  y: number;
}

/** LINER 描画用 2D プリミティブ。sourceObjectId で選択同期を可能にする。 */
export interface PlanPrimitive {
  type: PlanPrimitiveType;
  supportId: string;
  sourceObjectId: string;
  entity: string;
  material?: string;
  geometry:
    | { polygon: Vec2[] }
    | { circle: { center: Vec2; radius: number } }
    | { line: { a: Vec2; b: Vec2 } }
    | { text: { position: Vec2; content: string } }
    | { center: { position: Vec2 } };
}

export interface PlanProjection {
  supportId: string;
  supportCenter: Vec2;
  skewRad: number;
  primitives: PlanPrimitive[];
  labels: { id: string; label: string; position: Vec2 }[];
}

/** ローカル座標 → 世界 2D（平面投影、z 無視）。 */
function local2d(local: { x: number; y: number; z?: number }, transform: SolidTransform): Vec2 {
  return {
    x:
      transform.origin.x +
      transform.xAxis.x * local.x +
      transform.yAxis.x * local.y,
    y:
      transform.origin.y +
      transform.xAxis.y * local.x +
      transform.yAxis.y * local.y,
  };
}

/** SolidNode → 2D プリミティブ（box → footprint polygon, cylinder → circle）。 */
export function nodeToPlanPrimitive(
  supportId: string,
  node: SolidNode,
  transform: SolidTransform,
): PlanPrimitive {
  const base = {
    supportId,
    sourceObjectId: node.id,
    entity: node.entity,
    material: node.material,
  };

  if (node.kind === "cylinder") {
    const center = local2d(node.localCenter, transform);
    const radius = Math.max(node.localSize.x, node.localSize.y) / 2;
    return { ...base, type: "circle", geometry: { circle: { center, radius } } };
  }

  const hx = node.localSize.x / 2;
  const hy = node.localSize.y / 2;
  const corners: Array<{ x: number; y: number; z?: number }> = [
    { x: node.localCenter.x - hx, y: node.localCenter.y - hy },
    { x: node.localCenter.x + hx, y: node.localCenter.y - hy },
    { x: node.localCenter.x + hx, y: node.localCenter.y + hy },
    { x: node.localCenter.x - hx, y: node.localCenter.y + hy },
  ];
  return {
    ...base,
    type: "polygon",
    geometry: { polygon: corners.map((c) => local2d(c, transform)) },
  };
}

/** 支持中央（世界 2D）。 */
function supportCenter(transform: SolidTransform): Vec2 {
  return { x: transform.origin.x, y: transform.origin.y };
}

/** 1 支持のソリッド集合 → 2D プラン投影。 */
export function projectSupport(group: SolidGroup, label?: string): PlanProjection {
  const primitives: PlanPrimitive[] = group.solids.map((n) =>
    nodeToPlanPrimitive(group.supportId, n, group.transform),
  );
  const center = supportCenter(group.transform);

  primitives.push({
    type: "center",
    supportId: group.supportId,
    sourceObjectId: `${group.supportId}-CENTER`,
    entity: "support",
    geometry: { center: { position: center } },
  });
  primitives.push({
    type: "line",
    supportId: group.supportId,
    sourceObjectId: `${group.supportId}-SKEWDIR`,
    entity: "support",
    geometry: {
      line: {
        a: center,
        b: {
          x: center.x + group.transform.xAxis.x,
          y: center.y + group.transform.xAxis.y,
        },
      },
    },
  });
  primitives.push({
    type: "text",
    supportId: group.supportId,
    sourceObjectId: `${group.supportId}-LABEL`,
    entity: "support",
    geometry: { text: { position: center, content: label ?? group.supportId } },
  });

  return {
    supportId: group.supportId,
    supportCenter: center,
    skewRad: group.transform.skewRad,
    primitives,
    labels: [
      {
        id: group.supportId,
        label: label ?? group.supportId,
        position: center,
      },
    ],
  };
}

/** 複数の支持ソリッド集合を投影。 */
export function projectAll(groups: readonly SolidGroup[]): PlanProjection[] {
  return groups.map((g) => projectSupport(g));
}