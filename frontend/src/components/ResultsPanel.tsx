import type { AnalysisResult, BottomTab, StructuredMessage } from "../types";

type ResultsPanelProps = {
  activeTab: BottomTab;
  result: AnalysisResult | null;
  errors: StructuredMessage[];
  warnings: StructuredMessage[];
  activeLoadCase: string;
  selectedNode: string | null;
  selectedMember: string | null;
  logs: string[];
  onTabChange: (tab: BottomTab) => void;
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
  selectedNode,
  selectedMember,
  logs,
  onTabChange,
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
            selectedNode={selectedNode}
            selectedMember={selectedMember}
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
  selectedNode,
  selectedMember,
}: {
  result: AnalysisResult | null;
  activeLoadCase: string;
  selectedNode: string | null;
  selectedMember: string | null;
}) {
  if (!result) return <div className="empty-state">解析結果はまだありません。</div>;
  const summary = result.analysisSummary;
  const displacements = result.displacements.filter(
    (row) =>
      (!activeLoadCase || row.loadCaseId === activeLoadCase) &&
      (!selectedNode || row.nodeId === selectedNode),
  );
  const reactions = result.reactions.filter(
    (row) =>
      (!activeLoadCase || row.loadCaseId === activeLoadCase) &&
      (!selectedNode || row.nodeId === selectedNode),
  );
  const memberEndForces = result.memberEndForces.filter(
    (row) =>
      (!activeLoadCase || row.loadCaseId === activeLoadCase) &&
      (!selectedMember || row.memberId === selectedMember),
  );

  return (
    <div className="results-grid">
      <div className="summary-list">
        <span>状態: {statusLabel(summary.status)}</span>
        <span>ソルバー: {summary.solver}</span>
        <span>計算時間: {formatNumber(summary.durationMs)} ms</span>
        <span>自由度: {summary.freeDof}/{summary.totalDof} free</span>
        <span>荷重ケース: {activeLoadCase || "すべて"}</span>
        <span>選択: {selectedNode ?? selectedMember ?? "すべて"}</span>
      </div>
      <CompactTable
        title="節点変位"
        rows={displacements}
        columns={["loadCaseId", "nodeId", "ux", "uy", "uz", "rx", "ry", "rz"]}
      />
      <CompactTable
        title="支点反力"
        rows={reactions}
        columns={["loadCaseId", "nodeId", "fx", "fy", "fz", "mx", "my", "mz"]}
      />
      <CompactTable
        title="部材端力"
        rows={memberEndForces.map((row) => ({
          loadCaseId: row.loadCaseId,
          memberId: row.memberId,
          iFx: row.i.fx,
          iFy: row.i.fy,
          iFz: row.i.fz,
          iMx: row.i.mx,
          iMy: row.i.my,
          iMz: row.i.mz,
          jFx: row.j.fx,
          jFy: row.j.fy,
          jFz: row.j.fz,
          jMx: row.j.mx,
          jMy: row.j.my,
          jMz: row.j.mz,
        }))}
        columns={[
          "loadCaseId",
          "memberId",
          "iFx",
          "iFy",
          "iFz",
          "iMx",
          "iMy",
          "iMz",
          "jFx",
          "jFy",
          "jFz",
          "jMx",
          "jMy",
          "jMz",
        ]}
      />
    </div>
  );
}

function CompactTable({
  title,
  rows,
  columns,
}: {
  title: string;
  rows: Array<Record<string, unknown>>;
  columns: string[];
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
              <tr key={index}>
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
    loadCaseId: "荷重ケースID",
    nodeId: "節点ID",
    memberId: "部材ID",
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
    iFx: "I端 Fx",
    iFy: "I端 Fy",
    iFz: "I端 Fz",
    iMx: "I端 Mx",
    iMy: "I端 My",
    iMz: "I端 Mz",
    jFx: "J端 Fx",
    jFy: "J端 Fy",
    jFz: "J端 Fz",
    jMx: "J端 Mx",
    jMy: "J端 My",
    jMz: "J端 Mz",
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
    SOLVER_ERROR: "支点条件またはモデル条件が不足している可能性があります。",
    SCHEMA_ERROR: "入力データの形式に誤りがあります。",
    DUPLICATE_ID: "同じIDが複数使われています。",
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
