import { buildResultViewModel } from "../results/resultViewModel";
import type { AnalysisResult, BottomTab, StructuredMessage } from "../types";

type ResultsPanelProps = {
  activeTab: BottomTab;
  result: AnalysisResult | null;
  errors: StructuredMessage[];
  warnings: StructuredMessage[];
  activeLoadCase: string;
  selectedEigenMode: number;
  selectedNode: string | null;
  selectedMember: string | null;
  logs: string[];
  onTabChange: (tab: BottomTab) => void;
  onSelectedEigenModeChange: (modeNo: number) => void;
};

const tabs: Array<{ key: BottomTab; label: string }> = [
  { key: "results", label: "解析結果" },
  { key: "errors", label: "エラー" },
  { key: "warnings", label: "警告" },
  { key: "logs", label: "ログ" },
];

export function ResultsPanel({
  activeTab,
  result,
  errors,
  warnings,
  activeLoadCase,
  selectedEigenMode,
  selectedNode,
  selectedMember,
  logs,
  onTabChange,
  onSelectedEigenModeChange,
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
            selectedNode={selectedNode}
            selectedMember={selectedMember}
            onSelectedEigenModeChange={onSelectedEigenModeChange}
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

function ResultTables({
  result,
  activeLoadCase,
  selectedEigenMode,
  selectedNode,
  selectedMember,
  onSelectedEigenModeChange,
}: {
  result: AnalysisResult | null;
  activeLoadCase: string;
  selectedEigenMode: number;
  selectedNode: string | null;
  selectedMember: string | null;
  onSelectedEigenModeChange: (modeNo: number) => void;
}) {
  if (!result) return <div className="empty-state">解析結果はまだありません。</div>;

  const summary = result.analysisSummary;
  const viewModel = buildResultViewModel(result, activeLoadCase);
  const eigenModes = result.eigenResult?.modes ?? [];
  const selectedMode = eigenModes.find((mode) => mode.modeNo === selectedEigenMode) ?? eigenModes[0] ?? null;
  const displacements = (viewModel?.displacements.items ?? []).filter(
    (row) => !selectedNode || row.nodeId === selectedNode,
  );
  const reactions = (viewModel?.reactions.items ?? []).filter(
    (row) => !selectedNode || row.nodeId === selectedNode,
  );
  const memberForces = (viewModel?.memberForces.items ?? []).filter(
    (row) => !selectedMember || row.memberId === selectedMember,
  );

  return (
    <div className="results-grid">
      <div className="summary-list">
        <span>状態: {statusLabel(summary.status)}</span>
        <span>ソルバ: {summary.solver}</span>
        <span>計算時間: {formatNumber(summary.durationMs)} ms</span>
        <span>自由度: {summary.freeDof}/{summary.totalDof} free</span>
        <span>解析種別: {summary.analysisType}</span>
        <span>荷重ケース: {activeLoadCase || "すべて"}</span>
        {selectedMode && <span>Mode: {selectedMode.modeNo}</span>}
        <span>選択: {selectedNode ?? selectedMember ?? "すべて"}</span>
      </div>
      {eigenModes.length > 0 && (
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
              effectiveMassX: mode.effectiveMassRatios.find((item) => item.direction === "X")?.value ?? 0,
              effectiveMassY: mode.effectiveMassRatios.find((item) => item.direction === "Y")?.value ?? 0,
              effectiveMassZ: mode.effectiveMassRatios.find((item) => item.direction === "Z")?.value ?? 0,
            }))}
            columns={[
              "modeNo",
              "eigenvalue",
              "circularFrequency",
              "frequency",
              "period",
              "modalMass",
              "effectiveMassX",
              "effectiveMassY",
              "effectiveMassZ",
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
    </div>
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
    modalMass: "Modal mass",
    effectiveMassX: "Meff X",
    effectiveMassY: "Meff Y",
    effectiveMassZ: "Meff Z",
  };
  return labels[column] ?? column;
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
