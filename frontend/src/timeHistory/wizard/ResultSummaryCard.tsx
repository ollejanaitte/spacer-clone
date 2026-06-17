import { ja } from "../../i18n/ja";
import type { TimeHistoryResult } from "../../types";

type ResultSummaryCardProps = {
  result: TimeHistoryResult | null | undefined;
};

export function ResultSummaryCard({ result }: ResultSummaryCardProps) {
  const labels = ja.timeHistoryWizard.results.overview;
  if (!result) {
    return (
      <div className="time-history-summary-card empty">
        <span>{"まだ解析結果はありません。"}</span>
      </div>
    );
  }
  const summary = computeSummary(result);
  return (
    <div className="time-history-summary-card" aria-label={"最新結果サマリ"}>
      <div className="summary-list">
        <span>{labels.maxDisplacement}: {formatNumber(summary.maxDisplacement)}</span>
        <span>{labels.maxVelocity}: {formatNumber(summary.maxVelocity)}</span>
        <span>{labels.maxAcceleration}: {formatNumber(summary.maxAcceleration)}</span>
      </div>
      <div className="summary-list">
        <span>{labels.timeOfMax}: {formatNumber(summary.timeOfMax)} s</span>
        <span>{labels.analysisDuration}: {formatNumber(result.meta.duration)} s</span>
        <span>{labels.timeStep}: {formatNumber(result.meta.timeStep)} s</span>
      </div>
    </div>
  );
}

type Summary = {
  maxDisplacement: number;
  maxVelocity: number;
  maxAcceleration: number;
  timeOfMax: number;
};

function computeSummary(result: TimeHistoryResult): Summary {
  const timeStep = result.meta.timeStep;
  const timeIndex = maxAbsIndex(result.displacements);
  return {
    maxDisplacement: maxAbsValue(result.displacements),
    maxVelocity: maxAbsValue(result.velocities),
    maxAcceleration: maxAbsValue(result.accelerations),
    timeOfMax: timeIndex * timeStep,
  };
}

function maxAbsValue(table: Record<string, number[]>): number {
  let max = 0;
  for (const key of Object.keys(table)) {
    const series = table[key];
    if (!Array.isArray(series)) continue;
    for (const value of series) {
      if (typeof value === "number" && Number.isFinite(value)) {
        const abs = Math.abs(value);
        if (abs > max) max = abs;
      }
    }
  }
  return max;
}

function maxAbsIndex(table: Record<string, number[]>): number {
  let bestIndex = 0;
  let bestAbs = 0;
  for (const key of Object.keys(table)) {
    const series = table[key];
    if (!Array.isArray(series)) continue;
    for (let i = 0; i < series.length; i += 1) {
      const value = series[i];
      if (typeof value === "number" && Number.isFinite(value)) {
        const abs = Math.abs(value);
        if (abs > bestAbs) {
          bestAbs = abs;
          bestIndex = i;
        }
      }
    }
  }
  return bestIndex;
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "-";
  if (Math.abs(value) >= 1000 || (Math.abs(value) > 0 && Math.abs(value) < 0.001)) {
    return value.toExponential(3);
  }
  return value.toFixed(4);
}
