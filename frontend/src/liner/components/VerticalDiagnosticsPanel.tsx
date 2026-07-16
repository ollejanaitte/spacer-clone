import { useMemo } from "react";
import { ja } from "../../i18n/ja";
import {
  createDefaultVerticalAlignment,
  summarizeLinerDraft,
  type LinerDraft,
} from "../adapters/linerUiAdapter";
import { LINER_DIAGNOSTIC_CODES } from "../core/diagnostics";
import { totalAlignmentLength } from "../core/geometry/horizontal";
import type { DiagnosticLevel, LinerDiagnosticCode, ValidationIssue } from "../core/types";
import { validateVerticalAlignment } from "../core/validateVerticalAlignment";

export type VerticalDiagnosticsPanelProps = {
  draft: LinerDraft;
};

const VERTICAL_DIAGNOSTIC_CODES = new Set<LinerDiagnosticCode>([
  LINER_DIAGNOSTIC_CODES.profileElevationDiscontinuity,
  LINER_DIAGNOSTIC_CODES.profileGradeDiscontinuity,
  LINER_DIAGNOSTIC_CODES.profileCoverageGap,
  LINER_DIAGNOSTIC_CODES.profileAdjacencyGap,
  LINER_DIAGNOSTIC_CODES.profileEndCoverageGap,
  LINER_DIAGNOSTIC_CODES.profileOverlap,
  LINER_DIAGNOSTIC_CODES.profileGradeExceedsLimit,
  LINER_DIAGNOSTIC_CODES.zeroLengthSegment,
  LINER_DIAGNOSTIC_CODES.stationOutOfRange,
]);

const LEVEL_ORDER: DiagnosticLevel[] = ["error", "warning", "info"];

type LinerErrorMessages = typeof ja.liner.errors;

function verticalDiagnosticMessage(diagnostic: ValidationIssue): string {
  const messageKey = diagnostic.messageKey;
  if (messageKey?.startsWith("liner.errors.")) {
    const key = messageKey.slice("liner.errors.".length) as keyof LinerErrorMessages;
    const message = ja.liner.errors[key];
    if (typeof message === "string") {
      return message;
    }
  }
  return diagnostic.detail ?? diagnostic.code;
}

export function VerticalDiagnosticsPanel({ draft }: VerticalDiagnosticsPanelProps) {
  const diagnostics = useMemo(() => {
    const totalLength = totalAlignmentLength(draft.alignment);
    const summary = summarizeLinerDraft(draft);
    const verticalAlignment =
      draft.verticalAlignment ??
      createDefaultVerticalAlignment(summary.totalDeclaredLength, draft.z ?? 0);

    return validateVerticalAlignment(verticalAlignment, totalLength).filter((issue) =>
      VERTICAL_DIAGNOSTIC_CODES.has(issue.code as LinerDiagnosticCode),
    );
  }, [draft]);

  const diagnosticsByLevel = useMemo(() => groupDiagnosticsByLevel(diagnostics), [diagnostics]);

  return (
    <section
      className="liner-edit-panel liner-vertical-diagnostics-panel"
      aria-labelledby="liner-vertical-diagnostics-title"
      data-testid="vertical-diagnostics-panel"
    >
      <h2 id="liner-vertical-diagnostics-title">{ja.liner.diagnostics.verticalPanelTitle}</h2>
      {diagnostics.length === 0 ? (
        <p className="liner-edit-help" data-testid="vertical-diagnostics-empty">
          {ja.liner.diagnostics.emptyVerticalDiagnostics}
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
              className="liner-vertical-diagnostics-group"
              aria-label={diagnosticSeverityLabel(level)}
              data-testid={`vertical-diagnostics-${level}`}
            >
              <h3 className="liner-vertical-diagnostics-level">
                {diagnosticSeverityLabel(level)}
                <span className="liner-vertical-diagnostics-count">
                  {ja.liner.editor.count(levelDiagnostics.length)}
                </span>
              </h3>
              <ul className="liner-preview-diagnostics">
                {levelDiagnostics.map((diagnostic, index) => (
                  <li
                    key={`${diagnostic.code}-${diagnostic.entityId ?? index}`}
                    className={`liner-preview-diagnostic-${diagnostic.level}`}
                    data-testid={`vertical-diagnostic-${level}-${index}`}
                  >
                    <span>{verticalDiagnosticMessage(diagnostic)}</span>
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
