// Phase C1 (M3-04) 耐震設計 フレームワーク（データ・入力境界のみ）
// 耐震入力は上部工 support-interface の reactionCases（seismicLevel1/2）を
// 入力データとして分離保持する。照査は根拠未 ADOPTED のため HOLD_NOT_AVAILABLE。
// 応答スペクトル・係数・設計法は推測しない（AUTO-DETERMINATION BANNED）。

import type { ReactionCaseData } from "./designTypes";
import type { Support } from "../model";

export type SeismicLevel = "level1" | "level2";

export interface SeismicDesignInput {
  supportId: string;
  level: SeismicLevel;
  /** 入力データとしての地震時反力（上部工由来）。照査値ではない。 */
  reactions: ReactionCaseData[];
  /** 参照元。 */
  source?: string;
}

export interface SeismicCheckResult {
  checkId: string;
  checkName: string;
  status: "hold_not_available";
  level: SeismicLevel;
  reason: string;
  requiredEvidence: { sourceDocId: string; sourceLocator: string; decisionId: string };
}

const SEISMIC_EVIDENCE: {
  [L in SeismicLevel]: { sourceDocId: string; sourceLocator: string };
} = {
  level1: {
    sourceDocId: "道路橋示方書・同解説 Ⅴ 耐震設計編",
    sourceLocator: "seismic level1 clause TBD",
  },
  level2: {
    sourceDocId: "道路橋示方書・同解説 Ⅴ 耐震設計編",
    sourceLocator: "seismic level2 clause TBD",
  },
};

/** reactionCases から地震時反力ケースを抽出（入力データ境界）。 */
export function extractSeismicCases(
  cases: readonly ReactionCaseData[],
  level: SeismicLevel,
): ReactionCaseData[] {
  const kind = level === "level1" ? "seismicLevel1" : "seismicLevel2";
  return cases.filter((c) => c.caseKind === kind);
}

/** 耐震照査の状態（根拠未 ADOPTED → HOLD）。 */
export function buildSeismicCheck(
  support: Support,
  level: SeismicLevel,
): SeismicCheckResult {
  const evidence = SEISMIC_EVIDENCE[level];
  return {
    checkId: level === "level1" ? "M3-CHK-SEISMIC-L1" : "M3-CHK-SEISMIC-L2",
    checkName: level === "level1" ? "耐震-レベル1照査" : "耐震-レベル2照査",
    status: "hold_not_available",
    level,
    reason: "耐震設計法・係数が未 ADOPTED（decision_id 未発行）",
    requiredEvidence: { ...evidence, decisionId: "未発行" },
  };
}

/** 耐震入力サマリ（UI・trace 表示用）。 */
export function summarizeSeismicInput(
  input: SeismicDesignInput,
): { supportId: string; level: string; caseCount: number; hasForce: boolean } {
  return {
    supportId: input.supportId,
    level: input.level,
    caseCount: input.reactions.length,
    hasForce: input.reactions.some((c) => Boolean(c.force)),
  };
}
