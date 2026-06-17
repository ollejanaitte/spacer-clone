import { useEffect, useMemo, useState } from "react";
import {
  buildEigenModeViewModel,
  buildInfluenceLineViewModel,
  buildResponseSpectrumViewModel,
  buildResultViewModel,
  type ResponseSpectrumSelection,
} from "../results/resultViewModel";
import { ja } from "../i18n/ja";
import { GroundMotionManagerPanel } from "../timeHistory/GroundMotionManagerPanel";
import { TimeHistoryResultViewer } from "../timeHistory/TimeHistoryResultViewer";
import { TimeHistorySettingsPanel } from "../timeHistory/TimeHistorySettingsPanel";
import { useTimeHistoryAnalysis } from "../timeHistory/useTimeHistoryAnalysis";
import type { AnalysisResult, BottomTab, ProjectModel, StructuredMessage } from "../types";

type ResultsPanelProps = {
  activeTab: BottomTab;
  project: ProjectModel;
  result: AnalysisResult | null;
  errors: StructuredMessage[];
  warnings: StructuredMessage[];
  activeLoadCase: string;
  selectedEigenMode: number;
  selectedResponseSpectrumResult: ResponseSpectrumSelection;
  selectedNode: string | null;
  selectedMember: string | null;
  logs: string[];
  onTabChange: (tab: BottomTab) => void;
  onProjectChange: (project: ProjectModel) => void;
  onSelectedEigenModeChange: (modeNo: number) => void;
  onSelectedResponseSpectrumResultChange: (resultKey: ResponseSpectrumSelection) => void;
  onTimeHistoryAnimationOverrideChange?: (override: Map<string, { x: number; y: number; z: number }> | null) => void;
};

type ResultTablesProps = {
  result: AnalysisResult | null;
  activeLoadCase: string;
  selectedEigenMode: number;
  selectedResponseSpectrumResult: ResponseSpectrumSelection;
  selectedNode: string | null;
  selectedMember: string | null;
  onSelectedEigenModeChange: (modeNo: number) => void;
  onSelectedResponseSpectrumResultChange: (resultKey: ResponseSpectrumSelection) => void;
};

const tabs: Array<{ key: BottomTab; label: string }> = [
  { key: "results", label: ja.resultsPanel.tabs.results },
  { key: "timeHistory", label: ja.timeHistory.tab },
  { key: "errors", label: ja.resultsPanel.tabs.errors },
  { key: "warnings", label: ja.resultsPanel.tabs.warnings },
  { key: "logs", label: ja.resultsPanel.tabs.logs },
];

type ResultViewKey = "static" | "eigen" | "response" | "influence" | "timeHistory";

const resultViewLabels: Record<ResultViewKey, string> = {
  static: ja.resultsPanel.resultView.static,
  eigen: ja.resultsPanel.resultView.eigen,
  response: ja.resultsPanel.resultView.response,
  influence: ja.resultsPanel.resultView.influence,
  timeHistory: ja.resultsPanel.resultView.timeHistory,
};

