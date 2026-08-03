/**
 * Step 4-A workflow diagnostics panel.
 * Lists step diagnostics/warnings with code + message + remediation.
 * Each entry is text-labeled (never color-only) for a11y.
 */
import type { WorkflowDiagnostic, WorkflowStepState } from "../workflow/types";

type Props = {
  readonly step: WorkflowStepState;
};

export function WorkflowDiagnosticsPanel({ step }: Props) {
  const all = [...step.diagnostics, ...step.warnings];
  if (all.length === 0) {
    return (
      <p className="apollo-wf-no-diagnostics" data-testid="apollo-wf-no-diagnostics">
        診断なし
      </p>
    );
  }
  return (
    <ul className="apollo-wf-diagnostics" data-testid="apollo-wf-diagnostics" aria-label={`${step.workflowStepId} の診断`}>
      {all.map((entry) => (
        <DiagnosticRow key={entry.diagnosticId} entry={entry} />
      ))}
    </ul>
  );
}

function DiagnosticRow({ entry }: { readonly entry: WorkflowDiagnostic }) {
  return (
    <li className={`apollo-wf-diagnostic apollo-wf-diagnostic-${entry.severity}`} data-severity={entry.severity}>
      <span className="apollo-wf-diagnostic-code" aria-hidden="true">
        {severitySymbol(entry.severity)}
      </span>
      <div className="apollo-wf-diagnostic-body">
        <p className="apollo-wf-diagnostic-message">
          <span className="apollo-wf-diagnostic-code-text">{entry.code}</span> {entry.message}
        </p>
        {entry.blocking ? (
          <p className="apollo-wf-diagnostic-blocking" data-testid="apollo-wf-diagnostic-blocking">
            ブロッキング
          </p>
        ) : null}
        <p className="apollo-wf-diagnostic-detail">{entry.technicalDetail}</p>
        <p className="apollo-wf-diagnostic-remediation">対処: {entry.remediation}</p>
      </div>
    </li>
  );
}

function severitySymbol(severity: WorkflowDiagnostic["severity"]): string {
  switch (severity) {
    case "error":
      return "✕";
    case "warning":
      return "!";
    case "info":
      return "i";
  }
}
