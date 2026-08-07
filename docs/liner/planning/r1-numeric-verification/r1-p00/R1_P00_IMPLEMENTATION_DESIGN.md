# R1_P00_IMPLEMENTATION_DESIGN

- **Date**: 2026-08-07
- **Phase**: R1-P00 — verification foundations freeze
- **Host**: `frontend/src/liner/core/verification/`

## Design principles

1. **Additive only.** New files under `frontend/src/liner/core/verification/`. Existing
   calculation modules are not modified. The only existing-file change is an additive
   `export * from "./verification"` in `frontend/src/liner/core/index.ts`.
2. **Extend, don't duplicate.** Reuse `DxfUnits` (import type from
   `liner/dxf/model/units`), `Handedness`/`CoordinateContext` (contracts) concepts, and the
   relative/absolute tolerance semantics documented in `verificationReport.ts`. No new
   runtime dependencies.
3. **Fail-closed.** Unknown values are never silently defaulted. Explicit states:
   `UNKNOWN`, `UNRESOLVED`, `REJECTED`. Missing required provenance rejects.
4. **No calculation behavior change.** No existing golden, fixture, or calculation result
   is altered.

## Types (literal unions + guards)

### Reference source classification

```ts
export type ReferenceSourceClassification =
  | "EXTERNAL_REFERENCE"     // authoritative external output/document (LAYER2)
  | "INDEPENDENT_FORMULA"    // closed-form analytic (LAYER1)
  | "LEGACY_GOLDEN"          // inherited committed golden
  | "SELF_REFERENTIAL"       // derived from the code under test (must not be authoritative)
  | "INTERPOLATED_PLACEHOLDER" // interpolated, pending replacement (GAP-1002)
  | "MANUAL_TRANSCRIPTION"   // manually transcribed from PDF/document
  | "UNKNOWN";
```

### Units

```ts
export type R1LengthUnit = "m" | "mm";
export type R1AngleUnit = "degree" | "radian";
export type R1RatioUnit = "percent" | "permille";
export type R1Unit =
  | R1LengthUnit
  | R1AngleUnit
  | R1RatioUnit
  | "station"
  | "curvature_radius_m"
  | "dxf_unit";
```

`dxf_unit` maps to the existing `DxfUnits` (millimeters/meters/unitless) via a helper.
Units are grouped by dimension (`length`, `angle`, `ratio`, `other`) for mismatch checks.

### Rounding / precision policy

```ts
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
```

Proposed defaults are explicit and flagged as subject to review (per R1_P00_PLAN_REVIEW
UNRESOLVED_REQUIREMENTS).

### Tolerance policy

```ts
export type TolerancePolicy = {
  absolute?: number;
  relative?: number;
  exact?: boolean;
  unitGroup: R1UnitGroup;        // must match between expected and actual
  coordinateSystem?: R1CoordinateSystem;
};
export function isFiniteTolerance(p): boolean;      // rejects NaN/Infinity/negative
export function compareWithPolicy(expected, actual, policy): ComparisonResult;
```

Comparison result:
```ts
export type ComparisonVerdict = "PASS" | "FAIL" | "REJECTED";
export type ComparisonResult = {
  verdict: ComparisonVerdict;
  reason?: string;
  expected: number;
  actual: number;
  difference: number;
  relativeError?: number;
  rejectedReason?: "nan" | "infinity" | "unit_mismatch" | "coordinate_system_mismatch";
};
```

Rules:
- `exact: true` → verdict PASS iff exactly equal; no tolerance.
- Otherwise PASS if `|expected-actual| <= absolute` OR (`relative` given AND
  `|diff| / max(|expected|, epsilon) <= relative`).
- NaN/Infinity expected or actual → `REJECTED` (never `PASS`/`FAIL`).
- unit group or coordinate-system mismatch → `REJECTED`.

### Coordinate systems & sign conventions

```ts
export type R1CoordinateSystem =
  | "GLOBAL_XY" | "ALIGNMENT_TANGENT_NORMAL" | "BRIDGE_LOCAL"
  | "GIRDER_LOCAL" | "VERTICAL_DATUM";
export type OffsetSign = "left_positive" | "right_positive";
export type RotationSign = "clockwise_positive" | "counterclockwise_positive";
export type CrossfallSign = "fall_to_right_positive" | "rise_to_right_positive";
export type SkewSign = "positive_when_turning_right" | "positive_when_turning_left";
export type StationDirection = "forward_increasing" | "forward_decreasing";
export type VerticalPositive = "up_positive" | "down_positive";
export type SignConventions = { offset; rotation; crossfall; skew; station; vertical };
export function validateSignConventions(c): string[]; // errors, fail-closed
```

