import {
  isR1CoordinateSystem,
  isR1Unit,
  isReferenceSourceClassification,
} from "../types";
import { isFiniteTolerance } from "../tolerance";
import {
  R1_P01_CATEGORIES,
  R1_P01_CONFIDENCES,
  R1_P01_EXTRACTION_METHODS,
  R1_P01_REVIEW_STATUSES,
  type ReferenceValueRow,
  type R1P01Category,
  type R1P01Confidence,
  type R1P01ExtractionMethod,
  type R1P01ReviewStatus,
} from "./types";

export function isR1P01Category(value: unknown): value is R1P01Category {
  return typeof value === "string" && (R1_P01_CATEGORIES as readonly string[]).includes(value);
}

export function isR1P01ReviewStatus(value: unknown): value is R1P01ReviewStatus {
  return typeof value === "string" && (R1_P01_REVIEW_STATUSES as readonly string[]).includes(value);
}

export function isR1P01Confidence(value: unknown): value is R1P01Confidence {
  return typeof value === "string" && (R1_P01_CONFIDENCES as readonly string[]).includes(value);
}

export function isR1P01ExtractionMethod(value: unknown): value is R1P01ExtractionMethod {
  return (
    typeof value === "string" && (R1_P01_EXTRACTION_METHODS as readonly string[]).includes(value)
  );
}

export function validateReferenceRow(row: ReferenceValueRow): string[] {
  const errors: string[] = [];

  if (row.reference_id.length === 0) errors.push("reference_id is required");
  if (row.case_id.length === 0) errors.push("case_id is required");
  if (!isR1P01Category(row.category)) errors.push(`invalid category: ${row.category}`);
  if (row.value_name.length === 0) errors.push("value_name is required");

  if (row.source_document.length === 0) errors.push("source_document is required");
  if (row.source_page.length === 0) errors.push("source_page is required");

  if (!Number.isFinite(row.source_value)) {
    errors.push(`source_value must be finite (${row.reference_id})`);
  }
  if (!isR1Unit(row.source_unit)) {
    errors.push(`source_unit invalid: ${String(row.source_unit)}`);
  }
  if (!Number.isFinite(row.normalized_value)) {
    errors.push(`normalized_value must be finite (${row.reference_id})`);
  }
  if (!isR1Unit(row.normalized_unit)) {
    errors.push(`normalized_unit invalid: ${String(row.normalized_unit)}`);
  }
  if (!isR1CoordinateSystem(row.coordinate_system)) {
    errors.push(`coordinate_system invalid: ${String(row.coordinate_system)}`);
  }
  if (!isFiniteTolerance(row.comparison_tolerance)) {
    errors.push("comparison_tolerance invalid (must be finite, non-negative)");
  }
  if (
    row.comparison_tolerance.absolute === undefined &&
    row.comparison_tolerance.relative === undefined &&
    row.comparison_tolerance.exact !== true
  ) {
    errors.push("comparison_tolerance must define absolute, relative, or exact");
  }
  if (!isR1P01ExtractionMethod(row.extraction_method)) {
    errors.push(`extraction_method invalid: ${String(row.extraction_method)}`);
  }
  if (!isReferenceSourceClassification(row.expected_value_class)) {
    errors.push(`expected_value_class invalid: ${String(row.expected_value_class)}`);
  }
  if (!isR1P01ReviewStatus(row.review_status)) {
    errors.push(`review_status invalid: ${String(row.review_status)}`);
  }
  if (!isR1P01Confidence(row.confidence)) {
    errors.push(`confidence invalid: ${String(row.confidence)}`);
  }

  return errors;
}

export function isGoldenUsable(row: ReferenceValueRow): boolean {
  return (
    row.review_status === "CROSS_CHECKED" ||
    row.review_status === "APPROVED"
  );
}

export function isSelfReferential(row: ReferenceValueRow): boolean {
  return row.expected_value_class === "SELF_REFERENTIAL";
}

export function isInterpolatedPlaceholder(row: ReferenceValueRow): boolean {
  return row.expected_value_class === "INTERPOLATED_PLACEHOLDER";
}

export function validateDataset(
  rows: ReferenceValueRow[],
): { errors: string[]; duplicates: string[]; goldenRejected: string[] } {
  const errors: string[] = [];
  const ids = new Set<string>();
  const duplicates: string[] = [];

  for (const row of rows) {
    errors.push(...validateReferenceRow(row));
    if (ids.has(row.reference_id)) {
      duplicates.push(row.reference_id);
    }
    ids.add(row.reference_id);
  }

  const goldenRejected = rows
    .filter((row) => isGoldenUsable(row) && (isSelfReferential(row) || isInterpolatedPlaceholder(row)))
    .map((row) => row.reference_id);

  return { errors, duplicates, goldenRejected };
}
