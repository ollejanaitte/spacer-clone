import type { ComputationDiagnostic } from "../core/types";
import type { HaunchResultRow } from "../core/haunch/types";
import { hasHaunchErrors } from "../core/haunch/diagnostics";

export const HAUNCH_RESULTS_CSV_COLUMNS = [
  "definitionId",
  "type",
  "stationPhysicalDistance",
  "haunchTopElevationM",
  "haunchThicknessM",
  "side",
] as const;

export type HaunchResultsCsvColumn = (typeof HAUNCH_RESULTS_CSV_COLUMNS)[number];

export type HaunchReportSection = {
  key: "haunchResults";
  rows: HaunchResultRow[];
};

function csvEscape(value: string | number | undefined): string {
  if (value === undefined) {
    return "";
  }
  const text = String(value);
  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function buildHaunchResultsCsv(
  rows: readonly HaunchResultRow[],
  diagnostics: readonly ComputationDiagnostic[],
): string {
  if (hasHaunchErrors(diagnostics)) {
    return "";
  }
  const header = HAUNCH_RESULTS_CSV_COLUMNS.join(",");
  const body = rows.map((row) =>
    HAUNCH_RESULTS_CSV_COLUMNS.map((column) =>
      csvEscape(row[column as keyof HaunchResultRow] as string | number | undefined),
    ).join(","),
  );
  return [header, ...body].join("\n");
}

export function buildHaunchReportSection(
  rows: readonly HaunchResultRow[],
  diagnostics: readonly ComputationDiagnostic[],
): HaunchReportSection | null {
  if (hasHaunchErrors(diagnostics)) {
    return null;
  }
  return {
    key: "haunchResults",
    rows: [...rows],
  };
}
