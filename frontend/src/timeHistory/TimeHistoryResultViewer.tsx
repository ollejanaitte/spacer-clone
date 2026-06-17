import { useEffect, useMemo, useState } from "react";
import { ja } from "../i18n/ja";
import type { StructuredMessage, TimeHistoryResult } from "../types";

type TimeHistoryResultViewerProps = {
  result?: TimeHistoryResult | null;
  status?: string;
  error?: StructuredMessage | null;
};

const responseKeys: Array<keyof Pick<TimeHistoryResult, "displacements" | "velocities" | "accelerations">> = [
  "displacements",
  "velocities",
  "accelerations",
];
const maxDisplayedRows = 100;
const maxChartPoints = 1000;
type TimeHistorySeries = "displacement" | "velocity" | "acceleration";

const seriesResultKey: Record<TimeHistorySeries, (typeof responseKeys)[number]> = {
  displacement: "displacements",
  velocity: "velocities",
  acceleration: "accelerations",
};

export function TimeHistoryResultViewer({ result = null, status, error = null }: TimeHistoryResultViewerProps) {
  const labels = ja.timeHistory.resultViewer;
  const meta = result?.meta;
  const responseKeyOptions = useMemo(() => responseHistoryKeys(result), [result]);
  const [selectedKey, setSelectedKey] = useState("");
  const [selectedSeries, setSelectedSeries] = useState<TimeHistorySeries>("displacement");
  const selectedResultKey = seriesResultKey[selectedSeries];
  const seriesValues = selectedKey ? result?.[selectedResultKey]?.[selectedKey] : undefined;
  const tableRows = buildTableRows(result?.time, seriesValues);
  const displayedRows = tableRows.slice(0, maxDisplayedRows);
  const hasTable = displayedRows.length > 0;
  const firstResponseKey = responseKeyOptions[0] ?? null;

  useEffect(() => {
    setSelectedKey((current) => (current && responseKeyOptions.includes(current) ? current : responseKeyOptions[0] ?? ""));
  }, [responseKeyOptions]);

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
        <span>{labels.summary.availableKeysCount}: {responseKeyOptions.length}</span>
        <span>{labels.summary.firstKey}: {firstResponseKey ?? "-"}</span>
        <span>{labels.selectedKey}: {selectedKey || "-"}</span>
        <span>{labels.selectedSeries}: {seriesLabel(selectedSeries)}</span>
        <span>{labels.totalSamples}: {tableRows.length}</span>
        <span>{labels.displayedSamples}: {displayedRows.length}</span>
      </div>
      {error && (
        <div className="summary-list">
          <span>{ja.timeHistory.error.code}: {error.code}</span>
          <span>{ja.timeHistory.error.path}: {error.path ?? "-"}</span>
          <span>{ja.timeHistory.error.message}: {error.code === "TIME_HISTORY_NETWORK_ERROR" ? ja.timeHistory.error.network : error.message}</span>
        </div>
      )}
      <div className="summary-list result-toolbar">
        <label className="result-select">
          <span>{labels.responseKeyLabel}</span>
          <select
            value={selectedKey}
            disabled={responseKeyOptions.length === 0}
            onChange={(event) => setSelectedKey(event.currentTarget.value)}
          >
            {responseKeyOptions.length === 0 ? (
              <option value="">{labels.noResult}</option>
            ) : (
              responseKeyOptions.map((key) => (
                <option key={key} value={key}>
                  {key}
                </option>
              ))
            )}
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
          <input
            type="radio"
            name="time-history-series"
            checked={selectedSeries === "displacement"}
            onChange={() => setSelectedSeries("displacement")}
          />
          <span>{labels.seriesDisplacement}</span>
        </label>
        <label>
          <input
            type="radio"
            name="time-history-series"
            checked={selectedSeries === "velocity"}
            onChange={() => setSelectedSeries("velocity")}
          />
          <span>{labels.seriesVelocity}</span>
        </label>
        <label>
          <input
            type="radio"
            name="time-history-series"
            checked={selectedSeries === "acceleration"}
            onChange={() => setSelectedSeries("acceleration")}
          />
          <span>{labels.seriesAcceleration}</span>
        </label>
      </div>
      <div className="summary-list">
        <span>{labels.availableKeys}: {responseKeyOptions.length > 0 ? responseKeyOptions.join(", ") : "-"}</span>
      </div>
      <TimeHistoryChart
        rows={tableRows}
        selectedKey={selectedKey}
        selectedSeries={selectedSeries}
        hasResult={Boolean(result)}
      />
      {hasTable ? (
        <div className="result-table">
          <table>
            <thead>
              <tr>
                <th>{labels.table.time}</th>
                <th>{labels.table.value}</th>
              </tr>
            </thead>
            <tbody>
              {displayedRows.map((row, index) => (
                <tr key={index}>
                  <td>{formatTableTime(row.time)}</td>
                  <td>{formatTableValue(row.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="summary-list">
            <span>{labels.table.showing(displayedRows.length, tableRows.length)}</span>
          </div>
        </div>
      ) : (
        <div className="empty-state">{labels.noResult}</div>
      )}
    </section>
  );
}

function TimeHistoryChart({
  rows,
  selectedKey,
  selectedSeries,
  hasResult,
}: {
  rows: Array<{ time: number; value: number }>;
  selectedKey: string;
  selectedSeries: TimeHistorySeries;
  hasResult: boolean;
}) {
  const labels = ja.timeHistory.resultViewer.chart;
  const points = downsampleRows(rows, maxChartPoints);
  const width = 760;
  const height = 220;
  const padding = 30;
  const values = points.map((point) => point.value);
  const times = points.map((point) => point.time);
  const minValue = Math.min(...values, 0);
  const maxValue = Math.max(...values, 0);
  const minTime = Math.min(...times, 0);
  const maxTime = Math.max(...times, 0);
  const valueSpan = maxValue - minValue || 1;
  const timeSpan = maxTime - minTime || 1;
  const polylinePoints = points
    .map((point) => {
      const x = padding + ((point.time - minTime) / timeSpan) * (width - 2 * padding);
      const y = height - padding - ((point.value - minValue) / valueSpan) * (height - 2 * padding);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="result-table time-history-chart">
      <h3>{labels.title}</h3>
      <div className="summary-list">
        <span>{ja.timeHistory.resultViewer.selectedKey}: {selectedKey || "-"}</span>
        <span>{ja.timeHistory.resultViewer.selectedSeries}: {seriesLabel(selectedSeries)}</span>
      </div>
      {points.length === 0 ? (
        <div className="empty-state">{hasResult ? labels.invalid : labels.empty}</div>
      ) : (
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={labels.ariaLabel}>
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} />
          <line x1={padding} y1={padding} x2={padding} y2={height - padding} />
          <line
            className="zero-line"
            x1={padding}
            y1={height - padding - ((0 - minValue) / valueSpan) * (height - 2 * padding)}
            x2={width - padding}
            y2={height - padding - ((0 - minValue) / valueSpan) * (height - 2 * padding)}
          />
          <text x={width / 2} y={height - 6} textAnchor="middle">
            {labels.xAxis}
          </text>
          <text x={12} y={height / 2} textAnchor="middle" transform={`rotate(-90 12 ${height / 2})`}>
            {labels.yAxis}
          </text>
          <text x={padding} y={height - padding + 14} textAnchor="middle">
            {formatTableTime(minTime)}
          </text>
          <text x={width - padding} y={height - padding + 14} textAnchor="middle">
            {formatTableTime(maxTime)}
          </text>
          <text x={padding - 6} y={padding + 4} textAnchor="end">
            {formatTableValue(maxValue)}
          </text>
          <text x={padding - 6} y={height - padding + 4} textAnchor="end">
            {formatTableValue(minValue)}
          </text>
          <polyline
            data-response-key={selectedKey}
            data-series={selectedSeries}
            points={polylinePoints}
            fill="none"
            stroke="#2f6f9f"
            strokeWidth="2"
          />
          <text x={width - padding} y={padding + 4} textAnchor="end">
            {labels.pointCount(points.length, rows.length)}
          </text>
        </svg>
      )}
    </div>
  );
}

function responseHistoryKeys(result: TimeHistoryResult | null): string[] {
  if (!result) return [];
  const keys = new Set<string>();
  for (const responseKey of responseKeys) {
    const histories = result[responseKey];
    if (!histories || typeof histories !== "object") continue;
    for (const key of Object.keys(histories)) keys.add(key);
  }
  return [...keys].sort();
}

function buildTableRows(time: number[] | undefined, values: number[] | undefined): Array<{ time: number; value: number }> {
  if (!Array.isArray(time) || !Array.isArray(values) || time.length === 0 || values.length === 0) return [];
  const count = Math.min(time.length, values.length);
  const rows: Array<{ time: number; value: number }> = [];
  for (let index = 0; index < count; index += 1) {
    const timeValue = time[index];
    const responseValue = values[index];
    if (typeof timeValue === "number" && Number.isFinite(timeValue) && typeof responseValue === "number" && Number.isFinite(responseValue)) {
      rows.push({ time: timeValue, value: responseValue });
    }
  }
  return rows;
}

function downsampleRows(rows: Array<{ time: number; value: number }>, maxPoints: number): Array<{ time: number; value: number }> {
  if (rows.length <= maxPoints) return rows;
  const step = Math.ceil(rows.length / maxPoints);
  const points = rows.filter((_, index) => index % step === 0);
  const last = rows[rows.length - 1];
  return points[points.length - 1] === last ? points : [...points, last];
}

function statusLabel(status: string | undefined): string {
  if (!status) return ja.timeHistory.status.notRun;
  return ja.timeHistory.status[status as keyof typeof ja.timeHistory.status] ?? status;
}

function formatNumber(value: number | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return String(value);
}

function formatTableTime(value: number): string {
  return value.toFixed(2);
}

function formatTableValue(value: number): string {
  return Math.abs(value) > 10000 || (Math.abs(value) > 0 && Math.abs(value) < 0.001)
    ? value.toExponential(3)
    : value.toFixed(3);
}

function seriesLabel(series: TimeHistorySeries): string {
  return series === "displacement"
    ? ja.timeHistory.resultViewer.seriesDisplacement
    : series === "velocity"
      ? ja.timeHistory.resultViewer.seriesVelocity
      : ja.timeHistory.resultViewer.seriesAcceleration;
}
