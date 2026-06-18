import type { TimeHistoryResult } from "../../types";
import { summarizeTimeHistoryResult } from "./wizardState";

type ResultSummaryCardProps = {
  result?: TimeHistoryResult | null;
};

export function ResultSummaryCard({ result = null }: ResultSummaryCardProps) {
  const rows = summarizeTimeHistoryResult(result);
  return (
    <div className="time-history-result-summary-card">
      <h3>最新結果サマリ</h3>
      {rows.length === 0 ? (
        <p>まだ時刻歴応答解析の結果はありません。</p>
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
