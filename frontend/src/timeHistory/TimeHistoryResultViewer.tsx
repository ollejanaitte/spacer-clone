import { ja } from "../i18n/ja";
import type { TimeHistoryResult } from "../types";

type TimeHistoryResultViewerProps = {
  result?: TimeHistoryResult | null;
  status?: string;
};

const responseKeys: Array<keyof Pick<TimeHistoryResult, "displacements" | "velocities" | "accelerations">> = [
  "displacements",
  "velocities",
  "accelerations",
];

export function TimeHistoryResultViewer({ result = null, status }: TimeHistoryResultViewerProps) {
  const labels = ja.timeHistory.resultViewer;
  const meta = result?.meta;
  const availableKeys = result
    ? responseKeys.filter((key) => Object.keys(result[key] ?? {}).length > 0)
    : [];

  return (
    <section className="result-table time-history-result-viewer" aria-label={labels.heading}>
      <h3>{labels.heading}</h3>
      <div className="summary-list">
        <span>{labels.summary.status}: {statusLabel(status ?? meta?.status)}</span>
        <span>{labels.summary.sampleCount}: {formatNumber(meta?.sampleCount)}</span>
        <span>{labels.summary.timeStep}: {formatNumber(meta?.timeStep)} {ja.timeHistory.units.seconds}</span>
        <span>{labels.summary.duration}: {formatNumber(meta?.duration)} {ja.timeHistory.units.seconds}</span>
        <span>{labels.summary.analysisId}: {meta?.analysisId ?? "-"}</span>
        <span>{labels.summary.method}: {meta?.method ?? "-"}</span>
      </div>
      <div className="summary-list result-toolbar">
        <label className="result-select">
          <span>{labels.nodeLabel}</span>
          <select disabled value="">
            <option value="">{labels.nodePlaceholder}</option>
          </select>
        </label>
        <label className="result-select">
          <span>{labels.dofLabel}</span>
          <select disabled value="">
            <option value="">{labels.dofPlaceholder}</option>
          </select>
        </label>
      </div>
      <div className="series-picker" aria-label={labels.seriesLabel}>
        <label>
          <input type="radio" disabled name="time-history-series" />
          <span>{labels.seriesDisplacement}</span>
        </label>
        <label>
          <input type="radio" disabled name="time-history-series" />
          <span>{labels.seriesVelocity}</span>
        </label>
        <label>
          <input type="radio" disabled name="time-history-series" />
          <span>{labels.seriesAcceleration}</span>
        </label>
      </div>
      <div className="summary-list">
        <span>{labels.availableKeys}: {availableKeys.length > 0 ? availableKeys.join(", ") : "-"}</span>
      </div>
      {!result && <div className="empty-state">{labels.empty}</div>}
    </section>
  );
}

function statusLabel(status: string | undefined): string {
  if (!status) return ja.timeHistory.status.notRun;
  return ja.timeHistory.status[status as keyof typeof ja.timeHistory.status] ?? status;
}

function formatNumber(value: number | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return String(value);
}
