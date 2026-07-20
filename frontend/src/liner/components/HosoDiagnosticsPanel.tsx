import { ja } from "../../i18n/ja";
import type { ComputationDiagnostic } from "../core/types";
import { isHosoDiagnostic } from "../core/hoso/diagnostics";

export type HosoDiagnosticsPanelProps = {
  diagnostics: readonly ComputationDiagnostic[];
};

function diagnosticMessage(diagnostic: ComputationDiagnostic): string {
  const messages = ja.liner.hoso.diagnostics;
  const byCode: Record<string, string> = {
    LINER_HOSO_UNSUPPORTED_TYPE: messages.unsupportedType,
    LINER_HOSO_INVALID_REFERENCE: messages.invalidReference,
    LINER_HOSO_PROFILE_UNAVAILABLE: messages.profileUnavailable,
    LINER_HOSO_CROSSFALL_UNAVAILABLE: messages.crossfallUnavailable,
    LINER_HOSO_STATION_OUT_OF_RANGE: messages.stationOutOfRange,
    LINER_HOSO_OFFSET_OUT_OF_RANGE: messages.offsetOutOfRange,
    LINER_HOSO_LINE_OUT_OF_RANGE: messages.lineOutOfRange,
    LINER_HOSO_INTERSECTING_LINES: messages.intersectingLines,
    LINER_HOSO_DEGENERATE_GEOMETRY: messages.degenerateGeometry,
    LINER_HOSO_COLLINEAR_ANCHORS: messages.collinearAnchors,
    LINER_HOSO_NEGATIVE_THICKNESS: messages.negativeThickness,
    LINER_HOSO_MIN_THICKNESS: messages.minThickness,
    LINER_HOSO_AUTO_NOT_CONVERGED: messages.autoNotConverged,
    LINER_HOSO_OVERLAPPING_BAND: messages.overlappingBand,
    LINER_HOSO_DEFINITION_SCHEMA_INVALID: messages.definitionSchemaInvalid,
    LINER_HOSO_EXTRACTION_REQUIRED: messages.extractionRequired,
  };
  return byCode[diagnostic.code] ?? diagnostic.code;
}

export function HosoDiagnosticsPanel({ diagnostics }: HosoDiagnosticsPanelProps) {
  const hosoDiagnostics = diagnostics.filter(isHosoDiagnostic);
  if (hosoDiagnostics.length === 0) {
    return null;
  }

  return (
    <section className="liner-edit-panel" data-testid="hoso-diagnostics-panel">
      <h2>{ja.liner.hoso.diagnosticsTitle}</h2>
      <ul>
        {hosoDiagnostics.map((diagnostic, index) => (
          <li key={`${diagnostic.code}-${index}`} data-testid="hoso-diagnostic-item">
            <strong>{diagnostic.level}</strong>: {diagnosticMessage(diagnostic)}
            {diagnostic.entityId ? ` (${diagnostic.entityId})` : ""}
          </li>
        ))}
      </ul>
    </section>
  );
}
