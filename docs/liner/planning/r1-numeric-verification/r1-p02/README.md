# R1-P02 — External Golden Comparison Base

This directory documents R1-P02: building the external golden comparison infrastructure
for horizontal alignment, station, vertical profile, crossfall, and section height, using
the R1-P00 verification foundation and R1-P01 reference dataset.

## Principle

> Judge match/mismatch correctly with unit, coordinate system, tolerance, and provenance.
> Never modify expected values, tolerance, rounding, or calculation results to hide a
> mismatch.

## Scope

- Categories: horizontal_alignment, station, vertical_profile, crossfall, section_height
  (28 reference rows: 18 INPUT_PARITY + 10 DERIVED_OUTPUT)
- P02 subset source: `ALIGNMENT_PROFILE_ROWS` (28 rows, confirmed)
- Out of scope: span/girder/ldist/haunch/hoso/drawing/dxf (P03+)

## Documents

- `R1_P02_SCOPE.md` — scope, comparability kinds, engine contract, mismatch rules, PR plan
- `R1_P02_P01_HANDOFF_AUDIT.md` — P01 handoff + PR #450 count reconcile
- `R1_P02_COMPARABILITY_MATRIX.csv` — all 28 rows classified
- `R1_P02_TARGET_CASES.md` — target cases + fixture availability
- `R1_P02_PR_BREAKDOWN.md` — stepwise PR plan (P02-00..P02-05)
- `R1_P02_COMPARISON_ENGINE.md` — engine design (P02-01)
- `R1_P02_FIXTURE_REPORT.md` — fixture strategy (P02-02/03)
- `R1_P02_COMPARISON_REPORT.md` — comparison results (P02-04)
- `R1_P02_DISCREPANCY_LEDGER.csv` — mismatches (P02-04)
- `R1_P02_COVERAGE_MATRIX.csv` — coverage (P02-04)
- `R1_P02_TEST_REPORT.md`, `R1_P02_SCOPE_AUDIT.md`, `R1_P02_PR_LEDGER.md`,
  `R1_P02_FINAL_REPORT.md` — integration/final (P02-05)

## Deliverables (code)

```
frontend/src/liner/core/verification/comparison/**
```
