import type { AnalysisResult, BottomTab, StructuredMessage } from "../types";

type ResultsPanelProps = {
  activeTab: BottomTab;
  result: AnalysisResult | null;
  errors: StructuredMessage[];
  warnings: StructuredMessage[];
  logs: string[];
  onTabChange: (tab: BottomTab) => void;
};

const tabs: Array<{ key: BottomTab; label: string }> = [
  { key: "results", label: "Results" },
  { key: "errors", label: "Errors" },
  { key: "warnings", label: "Warnings" },
  { key: "logs", label: "Logs" },
];

export function ResultsPanel({
  activeTab,
  result,
  errors,
  warnings,
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
        {activeTab === "results" && <ResultTables result={result} />}
        {activeTab === "errors" && <MessageTable messages={errors} empty="No errors." />}
        {activeTab === "warnings" && <MessageTable messages={warnings} empty="No warnings." />}
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

function ResultTables({ result }: { result: AnalysisResult | null }) {
  if (!result) return <div className="empty-state">No analysis result.</div>;
  const summary = result.analysisSummary;

  return (
    <div className="results-grid">
      <div className="summary-list">
        <span>Status: {summary.status}</span>
        <span>Solver: {summary.solver}</span>
        <span>Duration: {formatNumber(summary.durationMs)} ms</span>
        <span>DOF: {summary.freeDof}/{summary.totalDof} free</span>
      </div>
      <CompactTable
        title="Displacements"
        rows={result.displacements}
        columns={["loadCaseId", "nodeId", "ux", "uy", "uz", "rx", "ry", "rz"]}
      />
      <CompactTable
        title="Reactions"
        rows={result.reactions}
        columns={["loadCaseId", "nodeId", "fx", "fy", "fz", "mx", "my", "mz"]}
      />
      <CompactTable
        title="Member End Forces"
        rows={result.memberEndForces.map((row) => ({
          loadCaseId: row.loadCaseId,
          memberId: row.memberId,
          iFx: row.i.fx,
          iFy: row.i.fy,
          iFz: row.i.fz,
          jFx: row.j.fx,
          jFy: row.j.fy,
          jFz: row.j.fz,
        }))}
        columns={["loadCaseId", "memberId", "iFx", "iFy", "iFz", "jFx", "jFy", "jFz"]}
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
        <div className="empty-state">No rows.</div>
      ) : (
        <table>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column}>{column}</th>
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
          <th>Code</th>
          <th>Path</th>
          <th>Entity</th>
          <th>Message</th>
        </tr>
      </thead>
      <tbody>
        {messages.map((message, index) => (
          <tr key={`${message.code}-${index}`}>
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

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "";
  return Math.abs(value) > 10000 || (Math.abs(value) > 0 && Math.abs(value) < 0.001)
    ? value.toExponential(4)
    : value.toFixed(6).replace(/\.?0+$/, "");
}
