// Phase C1 (M3-02/M3-03) 設計・接続の共有データ型
// 上部工 support-interface から受け取る反力・支承データの契約。
// 数値は「入力データ」であり、設計照査値ではない（M3-00 Freeze）。

import type { Vec3 } from "../model";

export type ReactionCaseKind =
  | "permanent"
  | "liveLoad"
  | "braking"
  | "wind"
  | "seismicLevel1"
  | "seismicLevel2";

export interface ReactionCaseData {
  caseId: string;
  caseKind: ReactionCaseKind;
  force?: Vec3;
  moment?: Vec3;
  displacement?: Vec3;
  rotation?: Vec3;
}

export interface SupportReactions {
  supportId: string;
  cases: ReactionCaseData[];
  /** 参照元（source + revision）。traceability 用。 */
  source?: string;
  sourceRevision?: string;
}

export interface BearingSeatInput {
  bearingId: string;
  bearingPosition: Vec3;
  bearingDimensions?: { w: number; d: number; h: number };
  bearingHeight?: number;
}

export interface SuperstructureInput {
  projectId?: string;
  bridgeId?: string;
  supportId: string;
  supportType?: "pier" | "abutment";
  bearingSeats?: BearingSeatInput[];
  reactionCases?: ReactionCaseData[];
  girderBottomElevation?: number;
  deckElevation?: number;
  sourceApplication?: string;
  sourceVersion?: string;
  sourceRevision?: string;
}

/** 反力入力のサマリ（UI・trace 表示用）。 */
export function summarizeReactions(
  cases: readonly ReactionCaseData[],
): Array<{ caseId: string; caseKind: string; hasForce: boolean; hasMoment: boolean }> {
  return cases.map((c) => ({
    caseId: c.caseId,
    caseKind: c.caseKind,
    hasForce: Boolean(c.force),
    hasMoment: Boolean(c.moment),
  }));
}
