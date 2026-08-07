import { createHash } from "node:crypto";
import type { DatasetManifest, ReferenceDataset, ReferenceValueRow } from "./types";
import { isGoldenUsable } from "./validation";

export function canonicalDatasetJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalDatasetJson(item)).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));
  return `{${entries
    .map(([key, entryValue]) => `${JSON.stringify(key)}:${canonicalDatasetJson(entryValue)}`)
    .join(",")}}`;
}

export function sha256Of(value: unknown): string {
  return createHash("sha256").update(canonicalDatasetJson(value), "utf8").digest("hex");
}

export function sha256OfCsv(csv: string): string {
  return createHash("sha256").update(csv, "utf8").digest("hex");
}

export function buildManifest(
  dataset: ReferenceDataset,
  csvText: string,
): DatasetManifest {
  const rows = dataset.rows;
  const approved = rows.filter((row) => isGoldenUsable(row)).length;
  const crossChecked = rows.filter((row) => row.review_status === "CROSS_CHECKED").length;
  const unresolved = rows.filter((row) => row.review_status === "UNRESOLVED").length;
  const categories = [...new Set(rows.map((row) => row.category))].sort();

  return {
    dataset_version: dataset.version,
    generated_at: dataset.generated_at,
    total_rows: rows.length,
    approved_rows: approved,
    cross_checked_rows: crossChecked,
    unresolved_rows: unresolved,
    categories,
    csv_sha256: sha256OfCsv(csvText),
    json_sha256: sha256Of(dataset),
    parity: true,
  };
}

export function rowsToCsv(rows: ReferenceValueRow[]): string {
  const headers = [
    "reference_id",
    "case_id",
    "category",
    "value_name",
    "source_document",
    "source_page",
    "source_section",
    "source_table",
    "source_row",
    "source_column",
    "source_value",
    "source_unit",
    "normalized_value",
    "normalized_unit",
    "coordinate_system",
    "sign_convention",
    "rounding_rule",
    "display_precision",
    "comparison_tolerance_absolute",
    "comparison_tolerance_relative",
    "comparison_tolerance_exact",
    "extraction_method",
    "expected_value_class",
    "review_status",
    "confidence",
    "notes",
  ];

  const escape = (value: string): string => {
    if (/[",\n]/.test(value)) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(
      [
        row.reference_id,
        row.case_id,
        row.category,
        row.value_name,
        row.source_document,
        row.source_page,
        row.source_section ?? "",
        row.source_table ?? "",
        row.source_row ?? "",
        row.source_column ?? "",
        String(row.source_value),
        row.source_unit,
        String(row.normalized_value),
        row.normalized_unit,
        row.coordinate_system,
        row.sign_convention ?? "",
        row.rounding_rule ?? "",
        row.display_precision !== undefined ? String(row.display_precision) : "",
        row.comparison_tolerance.absolute !== undefined ? String(row.comparison_tolerance.absolute) : "",
        row.comparison_tolerance.relative !== undefined ? String(row.comparison_tolerance.relative) : "",
        row.comparison_tolerance.exact !== undefined ? String(row.comparison_tolerance.exact) : "",
        row.extraction_method,
        row.expected_value_class,
        row.review_status,
        row.confidence,
        row.notes ?? "",
      ]
        .map(escape)
        .join(","),
    );
  }
  return lines.join("\n") + "\n";
}
