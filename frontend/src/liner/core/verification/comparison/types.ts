import type {
  R1CoordinateSystem,
  R1Unit,
  TolerancePolicy,
} from "../types";
import type { ReferenceValueRow } from "../reference-data/types";

export type ComparisonKind =
  | "INPUT_PARITY"
  | "DERIVED_OUTPUT"
  | "REPORT_OUTPUT"
  | "NOT_COMPARABLE"
  | "UNRESOLVED";

export type ComparisonStatus =
  | "PASS"
  | "FAIL"
  | "SKIP_UNRESOLVED"
  | "NOT_COMPARABLE"
  | "CONTRACT_ERROR"
  | "UNIT_MISMATCH"
  | "COORDINATE_MISMATCH"
  | "ACTUAL_MISSING";

export type ExternalComparisonResult = {
  reference_id: string;
  case_id: string;
  category: string;
  comparison_kind: ComparisonKind;
  status: ComparisonStatus;
  expected: number | null;
  actual: number | null;
  expected_unit: R1Unit | null;
  actual_unit: R1Unit | null;
  normalized_expected: number | null;
  normalized_actual: number | null;
  absolute_delta: number | null;
  relative_delta: number | null;
  tolerance: TolerancePolicy | null;
  coordinate_system: R1CoordinateSystem | null;
  source_document: string;
  source_page: string;
  message: string;
  mismatch_reason?: string;
};

export type ComparisonSummary = {
  total: number;
  input_parity_total: number;
  input_parity_pass: number;
  derived_total: number;
  derived_pass: number;
  derived_fail: number;
  report_total: number;
  report_pass: number;
  not_comparable: number;
  contract_error: number;
  unresolved_skipped: number;
};

export type ComparisonReport = {
  generated_at: string;
  results: ExternalComparisonResult[];
  summary: ComparisonSummary;
};
