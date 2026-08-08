// Phase C1 (M3-05) 計算書出力（純粋ロジック）
// 入力・基準・計算項目・中間値・判定・結果 を追跡可能な形で出力する。
// 存在しない設計結果を生成しない（HOLD は HOLD として出力）。

import type { DesignResult, DesignCheckResult } from "./designEngine";

export type CalcSheetRow = {
  category: string;
  item: string;
  value: string;
  unit: string;
  note: string;
};

export interface CalculationSheet {
  title: string;
  rows: CalcSheetRow[];
}

function num(v: number, digits = 3): string {
  if (!Number.isFinite(v)) return "N/A";
  return v.toFixed(digits);
}

/** 単一支点の計算書シートを組み立てる。 */
export function buildCalculationSheet(result: DesignResult): CalculationSheet {
  const rows: CalcSheetRow[] = [];
  const t = result.inputTrace;

  rows.push(
    { category: "入力", item: "supportId", value: t.supportId, unit: "", note: "安定ID" },
    { category: "入力", item: "supportType", value: t.supportType, unit: "", note: "" },
    { category: "入力", item: "station", value: t.station === null ? "—" : num(t.station), unit: "m", note: "配置測点" },
    { category: "入力", item: "skew", value: t.skewDeg === null ? "—" : num(t.skewDeg), unit: "deg", note: "" },
    { category: "入力", item: "footing.length", value: t.footing ? num(t.footing.length) : "—", unit: "m", note: "フーチング" },
    { category: "入力", item: "footing.width", value: t.footing ? num(t.footing.width) : "—", unit: "m", note: "フーチング" },
    { category: "入力", item: "pileCount", value: t.pileCount == null ? "—" : String(t.pileCount), unit: "本", note: "" },
    { category: "入力", item: "pileDiameter", value: t.pileDiameter == null ? "—" : num(t.pileDiameter), unit: "m", note: "" },
  );

  for (const r of result.reactions) {
    rows.push({
      category: "反力(入力データ)",
      item: r.caseId,
      value: r.force
        ? `(${num(r.force.x)}, ${num(r.force.y)}, ${num(r.force.z)})`
        : r.moment
          ? `M(${num(r.moment.x)}, ${num(r.moment.y)}, ${num(r.moment.z)})`
          : "—",
      unit: "kN / kN·m",
      note: `kind=${r.caseKind}（設計照査値ではない）`,
    });
  }

  rows.push(
    { category: "概算数量(幾何)", item: "totalConcreteVolume", value: num(result.geometric.totalConcreteVolume), unit: "m³", note: result.geometric.note },
    { category: "概算数量(幾何)", item: "totalPileLength", value: num(result.geometric.totalPileLength), unit: "m", note: "杭総延長" },
  );

  for (const check of result.checks) {
    rows.push(
      {
        category: "照査",
        item: check.checkName,
        value: check.status === "hold_not_available" ? "HOLD" : check.status,
        unit: "",
        note: check.reason,
      },
      {
        category: "照査-根拠",
        item: `${check.checkId}.evidence`,
        value: `${check.requiredEvidence?.sourceDocId ?? ""} @ ${check.requiredEvidence?.sourceLocator ?? ""}`,
        unit: "",
        note: `decision_id=${check.requiredEvidence?.decisionId ?? ""}`,
      },
    );
  }

  return { title: `下部工設計計算書（${result.supportId}）`, rows };
}

/** 複数支点の計算書 CSV を生成（出力・traceability 用）。 */
export function buildCalculationCsv(results: readonly DesignResult[]): string {
  const header = ["supportId", "category", "item", "value", "unit", "note"];
  const lines = [header.join(",")];
  for (const result of results) {
    const sheet = buildCalculationSheet(result);
    for (const row of sheet.rows) {
      const cells = [result.supportId, row.category, row.item, row.value, row.unit, row.note].map(
        (c) => `"${String(c).replace(/"/g, '""')}"`,
      );
      lines.push(cells.join(","));
    }
  }
  return `${lines.join("\n")}\n`;
}

/** 複数支点の設計結果 JSON を生成。 */
export function buildCalculationJson(results: readonly DesignResult[]): string {
  return `${JSON.stringify(results, null, 2)}\n`;
}

/** OK/NG/HOLD サマリ。 */
export function summarizeStatuses(
  results: readonly DesignResult[],
): { ok: number; ng: number; hold: number; total: number } {
  let ok = 0;
  let ng = 0;
  let hold = 0;
  for (const r of results) {
    if (r.status === "ok") ok += 1;
    else if (r.status === "ng") ng += 1;
    else hold += 1;
  }
  return { ok, ng, hold, total: results.length };
}

export function checkStatusLabel(check: DesignCheckResult): string {
  switch (check.status) {
    case "ok":
      return "OK";
    case "ng":
      return "NG";
    default:
      return "HOLD";
  }
}