### Provenance

```ts
export type ReviewStatus = "UNRESOLVED" | "UNREVIEWED" | "REVIEWED" | "REJECTED";
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
export function validateProvenance(p): string[]; // review_status required
export const UNRESOLVED_PROVENANCE: ReferenceProvenance = { review_status: "UNRESOLVED" };
```

### Verification metadata (golden schema)

```ts
export type VerificationMetadata = {
  id: string;                 // e.g. "R1-AL-001"
  feature: string;
  classification: ReferenceSourceClassification;
  provenance: ReferenceProvenance;
  input_hash?: string;        // sha256 (sourceRevisionFor)
  expected: number | null;
  tolerance: TolerancePolicy;
  note?: string;
};
export function validateVerificationMetadata(m): string[];
```

Fail-closed rules:
- `classification === "UNKNOWN"` or provenance `review_status` in `UNRESOLVED`/`REJECTED`
  → metadata is not authoritative; validator emits an error unless explicitly tagged
  non-authoritative.
- Missing provenance (no `review_status`) → error.
- `expected` must be finite or explicitly `null` (unknown) — never NaN/Infinity.

## Validation

- Guard functions: `isReferenceSourceClassification(v)`, `isR1Unit(v)`,
  `isR1CoordinateSystem(v)`, `isReviewStatus(v)`.
- `validateVerificationMetadata`, `validateProvenance`, `validateSignConventions`,
  `isFiniteTolerance` return `string[]` of errors (empty = valid). Fail-closed on
  unknown values.

## Serialization

- Pure functions operating on plain objects; no class-based serialization. `toJSON` not
  needed; canonical JSON via existing `sourceRevisionFor` is used for `input_hash`.

## Diagnostics

- R1-P00 introduces its own lightweight validation result (string[] errors) and does not
  extend `LinerDiagnosticCode` (to keep the existing diagnostics table untouched).
- Comparison results carry a `rejectedReason` when fail-closed triggers.

## Backward compatibility

- No existing type or function signature is changed.
- `nearlyEqual`, `DEFAULT_TOLERANCES`, `evaluateMetric`, `compareDisplacements` are left
  untouched; R1 comparison helpers are additive and independent.
- `DxfUnits` is imported, not redefined.

## Migration

- No migration needed: R1-P00 adds new types/helpers only. Existing fixtures and project
  files are unaffected.

## Fail-closed / defaults

- No default value is silently applied to `classification`, `review_status`,
  `coordinateSystem`, or `unitGroup`. Consumers must provide explicit values or use the
  explicit `UNRESOLVED_*` sentinels.
- `expected` is `number | null`; `null` = unknown (explicit), not a silent 0.

## API boundary

- Public surface = barrel export `frontend/src/liner/core/verification/index.ts` plus
  re-export from `liner/core/index.ts`. Consumers of R1-P01+ import from `liner/core`.

## File list

Implementation:
1. `verification/types.ts`
2. `verification/units.ts`
3. `verification/rounding.ts`
4. `verification/tolerance.ts`
5. `verification/coordinate.ts`
6. `verification/provenance.ts`
7. `verification/verificationMetadata.ts`
8. `verification/index.ts`
9. Edit `liner/core/index.ts` (additive export)

Tests:
10. `verification/__tests__/units.test.ts`
11. `verification/__tests__/rounding.test.ts`
12. `verification/__tests__/tolerance.test.ts`
13. `verification/__tests__/coordinate.test.ts`
14. `verification/__tests__/provenance.test.ts`
15. `verification/__tests__/verificationMetadata.test.ts`

Docs:
16. `docs/liner/planning/r1-numeric-verification/r1-p00/README.md`
17. `R1_P00_TEST_REPORT.md`
18. `R1_P00_SCOPE_AUDIT.md`
19. `R1_P00_FINAL_REPORT.md`
20. Update `docs/liner/planning/r1-numeric-verification/BRANCH_STATUS.md`
