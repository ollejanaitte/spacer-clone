// Phase C1 (M3-03) 下部工 設計計算エンジン（フレームワーク）
// M3-00 Freeze: 入力 → 反力/荷重（入力データ）→ 概算数量（幾何）→ 照査一覧 → DesignResult。
// 数値照査（安定・部材・基礎・杭・耐震・配筋）は根拠未 ADOPTED のため
// HOLD_NOT_AVAILABLE を返す（AUTO-DETERMINATION BANNED）。
// NaN/Infinity は禁止。traceability を保持する。

import type { Support } from "../model";
import type { SupportReactions, ReactionCaseData } from "./designTypes";
import { computeSupportQuantity, type GeometricQuantity } from "./geometricQuantity";

export type DesignCheckStatus = "ok" | "ng" | "hold_not_available";

export interface RequiredEvidence {
  sourceDocId: string;
  sourceLocator: string;
  decisionId: string;
}

export interface DesignCheckResult {
  checkId: string;
  checkName: string;
  status: DesignCheckStatus;
  /** HOLD 時の理由 / NG 時の根拠 */
  reason: string;
  /** HOLD 時に必要な根拠（未 ADOPTED） */
  requiredEvidence?: RequiredEvidence;
  /** 計算済みの中間値（trace） */
  intermediates?: Array<{ key: string; value: number; unit?: string }>;
}

export interface DesignTraceInput {
  supportId: string;
  supportType: string;
  station: number | null;
  skewDeg: number | null;
  pierFormType?: string;
  abutmentFormType?: string;
  footing?: { length: number; width: number; thickness: number };
  pileCount?: number | null;
  pileDiameter?: number | null;
  pileLength?: number | null;
}

export interface DesignResult {
  projectId?: string;
  supportId: string;
  supportType: string;
  /** 全体状態: ok / ng / hold_not_available */
  status: DesignCheckStatus;
  checks: DesignCheckResult[];
  inputTrace: DesignTraceInput;
  reactions: ReactionCaseData[];
  geometric: GeometricQuantity;
  createdAt: string;
  diagnostics: string[];
}

export interface DesignRunInput {
  projectId?: string;
  support: Support;
  reactions?: SupportReactions | null;
}

/** 全体状態の決定（1つでも NG なら NG、HOLD があれば HOLD、なければ OK）。 */
export function aggregateStatus(checks: readonly DesignCheckResult[]): DesignCheckStatus {
  if (checks.some((c) => c.status === "ng")) return "ng";
  if (checks.some((c) => c.status === "hold_not_available")) return "hold_not_available";
  return "ok";
}

function degFromRad(rad: number | null | undefined): number | null {
  if (typeof rad !== "number" || !Number.isFinite(rad)) return null;
  return (rad * 180) / Math.PI;
}

function buildInputTrace(support: Support): DesignTraceInput {
  const sub = support.pier ?? support.abutment;
  const pg = support.pier?.pileGroup ?? support.abutment?.pileGroup;
  return {
    supportId: support.supportId,
    supportType: support.supportType,
    station: support.placement.station ?? null,
    skewDeg: degFromRad(support.skewRad),
    pierFormType: support.pier?.formType,
    abutmentFormType: support.abutment?.formType,
    footing: sub
      ? {
          length: sub.footing.length,
          width: sub.footing.width,
          thickness: sub.footing.thickness,
        }
      : undefined,
    pileCount: pg?.pileCount ?? null,
    pileDiameter: pg?.diameter ?? null,
    pileLength: pg?.length ?? null,
  };
}

function hold(
  checkId: string,
  checkName: string,
  reason: string,
  requiredEvidence: RequiredEvidence,
): DesignCheckResult {
  return { checkId, checkName, status: "hold_not_available", reason, requiredEvidence };
}

const EVIDENCE = (doc: string, locator: string): RequiredEvidence => ({
  sourceDocId: doc,
  sourceLocator: locator,
  decisionId: "未発行",
});

