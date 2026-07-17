import { ja } from "../../i18n/ja";
import type { ComputationDiagnostic } from "../core/types";
import { isLdistDiagnostic } from "../core/ldist/diagnostics";

export type LdistDiagnosticsPanelProps = {
  diagnostics: readonly ComputationDiagnostic[];
};

function diagnosticMessage(diagnostic: ComputationDiagnostic): string {
  const messages = ja.liner.ldist.diagnostics;
  const byCode: Record<string, string> = {
    LINER_LDIST_ALIGNMENT_REFERENCE_MISSING: messages.alignmentReferenceMissing,
    LINER_LDIST_LINE_REFERENCE_MISSING: messages.lineReferenceMissing,
    LINER_LDIST_REFERENCE_LINE_REQUIRED: messages.referenceLineRequired,
    LINER_LDIST_STATION_OUT_OF_RANGE: messages.stationOutOfRange,
    LINER_LDIST_DEGENERATE_GEOMETRY: messages.degenerateGeometry,
    LINER_LDIST_PIER_REFERENCE_INVALID: messages.pierReferenceInvalid,
    LINER_LDIST_PIER_ID_REQUIRED: messages.pierIdRequired,
    LINER_LDIST_JOB_SCHEMA_INVALID: messages.jobSchemaInvalid,
    LINER_LDIST_PAIRS_EMPTY: messages.pairsEmpty,
  };
  return byCode[diagnostic.code] ?? diagnostic.code;
}

export function LdistDiagnosticsPanel({ diagnostics }: LdistDiagnosticsPanelProps) {
  const ldistDiagnostics = diagnostics.filter(isLdistDiagnostic);
  if (ldistDiagnostics.length === 0) {
    return null;
  }

  return (
    <section className="liner-edit-panel" data-testid="ldist-diagnostics-panel">
      <h2>{ja.liner.ldist.diagnosticsTitle}</h2>
      <ul>
        {ldistDiagnostics.map((diagnostic, index) => (
          <li key={`${diagnostic.code}-${index}`} data-testid="ldist-diagnostic-item">
            <strong>{diagnostic.level}</strong>: {diagnosticMessage(diagnostic)}
            {diagnostic.entityId ? ` (${diagnostic.entityId})` : ""}
          </li>
        ))}
      </ul>
    </section>
  );
}
