import { useMemo } from "react";
import { ja } from "../../i18n/ja";
import { summarizeLinerDraft, type LinerDraft } from "../adapters/linerUiAdapter";
import { validateCrossSectionTemplates } from "../core/crossSectionTemplateValidation";
import { LINER_DIAGNOSTIC_CODES } from "../core/diagnostics";
import { validateCrossSlopeIntervals } from "../core/grid/crossfallResolution";
import { totalAlignmentLength } from "../core/geometry/horizontal";
import type { DiagnosticLevel, LinerDiagnosticCode, ValidationIssue } from "../core/types";
import { validateWidthChangePoints } from "../core/width/widthResolution";

export type CrossSectionDiagnosticsPanelProps = {
  draft: LinerDraft;
};

const CROSS_SECTION_DIAGNOSTIC_CODES = new Set<LinerDiagnosticCode>([
  LINER_DIAGNOSTIC_CODES.crossSectionTemplateDuplicateId,
  LINER_DIAGNOSTIC_CODES.crossSectionTemplateMissingId,
  LINER_DIAGNOSTIC_CODES.crossSectionOffsetLineDuplicateId,
  LINER_DIAGNOSTIC_CODES.crossSectionOffsetLineMissingId,
  LINER_DIAGNOSTIC_CODES.crossSectionOffsetLineMissing,
  LINER_DIAGNOSTIC_CODES.crossSectionGridDefinitionDuplicateId,
  LINER_DIAGNOSTIC_CODES.crossSectionGridDefinitionMissingId,
  LINER_DIAGNOSTIC_CODES.crossSectionTemplateReferenceMissing,
  LINER_DIAGNOSTIC_CODES.crossSectionOffsetLineReferenceMissing,
  LINER_DIAGNOSTIC_CODES.crossSectionGridDefinitionInvalidRange,
  LINER_DIAGNOSTIC_CODES.crossSectionGridDefinitionOverlap,
  LINER_DIAGNOSTIC_CODES.crossfallIntervalOverlap,
  LINER_DIAGNOSTIC_CODES.crossfallIntervalInvalidRange,
  LINER_DIAGNOSTIC_CODES.crossfallPivotChangeUnsupported,
  LINER_DIAGNOSTIC_CODES.widthChangePointOverlap,
  LINER_DIAGNOSTIC_CODES.widthChangePointOutOfRange,
  LINER_DIAGNOSTIC_CODES.widthChangePointInvalid,
]);

const LEVEL_ORDER: DiagnosticLevel[] = ["error", "warning", "info"];

type LinerErrorMessages = typeof ja.liner.errors;

function crossSectionDiagnosticMessage(diagnostic: ValidationIssue): string {
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

export function CrossSectionDiagnosticsPanel({ draft }: CrossSectionDiagnosticsPanelProps) {
  const diagnostics = useMemo(() => {
    const totalLength = totalAlignmentLength(draft.alignment);
    const summary = summarizeLinerDraft(draft);
    const issues = [
      ...validateCrossSectionTemplates({
        crossSections: draft.crossSections,
        gridDefinitions: draft.gridDefinitions,
        alignmentTotalLength: summary.totalDeclaredLength,
      }),
      ...validateCrossSlopeIntervals(draft.crossSlopeIntervals, totalLength),
      ...validateWidthChangePoints(draft.widthChangePoints, totalLength),
    ];
    return issues.filter((issue) =>
      CROSS_SECTION_DIAGNOSTIC_CODES.has(issue.code as LinerDiagnosticCode),
    );
  }, [draft]);

  const diagnosticsByLevel = useMemo(() => groupDiagnosticsByLevel(diagnostics), [diagnostics]);

  return (
    <section
      className="liner-edit-panel liner-cross-section-diagnostics-panel"
      aria-labelledby="liner-cross-section-diagnostics-title"
      data-testid="cross-section-diagnostics-panel"
    >
      <h2 id="liner-cross-section-diagnostics-title">{ja.liner.diagnostics.crossSectionPanelTitle}</h2>
      {diagnostics.length === 0 ? (
        <p className="liner-edit-help" data-testid="cross-section-diagnostics-empty">
          {ja.liner.diagnostics.emptyCrossSectionDiagnostics}
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
              className="liner-cross-section-diagnostics-group"
              aria-label={diagnosticSeverityLabel(level)}
              data-testid={`cross-section-diagnostics-${level}`}
            >
              <h3 className="liner-cross-section-diagnostics-level">
                {diagnosticSeverityLabel(level)}
                <span className="liner-cross-section-diagnostics-count">
                  {ja.liner.editor.count(levelDiagnostics.length)}
                </span>
              </h3>
              <ul className="liner-preview-diagnostics">
                {levelDiagnostics.map((diagnostic, index) => (
                  <li
                    key={`${diagnostic.code}-${diagnostic.entityId ?? index}`}
                    className={`liner-preview-diagnostic-${diagnostic.level}`}
                    data-testid={`cross-section-diagnostic-${level}-${index}`}
                  >
                    <span>{crossSectionDiagnosticMessage(diagnostic)}</span>
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
