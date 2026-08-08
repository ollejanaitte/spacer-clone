// Phase C1 (M3-05) 設計計算結果パネル
// OK/NG/HOLD サマリ + 支点別チェック詳細 + 入力/概算数量/反力 trace。
// 存在しない設計結果を見栄え目的で生成しない（HOLD は HOLD 表示）。

import { useMemo } from "react";
import { ja } from "../../i18n/ja";
import type { DesignResult } from "../design/designEngine";
import {
  buildCalculationSheet,
  summarizeStatuses,
  checkStatusLabel,
  type CalcSheetRow,
} from "../design/calculationOutput";

export interface DesignResultPanelProps {
  results: readonly DesignResult[];
  selectedSupportId?: string | null;
  onSelectSupport?: (supportId: string) => void;
}

const STATUS_COLOR: Record<string, string> = {
  ok: "#4ade80",
  ng: "#f87171",
  hold_not_available: "#fdba74",
};

const S = {
  panel: {
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: 10,
    background: "#121a2b",
    color: "#e2e8f0",
    padding: 12,
    margin: 8,
    fontFamily: "Inter, 'Noto Sans JP', sans-serif",
    fontSize: 12,
  } as const,
  empty: {
    padding: 12,
    color: "#94a3b8",
    fontSize: 12,
  } as const,
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  } as const,
  summary: { display: "flex", gap: 10 } as const,
  tabs: { display: "flex", gap: 6, flexWrap: "wrap" as const, marginBottom: 10 } as const,
  tab: {
    padding: "4px 10px",
    borderRadius: 6,
    border: "1px solid rgba(255,255,255,0.15)",
    background: "#1d2b45",
    color: "#f1f5f9",
    cursor: "pointer",
    fontSize: 12,
  } as const,
  tabActive: {
    borderColor: "#3b82f6",
    background: "#24406b",
  } as const,
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    fontSize: 11,
  } as const,
  cell: {
    border: "1px solid rgba(255,255,255,0.1)",
    padding: "4px 6px",
    textAlign: "left" as const,
  } as const,
};

export function DesignResultPanel(props: DesignResultPanelProps) {
  const t = ja.substructure?.planning ?? ({} as Record<string, string>);
  const summary = useMemo(() => summarizeStatuses(props.results), [props.results]);

  const selected = useMemo(
    () =>
      props.results.find((r) => r.supportId === props.selectedSupportId) ??
      props.results[0] ??
      null,
    [props.results, props.selectedSupportId],
  );

  const sheet = useMemo(
    () => (selected ? buildCalculationSheet(selected) : null),
    [selected],
  );

  if (props.results.length === 0) {
    return (
      <div data-testid="design-result-panel" style={S.empty}>
        {t.designNoResult ??
          "設計計算を実行すると結果が表示されます（数値照査は根拠未 ADOPTED のため HOLD となります）"}
      </div>
    );
  }

  return (
    <section data-testid="design-result-panel" style={S.panel}>
      <header style={S.header}>
        <h2 style={{ margin: 0, fontSize: 14 }}>{t.designResultTitle ?? "設計計算結果"}</h2>
        <div style={S.summary} data-testid="design-summary">
          <span style={{ color: "#4ade80" }}>OK {summary.ok}</span>
          <span style={{ color: "#f87171" }}>NG {summary.ng}</span>
          <span style={{ color: "#fdba74" }}>HOLD {summary.hold}</span>
        </div>
      </header>

      <div style={S.tabs} data-testid="design-support-tabs">
        {props.results.map((r) => (
          <button
            key={r.supportId}
            type="button"
            data-testid={`design-tab-${r.supportId}`}
            style={
              r.supportId === selected?.supportId
                ? { ...S.tab, ...S.tabActive }
                : S.tab
            }
            onClick={() => props.onSelectSupport?.(r.supportId)}
          >
            {r.supportId} ({checkStatusLabel(r.checks[0])})
          </button>
        ))}
      </div>

      {selected && sheet && (
        <div>
          <div
            style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}
          >
            <strong>{sheet.title}</strong>
            <span
              data-testid="design-status-badge"
              style={{ color: STATUS_COLOR[selected.status] ?? "#f1f5f9" }}
            >
              {selected.status === "ok" ? "OK" : selected.status === "ng" ? "NG" : "HOLD"}
            </span>
          </div>
          <table style={S.table} data-testid="design-sheet">
            <thead>
              <tr>
                <th style={S.cell}>区分</th>
                <th style={S.cell}>項目</th>
                <th style={S.cell}>値</th>
                <th style={S.cell}>単位</th>
                <th style={S.cell}>備考</th>
              </tr>
            </thead>
            <tbody>
              {sheet.rows.map((row: CalcSheetRow, i: number) => (
                <tr key={i} data-testid={`design-row-${i}`}>
                  <td style={S.cell}>{row.category}</td>
                  <td style={S.cell}>{row.item}</td>
                  <td style={S.cell}>{row.value}</td>
                  <td style={S.cell}>{row.unit}</td>
                  <td style={S.cell}>{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
