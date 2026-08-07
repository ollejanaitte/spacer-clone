export type ReferenceSourceClassification =
  | "EXTERNAL_REFERENCE"
  | "INDEPENDENT_FORMULA"
  | "LEGACY_GOLDEN"
  | "SELF_REFERENTIAL"
  | "INTERPOLATED_PLACEHOLDER"
  | "MANUAL_TRANSCRIPTION"
  | "UNKNOWN";

export const REFERENCE_SOURCE_CLASSIFICATIONS: readonly ReferenceSourceClassification[] = [
  "EXTERNAL_REFERENCE",
  "INDEPENDENT_FORMULA",
  "LEGACY_GOLDEN",
  "SELF_REFERENTIAL",
  "INTERPOLATED_PLACEHOLDER",
  "MANUAL_TRANSCRIPTION",
  "UNKNOWN",
];

export function isReferenceSourceClassification(
  value: unknown,
): value is ReferenceSourceClassification {
  return (
    typeof value === "string" &&
    (REFERENCE_SOURCE_CLASSIFICATIONS as readonly string[]).includes(value)
  );
}

export type R1LengthUnit = "m" | "mm";
export type R1AngleUnit = "degree" | "radian";
export type R1RatioUnit = "percent" | "permille";
export type R1OtherUnit = "station" | "curvature_radius_m" | "dxf_unit";

export type R1Unit = R1LengthUnit | R1AngleUnit | R1RatioUnit | R1OtherUnit;

export type R1UnitGroup = "length" | "angle" | "ratio" | "other";

export const LENGTH_UNITS: readonly R1LengthUnit[] = ["m", "mm"];
export const ANGLE_UNITS: readonly R1AngleUnit[] = ["degree", "radian"];
export const RATIO_UNITS: readonly R1RatioUnit[] = ["percent", "permille"];
export const OTHER_UNITS: readonly R1OtherUnit[] = ["station", "curvature_radius_m", "dxf_unit"];

export const R1_UNITS: readonly R1Unit[] = [
  "m",
  "mm",
  "degree",
  "radian",
  "percent",
  "permille",
  "station",
  "curvature_radius_m",
  "dxf_unit",
];

export function unitGroupOf(unit: R1Unit): R1UnitGroup {
  if ((LENGTH_UNITS as readonly string[]).includes(unit)) return "length";
  if ((ANGLE_UNITS as readonly string[]).includes(unit)) return "angle";
  if ((RATIO_UNITS as readonly string[]).includes(unit)) return "ratio";
  return "other";
}

export function isR1Unit(value: unknown): value is R1Unit {
  return typeof value === "string" && (R1_UNITS as readonly string[]).includes(value);
}

export type RoundingPolicy = {
  internal_precision: number;
  comparison_precision: number;
  external_reference_tolerance: number;
  report_rounding: number;
  ui_display_rounding: number;
  serialization_precision: number;
};

export const PROPOSED_DEFAULT_ROUNDING_POLICY: RoundingPolicy = {
  internal_precision: 12,
  comparison_precision: 6,
  external_reference_tolerance: 6,
  report_rounding: 3,
  ui_display_rounding: 3,
  serialization_precision: 9,
};

export const ROUNDING_POLICY_KEYS: readonly (keyof RoundingPolicy)[] = [
  "internal_precision",
  "comparison_precision",
  "external_reference_tolerance",
  "report_rounding",
  "ui_display_rounding",
  "serialization_precision",
];

export function isRoundingPolicy(value: unknown): value is RoundingPolicy {
  if (value === null || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return ROUNDING_POLICY_KEYS.every(
    (key) => typeof record[key] === "number" && Number.isFinite(record[key] as number) && (record[key] as number) >= 0,
  );
}

export type TolerancePolicy = {
  absolute?: number;
  relative?: number;
  exact?: boolean;
  unitGroup?: R1UnitGroup;
  coordinateSystem?: R1CoordinateSystem;
};

export type RejectedReason =
  | "nan"
  | "infinity"
  | "unit_mismatch"
  | "coordinate_system_mismatch";

export type ComparisonVerdict = "PASS" | "FAIL" | "REJECTED";

export type ComparisonResult = {
  verdict: ComparisonVerdict;
  expected: number;
  actual: number;
  difference: number;
  relativeError?: number;
  rejectedReason?: RejectedReason;
  reason?: string;
};

export type R1CoordinateSystem =
  | "GLOBAL_XY"
  | "ALIGNMENT_TANGENT_NORMAL"
  | "BRIDGE_LOCAL"
  | "GIRDER_LOCAL"
  | "VERTICAL_DATUM";

export const R1_COORDINATE_SYSTEMS: readonly R1CoordinateSystem[] = [
  "GLOBAL_XY",
  "ALIGNMENT_TANGENT_NORMAL",
  "BRIDGE_LOCAL",
  "GIRDER_LOCAL",
  "VERTICAL_DATUM",
];

export function isR1CoordinateSystem(value: unknown): value is R1CoordinateSystem {
  return (
    typeof value === "string" &&
    (R1_COORDINATE_SYSTEMS as readonly string[]).includes(value)
  );
}

export type OffsetSign = "left_positive" | "right_positive";
export type RotationSign = "clockwise_positive" | "counterclockwise_positive";
export type CrossfallSign = "fall_to_right_positive" | "rise_to_right_positive";
export type SkewSign = "positive_when_turning_right" | "positive_when_turning_left";
export type StationDirection = "forward_increasing" | "forward_decreasing";
export type VerticalPositive = "up_positive" | "down_positive";

export type SignConventions = {
  offset: OffsetSign;
  rotation: RotationSign;
  crossfall: CrossfallSign;
  skew: SkewSign;
  station: StationDirection;
  vertical: VerticalPositive;
};

export type ReviewStatus = "UNRESOLVED" | "UNREVIEWED" | "REVIEWED" | "REJECTED";

export const REVIEW_STATUSES: readonly ReviewStatus[] = [
  "UNRESOLVED",
  "UNREVIEWED",
  "REVIEWED",
  "REJECTED",
];

export function isReviewStatus(value: unknown): value is ReviewStatus {
  return typeof value === "string" && (REVIEW_STATUSES as readonly string[]).includes(value);
}

export type ReferenceProvenance = {
  source_document?: string;
  source_page?: string;
  source_section?: string;
  source_table?: string;
  source_row?: string;
  source_column?: string;
  source_value?: number;
  source_unit?: R1Unit;
  extraction_method?: string;
  review_status: ReviewStatus;
};

export const UNRESOLVED_PROVENANCE: ReferenceProvenance = {
  review_status: "UNRESOLVED",
};

export type VerificationMetadata = {
  id: string;
  feature: string;
  classification: ReferenceSourceClassification;
  provenance: ReferenceProvenance;
  input_hash?: string;
  expected: number | null;
  tolerance: TolerancePolicy;
  note?: string;
};
