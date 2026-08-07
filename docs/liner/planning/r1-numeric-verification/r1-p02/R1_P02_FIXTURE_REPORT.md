# R1_P02_FIXTURE_REPORT

- **Date**: 2026-08-07
- **Phase**: R1-P02-02 (horizontal + station)

## Fixtures

`frontend/src/liner/core/verification/comparison/fixtures/horizontal-station.ts`

| Fixture | Source | Rows used | Reconstructed |
|---|---|---|---|
| CL alignment | SRC-LINER-SAMPLE p7 | REF-horizontal-001..005, REF-station-001 | 3 elements (arc/clothoid/straight) from element length/radius/parameter; origin station |
| ECL alignment | SRC-LINER-SAMPLE p8 | REF-horizontal-006..008 | 2 arc elements |
| HCL alignment | SRC-LINER-SAMPLE p9 | REF-horizontal-009..010 | arc + straight |

Reconstruction limitation (documented): the R1-P01 dataset records element length, radius,
clothoid parameter, and endpoint stations, but NOT per-element start coordinates, azimuths,
or station-equation definitions. Therefore:

- Element length / radius / parameter are reconstructed as pipeline input values →
  **INPUT_PARITY** (serialization parity check, not derived calculation).
- Cumulative station numbers in the JIP output use station equations not in the dataset →
  derived-station comparison is **NOT_COMPARABLE** (except the origin station, which is
  INPUT_PARITY).

## Comparison adapter

`frontend/src/liner/core/verification/comparison/adapters/horizontal-station.ts`

- `runHorizontalStationComparison()` returns `ExternalComparisonResult[]` for all 14
  horizontal_alignment (10) + station (4) rows.

## Results (P02-02)

| metric | count |
|---|---|
| total references | 14 |
| input parity | 11 (all PASS) |
| derived comparable | 0 |
| derived PASS | 0 |
| derived FAIL | 0 |
| not comparable | 3 (station chainage: REF-station-002/003/004) |

Input-parity PASS verifies the reference element length/radius/parameter and the station
origin are faithfully representable in the current LINER pipeline input model. It is NOT
counted as numeric calculation verification.

## Honesty note

No expected value was generated from runtime; no tolerance was widened; no reference value
was altered; station rows that cannot be reproduced honestly are NOT_COMPARABLE, not PASS.
