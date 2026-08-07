import { runHorizontalStationComparison } from "./adapters/horizontal-station";
import { runProfileCrossfallHeightComparison } from "./adapters/profile-crossfall-height";
import { buildComparisonReport, resultsToCsv } from "./report";
import type { ExternalComparisonResult } from "./types";
import type { ComparisonReport } from "./types";

export function runAllP02Comparisons(): ExternalComparisonResult[] {
  return [
    ...runHorizontalStationComparison(),
    ...runProfileCrossfallHeightComparison(),
  ];
}

export function buildP02ComparisonReport(generatedAt = "2026-08-07"): ComparisonReport {
  return buildComparisonReport(runAllP02Comparisons(), generatedAt);
}

export function buildP02ReportCsv(): string {
  return resultsToCsv(runAllP02Comparisons());
}

export function buildDiscrepancyLedgerCsv(results: ExternalComparisonResult[]): string {
  const headers = [
    "reference_id",
    "category",
    "comparison_kind",
    "status",
    "expected",
    "actual",
    "absolute_delta",
    "relative_delta",
    "tolerance_absolute",
    "tolerance_relative",
    "coordinate_system",
    "source_document",
    "source_page",
    "mismatch_reason",
    "message",
  ];
  const escape = (v: string): string => (/,|"|\n/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const lines = [headers.join(",")];
  for (const r of results) {
    if (r.status === "PASS") continue;
    lines.push(
      [
        r.reference_id,
        r.category,
        r.comparison_kind,
        r.status,
        r.expected !== null ? String(r.expected) : "",
        r.actual !== null ? String(r.actual) : "",
        r.absolute_delta !== null ? String(r.absolute_delta) : "",
        r.relative_delta !== null ? String(r.relative_delta) : "",
        r.tolerance?.absolute !== undefined ? String(r.tolerance.absolute) : "",
        r.tolerance?.relative !== undefined ? String(r.tolerance.relative) : "",
        r.coordinate_system ?? "",
        r.source_document,
        r.source_page,
        r.mismatch_reason ?? "",
        r.message,
      ]
        .map(escape)
        .join(","),
    );
  }
  return lines.join("\n") + "\n";
}

export function buildCoverageMatrixCsv(results: ExternalComparisonResult[]): string {
  const headers = ["reference_id", "category", "comparison_kind", "status"];
  const escape = (v: string): string => (/,|"|\n/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const lines = [headers.join(",")];
  for (const r of results) {
    lines.push([r.reference_id, r.category, r.comparison_kind, r.status].map(escape).join(","));
  }
  return lines.join("\n") + "\n";
}
