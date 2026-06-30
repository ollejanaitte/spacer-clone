import { useMemo } from "react";
import { ja } from "../../i18n/ja";
import { type LinerDraft } from "../adapters/linerUiAdapter";
import { LINER_DIAGNOSTIC_CODES } from "../core/diagnostics";
import { validateAlignment } from "../core/geometry/horizontal";
import type { DiagnosticLevel, LinerDiagnosticCode, ValidationIssue } from "../core/types";

export type ContinuityDiagnosticsPanelProps = {
  draft: LinerDraft;
};

const CONTINUITY_DIAGNOSTIC_CODES = new Set<LinerDiagnosticCode>([
  LINER_DIAGNOSTIC_CODES.positionDiscontinuity,
  LINER_DIAGNOSTIC_CODES.azimuthDiscontinuity,
]);

const LEVEL_ORDER: DiagnosticLevel[] = ["error", "warning", "info"];

export function ContinuityDiagnosticsPanel({ draft }: ContinuityDiagnosticsPanelProps) {
  const diagnostics = useMemo(
    () =>
      validateAlignment(draft.alignment).filter((issue) =>
        CONTINUITY_DIAGNOSTIC_CODES.has(issue.code as LinerDiagnosticCode),
      ),
    [draft.alignment],
  );

  const diagnosticsByLevel = useMemo(() => groupDiagnosticsByLevel(diagnostics), [diagnostics]);

  return (
    <section
      className="liner-edit-panel liner-continuity-diagnostics-panel"
      aria-labelledby="liner-continuity-diagnostics-title"
      data-testid="continuity-diagnostics-panel"
    >
      <h2 id="liner-continuity-diagnostics-title">{ja.liner.diagnostics.continuityPanelTitle}</h2>
      {diagnostics.length === 0 ? (
        <p className="liner-edit-help" data-testid="continuity-diagnostics-empty">
          {ja.liner.diagnostics.emptyContinuityDiagnostics}
        </p>
      ) : (
        LEVEL_ORDER.map((level) => {
          const levelDiagnostics = diagnosticsByLevel[level];
          if (levelDiagnostics.length === 0) {
            return null;
          }

          return (
            <section
              key={level}
              className="liner-continuity-diagnostics-group"
              aria-label={diagnosticSeverityLabel(level)}
              data-testid={`continuity-diagnostics-${level}`}
            >
              <h3 className="liner-continuity-diagnostics-level">
                {diagnosticSeverityLabel(level)}
                <span className="liner-continuity-diagnostics-count">
                  {ja.liner.editor.count(levelDiagnostics.length)}
                </span>
              </h3>
              <ul className="liner-preview-diagnostics">
                {levelDiagnostics.map((diagnostic, index) => (
                  <li
                    key={`${diagnostic.code}-${diagnostic.entityId ?? index}`}
                    className={`liner-preview-diagnostic-${diagnostic.level}`}
                    data-testid={`continuity-diagnostic-${level}-${index}`}
                  >
                    <span>{continuityDiagnosticMessage(diagnostic)}</span>
                    {diagnostic.entityId && (
                      <span>
                        {ja.liner.diagnostics.entityIdLabel}: <code>{diagnostic.entityId}</code>
                      </span>
                    )}
                    {diagnostic.detail && <span>{diagnostic.detail}</span>}
                    <code>{diagnostic.code}</code>
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}
    </section>
  );
}

function groupDiagnosticsByLevel(
  diagnostics: ValidationIssue[],
): Record<DiagnosticLevel, ValidationIssue[]> {
  return {
    error: diagnostics.filter((diagnostic) => diagnostic.level === "error"),
    warning: diagnostics.filter((diagnostic) => diagnostic.level === "warning"),
    info: diagnostics.filter((diagnostic) => diagnostic.level === "info"),
  };
}

function diagnosticSeverityLabel(level: DiagnosticLevel): string {
  if (level === "error") {
    return ja.liner.diagnostics.severityError;
  }
  if (level === "warning") {
    return ja.liner.diagnostics.severityWarning;
  }
  return ja.liner.diagnostics.severityInfo;
}

function continuityDiagnosticMessage(diagnostic: ValidationIssue): string {
  if (diagnostic.code === LINER_DIAGNOSTIC_CODES.positionDiscontinuity) {
    return ja.liner.diagnostics.positionDiscontinuity;
  }
  if (diagnostic.code === LINER_DIAGNOSTIC_CODES.azimuthDiscontinuity) {
    return ja.liner.diagnostics.azimuthDiscontinuity;
  }
  return diagnostic.messageKey ?? diagnostic.code;
}
