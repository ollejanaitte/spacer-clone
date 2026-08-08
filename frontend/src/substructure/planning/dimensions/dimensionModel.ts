// Phase C1 (M2-06) 寸法表示モデル（純粋ロジック）
// dimension 値は別計算で再定義せず、M1 Geometry（SolidNode.localSize / SolidGroup）の
// 正本値から生成する。P03 Freeze の4モード: off / main / selected / all。

import type { SolidGroup, SolidNode, SolidTransform } from "../../geometryBase";

export type DimensionMode = "off" | "main" | "selected" | "all";

/** ローカル座標 → ワールド（2D: x/y 平面投影）。 */
function localToWorld2D(local: { x: number; y: number }, t: SolidTransform) {
  return {
    x: t.origin.x + t.xAxis.x * local.x + t.yAxis.x * local.y,
    y: t.origin.y + t.xAxis.y * local.x + t.yAxis.y * local.y,
  };
}

/** ローカル座標 → ワールド3D。 */
function localToWorld3D(local: { x: number; y: number; z: number }, t: SolidTransform) {
  return {
    x: t.origin.x + t.xAxis.x * local.x + t.yAxis.x * local.y + t.zAxis.x * local.z,
    y: t.origin.y + t.xAxis.y * local.x + t.yAxis.y * local.y + t.zAxis.y * local.z,
    z: t.origin.z + t.xAxis.z * local.x + t.yAxis.z * local.y + t.zAxis.z * local.z,
  };
}

export interface DimensionLine2D {
  id: string;
  supportId: string;
  label: string;
  /** 寸法線の端点（表示座標 2D） */
  a: { x: number; y: number };
  b: { x: number; y: number };
  /** 寸法線オフセット（延長線方向） */
  offset: number;
  kind: "width" | "length" | "diameter" | "spacing" | "edge" | "height" | "thickness";
}

export interface DimensionMarker3D {
  id: string;
  supportId: string;
  label: string;
  /** 表示座標（Y-up）でのラベル位置 */
  position: { x: number; y: number; z: number };
  kind: DimensionLine2D["kind"];
}

export interface DimensionSet {
  lines2D: DimensionLine2D[];
  markers3D: DimensionMarker3D[];
}

const fmt = (v: number) => `${v.toFixed(2)} m`;

/** SolidNode から種類別ラベルを生成。 */
export function nodeDimensionLabel(node: SolidNode): { kind: DimensionLine2D["kind"]; label: string } | null {
  switch (node.entity) {
    case "footing":
      return { kind: "length", label: `${fmt(node.localSize.x)} × ${fmt(node.localSize.y)}` };
    case "pile":
      return { kind: "diameter", label: `φ${fmt(Math.max(node.localSize.x, node.localSize.y))}` };
    case "pier":
    case "abutment":
      return { kind: "height", label: fmt(node.localSize.z) };
    default:
      return null;
  }
}

/**
 * SolidGroup から寸法セットを生成。
 * @param groups      3D ジオメトリ（正本）
 * @param mode        寸法モード
 * @param selectedId  選択 support（mode=selected のとき対象）
 * @param supportCenterFn 2D 寸法線の基準（support 中心）
 */
export function buildDimensions(
  groups: readonly SolidGroup[],
  mode: DimensionMode,
  selectedId?: string | null,
): DimensionSet {
  const lines2D: DimensionLine2D[] = [];
  const markers3D: DimensionMarker3D[] = [];

  if (mode === "off") return { lines2D, markers3D };

  for (const g of groups) {
    if (mode === "selected" && selectedId && g.supportId !== selectedId) continue;
    if (mode === "main" && g.supportId !== selectedId && selectedId) continue;

    for (const node of g.solids) {
      const meta = nodeDimensionLabel(node);
      if (!meta) continue;
      // 2D 寸法線: ワールド座標（group transform で変換）
      const aWorld = localToWorld2D(
        { x: node.localCenter.x - node.localSize.x / 2, y: node.localCenter.y },
        g.transform,
      );
      const bWorld = localToWorld2D(
        { x: node.localCenter.x + node.localSize.x / 2, y: node.localCenter.y },
        g.transform,
      );
      lines2D.push({
        id: `D2-${node.id}`,
        supportId: g.supportId,
        label: meta.label,
        kind: meta.kind,
        a: aWorld,
        b: bWorld,
        offset: node.localSize.y / 2 + 2,
      });
      const center3D = localToWorld3D(node.localCenter, g.transform);
      markers3D.push({
        id: `D3-${node.id}`,
        supportId: g.supportId,
        label: meta.label,
        kind: meta.kind,
        position: {
          x: center3D.x,
          y: center3D.y,
          z: center3D.z + node.localSize.z / 2 + 0.5,
        },
      });
    }
  }

  return { lines2D, markers3D };
}

/** 選択 support のソリッドだけに限定した寸法セット（選択部材モード用）。 */
export function buildSelectedDimensions(
  groups: readonly SolidGroup[],
  selectedId: string,
): DimensionSet {
  return buildDimensions(groups, "selected", selectedId);
}
