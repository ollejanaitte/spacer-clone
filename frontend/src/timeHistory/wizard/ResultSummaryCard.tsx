import locale from "../../i18n/locales/ja.json";
import type { TimeHistoryResult } from "../../types";
import { summarizeTimeHistoryResult } from "./wizardState";

type ResultSummaryCardProps = {
  result?: TimeHistoryResult | null;
};

export function ResultSummaryCard({ result = null }: ResultSummaryCardProps) {
  const rows = summarizeTimeHistoryResult(result);
  return (
    <div className="time-history-result-summary-card">
      <h3>{locale.thAnalysis.latestResult}</h3>
      {rows.length === 0 ? (
        <p>{locale.thAnalysis.noLatestResult}</p>
      ) : (
        <dl>
          {rows.map((row) => (
            <div key={row.label}>
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
