/**
 * Step 4-A workflow diagnostics panel.
 * L1: Japanese message; L3: diagnostic code (collapsed).
 */
import type { WorkflowDiagnostic, WorkflowStepState } from "../workflow/types";
import { getDiagnosticMessage } from "../i18n";
import { TechnicalDetails } from "./TechnicalDetails";

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
  const catalog = getDiagnosticMessage(entry.code);
  const l1 = catalog.l1 !== "表示文言未登録" ? catalog.l1 : entry.message;
  const l2 = catalog.l2;
  return (
    <li className={`apollo-wf-diagnostic apollo-wf-diagnostic-${entry.severity}`} data-severity={entry.severity}>
      <span className="apollo-wf-diagnostic-code" aria-hidden="true">
        {severitySymbol(entry.severity)}
      </span>
      <div className="apollo-wf-diagnostic-body">
        <p className="apollo-wf-diagnostic-message">{l1}</p>
        {l2 ? <p className="apollo-wf-diagnostic-l2">{l2}</p> : null}
        {entry.blocking ? (
          <p className="apollo-wf-diagnostic-blocking" data-testid="apollo-wf-diagnostic-blocking">
            先に解消が必要です
          </p>
        ) : null}
        <p className="apollo-wf-diagnostic-remediation">
          対処: {catalog.nextAction ?? entry.remediation}
        </p>
        <TechnicalDetails
          testId={`apollo-wf-diag-${entry.diagnosticId}-tech`}
          lines={[
            `diagnosticCode=${entry.code}`,
            entry.technicalDetail ? `detail=${entry.technicalDetail}` : "",
          ].filter(Boolean)}
        />
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