export function ResultsPanel({
  activeTab,
  project,
  result,
  errors,
  warnings,
  activeLoadCase,
  selectedEigenMode,
  selectedResponseSpectrumResult,
  selectedNode,
  selectedMember,
  logs,
  onTabChange,
  onProjectChange,
  onSelectedEigenModeChange,
  onSelectedResponseSpectrumResultChange,
  onTimeHistoryAnimationOverrideChange,
}: ResultsPanelProps) {
  return (
    <section className="bottom-panel">
      <div className="tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={activeTab === tab.key ? "tab active" : "tab"}
            onClick={() => onTabChange(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="tab-body">
        {activeTab === "results" && (
          <ResultTables
            result={result}
            activeLoadCase={activeLoadCase}
            selectedEigenMode={selectedEigenMode}
            selectedResponseSpectrumResult={selectedResponseSpectrumResult}
            selectedNode={selectedNode}
            selectedMember={selectedMember}
            onSelectedEigenModeChange={onSelectedEigenModeChange}
            onSelectedResponseSpectrumResultChange={onSelectedResponseSpectrumResultChange}
          />
        )}
        {activeTab === "timeHistory" && <TimeHistoryWorkspace project={project} result={result} onProjectChange={onProjectChange} onAnimationOverrideChange={onTimeHistoryAnimationOverrideChange} />}
        {activeTab === "errors" && <MessageTable messages={errors} empty={ja.resultsPanel.errorsEmpty} />}
        {activeTab === "warnings" && <MessageTable messages={warnings} empty={ja.resultsPanel.warningsEmpty} />}
        {activeTab === "logs" && (
          <div className="log-list">
            {logs.map((line, index) => (
              <div key={index}>{line}</div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function ResultTables(props: ResultTablesProps) {
  if (!props.result) return <div className="empty-state">{ja.resultsPanel.empty}</div>;
  return <ResultTablesContent {...props} result={props.result} />;
}

function TimeHistoryWorkspace({
  project,
  result,
  onProjectChange,
  onAnimationOverrideChange,
}: {
  project: ProjectModel;
  result: AnalysisResult | null;
  onProjectChange: (project: ProjectModel) => void;
  onAnimationOverrideChange?: (override: Map<string, { x: number; y: number; z: number }> | null) => void;
}) {
  const timeHistoryAnalysis = useTimeHistoryAnalysis();
  const latestResult = timeHistoryAnalysis.result ?? (result?.analysisSummary.analysisType === "time_history" ? result : null);
  const status = timeHistoryAnalysis.loading
    ? "running"
    : timeHistoryAnalysis.error?.code === "TIME_HISTORY_NETWORK_ERROR"
      ? "networkError"
      : latestResult?.analysisSummary.status;

  const runTimeHistory = () => {
    void timeHistoryAnalysis.run(project).catch(() => undefined);
  };

  return (
    <div className="results-grid">
      <TimeHistorySettingsPanel
        project={project}
        running={timeHistoryAnalysis.loading}
        onRun={runTimeHistory}
        onChange={onProjectChange}
      />
      <GroundMotionManagerPanel project={project} onChange={onProjectChange} />
      <TimeHistoryResultViewer
        result={latestResult?.timeHistoryResult ?? null}
        project={project}
        status={status}
        error={timeHistoryAnalysis.error ?? latestResult?.errors[0] ?? null}
        onOverrideChange={onAnimationOverrideChange}
      />
      </div>
  )
}

function ResultTablesContent({
  result,
  activeLoadCase,
  selectedEigenMode,
  selectedResponseSpectrumResult,
  selectedNode,
  selectedMember,
  onSelectedEigenModeChange,
  onSelectedResponseSpectrumResultChange,
}: {
  result: AnalysisResult;
  activeLoadCase: string;
  selectedEigenMode: number;
  selectedResponseSpectrumResult: ResponseSpectrumSelection;
  selectedNode: string | null;
  selectedMember: string | null;
  onSelectedEigenModeChange: (modeNo: number) => void;
  onSelectedResponseSpectrumResultChange: (resultKey: ResponseSpectrumSelection) => void;
}) {
  const summary = result.analysisSummary;
  const viewModel = buildResultViewModel(result, activeLoadCase, selectedResponseSpectrumResult);
  const eigenViewModel = buildEigenModeViewModel(result, selectedEigenMode);
  const responseSpectrumViewModel = buildResponseSpectrumViewModel(result, selectedResponseSpectrumResult);
  const influenceViewModel = buildInfluenceLineViewModel(result);
  const timeHistoryResult = result.timeHistoryResult ?? null;
  const eigenModes = eigenViewModel?.modes ?? [];
  const selectedMode = eigenModes.find((mode) => mode.modeNo === eigenViewModel?.selectedModeNo) ?? eigenModes[0] ?? null;
  const displacements = (viewModel?.displacements.items ?? []).filter(
    (row) => !selectedNode || row.nodeId === selectedNode,
  );
  const reactions = (viewModel?.reactions.items ?? []).filter(
    (row) => !selectedNode || row.nodeId === selectedNode,
  );
  const memberForces = (viewModel?.memberForces.items ?? []).filter(
    (row) => !selectedMember || row.memberId === selectedMember,
  );
  const responseDisplacements = (responseSpectrumViewModel?.displacements.items ?? []).filter(
    (row) => !selectedNode || row.nodeId === selectedNode,
  );
  const responseReactions = (responseSpectrumViewModel?.reactions.items ?? []).filter(
    (row) => !selectedNode || row.nodeId === selectedNode,
  );
  const responseMemberSectionForces = (responseSpectrumViewModel?.memberSectionForces.items ?? []).filter(
    (row) => !selectedMember || row.memberId === selectedMember,
  );
  const filteredInfluenceSeries = (influenceViewModel?.series ?? []).filter(
    (item) =>
      (!selectedNode || item.target.nodeId === selectedNode) &&
      (!selectedMember || item.target.memberId === selectedMember),
  );
  const filteredInfluenceTargets = (influenceViewModel?.targets ?? []).filter(
    (row) =>
      (!selectedNode || row.nodeId === selectedNode) &&
      (!selectedMember || row.memberId === selectedMember),
  );
  const availableViews = useMemo(() => {
    const views: ResultViewKey[] = [];
    if (displacements.length > 0 || reactions.length > 0 || memberForces.length > 0) views.push("static");
    if (eigenModes.length > 0) views.push("eigen");
    if (responseSpectrumViewModel) views.push("response");
    if (influenceViewModel) views.push("influence");
    if (timeHistoryResult) views.push("timeHistory");
    return views.length > 0 ? views : (["static"] satisfies ResultViewKey[]);
  }, [
    displacements.length,
    eigenModes.length,
    influenceViewModel,
    memberForces.length,
    reactions.length,
    responseSpectrumViewModel,
    timeHistoryResult,
  ]);
  const preferredView = preferredResultView(summary.analysisType, availableViews);
  const [activeView, setActiveView] = useState<ResultViewKey>(preferredView);

  useEffect(() => {
    setActiveView((current) => (availableViews.includes(current) ? current : preferredView));
  }, [availableViews, preferredView]);

  return (
    <div className="results-grid">
      <div className="result-overview">
        <div className="summary-list">
          <span>{ja.resultsPanel.summary.status}: {statusLabel(summary.status)}</span>
          <span>{ja.resultsPanel.summary.solver}: {summary.solver}</span>
          <span>{ja.resultsPanel.summary.duration}: {formatNumber(summary.durationMs)} ms</span>
          <span>{ja.resultsPanel.summary.freeDof}: {summary.freeDof}/{summary.totalDof} free</span>
          <span>{ja.resultsPanel.summary.analysisType}: {analysisTypeLabel(summary.analysisType)}</span>
          <span>{ja.resultsPanel.summary.loadCase}: {activeLoadCase || ja.resultsPanel.summary.loadCaseAll}</span>
          {selectedMode && <span>{ja.resultsPanel.summary.mode(selectedMode.modeNo)}</span>}
          {responseSpectrumViewModel && <span>{ja.resultsPanel.summary.responseSpectrum}: {responseSpectrumViewModel.selectedResultLabel}</span>}
          <span>{ja.resultsPanel.summary.selection}: {selectedNode ?? selectedMember ?? ja.resultsPanel.summary.selectionAll}</span>
        </div>
        <div className="result-view-tabs" aria-label={ja.resultsPanel.viewTabsAriaLabel}>
          {availableViews.map((view) => (
            <button
              key={view}
              type="button"
              className={activeView === view ? "result-view-tab active" : "result-view-tab"}
              onClick={() => setActiveView(view)}
            >
              {resultViewLabels[view]}
            </button>
          ))}
        </div>
      </div>
      {activeView === "response" && responseSpectrumViewModel && (
        <>
          <div className="result-table">
            <h3>{ja.resultsPanel.tabs.results}</h3>
            <div className="summary-list result-toolbar">
              <span>{ja.resultsPanel.overview.spectrumCaseId}: {responseSpectrumViewModel.spectrumCaseId}</span>
              <span>{ja.resultsPanel.overview.direction}: {responseSpectrumViewModel.direction}</span>
              <span>{ja.resultsPanel.overview.damping}: {formatNumber(responseSpectrumViewModel.dampingRatio)}</span>
              <span>{ja.resultsPanel.overview.combination}: {responseSpectrumViewModel.combinationMethod}</span>
              <label className="result-select">
                <span>{ja.resultsPanel.overview.show}</span>
                <select
                  value={responseSpectrumViewModel.selectedResultKey}
                  onChange={(event) =>
                    onSelectedResponseSpectrumResultChange(event.currentTarget.value as ResponseSpectrumSelection)
                  }
                >
                  {responseSpectrumViewModel.modeOptions.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          <CompactTable
            title={ja.resultsPanel.tables.modalResponse}
            rows={responseSpectrumViewModel.modalRows}
            columns={["modeNo", "spectralAcceleration", "maxDisplacement", "maxReaction", "maxMemberForce"]}
            onRowClick={(row) => onSelectedResponseSpectrumResultChange(`mode:${Number(row.modeNo)}`)}
          />
          <CompactTable
            title={ja.resultsPanel.tables.combinationResult(responseSpectrumViewModel.combinationMethod)}
            rows={responseSpectrumViewModel.srssRows}
            columns={["method", "maxDisplacement", "maxReaction", "maxMemberForce"]}
            onRowClick={() => onSelectedResponseSpectrumResultChange("SRSS")}
          />
          <CompactTable
            title={ja.resultsPanel.tables.maxDisplacement}
            rows={responseDisplacements}
            columns={["nodeId", "ux", "uy", "uz", "rx", "ry", "rz", "magnitude"]}
          />
          <CompactTable
            title={ja.resultsPanel.tables.maxReaction}
            rows={responseReactions}
            columns={["nodeId", "fx", "fy", "fz", "mx", "my", "mz"]}
          />
          <CompactTable
            title={ja.resultsPanel.tables.maxMemberForce}
            rows={responseMemberSectionForces}
            columns={["memberId", "station", "component", "value"]}
          />
          {responseSpectrumViewModel.directionResults.length > 0 && (
            <CompactTable
              title={ja.resultsPanel.tables.directionSummary}
              rows={responseSpectrumViewModel.directionResults.map((d) => ({
                direction: d.direction,
                combinationMethod: d.combinationMethod,
                interpolationMethod: d.interpolationMethod ?? "-",
                modalCount: d.modalResults,
                combinedCount: d.combinedDisplacementCount,
                usedModes: Array.isArray(d.usedModes) && d.usedModes.length > 0 ? d.usedModes.join(",") : "-",
              }))}
              columns={["direction", "combinationMethod", "interpolationMethod", "modalCount", "combinedCount", "usedModes"]}
              emptyMessage={ja.resultsPanel.tables.directionSummaryEmpty}
            />
          )}
        </>
      )}
      {activeView === "influence" && influenceViewModel && (
        <>
          <div className="result-table">
            <h3>{ja.resultsPanel.tables.influenceResults}</h3>
            <div className="summary-list">
              <span>{ja.resultsPanel.fileScope.case}: {influenceViewModel.caseId}</span>
              <span>{ja.resultsPanel.fileScope.travelMember}: {influenceViewModel.lineMemberId}</span>
              <span>{ja.resultsPanel.fileScope.stationCount}: {influenceViewModel.stationCount}</span>
              <span>{ja.resultsPanel.fileScope.unitLoad}: {formatNumber(influenceViewModel.loadMagnitude)}</span>
              <span>\n                {ja.resultsPanel.fileScope.loadDirection}: {formatNumber(influenceViewModel.loadDirection.x)},{" "}
                {formatNumber(influenceViewModel.loadDirection.y)},{" "}
                {formatNumber(influenceViewModel.loadDirection.z)}
              </span>
            </div>
          </div>
          <InfluenceChart series={filteredInfluenceSeries} />
          <CompactTable
            title={ja.resultsPanel.tables.influenceSeries}
            rows={filteredInfluenceTargets}
            columns={["label", "type", "component", "maxAbs", "min", "max"]}
          />
          <CompactTable
            title={ja.resultsPanel.tables.influenceValues}
            rows={influenceRows(filteredInfluenceSeries)}
            columns={["target", "station", "ratio", "value"]}
          />
        </>
      )}
      {activeView === "timeHistory" && (
        <TimeHistoryResultViewer result={timeHistoryResult} status={summary.status} />
      )}
      {activeView === "eigen" && eigenModes.length > 0 && (
        <>
          <CompactTable
            title={ja.resultsPanel.tables.massPerDirection}
            rows={[
              { direction: "X", totalMass: eigenViewModel?.totalMassX ?? null },
              { direction: "Y", totalMass: eigenViewModel?.totalMassY ?? null },
              { direction: "Z", totalMass: eigenViewModel?.totalMassZ ?? null },
            ]}
            columns={["direction", "totalMass"]}
          />
          <CompactTable
            title={ja.resultsPanel.tables.eigenModes}
            rows={eigenModes.map((mode) => ({
              modeNo: mode.modeNo,
              eigenvalue: mode.eigenvalue,
              circularFrequency: mode.circularFrequency,
              frequency: mode.frequency,
              period: mode.period,
              modalMass: mode.modalMass,
              participationFactorX: mode.participationFactorX,
              participationFactorY: mode.participationFactorY,
              participationFactorZ: mode.participationFactorZ,
              effectiveMassRatioX: mode.effectiveMassRatioX,
              effectiveMassRatioY: mode.effectiveMassRatioY,
              effectiveMassRatioZ: mode.effectiveMassRatioZ,
              effectiveMassX: mode.effectiveMassX,
              effectiveMassY: mode.effectiveMassY,
              effectiveMassZ: mode.effectiveMassZ,
              cumulativeEffectiveMassRatioX: mode.cumulativeEffectiveMassRatioX,
              cumulativeEffectiveMassRatioY: mode.cumulativeEffectiveMassRatioY,
              cumulativeEffectiveMassRatioZ: mode.cumulativeEffectiveMassRatioZ,
            }))}
            columns={[
              "modeNo",
              "eigenvalue",
              "circularFrequency",
              "frequency",
              "period",
              "modalMass",
              "participationFactorX",
              "participationFactorY",
              "participationFactorZ",
              "effectiveMassRatioX",
              "effectiveMassRatioY",
              "effectiveMassRatioZ",
              "effectiveMassX",
              "effectiveMassY",
              "effectiveMassZ",
              "cumulativeEffectiveMassRatioX",
              "cumulativeEffectiveMassRatioY",
              "cumulativeEffectiveMassRatioZ",
            ]}
            onRowClick={(row) => onSelectedEigenModeChange(Number(row.modeNo))}
          />
          <CompactTable
            title={ja.resultsPanel.tables.selectedModeShape}
            rows={(selectedMode?.shape ?? []).filter((row) => !selectedNode || row.nodeId === selectedNode)}
            columns={["nodeId", "ux", "uy", "uz", "rx", "ry", "rz"]}
          />
        </>
      )}
      {activeView === "static" && (
        <>
          <CompactTable
            title={ja.resultsPanel.tables.nodeDisplacement}
            rows={displacements}
            columns={["nodeId", "ux", "uy", "uz", "rx", "ry", "rz", "magnitude"]}
          />
          <CompactTable
            title={ja.resultsPanel.tables.supportReaction}
            rows={reactions}
            columns={["nodeId", "fx", "fy", "fz", "mx", "my", "mz"]}
          />
          <CompactTable
            title={ja.resultsPanel.tables.memberSectionForce}
            rows={memberForces}
            columns={["memberId", "component", "i", "j"]}
          />
        </>
      )}
    </div>
  );
}

function InfluenceChart({
  series,
}: {
  series: Array<{
    targetId: string;
    label: string;
    target: { type: string };
    points: Array<{ station: number; ratio: number; value: number }>;
  }>;
}) {
  const seriesKey = series.map((item) => item.targetId).join("\u0000");
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    series.map((item) => item.targetId),
  );

  useEffect(() => {
    setSelectedIds(series.map((item) => item.targetId));
  }, [seriesKey]);

  const visibleSeries = series.filter((item) => selectedIds.includes(item.targetId));
  const values = visibleSeries.flatMap((item) => item.points.map((point) => point.value));
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const span = max - min || 1;
  const width = 760;
  const height = 220;
  const padding = 28;
  const colors = ["#2f6f9f", "#c94f4f", "#2f855a", "#805ad5", "#b7791f", "#4a5568"];

  return (
    <div className="result-table influence-chart">
      <h3>{ja.resultsPanel.tables.influenceChart}</h3>
      {series.length === 0 ? (
        <div className="empty-state">{ja.resultsPanel.tables.influenceChartEmpty}</div>
      ) : (
        <>
          <div className="series-picker-actions">
            <button
              type="button"
              onClick={() => setSelectedIds(series.map((item) => item.targetId))}
              disabled={selectedIds.length === series.length}
            >
              {ja.resultsPanel.tables.influenceSelectAll}
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              disabled={selectedIds.length === 0}
            >
              {ja.resultsPanel.tables.influenceClearAll}
            </button>
          </div>
          <div className="series-picker" aria-label={ja.resultsPanel.tables.influencePickerAriaLabel}>
            {series.map((item) => (
              <label key={item.targetId}>
                <input
                  type="checkbox"
                  data-target-id={item.targetId}
                  checked={selectedIds.includes(item.targetId)}
                  onChange={(event) => {
                    const checked = event.currentTarget.checked;
                    setSelectedIds((current) =>
                      checked
                        ? [...current, item.targetId]
                        : current.filter((id) => id !== item.targetId),
                    );
                  }}
                />
                <span>{item.label}</span>
              </label>
            ))}
          </div>
          <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Influence line graph">
            <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} />
            <line x1={padding} y1={padding} x2={padding} y2={height - padding} />
            <line
              className="zero-line"
              x1={padding}
              y1={scaleY(0, min, span, height, padding)}
              x2={width - padding}
              y2={scaleY(0, min, span, height, padding)}
            />
            <text x={width / 2} y={height - 6} textAnchor="middle">
              {ja.resultsPanel.tables.influenceAxis.x}
            </text>
            <text x={12} y={height / 2} textAnchor="middle" transform={`rotate(-90 12 ${height / 2})`}>
              {ja.resultsPanel.tables.influenceAxis.y}
            </text>
            <text x={padding} y={height - padding + 14} textAnchor="middle">
              {ja.resultsPanel.tables.influenceAxis.origin}
            </text>
            <text x={width - padding} y={height - padding + 14} textAnchor="middle">
              {ja.resultsPanel.tables.influenceAxis.unit}
            </text>
            <text x={padding - 6} y={scaleY(max, min, span, height, padding) + 4} textAnchor="end">
              {formatNumber(max)}
            </text>
            <text x={padding - 6} y={scaleY(min, min, span, height, padding) + 4} textAnchor="end">
              {formatNumber(min)}
            </text>
            {visibleSeries.map((item, index) => (
              <polyline
                key={item.targetId}
                data-target-id={item.targetId}
                points={item.points
                  .map((point) => {
                    const x = padding + point.ratio * (width - 2 * padding);
                    const y = scaleY(point.value, min, span, height, padding);
                    return `${x},${y}`;
                  })
                  .join(" ")}
                fill="none"
                stroke={colors[index % colors.length]}
                strokeWidth="2"
              />
            ))}
          </svg>
          {visibleSeries.length === 0 ? (
            <div className="empty-state compact-empty">{ja.resultsPanel.tables.influenceNoSeriesSelected}</div>
          ) : (
            <div className="chart-legend">
              {visibleSeries.map((item, index) => (
                <span key={item.targetId}>
                  <i style={{ background: colors[index % colors.length] }} />
                  {item.label}
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function scaleY(value: number, min: number, span: number, height: number, padding: number): number {
  return height - padding - ((value - min) / span) * (height - 2 * padding);
}

function influenceRows(
  series: Array<{
    label: string;
    points: Array<{ station: number; ratio: number; value: number }>;
  }>,
): Array<Record<string, unknown>> {
  return series.flatMap((item) =>
    item.points.map((point) => ({
      target: item.label,
      station: point.station,
      ratio: point.ratio,
      value: point.value,
    })),
  );
}

function CompactTable({
  title,
  rows,
  columns,
  onRowClick,
  emptyMessage = ja.resultsPanel.empty,
  // Default text shown when rows is empty; callers may pass a more specific message.
}: {
  title: string;
  rows: Array<Record<string, unknown>>;
  columns: string[];
  onRowClick?: (row: Record<string, unknown>) => void;
  emptyMessage?: string;
}) {
  return (
    <div className="result-table">
      <h3>{title}</h3>
      {rows.length === 0 ? (
        <div className="empty-state">{emptyMessage}</div>
      ) : (
        <table>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column}>{columnLabel(column)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} onClick={() => onRowClick?.(row)}>
                {columns.map((column) => (
                  <td key={column}>{formatCell(row[column])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function MessageTable({ messages, empty }: { messages: StructuredMessage[]; empty: string }) {
  if (messages.length === 0) return <div className="empty-state">{empty}</div>;
  return (
    <table className="message-table">
      <thead>
        <tr>
          <th>{ja.resultsPanel.messageTable.description}</th>
          <th>{ja.resultsPanel.messageTable.code}</th>
          <th>{ja.resultsPanel.messageTable.path}</th>
          <th>{ja.resultsPanel.messageTable.target}</th>
          <th>{ja.resultsPanel.messageTable.detail}</th>
        </tr>
      </thead>
      <tbody>
        {messages.map((message, index) => (
          <tr key={`${message.code}-${index}`}>
            <td>
              <strong>{errorDescription(message.code)}</strong>
            </td>
            <td>{message.code}</td>
            <td>{message.path ?? "-"}</td>
            <td>{message.entityId ?? message.entityType ?? "-"}</td>
            <td>{message.message}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function formatCell(value: unknown): string {
  if (typeof value === "number") return formatNumber(value);
  if (Array.isArray(value)) return value.join(", ");
  return value == null ? "-" : String(value);
}

function columnLabel(column: string): string {
  return ja.resultsPanel.columns[column] ?? column;
}

function preferredResultView(analysisType: string, availableViews: ResultViewKey[]): ResultViewKey {
  const preferred =
    analysisType === "eigen"
      ? "eigen"
      : analysisType === "response_spectrum" || analysisType === "responseSpectrum"
        ? "response"
      : analysisType === "influence_line"
        ? "influence"
        : analysisType === "time_history"
          ? "timeHistory"
          : "static";
  return availableViews.includes(preferred) ? preferred : availableViews[0] ?? "static";
}

function analysisTypeLabel(analysisType: string): string {
  return ja.resultsPanel.analysisType[analysisType] ?? analysisType;
}

function statusLabel(status: string): string {
  return ja.resultsPanel.statusLabel[status] ?? status;
}

function errorDescription(code: string): string {
  return ja.resultsPanel.errorDescriptions[code] ?? ja.common.pleaseCheckInput;
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "";
  return Math.abs(value) > 10000 || (Math.abs(value) > 0 && Math.abs(value) < 0.001)
    ? value.toExponential(4)
    : value.toFixed(6).replace(/\.?0+$/, "");
}
