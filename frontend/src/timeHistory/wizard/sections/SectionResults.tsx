import { useEffect, useState } from "react";
import { ja } from "../../../i18n/ja";
import { TimeHistoryResultViewer } from "../../TimeHistoryResultViewer";
import type { ProjectModel, StructuredMessage, TimeHistoryResult } from "../../../types";
import { isXyzAnimationAvailable } from "../wizardState";

type SectionResultsProps = {
  project: ProjectModel;
  result: TimeHistoryResult | null | undefined;
  status: string | undefined;
  error: StructuredMessage | null;
  onOverrideChange?: (override: Map<string, { x: number; y: number; z: number }> | null) => void;
};

type ResultTabId = "overview" | "maxima" | "chart" | "inputMotion" | "animation" | "detail" | "errors";

const tabs: Array<{ key: ResultTabId; label: string }> = [
  { key: "overview", label: ja.timeHistoryWizard.results.tabs.overview },
  { key: "maxima", label: ja.timeHistoryWizard.results.tabs.maxima },
  { key: "chart", label: ja.timeHistoryWizard.results.tabs.chart },
  { key: "inputMotion", label: ja.timeHistoryWizard.results.tabs.inputMotion },
  { key: "animation", label: ja.timeHistoryWizard.results.tabs.animation },
  { key: "detail", label: ja.timeHistoryWizard.results.tabs.detail },
  { key: "errors", label: ja.timeHistoryWizard.results.tabs.errors },
];

