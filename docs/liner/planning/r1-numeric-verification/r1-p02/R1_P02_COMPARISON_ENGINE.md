# R1_P02_COMPARISON_ENGINE

- **Date**: 2026-08-07
- **Phase**: R1-P02-01

## Implementation

`frontend/src/liner/core/verification/comparison/`

| File | Purpose |
|---|---|
| `types.ts` | `ComparisonKind`, `ComparisonStatus`, `ExternalComparisonResult`, `ComparisonSummary`, `ComparisonReport`, `CompareInput` |
| `comparator.ts` | `compareExternalValue`, `fromReferenceRow`, `coordinateSystemsCompatible`, `unitsComparableAfterConversion` |
| `report.ts` | `buildComparisonSummary`, `buildComparisonReport`, `resultsToCsv` |
| `index.ts` | barrel export (re-exported from verification/index.ts) |

## Contract

- Statuses: PASS, FAIL, SKIP_UNRESOLVED, NOT_COMPARABLE, CONTRACT_ERROR, UNIT_MISMATCH,
  COORDINATE_MISMATCH, ACTUAL_MISSING.
- tolerance: uses row `comparison_tolerance`; never widened. exact/absolute/relative.
- unit: `areUnitsComparable` from R1-P00 units module (mm<->m, degree<->radian,
  percent<->permille within group).
- coordinate system: must match; otherwise COORDINATE_MISMATCH (never auto-PASS).
- fail-closed: missing actual/expected/unit/coordinate/tolerance → CONTRACT_ERROR or
  ACTUAL_MISSING. NaN/Infinity → CONTRACT_ERROR. UNRESOLVED kind → SKIP_UNRESOLVED.

## Behaviors

- exact PASS on `=== 0` difference (negative zero == 0).
- absolute/relative tolerance combined (either passes).
- zero-expected edge handled with relative denominator `max(|expected|, EPSILON)`.
- mismatch_reason populated (UNIT_ERROR / COORDINATE_ERROR / etc.).

## Tests

19 focused tests covering: exact/abs/rel PASS/FAIL, zero edge, negative zero, NaN/Infinity
reject, unit mismatch, coordinate mismatch, unresolved skip, missing actual, missing
tolerance, tolerance-without-rule, fromReferenceRow integration, report summary + CSV.

Total verification tests: 151 PASS.
