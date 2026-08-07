// Phase C1 (I03) 下部工 3D ソリッドジオメトリ生成
// UI非依存（純粋なソリッドパラメータ記述）。R3F/THREE 生成は Milestone 2 で実施。
// P02 配置（SupportPlacementSnapshot: position/tangent/transverse/vertical）を
// ローカル座標 → ワールド座標に変換する。

import type { Vec3, Support, SupportPlacementSnapshot, AbutmentData, WingWall } from "./model";

/** ソリッド種別。Milestone 2 の描画層が形状プリミティブへ変換する。 */
export type SolidKind = "box" | "cylinder";

export interface SolidNode {
  /** P02 9.1 命名 (例: A1-BACKWALL, A1-WING-L, A1-FOOTING) */
  id: string;
  kind: SolidKind;
  /** ローカル中心（支持点基準、橋軸直線をx、橋軸直角をy、鉛直上をz） */
  localCenter: Vec3;
  /** ローカル寸法 */
  localSize: Vec3;
  entity: "abutment" | "pier" | "footing" | "pile" | "bearingSeat" | "bearing";
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

/** P02 4.2: 支持点ローカル基底（longitudinal=橋軸方向, transverse=橋軸直角, vertical=上）。 */
export function transformFromSnapshot(snapshot: SupportPlacementSnapshot): SolidTransform {
  return {
    origin: snapshot.position,
    xAxis: snapshot.tangent,
    yAxis: snapshot.transverse,
    zAxis: snapshot.vertical,
    skewRad: snapshot.skewRad,
  };
}

/**
 * ローカル中心をワールド座標へ変換。
 * world = origin + xAxis*lx + yAxis*ly + zAxis*lz
 */
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
      transform.xAxis.z * local.x +
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

/** 維持 estado err handling */
function validateDimensions(
  name: string,
  value: number,
  diagnostics: GeometryDiagnostic[],
  supportId: string,
): void {
  if (!Number.isFinite(value) || value <= 0) {
    diagnostics.push({
      code: "INVALID_DIMENSION",
      supportId,
      message: `${name} は 0 より大きい有限値が必要 (got ${value})`,
    });
  }
}

/**
 * 橋台（逆T式 inverted_t / ラーメン式 cantilever_frame）のソリッドを生成。
 * P01: ラーメン式は逆T式と同形状（formType のみ）。背壁・各翼壁・支承座を出力。
 * フーチング・杭は I03C（基礎）で生成するため、ここでは背壁/翼壁/支承のみ。
 */
export function buildAbutmentSolids(
  support: Support,
  abutment: AbutmentData,
  transform: SolidTransform,
): SolidGroup {
  const diagnostics: GeometryDiagnostic[] = [];
  const solids: SolidNode[] = [];
  const supportId = support.supportId;

  const bw = abutment.backwall;
  validateDimensions("backwall.height", bw?.height, diagnostics, supportId);
  validateDimensions("backwall.thickness", bw?.thickness, diagnostics, supportId);
  validateDimensions("backwall.width", bw?.width, diagnostics, supportId);

  // 背壁: 橋軸方向厚さ在x, 橋軸直角幅在y, 高さ在z。基準面 z=0 から中央。
  if (bw) {
    solids.push({
      id: partId(supportId, "BACKWALL"),
      kind: "box",
      localCenter: { x: 0, y: 0, z: bw.height / 2 },
      localSize: { x: bw.thickness, y: bw.width, z: bw.height },
      entity: "abutment",
      material: "abutment.concrete",
    });
  }

  // 翼壁: 左右。橋軸方向長(x), 厚(y), 高(z)。基準線から前方にL.
  const wings: Array<[WingWall | undefined, -1 | 1, string]> = [
    [abutment.wingWallL, -1, "WING-L"],
    [abutment.wingWallR, 1, "WING-R"],
  ];
  for (const [wing, sign, tag] of wings) {
    if (!wing) continue;
    validateDimensions(`${tag}.length`, wing.length, diagnostics, supportId);
    validateDimensions(`${tag}.height`, wing.height, diagnostics, supportId);
    validateDimensions(`${tag}.thickness`, wing.thickness, diagnostics, supportId);
    // 翼壁は背壁の横端から張り出す。ローカル中心: 沿橋軸= wing.length/2, 横= sign*(bw.width/2 + wing.thickness/2)
    solids.push({
      id: partId(supportId, tag),
      kind: "box",
      localCenter: {
        x: bw ? bw.thickness / 2 + wing.length / 2 : wing.length / 2,
        y: sign * (bw.width / 2 + wing.thickness / 2),
        z: wing.height / 2,
      },
      localSize: { x: wing.length, y: wing.thickness, z: wing.height },
      entity: "abutment",
      material: "abutment.wing",
    });
  }

  return { supportId, solids, transform };
}

/**
 * 1本の Support 全体のソリッドを生成する。
 * 現段階（I03A）は橋台のみ。橋脚（I03B）・基礎（I03C）は後続で追加。
 */
export function buildSupportSolids(
  support: Support,
  snapshots: Map<string, SupportPlacementSnapshot>,
): SolidGroup {
  const snapshot = snapshots.get(support.supportId);
  if (snapshot === undefined) {
    throw new GeometryError([
      { code: "NO_SNAPSHOT", supportId: support.supportId, message: `配置スナップショット未定義 (${support.supportId})` },
    ]);
  }
  const transform = transformFromSnapshot(snapshot);
  if (support.supportType === "abutment" && support.abutment) {
    return buildAbutmentSolids(support, support.abutment, transform);
  }
  if (support.supportType === "pier" && support.pier) {
    throw new GeometryError([
      { code: "NOT_IMPLEMENTED", supportId: support.supportId, message: "橋脚ジオメトリは I03B で実装予定" },
    ]);
  }
  return { supportId: support.supportId, solids: [], transform };
}

/** 複数支点のソリッドを一括生成。 */
export function buildAllSupportSolids(
  supports: readonly Support[],
  snapshots: Map<string, SupportPlacementSnapshot>,
): SolidGroup[] {
  return supports.map((s) => buildSupportSolids(s, snapshots));
}