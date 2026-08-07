import type {
  ComparisonReport,
  ExternalComparisonResult,
  ComparisonSummary,
} from "./types";

export function buildComparisonSummary(results: ExternalComparisonResult[]): ComparisonSummary {
  return {
    total: results.length,
    input_parity_total: results.filter((r) => r.comparison_kind === "INPUT_PARITY").length,
    input_parity_pass: results.filter(
      (r) => r.comparison_kind === "INPUT_PARITY" && r.status === "PASS",
    ).length,
    derived_total: results.filter((r) => r.comparison_kind === "DERIVED_OUTPUT").length,
    derived_pass: results.filter(
      (r) => r.comparison_kind === "DERIVED_OUTPUT" && r.status === "PASS",
    ).length,
    derived_fail: results.filter(
      (r) => r.comparison_kind === "DERIVED_OUTPUT" && r.status === "FAIL",
    ).length,
    report_total: results.filter((r) => r.comparison_kind === "REPORT_OUTPUT").length,
    report_pass: results.filter(
      (r) => r.comparison_kind === "REPORT_OUTPUT" && r.status === "PASS",
    ).length,
    not_comparable: results.filter((r) => r.status === "NOT_COMPARABLE").length,
    contract_error: results.filter((r) => r.status === "CONTRACT_ERROR").length,
    unresolved_skipped: results.filter((r) => r.status === "SKIP_UNRESOLVED").length,
  };
}

export function buildComparisonReport(
  results: ExternalComparisonResult[],
  generatedAt: string,
): ComparisonReport {
  return {
    generated_at: generatedAt,
    results,
    summary: buildComparisonSummary(results),
  };
}

export function resultsToCsv(results: ExternalComparisonResult[]): string {
  const headers = [
    "reference_id",
    "case_id",
    "category",
    "comparison_kind",
    "status",
    "expected",
    "actual",
    "expected_unit",
    "actual_unit",
    "normalized_expected",
    "normalized_actual",
    "absolute_delta",
    "relative_delta",
    "tolerance_absolute",
    "tolerance_relative",
    "tolerance_exact",
    "coordinate_system",
    "source_document",
    "source_page",
    "mismatch_reason",
    "message",
  ];
  const escape = (v: string): string => (/,|"|\n/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const lines = [headers.join(",")];
  for (const r of results) {
    lines.push(
      [
        r.reference_id,
        r.case_id,
        r.category,
        r.comparison_kind,
        r.status,
        r.expected !== null ? String(r.expected) : "",
        r.actual !== null ? String(r.actual) : "",
        r.expected_unit ?? "",
        r.actual_unit ?? "",
        r.normalized_expected !== null ? String(r.normalized_expected) : "",
        r.normalized_actual !== null ? String(r.normalized_actual) : "",
        r.absolute_delta !== null ? String(r.absolute_delta) : "",
        r.relative_delta !== null ? String(r.relative_delta) : "",
        r.tolerance?.absolute !== undefined ? String(r.tolerance.absolute) : "",
        r.tolerance?.relative !== undefined ? String(r.tolerance.relative) : "",
        r.tolerance?.exact !== undefined ? String(r.tolerance.exact) : "",
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
