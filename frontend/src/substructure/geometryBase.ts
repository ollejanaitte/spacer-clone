// Phase C1 (I03) 下部工 3D ソリッド — 共有ベース型・ヘルパー
// I03A/I03B/I03C が参照する、UI非依存の共通ジオメトリ基盤。
// 循環 import を防ぐため、SolidNode / GeometryError / partId / transform 基盤をここに集約する。

import type { Vec3, SupportPlacementSnapshot } from "./model";

/** ソリッド種別。Milestone 2 の描画層が形状プリミティブへ変換する。 */
export type SolidKind = "box" | "cylinder";

export interface SolidNode {
  id: string;
  kind: SolidKind;
  /** ローカル中心（支持点基準、x-longitudinal / y-transverse / z-up） */
  localCenter: Vec3;
  /** ローカル寸法 */
  localSize: Vec3;
  entity:
    | "abutment"
    | "pier"
    | "footing"
    | "pile"
    | "bearingSeat"
    | "bearing"
    | "superstructure";
  material: string;
}

export interface SolidTransform {
  origin: Vec3;
  xAxis: Vec3;
  yAxis: Vec3;
  zAxis: Vec3;
  skewRad: number;
}

/** 配置後のワールド空間ソリッド */
export interface WorldSolid {
  node: SolidNode;
  transform: SolidTransform;
}

export interface SolidGroup {
  supportId: string;
  solids: SolidNode[];
  transform: SolidTransform;
}

export interface GeometryDiagnostic {
  code: string;
  message: string;
  supportId?: string;
}

export class GeometryError extends Error {
  diagnostics: GeometryDiagnostic[];
  constructor(diagnostics: GeometryDiagnostic[]) {
    super(diagnostics.map((d) => d.message).join("; "));
    this.name = "GeometryError";
    this.diagnostics = diagnostics;
  }
}

/** P02 4.2: 支持点ローカル基底。 */
export function transformFromSnapshot(snapshot: SupportPlacementSnapshot): SolidTransform {
  return {
    origin: snapshot.position,
    xAxis: snapshot.tangent,
    yAxis: snapshot.transverse,
    zAxis: snapshot.vertical,
    skewRad: snapshot.skewRad,
  };
}

/** ローカル中心 → ワールド座標。world = origin + xAxis*lx + yAxis*ly + zAxis*lz */
export function localToWorld(
  local: Vec3,
  transform: SolidTransform,
): Vec3 {
  return {
    x:
      transform.origin.x +
      transform.xAxis.x * local.x +
      transform.yAxis.x * local.y +
      transform.zAxis.x * local.z,
    y:
      transform.origin.y +
      transform.xAxis.y * local.x +
      transform.yAxis.y * local.y +
      transform.zAxis.y * local.z,
    z:
      transform.origin.z +
      transform.xAxis.z * local.z +
      transform.yAxis.z * local.y +
      transform.zAxis.z * local.z,
  };
}

export function toWorldSolid(node: SolidNode, transform: SolidTransform): WorldSolid {
  return { node, transform };
}

/** P02 9.1: 部材ID 命名ヘルパー。 */
export function partId(supportId: string, part: string, index?: number): string {
  return index === undefined
    ? `${supportId}-${part}`
    : `${supportId}-${part}-${String(index).padStart(2, "0")}`;
}