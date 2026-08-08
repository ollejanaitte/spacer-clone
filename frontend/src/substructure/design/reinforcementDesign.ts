// Phase C1 (M3-04) 配筋設計 フレームワーク（データモデル・HOLD）
// 配筋データモデル（部材位置・鉄筋径・本数・間隔・かぶり）と
// 必要鉄筋量要求の枠組みを提供する。
// 配筋ルール・限界値は根拠未 ADOPTED のため HOLD_NOT_AVAILABLE。
// 必要鉄筋量・間隔・かぶりを推測しない（AUTO-DETERMINATION BANNED）。

import type { Support } from "../model";

export type ReinforcementLocation =
  | "pier_column"
  | "pier_cap"
  | "abutment_backwall"
  | "abutment_wing"
  | "footing"
  | "pile";

export interface ReinforcementArrangement {
  location: ReinforcementLocation;
  /** 鉄筋径（mm）。未決定なら null。 */
  barDiameter: number | null;
  /** 本数。未決定なら null。 */
  barCount: number | null;
  /** 間隔（mm）。未決定なら null。 */
  spacing: number | null;
  /** かぶり（mm）。未決定なら null。 */
  cover: number | null;
  /** 配筋ルール・限界値が ADOPTED になるまで計算しない。 */
  status: "hold_not_available";
}

export interface ReinforcementRequirement {
  supportId: string;
  status: "hold_not_available";
  reason: string;
  requiredEvidence: { sourceDocId: string; sourceLocator: string; decisionId: string };
  /** 適用可能な配筋位置の候補（データ構造のみ）。 */
  locations: ReinforcementLocation[];
}

const REBAR_EVIDENCE = {
  sourceDocId: "道路橋示方書・同解説 Ⅲ コンクリート部材・Ⅳ 下部構造編",
  sourceLocator: "rebar requirement clause TBD",
  decisionId: "未発行",
};

/** 支点の形式から適用可能な配筋位置候補を返す（構造のみ・数値なし）。 */
export function candidateReinforcementLocations(
  support: Support,
): ReinforcementLocation[] {
  const locations: ReinforcementLocation[] = [];
  if (support.pier) {
    locations.push("pier_column");
    locations.push("pier_cap");
    locations.push("footing");
  }
  if (support.abutment) {
    locations.push("abutment_backwall");
    locations.push("abutment_wing");
    locations.push("footing");
  }
  if (support.pier?.pileGroup || support.abutment?.pileGroup) {
    locations.push("pile");
  }
  return locations;
}

/** 配筋設計要求（根拠未 ADOPTED → HOLD）。 */
export function buildReinforcementRequirement(support: Support): ReinforcementRequirement {
  return {
    supportId: support.supportId,
    status: "hold_not_available",
    reason: "配筋ルール・限界値（必要鉄筋量・間隔・かぶり）が未 ADOPTED",
    requiredEvidence: REBAR_EVIDENCE,
    locations: candidateReinforcementLocations(support),
  };
}

/** 配筋配置モデルのプレースホルダ（数値なし・構造のみ）。 */
export function buildReinforcementArrangements(
  support: Support,
): ReinforcementArrangement[] {
  return candidateReinforcementLocations(support).map((location) => ({
    location,
    barDiameter: null,
    barCount: null,
    spacing: null,
    cover: null,
    status: "hold_not_available" as const,
  }));
}