/** 根拠未 ADOPTED の照査一覧（PHASE_C1_M3_DESIGN_BASIS_REGISTER.csv と同期）。 */
export function buildHoldChecks(support: Support): DesignCheckResult[] {
  const rbs = "道路橋示方書・同解説 Ⅳ 下部構造編";
  const rc = "道路橋示方書・同解説 Ⅲ コンクリート部材・Ⅳ 下部構造編";
  const rs = "道路橋示方書・同解説 Ⅴ 耐震設計編";
  const checks: DesignCheckResult[] = [];

  checks.push(
    hold("M3-CHK-STABILITY-OVERTURNING", "安定照査-転倒", "部分係数・許容値が未 ADOPTED（DS-04/05）", EVIDENCE(rbs, "partial factor / clause TBD")),
    hold("M3-CHK-STABILITY-SLIDING", "安定照査-滑動", "部分係数・許容値が未 ADOPTED（DS-04/05）", EVIDENCE(rbs, "partial factor / clause TBD")),
    hold("M3-CHK-STABILITY-BEARING", "安定照査-支持力", "地盤定数・許容値が未 ADOPTED", EVIDENCE(rbs, "ground bearing clause TBD")),
    hold("M3-CHK-STABILITY-FLOAT", "安定照査-浮上", "浮上照査係数が未 ADOPTED", EVIDENCE(rbs, "flotation clause TBD")),
    hold("M3-CHK-MEMBER-FLEXURE", "部材-曲げ照査", "照査式・材料強度・係数が未 ADOPTED（DS-05）", EVIDENCE(rc, "flexural check clause TBD")),
    hold("M3-CHK-MEMBER-SHEAR", "部材-せん断照査", "照査式・材料強度・係数が未 ADOPTED（DS-05）", EVIDENCE(rc, "shear check clause TBD")),
  );

  if (support.supportType === "pier") {
    checks.push(
      hold("M3-CHK-MEMBER-PIER-AXIAL", "橋脚-軸力照査", "照査式・係数が未 ADOPTED（DS-05）", EVIDENCE(rc, "axial check clause TBD")),
    );
  }
  if (support.abutment) {
    checks.push(
      hold("M3-CHK-MEMBER-ABUTMENT", "橋台-部材照査", "照査式・係数が未 ADOPTED（DS-05）", EVIDENCE(rc, "member check clause TBD")),
    );
  }

  checks.push(
    hold("M3-CHK-FOUNDATION-SOIL", "基礎-地盤支持力照査", "地盤定数・許容値が未 ADOPTED", EVIDENCE(rbs, "ground bearing clause TBD")),
  );

  if (support.pier?.pileGroup || support.abutment?.pileGroup) {
    checks.push(
      hold("M3-CHK-PILE-STRUCTURE", "杭-杭体照査", "杭支持力式・係数が未 ADOPTED", EVIDENCE(rbs, "pile capacity clause TBD")),
      hold("M3-CHK-PILE-GROUP", "杭-群杭照査", "群杭効率・係数が未 ADOPTED", EVIDENCE(rbs, "group pile clause TBD")),
    );
  }

  checks.push(
    hold("M3-CHK-SEISMIC-L1", "耐震-レベル1照査", "耐震設計法・係数が未 ADOPTED", EVIDENCE(rs, "seismic level1 clause TBD")),
    hold("M3-CHK-SEISMIC-L2", "耐震-レベル2照査", "耐震設計法・係数が未 ADOPTED", EVIDENCE(rs, "seismic level2 clause TBD")),
    hold("M3-CHK-REBAR-REQUIRED", "配筋-必要鉄筋量", "配筋ルール・限界値が未 ADOPTED", EVIDENCE(rc, "rebar requirement clause TBD")),
    hold("M3-CHK-REBAR-SPACING", "配筋-間隔・かぶり", "配筋ルール・限界値が未 ADOPTED", EVIDENCE(rc, "spacing/cover clause TBD")),
  );

  return checks;
}

/**
 * 設計計算を実行する（フレームワーク）。
 * 概算数量（幾何）は実計算。数値照査は全て HOLD_NOT_AVAILABLE を返す。
 * NaN/Infinity は診断に記録し fail-closed とする。
 */
export function runDesign(input: DesignRunInput): DesignResult {
  const diagnostics: string[] = [];
  const support = input.support;

  const geometric = {
    ...computeSupportQuantity(support),
    units: "m³ / m",
    note: "幾何学的概算値。実務数量・設計照査値ではない。",
  } as GeometricQuantity;
  const values = [
    geometric.columnVolume,
    geometric.capVolume,
    geometric.beamVolume,
    geometric.backwallVolume,
    geometric.wingVolume,
    geometric.footingVolume,
    geometric.pileVolume,
    geometric.totalPileLength,
  ];
  const nonFinite = values.filter((v) => !Number.isFinite(v));
  if (nonFinite.length > 0) {
    diagnostics.push("概算数量に NaN/Infinity が検出されました（入力寸法を確認）");
  }

  const checks = buildHoldChecks(support);
  const status = aggregateStatus(checks);
  const reactions = input.reactions?.cases ?? [];

  return {
    projectId: input.projectId,
    supportId: support.supportId,
    supportType: support.supportType,
    status,
    checks,
    inputTrace: buildInputTrace(support),
    reactions,
    geometric,
    createdAt: new Date().toISOString(),
    diagnostics,
  };
}
