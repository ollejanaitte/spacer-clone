import { useMemo } from "react";
import { ja } from "../../i18n/ja";
import { summarizeLinerDraft, type LinerDraft } from "../adapters/linerUiAdapter";
import { validateBridgeLayout } from "../core/bridge/bridgeLayoutEvaluation";
import { LINER_DIAGNOSTIC_CODES } from "../core/diagnostics";
import { buildIntermediateResult } from "../core/pipeline/pipeline";
import type { DiagnosticLevel, LinerDiagnosticCode, ValidationIssue } from "../core/types";

export type BridgeLayoutDiagnosticsPanelProps = {
  draft: LinerDraft;
};

const BRIDGE_LAYOUT_DIAGNOSTIC_CODES = new Set<LinerDiagnosticCode>([
  LINER_DIAGNOSTIC_CODES.spanEndExceedsAlignment,
  LINER_DIAGNOSTIC_CODES.spanStartNegative,
  LINER_DIAGNOSTIC_CODES.spanReversed,
  LINER_DIAGNOSTIC_CODES.spanDuplicateId,
  LINER_DIAGNOSTIC_CODES.spanPierReferenceMissing,
  LINER_DIAGNOSTIC_CODES.pierDuplicateId,
  LINER_DIAGNOSTIC_CODES.pierBearingOffsetInvalid,
  LINER_DIAGNOSTIC_CODES.pierBearingOffsetDuplicateIndex,
  LINER_DIAGNOSTIC_CODES.stationOutOfRange,
]);

const LEVEL_ORDER: DiagnosticLevel[] = ["error", "warning", "info"];

type LinerErrorMessages = typeof ja.liner.errors;

function bridgeLayoutDiagnosticMessage(diagnostic: ValidationIssue): string {
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

export function BridgeLayoutDiagnosticsPanel({ draft }: BridgeLayoutDiagnosticsPanelProps) {
  const summary = useMemo(() => summarizeLinerDraft(draft), [draft]);
  const diagnostics = useMemo(() => {
    const issues = validateBridgeLayout({
      spans: draft.spans ?? [],
      piers: draft.piers ?? [],
      alignmentTotalLength: summary.totalDeclaredLength,
      stationDefinition: draft.stationDefinition,
      gridPoints: [],
    });
    return issues.filter((issue) =>
      BRIDGE_LAYOUT_DIAGNOSTIC_CODES.has(issue.code as LinerDiagnosticCode),
    );
  }, [draft, summary.totalDeclaredLength]);

  const evaluationSummary = useMemo(() => {
    if (diagnostics.some((issue) => issue.level === "error")) {
      return null;
    }
    if ((draft.spans?.length ?? 0) === 0 && (draft.piers?.length ?? 0) === 0) {
      return null;
    }
    const result = buildIntermediateResult({
      ...draft,
      computedAt: "1970-01-01T00:00:00.000Z",
    });
    return {
      spanCount: result.spans.length,
      pierCount: result.piers.length,
    };
  }, [draft, diagnostics]);

  const diagnosticsByLevel = useMemo(() => groupDiagnosticsByLevel(diagnostics), [diagnostics]);

  return (
    <section
      className="liner-edit-panel liner-bridge-layout-diagnostics-panel"
      aria-labelledby="liner-bridge-layout-diagnostics-title"
      data-testid="bridge-layout-diagnostics-panel"
    >
      <h2 id="liner-bridge-layout-diagnostics-title">
        {ja.liner.diagnostics.bridgeLayoutPanelTitle}
      </h2>
      {evaluationSummary && (
        <p className="liner-edit-help" data-testid="bridge-layout-evaluation-summary">
          {ja.liner.diagnostics.bridgeLayoutEvaluationSummary(
            evaluationSummary.spanCount,
            evaluationSummary.pierCount,
          )}
        </p>
      )}
      {diagnostics.length === 0 ? (
        <p className="liner-edit-help" data-testid="bridge-layout-diagnostics-empty">
          {ja.liner.diagnostics.emptyBridgeLayoutDiagnostics}
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
              className="liner-bridge-layout-diagnostics-group"
              aria-label={diagnosticSeverityLabel(level)}
              data-testid={`bridge-layout-diagnostics-${level}`}
            >
              <h3 className="liner-bridge-layout-diagnostics-level">
                {diagnosticSeverityLabel(level)}
                <span className="liner-bridge-layout-diagnostics-count">
                  {ja.liner.editor.count(levelDiagnostics.length)}
                </span>
              </h3>
              <ul className="liner-preview-diagnostics">
                {levelDiagnostics.map((diagnostic, index) => (
                  <li
                    key={`${diagnostic.code}-${diagnostic.entityId ?? index}`}
                    className={`liner-preview-diagnostic-${diagnostic.level}`}
                    data-testid={`bridge-layout-diagnostic-${level}-${index}`}
                  >
                    <span>{bridgeLayoutDiagnosticMessage(diagnostic)}</span>
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
