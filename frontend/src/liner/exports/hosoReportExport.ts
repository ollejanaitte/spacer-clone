import type { ComputationDiagnostic } from "../core/types";
import type { HosoResultRow } from "../core/hoso/types";
import { hasHosoErrors } from "../core/hoso/diagnostics";

export const HOSO_RESULTS_CSV_COLUMNS = [
  "definitionId",
  "type",
  "stationPhysicalDistance",
  "offsetM",
  "pavementThicknessM",
  "pavementElevationM",
] as const;

export type HosoResultsCsvColumn = (typeof HOSO_RESULTS_CSV_COLUMNS)[number];

export type HosoReportSection = {
  key: "hosoResults";
  rows: HosoResultRow[];
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

export function buildHosoResultsCsv(
  rows: readonly HosoResultRow[],
  diagnostics: readonly ComputationDiagnostic[],
): string {
  if (hasHosoErrors(diagnostics)) {
    return "";
  }
  const header = HOSO_RESULTS_CSV_COLUMNS.join(",");
  const body = rows.map((row) =>
    HOSO_RESULTS_CSV_COLUMNS.map((column) =>
      csvEscape(row[column as keyof HosoResultRow] as string | number | undefined),
    ).join(","),
  );
  return [header, ...body].join("\n");
}

export function buildHosoReportSection(
  rows: readonly HosoResultRow[],
  diagnostics: readonly ComputationDiagnostic[],
): HosoReportSection | null {
  if (hasHosoErrors(diagnostics)) {
    return null;
  }
  return {
    key: "hosoResults",
    rows: [...rows],
  };
}
