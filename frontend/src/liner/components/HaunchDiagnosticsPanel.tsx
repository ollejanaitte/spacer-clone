import { ja } from "../../i18n/ja";
import type { ComputationDiagnostic } from "../core/types";
import { isHaunchDiagnostic } from "../core/haunch/diagnostics";

export type HaunchDiagnosticsPanelProps = {
  diagnostics: readonly ComputationDiagnostic[];
};

function diagnosticMessage(diagnostic: ComputationDiagnostic): string {
  const messages = ja.liner.haunch.diagnostics;
  const byCode: Record<string, string> = {
    LINER_HAUNCH_UNSUPPORTED_TYPE: messages.unsupportedType,
    LINER_HAUNCH_INVALID_REFERENCE: messages.invalidReference,
    LINER_HAUNCH_PROFILE_UNAVAILABLE: messages.profileUnavailable,
    LINER_HAUNCH_STATION_OUT_OF_RANGE: messages.stationOutOfRange,
    LINER_HAUNCH_RANGE_INVALID: messages.rangeInvalid,
    LINER_HAUNCH_OVERLAPPING_RANGE: messages.overlappingRange,
    LINER_HAUNCH_DEGENERATE_GEOMETRY: messages.degenerateGeometry,
    LINER_HAUNCH_NEGATIVE_THICKNESS: messages.negativeThickness,
    LINER_HAUNCH_REFERENCE_GIRDER_REQUIRED: messages.referenceGirderRequired,
    LINER_HAUNCH_LINER_HEIGHT_REQUIRED: messages.linerHeightRequired,
    LINER_HAUNCH_COLLINEAR_ANCHORS: messages.collinearAnchors,
    LINER_HAUNCH_DEFINITION_SCHEMA_INVALID: messages.definitionSchemaInvalid,
  };
  return byCode[diagnostic.code] ?? diagnostic.code;
}

export function HaunchDiagnosticsPanel({ diagnostics }: HaunchDiagnosticsPanelProps) {
  const haunchDiagnostics = diagnostics.filter(isHaunchDiagnostic);
  if (haunchDiagnostics.length === 0) {
    return null;
  }

  return (
    <section className="liner-edit-panel" data-testid="haunch-diagnostics-panel">
      <h2>{ja.liner.haunch.diagnosticsTitle}</h2>
      <ul>
        {haunchDiagnostics.map((diagnostic, index) => (
          <li key={`${diagnostic.code}-${index}`} data-testid="haunch-diagnostic-item">
            <strong>{diagnostic.level}</strong>: {diagnosticMessage(diagnostic)}
            {diagnostic.entityId ? ` (${diagnostic.entityId})` : ""}
          </li>
        ))}
      </ul>
    </section>
  );
}
