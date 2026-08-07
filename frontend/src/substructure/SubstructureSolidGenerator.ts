// Phase C1 (I03) 下部工 3D ソリッドジオメトリ生成
// UI非依存（純粋なソリッドパラメータ記述）。R3F/THREE 生成は Milestone 2 で実施。
// 共有ベース（SolidNode/SolidTransform/partId/GeometryError）は geometryBase.ts に集約。

import type { Support, SupportPlacementSnapshot, AbutmentData, Footing, PileGroup } from "./model";
import { buildPierSolids } from "./PierSolidGenerator";
import { buildFoundationSolids } from "./FoundationSolidGenerator";
import {
  type SolidNode,
  type SolidGroup,
  type SolidTransform,
  type GeometryDiagnostic,
  type WorldSolid,
  type SolidKind,
  partId,
  GeometryError,
  transformFromSnapshot,
  localToWorld,
  toWorldSolid,
} from "./geometryBase";

export {
  type SolidNode,
  type SolidGroup,
  type SolidTransform,
  type GeometryDiagnostic,
  type WorldSolid,
  type SolidKind,
  partId,
  GeometryError,
  transformFromSnapshot,
  localToWorld,
  toWorldSolid,
} from "./geometryBase";

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
 */
export function buildAbutmentSolids(
  support: { supportId: string },
  abutment: AbutmentData,
  transform: SolidTransform,
): SolidGroup {
  const diagnostics: GeometryDiagnostic[] = [];
  const solids: SolidNode[] = [];
  const supportId = support.supportId;

  const bw = abutment.backwall;
  if (bw) {
    validateDimensions("backwall.height", bw.height, diagnostics, supportId);
    validateDimensions("backwall.thickness", bw.thickness, diagnostics, supportId);
    validateDimensions("backwall.width", bw.width, diagnostics, supportId);
    solids.push({
      id: partId(supportId, "BACKWALL"),
      kind: "box",
      localCenter: { x: 0, y: 0, z: bw.height / 2 },
      localSize: { x: bw.thickness, y: bw.width, z: bw.height },
      entity: "abutment",
      material: "abutment.concrete",
    });
  }

  const wings: Array<[typeof abutment.wingWallL, -1 | 1, string]> = [
    [abutment.wingWallL, -1, "WING-L"],
    [abutment.wingWallR, 1, "WING-R"],
  ];
  for (const [wing, sign, tag] of wings) {
    if (!wing) continue;
    validateDimensions(`${tag}.length`, wing.length, diagnostics, supportId);
    validateDimensions(`${tag}.height`, wing.height, diagnostics, supportId);
    validateDimensions(`${tag}.thickness`, wing.thickness, diagnostics, supportId);
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

  if (diagnostics.length > 0) {
    throw new GeometryError(diagnostics);
  }

  return { supportId, solids, transform };
}

/** 1本の Support 全体のソリッドを生成する。 */
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
  const group: SolidGroup = { supportId: support.supportId, solids: [], transform };
  if (support.supportType === "abutment" && support.abutment) {
    group.solids.push(...buildAbutmentSolids(support, support.abutment, transform).solids);
  }
  if (support.supportType === "pier" && support.pier) {
    group.solids.push(...buildPierSolids(support, support.pier, transform).solids);
  }
  // I03C: 基礎（フーチング + 杭）。abutment / pier いずれも footing+pileGroup を持つ。
  const sub = (support.supportType === "abutment" ? support.abutment : support.pier) as
    | { footing?: Footing; pileGroup?: PileGroup | null }
    | undefined;
  if (sub?.footing) {
    group.solids.push(...buildFoundationSolids(support.supportId, sub.footing, sub.pileGroup, transform).solids);
  }
  return group;
}

/** 複数支点のソリッドを一括生成。 */
export function buildAllSupportSolids(
  supports: readonly Support[],
  snapshots: Map<string, SupportPlacementSnapshot>,
): SolidGroup[] {
  return supports.map((s) => buildSupportSolids(s, snapshots));
}