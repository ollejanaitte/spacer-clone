import { useEffect, useMemo, useState } from "react";
import {
  buildEigenModeViewModel,
  buildInfluenceLineViewModel,
  buildResponseSpectrumViewModel,
  buildResultViewModel,
  type ResponseSpectrumSelection,
} from "../results/resultViewModel";
import type { AnalysisResult, BottomTab, StructuredMessage } from "../types";

type ResultsPanelProps = {
  activeTab: BottomTab;
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
  onSelectedEigenModeChange: (modeNo: number) => void;
  onSelectedResponseSpectrumResultChange: (resultKey: ResponseSpectrumSelection) => void;
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
  { key: "results", label: "解析結果" },
  { key: "errors", label: "エラー" },
  { key: "warnings", label: "警告" },
  { key: "logs", label: "ログ" },
];

type ResultViewKey = "static" | "eigen" | "response" | "influence";

const resultViewLabels: Record<ResultViewKey, string> = {
  static: "静的",
  eigen: "固有値",
  response: "応答スペクトル",
  influence: "影響線",
};

export function ResultsPanel({
  activeTab,
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
  onSelectedEigenModeChange,
  onSelectedResponseSpectrumResultChange,
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
        {activeTab === "errors" && <MessageTable messages={errors} empty="エラーはありません。" />}
        {activeTab === "warnings" && <MessageTable messages={warnings} empty="警告はありません。" />}
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
  if (!props.result) return <div className="empty-state">解析結果はまだありません。</div>;
  return <ResultTablesContent {...props} result={props.result} />;
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
    return views.length > 0 ? views : (["static"] satisfies ResultViewKey[]);
  }, [
    displacements.length,
    eigenModes.length,
    influenceViewModel,
    memberForces.length,
    reactions.length,
    responseSpectrumViewModel,
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
          <span>状態: {statusLabel(summary.status)}</span>
          <span>ソルバ: {summary.solver}</span>
          <span>計算時間: {formatNumber(summary.durationMs)} ms</span>
          <span>自由度: {summary.freeDof}/{summary.totalDof} free</span>
          <span>解析種別: {analysisTypeLabel(summary.analysisType)}</span>
          <span>荷重ケース: {activeLoadCase || "すべて"}</span>
          {selectedMode && <span>Mode: {selectedMode.modeNo}</span>}
          {responseSpectrumViewModel && <span>応答: {responseSpectrumViewModel.selectedResultLabel}</span>}
          <span>選択: {selectedNode ?? selectedMember ?? "すべて"}</span>
        </div>
        <div className="result-view-tabs" aria-label="結果表示切替">
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
            <h3>応答スペクトル結果</h3>
            <div className="summary-list result-toolbar">
              <span>スペクトル: {responseSpectrumViewModel.spectrumCaseId}</span>
              <span>方向: {responseSpectrumViewModel.direction}</span>
              <span>減衰: {formatNumber(responseSpectrumViewModel.dampingRatio)}</span>
              <span>合成: {responseSpectrumViewModel.combinationMethod}</span>
              <label className="result-select">
                <span>表示</span>
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
            title="モード別応答"
            rows={responseSpectrumViewModel.modalRows}
            columns={["modeNo", "spectralAcceleration", "maxDisplacement", "maxReaction", "maxMemberForce"]}
            onRowClick={(row) => onSelectedResponseSpectrumResultChange(`mode:${Number(row.modeNo)}`)}
          />
          <CompactTable
            title="SRSS合成結果"
            rows={responseSpectrumViewModel.srssRows}
            columns={["method", "maxDisplacement", "maxReaction", "maxMemberForce"]}
            onRowClick={() => onSelectedResponseSpectrumResultChange("SRSS")}
          />
          <CompactTable
            title="最大変位"
            rows={responseDisplacements}
            columns={["nodeId", "ux", "uy", "uz", "rx", "ry", "rz", "magnitude"]}
          />
          <CompactTable
            title="最大反力"
            rows={responseReactions}
            columns={["nodeId", "fx", "fy", "fz", "mx", "my", "mz"]}
          />
          <CompactTable
            title="最大断面力"
            rows={responseMemberSectionForces}
            columns={["memberId", "station", "component", "value"]}
          />
        </>
      )}
      {activeView === "influence" && influenceViewModel && (
        <>
          <div className="result-table">
            <h3>影響線結果</h3>
            <div className="summary-list">
              <span>ケース: {influenceViewModel.caseId}</span>
              <span>走行部材: {influenceViewModel.lineMemberId}</span>
              <span>分割数: {influenceViewModel.stationCount}</span>
              <span>単位荷重: {formatNumber(influenceViewModel.loadMagnitude)}</span>
              <span>
                荷重方向: {formatNumber(influenceViewModel.loadDirection.x)},{" "}
                {formatNumber(influenceViewModel.loadDirection.y)},{" "}
                {formatNumber(influenceViewModel.loadDirection.z)}
              </span>
            </div>
          </div>
          <InfluenceChart series={filteredInfluenceSeries} />
          <CompactTable
            title="影響線系列"
            rows={filteredInfluenceTargets}
            columns={["label", "type", "component", "maxAbs", "min", "max"]}
          />
          <CompactTable
            title="影響線値"
            rows={influenceRows(filteredInfluenceSeries)}
            columns={["target", "station", "ratio", "value"]}
          />
        </>
      )}
      {activeView === "eigen" && eigenModes.length > 0 && (
        <>
          <CompactTable
            title="固有モード一覧"
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
            ]}
            onRowClick={(row) => onSelectedEigenModeChange(Number(row.modeNo))}
          />
          <CompactTable
            title="選択モード形"
            rows={(selectedMode?.shape ?? []).filter((row) => !selectedNode || row.nodeId === selectedNode)}
            columns={["nodeId", "ux", "uy", "uz", "rx", "ry", "rz"]}
          />
        </>
      )}
      {activeView === "static" && (
        <>
          <CompactTable
            title="節点変位表"
            rows={displacements}
            columns={["nodeId", "ux", "uy", "uz", "rx", "ry", "rz", "magnitude"]}
          />
          <CompactTable
            title="支点反力表"
            rows={reactions}
            columns={["nodeId", "fx", "fy", "fz", "mx", "my", "mz"]}
          />
          <CompactTable
            title="部材断面力表"
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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const defaultIds = useMemo(() => series.slice(0, 3).map((item) => item.targetId), [series]);

  useEffect(() => {
    setSelectedIds((current) => {
      const currentValid = current.filter((id) => series.some((item) => item.targetId === id));
      return currentValid.length > 0 ? currentValid : defaultIds;
    });
  }, [defaultIds, series]);

  const visibleSeries = series.filter((item) => selectedIds.includes(item.targetId)).slice(0, 6);
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
      <h3>影響線グラフ</h3>
      {series.length === 0 ? (
        <div className="empty-state">影響線系列がありません。</div>
      ) : (
        <>
          <div className="series-picker" aria-label="影響線系列選択">
            {series.map((item) => (
              <label key={item.targetId}>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(item.targetId)}
                  onChange={(event) => {
                    setSelectedIds((current) =>
                      event.currentTarget.checked
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
              走行位置比
            </text>
            <text x={12} y={height / 2} textAnchor="middle" transform={`rotate(-90 12 ${height / 2})`}>
              影響値
            </text>
            <text x={padding} y={height - padding + 14} textAnchor="middle">
              0
            </text>
            <text x={width - padding} y={height - padding + 14} textAnchor="middle">
              1
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
            <div className="empty-state compact-empty">表示する系列を選択してください。</div>
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
}: {
  title: string;
  rows: Array<Record<string, unknown>>;
  columns: string[];
  onRowClick?: (row: Record<string, unknown>) => void;
}) {
  return (
    <div className="result-table">
      <h3>{title}</h3>
      {rows.length === 0 ? (
        <div className="empty-state">行がありません。</div>
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
          <th>説明</th>
          <th>コード</th>
          <th>場所</th>
          <th>対象</th>
          <th>詳細</th>
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
  return String(value ?? "");
}

function columnLabel(column: string): string {
  const labels: Record<string, string> = {
    nodeId: "節点ID",
    memberId: "部材ID",
    component: "成分",
    magnitude: "並進合成",
    station: "位置",
    ratio: "位置比",
    target: "系列",
    type: "種別",
    label: "系列名",
    maxAbs: "最大絶対値",
    min: "最小",
    max: "最大",
    value: "値",
    method: "方法",
    ux: "UX",
    uy: "UY",
    uz: "UZ",
    rx: "RX",
    ry: "RY",
    rz: "RZ",
    fx: "Fx",
    fy: "Fy",
    fz: "Fz",
    mx: "Mx",
    my: "My",
    mz: "Mz",
    i: "I端",
    j: "J端",
    modeNo: "Mode",
    eigenvalue: "λ",
    circularFrequency: "ω",
    frequency: "f",
    period: "T",
    modalMass: "モード質量",
    spectralAcceleration: "Sa",
    maxDisplacement: "最大変位",
    maxReaction: "最大反力",
    maxMemberForce: "最大断面力",
    participationFactorX: "刺激係数 X",
    participationFactorY: "刺激係数 Y",
    participationFactorZ: "刺激係数 Z",
    effectiveMassRatioX: "有効質量比 X",
    effectiveMassRatioY: "有効質量比 Y",
    effectiveMassRatioZ: "有効質量比 Z",
  };
  return labels[column] ?? column;
}

function preferredResultView(analysisType: string, availableViews: ResultViewKey[]): ResultViewKey {
  const preferred =
    analysisType === "eigen"
      ? "eigen"
      : analysisType === "response_spectrum" || analysisType === "responseSpectrum"
        ? "response"
        : analysisType === "influence_line"
          ? "influence"
          : "static";
  return availableViews.includes(preferred) ? preferred : availableViews[0] ?? "static";
}

function analysisTypeLabel(analysisType: string): string {
  const labels: Record<string, string> = {
    linear_static: "線形静的",
    eigen: "固有値",
    response_spectrum: "応答スペクトル",
    responseSpectrum: "応答スペクトル",
    influence_line: "影響線",
  };
  return labels[analysisType] ?? analysisType;
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    success: "成功",
    warning: "警告あり",
    failed: "失敗",
  };
  return labels[status] ?? status;
}

function errorDescription(code: string): string {
  const descriptions: Record<string, string> = {
    INVALID_REFERENCE: "存在しない節点、部材、材料、断面などを参照しています。",
    MODEL_UNSTABLE: "支点条件が不足しています。",
    SOLVER_ERROR: "解析ソルバでエラーが発生しました。",
    SCHEMA_ERROR: "入力データの形式に誤りがあります。",
    DUPLICATE_ID: "同じIDが複数使用されています。",
    INVALID_VALUE: "数値が未設定、範囲外、または不正です。",
    ZERO_LENGTH_MEMBER: "部材のI端とJ端が同じ位置です。",
    POSTPROCESS_ERROR: "解析結果の整理中にエラーが発生しました。",
    DISCONNECTED_NODE: "部材に接続されていない節点があります。",
    WEBGL_INIT_FAILED: "3D表示を初期化できませんでした。",
    NETWORK_ERROR: "APIサーバーに接続できません。",
    VALIDATION_API_ERROR: "入力チェックAPIでエラーが発生しました。",
    ANALYSIS_API_ERROR: "解析実行APIでエラーが発生しました。",
    PROJECT_OPEN_ERROR: "project.jsonを開けませんでした。",
  };
  return descriptions[code] ?? "入力内容を確認してください。";
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "";
  return Math.abs(value) > 10000 || (Math.abs(value) > 0 && Math.abs(value) < 0.001)
    ? value.toExponential(4)
    : value.toFixed(6).replace(/\.?0+$/, "");
}
