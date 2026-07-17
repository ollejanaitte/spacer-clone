import type { ComputationDiagnostic } from "../core/types";
import type { LdistResultRow } from "../core/ldist/types";
import { hasLdistErrors } from "../core/ldist/diagnostics";

export const LDIST_RESULTS_CSV_COLUMNS = [
  "jobId",
  "fromLineId",
  "toLineId",
  "stationPhysicalDistance",
  "displayedStation",
  "distanceM",
  "overhangM",
  "side",
  "signConvention",
] as const;

export type LdistResultsCsvColumn = (typeof LDIST_RESULTS_CSV_COLUMNS)[number];

export type LdistReportSection = {
  key: "ldistResults";
  rows: LdistResultRow[];
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

export function buildLdistResultsCsv(
  rows: readonly LdistResultRow[],
  diagnostics: readonly ComputationDiagnostic[],
): string {
  if (hasLdistErrors(diagnostics)) {
    return "";
  }
  const header = LDIST_RESULTS_CSV_COLUMNS.join(",");
  const body = rows.map((row) =>
    LDIST_RESULTS_CSV_COLUMNS.map((column) => csvEscape(row[column as keyof LdistResultRow] as string | number | undefined)).join(","),
  );
  return [header, ...body].join("\n");
}

export function buildLdistReportSection(
  rows: readonly LdistResultRow[],
  diagnostics: readonly ComputationDiagnostic[],
): LdistReportSection | null {
  if (hasLdistErrors(diagnostics)) {
    return null;
  }
  return {
    key: "ldistResults",
    rows: [...rows],
  };
}
