import { useEffect, useMemo, useState } from "react";
import { ja } from "../i18n/ja";
import type { ProjectModel, StructuredMessage, TimeHistoryResult } from "../types";
import { TimeHistoryAnimationProvider } from "./TimeHistoryAnimationContext";
import { TimeHistoryAnimationControls } from "./TimeHistoryAnimationControls";
import { useTimeHistoryAnimationState } from "./useTimeHistoryAnimationState";

type TimeHistoryResultViewerProps = {
  result?: TimeHistoryResult | null;
  project?: ProjectModel | null;
  status?: string;
  error?: StructuredMessage | null;
  onOverrideChange?: (override: Map<string, { x: number; y: number; z: number }> | null) => void;
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

export function TimeHistoryResultViewer({
  result = null,
  project = null,
  status,
  error = null,
  onOverrideChange,
}: TimeHistoryResultViewerProps) {
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
    <TimeHistoryResultViewerBody
      result={result}
      project={project}
      status={status}
      error={error}
      labels={labels}
      meta={meta}
      responseKeyOptions={responseKeyOptions}
      firstResponseKey={firstResponseKey}
      selectedKey={selectedKey}
      onSelectedKeyChange={setSelectedKey}
      selectedSeries={selectedSeries}
      onSelectedSeriesChange={setSelectedSeries}
      tableRows={tableRows}
      displayedRows={displayedRows}
      hasTable={hasTable}
      onOverrideChange={onOverrideChange}
    />
  );
}

type BodyProps = {
  result: TimeHistoryResult | null;
  project: ProjectModel | null;
  status: string | undefined;
  error: StructuredMessage | null;
  labels: typeof ja.timeHistory.resultViewer;
  meta?: TimeHistoryResult["meta"];
  responseKeyOptions: string[];
  firstResponseKey: string | null;
  selectedKey: string;
  onSelectedKeyChange: (key: string) => void;
  selectedSeries: TimeHistorySeries;
  onSelectedSeriesChange: (series: TimeHistorySeries) => void;
  tableRows: Array<{ time: number; value: number }>;
  displayedRows: Array<{ time: number; value: number }>;
  hasTable: boolean;
  onOverrideChange?: (override: Map<string, { x: number; y: number; z: number }> | null) => void;
};

