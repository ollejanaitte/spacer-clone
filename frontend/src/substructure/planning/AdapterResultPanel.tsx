// Phase C1 (A-04) Adapter 計算結果パネル（TEST/MOCK 明示）
// CalculationAdapterResult を表示する。正式設計結果と誤認しないよう
// engineLabel=TEST / isFormalDesign=false / 「正式設計結果ではない」を明示する。

import { useMemo } from "react";
import { ja } from "../../i18n/ja";
import type {
  CalculationAdapterResult,
  AdapterStatus,
} from "../design/calculationAdapter";

export interface AdapterResultPanelProps {
  results: readonly CalculationAdapterResult[];
  selectedSupportId?: string | null;
  onSelectSupport?: (supportId: string) => void;
}

const STATUS_COLOR: Record<AdapterStatus, string> = {
  TEST_PASS: "#4ade80",
  TEST_FAIL: "#f87171",
  HOLD: "#fdba74",
  ERROR: "#f87171",
};

const STATUS_LABEL: Record<AdapterStatus, string> = {
  TEST_PASS: "TEST PASS",
  TEST_FAIL: "TEST FAIL",
  HOLD: "HOLD",
  ERROR: "ERROR",
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
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  } as const,
  notice: {
    fontSize: 11,
    color: "#fdba74",
    marginBottom: 8,
  } as const,
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
  tabActive: { borderColor: "#3b82f6", background: "#24406b" } as const,
  table: { width: "100%", borderCollapse: "collapse" as const, fontSize: 11 } as const,
  cell: { border: "1px solid rgba(255,255,255,0.1)", padding: "4px 6px", textAlign: "left" as const },
};

export function AdapterResultPanel(props: AdapterResultPanelProps) {
  const t = ja.substructure?.planning ?? ({} as Record<string, string>);
  const summary = useMemo(() => {
    const acc = { TEST_PASS: 0, TEST_FAIL: 0, HOLD: 0, ERROR: 0 };
    for (const r of props.results) {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
    }
    return acc;
  }, [props.results]);

  const selected = useMemo(
    () =>
      props.results.find((r) => r.supportId === props.selectedSupportId) ??
      props.results[0] ??
      null,
    [props.results, props.selectedSupportId],
  );

  if (props.results.length === 0) {
    return (
      <div data-testid="adapter-result-panel" style={{ padding: 12, color: "#94a3b8", fontSize: 12 }}>
        {t.adapterNoResult ?? "Adapter 計算（TEST）を実行すると結果が表示されます"}
      </div>
    );
  }

  return (
    <section data-testid="adapter-result-panel" style={S.panel}>
      <header style={S.header}>
        <h2 style={{ margin: 0, fontSize: 14 }}>
          {t.adapterResultTitle ?? "Adapter 計算結果（TEST/MOCK）"}
        </h2>
        <div data-testid="adapter-summary" style={{ display: "flex", gap: 10 }}>
          <span style={{ color: "#4ade80" }}>PASS {summary.TEST_PASS}</span>
          <span style={{ color: "#f87171" }}>FAIL {summary.TEST_FAIL}</span>
          <span style={{ color: "#fdba74" }}>HOLD {summary.HOLD}</span>
          <span style={{ color: "#f87171" }}>ERROR {summary.ERROR}</span>
        </div>
      </header>
      <div style={S.notice} data-testid="adapter-formal-notice">
        {t.adapterFormalNotice ??
          "この結果は TEST / MOCK 計算によるものであり、正式な構造安全性の設計判定ではありません。"}
      </div>

      <div style={S.tabs} data-testid="adapter-support-tabs">
        {props.results.map((r) => (
          <button
            key={r.supportId}
            type="button"
            data-testid={`adapter-tab-${r.supportId}`}
            style={r.supportId === selected?.supportId ? { ...S.tab, ...S.tabActive } : S.tab}
            onClick={() => props.onSelectSupport?.(r.supportId)}
          >
            {r.supportId} ({STATUS_LABEL[r.status]})
          </button>
        ))}
      </div>

      {selected && (
        <div data-testid="adapter-result-detail">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span>
              engine: <strong data-testid="adapter-engine-label">{selected.engineLabel}</strong>{" "}
              ({selected.engineType}@{selected.engineVersion})
            </span>
            <span data-testid="adapter-status-badge" style={{ color: STATUS_COLOR[selected.status] }}>
              {STATUS_LABEL[selected.status]}
            </span>
          </div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 6 }}>
            calculationId: <span data-testid="adapter-calculation-id">{selected.calculationId}</span>
            {" / "}
            supportId: <span data-testid="adapter-support-id">{selected.supportId}</span>
            {" / "}
            <span data-testid="adapter-generated-at">{selected.generatedAt}</span>
          </div>

          {selected.errors.length > 0 && (
            <div data-testid="adapter-errors" style={{ color: "#f87171", marginBottom: 6 }}>
              {selected.errors.map((e, i) => (
                <div key={i}>ERROR: {e}</div>
              ))}
            </div>
          )}
          {selected.warnings.map((w, i) => (
            <div key={i} style={{ color: "#fdba74", fontSize: 11 }}>
              WARN: {w}
            </div>
          ))}

          <table style={S.table} data-testid="adapter-check-table">
            <thead>
              <tr>
                <th style={S.cell}>checkId</th>
                <th style={S.cell}>name</th>
                <th style={S.cell}>status</th>
                <th style={S.cell}>value</th>
                <th style={S.cell}>unit</th>
              </tr>
            </thead>
            <tbody>
              {selected.checks.map((c) => (
                <tr key={c.checkId} data-testid={`adapter-check-${c.checkId}`}>
                  <td style={S.cell}>{c.checkId}</td>
                  <td style={S.cell}>{c.checkName}</td>
                  <td style={S.cell} data-testid={`adapter-check-status-${c.checkId}`}>
                    {c.status}
                  </td>
                  <td style={S.cell}>{c.value}</td>
                  <td style={S.cell}>{c.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