export function SectionResults({
  project,
  result,
  status,
  error,
  onOverrideChange,
}: SectionResultsProps) {
  const labels = ja.timeHistoryWizard.results;
  const initialTab: ResultTabId = status === "failed" || error ? "errors" : "overview";
  const [active, setActive] = useState<ResultTabId>(initialTab);
  useEffect(() => {
    setActive(status === "failed" || error ? "errors" : "overview");
  }, [status, error, result?.meta?.analysisId]);
  const availability = isXyzAnimationAvailable(result);

  return (
    <section className="time-history-wizard-section section-results" aria-label={labels.heading}>
      <h2>{labels.heading}</h2>
      <div className="tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={active === tab.key ? "tab active" : "tab"}
            onClick={() => setActive(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="tab-body">
        {active === "overview" && <OverviewTab result={result} />}
        {active === "maxima" && <MaximaTab result={result} />}
        {active === "chart" && (
          <div className="result-table">
            <TimeHistoryResultViewer
              result={result ?? null}
              project={project}
              status={status}
              error={error}
              onOverrideChange={onOverrideChange}
            />
          </div>
        )}
        {active === "inputMotion" && <InputMotionTab project={project} />}
        {active === "animation" && <AnimationTab result={result} availability={availability} />}
        {active === "detail" && (
          <div className="result-table">
            <TimeHistoryResultViewer
              result={result ?? null}
              project={project}
              status={status}
              error={error}
              onOverrideChange={onOverrideChange}
            />
          </div>
        )}
        {active === "errors" && <ErrorsTab error={error} />}
      </div>
    </section>
  );
}

function OverviewTab({ result }: { result: TimeHistoryResult | null | undefined }) {
  const labels = ja.timeHistoryWizard.results.overview;
  if (!result) {
    return <div className="empty-state">{"まだ解析結果はありません。"}</div>;
  }
  const summary = computeSummary(result);
  return (
    <div className="time-history-overview">
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
      <p className="time-history-wizard-help">{labels.helpMaxDisplacement}</p>
      <p className="time-history-wizard-help">{labels.helpTimeOfMax}</p>
      <p className="time-history-wizard-help">{labels.helpSign}</p>
    </div>
  );
}

function MaximaTab({ result }: { result: TimeHistoryResult | null | undefined }) {
  const labels = ja.timeHistoryWizard.results.maximaTable;
  if (!result) {
    return <div className="empty-state">{"まだ解析結果はありません。"}</div>;
  }
  const rows = buildMaximaRows(result);
  return (
    <div className="result-table">
      <h3>{labels.heading}</h3>
      <table>
        <thead>
          <tr>
            <th>{labels.kind}</th>
            <th>{labels.target}</th>
            <th>{labels.direction}</th>
            <th>{labels.max}</th>
            <th>{labels.min}</th>
            <th>{labels.absMax}</th>
            <th>{labels.timeOfMax}</th>
            <th>{labels.unit}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.kind}</td>
              <td>{row.target}</td>
              <td>{row.direction}</td>
              <td className="max-cell">{row.max.toFixed(4)}</td>
              <td>{row.min.toFixed(4)}</td>
              <td className="max-cell">{row.absMax.toFixed(4)}</td>
              <td>{row.timeOfMax.toFixed(3)} s</td>
              <td>{row.unit}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InputMotionTab({ project }: { project: ProjectModel }) {
  const motion = project.groundMotions?.[0];
  if (!motion || !Array.isArray(motion.samples) || motion.samples.length === 0) {
    return <div className="empty-state">{"地震波が読み込まれていません。"}</div>;
  }
  return (
    <div className="result-table">
      <h3>{ja.timeHistory.groundMotionManager.previewLabel}</h3>
      <GroundMotionChart samples={motion.samples} timeStep={motion.timeStep} />
    </div>
  );
}

function GroundMotionChart({ samples, timeStep }: { samples: number[]; timeStep: number }) {
  const width = 480;
  const height = 200;
  const padding = 20;
  let max = -Infinity;
  let min = Infinity;
  for (const v of samples) {
    if (typeof v === "number" && Number.isFinite(v)) {
      if (v > max) max = v;
      if (v < min) min = v;
    }
  }
  if (!Number.isFinite(max)) max = 0;
  if (!Number.isFinite(min)) min = 0;
  const valueSpan = Math.max(1e-9, max - min);
  const timeSpan = Math.max(1e-9, (samples.length - 1) * timeStep);
  const polyline = samples
    .map((value, index) => {
      const x = padding + (index * timeStep / timeSpan) * (width - 2 * padding);
      const y = height - padding - ((value - min) / valueSpan) * (height - 2 * padding);
      return x + "," + y;
    })
    .join(" ");
  return (
    <svg viewBox={"0 0 " + width + " " + height} role="img" aria-label={"ground motion chart"}>
      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} />
      <line x1={padding} y1={padding} x2={padding} y2={height - padding} />
      <polyline data-ground-motion points={polyline} fill="none" stroke="#2f6f9f" strokeWidth={2} />
      <text x={width / 2} y={height - 4} textAnchor="middle">{"t (s)"}</text>
      <text x={12} y={height / 2} textAnchor="middle" transform={"rotate(-90 12 " + (height / 2) + ")"}>{"a"}</text>
    </svg>
  );
}

function AnimationTab({
  result,
  availability,
}: {
  result: TimeHistoryResult | null | undefined;
  availability: { available: boolean; missingAxes: string[] };
}) {
  const labels = ja.timeHistoryWizard.animation;
  return (
    <div className="time-history-animation-availability">
      <h3>{labels.availabilityHeading}</h3>
      <p className="time-history-wizard-help">{labels.availabilityHelp}</p>
      <table>
        <thead>
          <tr>
            <th>{"結果"}</th>
            <th>{"状態"}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{labels.xStatus}</td>
            <td>{availability.missingAxes.includes("X") ? labels.missingLabel : labels.okLabel}</td>
          </tr>
          <tr>
            <td>{labels.yStatus}</td>
            <td>{availability.missingAxes.includes("Y") ? labels.missingLabel : labels.okLabel}</td>
          </tr>
          <tr>
            <td>{labels.zStatus}</td>
            <td>{availability.missingAxes.includes("Z") ? labels.missingLabel : labels.okLabel}</td>
          </tr>
          <tr>
            <td>{labels.xyzStatus}</td>
            <td>{availability.available ? labels.availableLabel : labels.unavailableLabel}</td>
          </tr>
        </tbody>
      </table>
      {!availability.available && (
        <div className="time-history-wizard-error-card">
          <h4>{labels.xyzUnavailableTitle}</h4>
          <p>{labels.xyzUnavailableBody}</p>
          <p>{labels.xyzUnavailableMissing({ axes: availability.missingAxes.join("・") })}</p>
          <p>{labels.xyzUnavailableRemedy}</p>
        </div>
      )}
      {!result && <div className="empty-state">{"解析結果がありません。"}</div>}
    </div>
  );
}

function ErrorsTab({ error }: { error: StructuredMessage | null }) {
  if (!error) {
    return <div className="empty-state">{ja.timeHistoryWizard.results.errorTabEmpty}</div>;
  }
  return (
    <div className="result-table">
      <table>
        <thead>
          <tr>
            <th>{ja.timeHistory.error.code}</th>
            <th>{ja.timeHistory.error.message}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{error.code}</td>
            <td>{error.message}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

type MaxRow = {
  id: string;
  kind: string;
  target: string;
  direction: string;
  max: number;
  min: number;
  absMax: number;
  timeOfMax: number;
  unit: string;
};

function buildMaximaRows(result: TimeHistoryResult): MaxRow[] {
  const rows: MaxRow[] = [];
  for (const key of Object.keys(result.displacements)) {
    rows.push(makeRow(result, "displacements", key, "m"));
  }
  for (const key of Object.keys(result.velocities)) {
    rows.push(makeRow(result, "velocities", key, "m/s"));
  }
  for (const key of Object.keys(result.accelerations)) {
    rows.push(makeRow(result, "accelerations", key, "m/s^2"));
  }
  return rows;
}

function makeRow(result: TimeHistoryResult, kind: keyof Pick<TimeHistoryResult, "displacements" | "velocities" | "accelerations">, key: string, unit: string): MaxRow {
  const series = result[kind][key];
  let max = 0;
  let min = 0;
  let timeOfMax = 0;
  let absMax = 0;
  if (Array.isArray(series) && series.length > 0) {
    max = -Infinity;
    min = Infinity;
    for (let i = 0; i < series.length; i += 1) {
      const value = series[i];
      if (typeof value !== "number" || !Number.isFinite(value)) continue;
      if (value > max) max = value;
      if (value < min) min = value;
    }
    if (!Number.isFinite(max)) max = 0;
    if (!Number.isFinite(min)) min = 0;
    absMax = Math.max(Math.abs(max), Math.abs(min));
    for (let i = 0; i < series.length; i += 1) {
      const value = series[i];
      if (typeof value === "number" && Math.abs(value) === absMax) {
        timeOfMax = i * result.meta.timeStep;
        break;
      }
    }
  }
  return {
    id: kind + ":" + key,
    kind: kind === "displacements" ? "変位" : kind === "velocities" ? "速度" : "加速度",
    target: key,
    direction: extractDirection(key),
    max,
    min,
    absMax,
    timeOfMax,
    unit,
  };
}

function extractDirection(key: string): string {
  if (key.endsWith("_ux")) return "X";
  if (key.endsWith("_uy")) return "Y";
  if (key.endsWith("_uz")) return "Z";
  return "-";
}

type Summary = {
  maxDisplacement: number;
  maxVelocity: number;
  maxAcceleration: number;
  timeOfMax: number;
};

function computeSummary(result: TimeHistoryResult): Summary {
  const timeStep = result.meta.timeStep;
  return {
    maxDisplacement: maxAbsValue(result.displacements),
    maxVelocity: maxAbsValue(result.velocities),
    maxAcceleration: maxAbsValue(result.accelerations),
    timeOfMax: maxAbsIndex(result.displacements) * timeStep,
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
