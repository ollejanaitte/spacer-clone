import type {
  R1CoordinateSystem,
  R1Unit,
  TolerancePolicy,
} from "../types";
import { areUnitsComparable } from "../units";
import { isFiniteTolerance } from "../tolerance";
import type { ReferenceValueRow } from "../reference-data/types";
import type {
  ComparisonKind,
  ExternalComparisonResult,
  ComparisonStatus,
} from "./types";

export function unitsComparableAfterConversion(
  expectedUnit: R1Unit,
  actualUnit: R1Unit,
): boolean {
  return areUnitsComparable(expectedUnit, actualUnit);
}

export function coordinateSystemsCompatible(
  expected: R1CoordinateSystem,
  actual: R1CoordinateSystem,
): boolean {
  return expected === actual;
}

export type CompareInput = {
  reference_id: string;
  case_id: string;
  category: string;
  comparison_kind: ComparisonKind;
  expected: number | null;
  expected_unit: R1Unit | null;
  actual: number | null;
  actual_unit: R1Unit | null;
  expected_coordinate_system: R1CoordinateSystem | null;
  actual_coordinate_system: R1CoordinateSystem | null;
  tolerance: TolerancePolicy | null;
  source_document: string;
  source_page: string;
};

function makeResult(
  input: CompareInput,
  status: ComparisonStatus,
  normalizedExpected: number | null,
  normalizedActual: number | null,
  delta: number | null,
  message: string,
  mismatchReason?: string,
): ExternalComparisonResult {
  const relativeDelta =
    delta !== null && normalizedExpected !== null && normalizedExpected !== 0
      ? Math.abs(delta) / Math.abs(normalizedExpected)
      : null;
  return {
    reference_id: input.reference_id,
    case_id: input.case_id,
    category: input.category,
    comparison_kind: input.comparison_kind,
    status,
    expected: input.expected,
    actual: input.actual,
    expected_unit: input.expected_unit,
    actual_unit: input.actual_unit,
    normalized_expected: normalizedExpected,
    normalized_actual: normalizedActual,
    absolute_delta: delta,
    relative_delta: relativeDelta,
    tolerance: input.tolerance,
    coordinate_system: input.actual_coordinate_system,
    source_document: input.source_document,
    source_page: input.source_page,
    message,
    mismatch_reason: mismatchReason,
  };
}

export function compareExternalValue(input: CompareInput): ExternalComparisonResult {
  if (input.comparison_kind === "UNRESOLVED") {
    return makeResult(input, "SKIP_UNRESOLVED", null, null, null, "unresolved reference skipped");
  }

  if (input.expected === null || input.expected_unit === null) {
    return makeResult(input, "CONTRACT_ERROR", null, null, null, "expected or unit missing");
  }
  if (input.actual === null || input.actual_unit === null) {
    return makeResult(input, "ACTUAL_MISSING", null, null, null, "actual value or unit missing");
  }

  if (input.expected_coordinate_system === null || input.actual_coordinate_system === null) {
    return makeResult(input, "CONTRACT_ERROR", null, null, null, "coordinate system missing");
  }
  if (!coordinateSystemsCompatible(input.expected_coordinate_system, input.actual_coordinate_system)) {
    return makeResult(
      input,
      "COORDINATE_MISMATCH",
      null,
      null,
      null,
      `coordinate system mismatch: ${input.expected_coordinate_system} vs ${input.actual_coordinate_system}`,
      "COORDINATE_ERROR",
    );
  }

  if (!unitsComparableAfterConversion(input.expected_unit, input.actual_unit)) {
    return makeResult(
      input,
      "UNIT_MISMATCH",
      null,
      null,
      null,
      `unit mismatch: ${input.expected_unit} vs ${input.actual_unit}`,
      "UNIT_ERROR",
    );
  }

  if (input.tolerance === null || !isFiniteTolerance(input.tolerance)) {
    return makeResult(input, "CONTRACT_ERROR", null, null, null, "tolerance missing or invalid");
  }
  if (
    input.tolerance.absolute === undefined &&
    input.tolerance.relative === undefined &&
    input.tolerance.exact !== true
  ) {
    return makeResult(input, "CONTRACT_ERROR", null, null, null, "tolerance has no comparison rule");
  }

  if (!Number.isFinite(input.expected) || !Number.isFinite(input.actual)) {
    return makeResult(input, "CONTRACT_ERROR", null, null, null, "expected/actual must be finite");
  }

  const difference = input.actual - input.expected;
  const absDifference = Math.abs(difference);

  let passed = false;
  if (input.tolerance.exact === true) {
    passed = difference === 0;
  } else {
    const absPass = input.tolerance.absolute !== undefined && absDifference <= input.tolerance.absolute;
    let relPass = false;
    if (input.tolerance.relative !== undefined) {
      const denominator = Math.max(Math.abs(input.expected), Number.EPSILON);
      relPass = absDifference / denominator <= input.tolerance.relative;
    }
    passed = absPass || relPass;
  }

  return makeResult(
    input,
    passed ? "PASS" : "FAIL",
    input.expected,
    input.actual,
    difference,
    passed ? "value within tolerance" : "value out of tolerance",
    passed ? undefined : "IMPLEMENTATION_BUG_OR_REFERENCE_ERROR",
  );
}

export function fromReferenceRow(
  row: ReferenceValueRow,
  actual: number | null,
  actualUnit: R1Unit | null,
  actualCoordinateSystem: R1CoordinateSystem | null,
  comparisonKind: ComparisonKind,
): CompareInput {
  return {
    reference_id: row.reference_id,
    case_id: row.case_id,
    category: row.category,
    comparison_kind: comparisonKind,
    expected: row.normalized_value,
    expected_unit: row.normalized_unit,
    actual,
    actual_unit: actualUnit,
    expected_coordinate_system: row.coordinate_system,
    actual_coordinate_system: actualCoordinateSystem,
    tolerance: row.comparison_tolerance,
    source_document: row.source_document,
    source_page: row.source_page,
  };
}