function TimeHistoryResultViewerBody(props: BodyProps) {
  // The animation state is owned here so the controls and the 3D
  // viewer can read the derived override. When the project is not
  // available (e.g. the result viewer is used in isolation in a
  // test), the controls still render but the override is null.
  const animation = useTimeHistoryAnimationState({
    project: props.project,
    result: props.result,
    selectedKey: props.selectedKey || null,
    seriesKind: props.selectedSeries,
  });
  // Report the override upward so the 3D viewer can consume it.
  // We compare by reference; the override map is recomputed
  // whenever the active time index or the scale changes.
  const onOverrideChange = props.onOverrideChange;
  useEffect(() => {
    onOverrideChange?.(animation.override);
  }, [animation.override, onOverrideChange]);
  return (
    <TimeHistoryAnimationProvider
      project={props.project}
      result={props.result}
      state={animation.state}
      setters={animation.setters}
      reset={animation.reset}
      jumpToMax={animation.jumpToMax}
      currentTimeSeconds={animation.currentTimeSeconds}
      currentValue={animation.currentValue}
      maxAbsValue={animation.maxAbsValue}
      maxAbsTimeSeconds={animation.maxAbsTimeSeconds}
      largeScaleWarning={animation.largeScaleWarning}
    >
      <section className="result-table time-history-result-viewer" aria-label={props.labels.heading}>
        <h3>{props.labels.heading}</h3>
        <div className="summary-list">
          <span>{props.labels.summary.status}: {statusLabel(props.status ?? props.meta?.status)}</span>
          <span>{props.labels.summary.sampleCount}: {formatNumber(props.meta?.sampleCount)}</span>
          <span>{props.labels.summary.timeStep}: {formatNumber(props.meta?.timeStep)} {ja.timeHistory.units.seconds}</span>
          <span>{props.labels.summary.duration}: {formatNumber(props.meta?.duration)} {ja.timeHistory.units.seconds}</span>
          <span>{props.labels.summary.analysisId}: {props.meta?.analysisId ?? "-"}</span>
          <span>{props.labels.summary.method}: {props.meta?.method ?? "-"}</span>
          <span>{props.labels.summary.availableKeysCount}: {props.responseKeyOptions.length}</span>
          <span>{props.labels.summary.firstKey}: {props.firstResponseKey ?? "-"}</span>
          <span>{props.labels.selectedKey}: {props.selectedKey || "-"}</span>
          <span>{props.labels.selectedSeries}: {seriesLabel(props.selectedSeries)}</span>
          <span>{props.labels.totalSamples}: {props.tableRows.length}</span>
          <span>{props.labels.displayedSamples}: {props.displayedRows.length}</span>
        </div>
        {props.error && (
          <div className="summary-list time-history-error-summary">
            <span>{ja.timeHistory.error.code}: {props.error.code}</span>
            <span>{ja.timeHistory.error.path}: {props.error.path ?? "-"}</span>
            <span>{ja.timeHistory.error.message}: {props.error.code === "TIME_HISTORY_NETWORK_ERROR" ? ja.timeHistory.error.network : props.error.message}</span>
          </div>
        )}
        <div className="summary-list result-toolbar">
          <label className="result-select">
            <span>{props.labels.responseKeyLabel}</span>
            <select
              value={props.selectedKey}
              disabled={props.responseKeyOptions.length === 0}
              onChange={(event) => props.onSelectedKeyChange(event.currentTarget.value)}
            >
              {props.responseKeyOptions.length === 0 ? (
                <option value="">{props.labels.noResult}</option>
              ) : (
                props.responseKeyOptions.map((key) => (
                  <option key={key} value={key}>
                    {key}
                  </option>
                ))
              )}
            </select>
          </label>
          <label className="result-select">
            <span>{props.labels.dofLabel}</span>
            <select disabled value="">
              <option value="">{props.labels.dofPlaceholder}</option>
            </select>
          </label>
        </div>
        <div className="series-picker" aria-label={props.labels.seriesLabel}>
          <label>
            <input
              type="radio"
              name="time-history-series"
              checked={props.selectedSeries === "displacement"}
              onChange={() => props.onSelectedSeriesChange("displacement")}
            />
            <span>{props.labels.seriesDisplacement}</span>
          </label>
          <label>
            <input
              type="radio"
              name="time-history-series"
              checked={props.selectedSeries === "velocity"}
              onChange={() => props.onSelectedSeriesChange("velocity")}
            />
            <span>{props.labels.seriesVelocity}</span>
          </label>
          <label>
            <input
              type="radio"
              name="time-history-series"
              checked={props.selectedSeries === "acceleration"}
              onChange={() => props.onSelectedSeriesChange("acceleration")}
            />
            <span>{props.labels.seriesAcceleration}</span>
          </label>
        </div>
        <div className="summary-list">
          <span>{props.labels.availableKeys}: {props.responseKeyOptions.length > 0 ? props.responseKeyOptions.join(", ") : "-"}</span>
        </div>
        <TimeHistoryChart
          rows={props.tableRows}
          selectedKey={props.selectedKey}
          selectedSeries={props.selectedSeries}
          hasResult={Boolean(props.result)}
        />
        {props.hasTable ? (
          <div className="result-table">
            <table>
              <thead>
                <tr>
                  <th>{props.labels.table.time}</th>
                  <th>{props.labels.table.value}</th>
                </tr>
              </thead>
              <tbody>
                {props.displayedRows.map((row, index) => (
                  <tr key={index}>
                    <td>{formatTableTime(row.time)}</td>
                    <td>{formatTableValue(row.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="summary-list">
              <span>{props.labels.table.showing(props.displayedRows.length, props.tableRows.length)}</span>
            </div>
          </div>
        ) : (
          <div className="empty-state">{props.labels.noResult}</div>
        )}
        <TimeHistoryAnimationControls />
      </section>
    </TimeHistoryAnimationProvider>
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
  const points = useMemo(() => downsampleRows(rows, maxChartPoints), [rows]);
  const minTime = points.length > 0 ? points[0].time : 0;
  const maxTime = points.length > 0 ? points[points.length - 1].time : 0;
  const minValue = points.length > 0 ? Math.min(...points.map((p) => p.value), 0) : 0;
  const maxValue = points.length > 0 ? Math.max(...points.map((p) => p.value), 0) : 0;
  const valueSpan = maxValue - minValue === 0 ? 1 : maxValue - minValue;
  const timeSpan = maxTime - minTime === 0 ? 1 : maxTime - minTime;
  const width = 320;
  const height = 160;
  const padding = 16;
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
