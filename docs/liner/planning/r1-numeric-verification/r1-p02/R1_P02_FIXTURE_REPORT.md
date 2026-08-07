# R1_P02_FIXTURE_REPORT

- **Date**: 2026-08-07
- **Phase**: R1-P02-02 (horizontal + station), R1-P02-03 (profile/crossfall/height)

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

## P02-03 vertical fixture

`frontend/src/liner/core/verification/comparison/adapters/profile-crossfall-height.ts`

- HCL vertical alignment reconstructed from 縦断線形 (crown heights + grades).
- crown heights / grades / crossfall → INPUT_PARITY (input definitions carried through the
  pipeline input model).
- section_height plan heights → NOT_COMPARABLE: reproducing them requires the full vertical
  alignment plus the cross-section station chainage (station equations) not present in the
  R1-P01 dataset; a naive reconstruction does not reproduce the reference values.

## Comparison adapters

- `comparison/adapters/horizontal-station.ts` — `runHorizontalStationComparison()`
- `comparison/adapters/profile-crossfall-height.ts` — `runProfileCrossfallHeightComparison()`

## Results (P02-02 horizontal + station)

| metric | count |
|---|---|
| total references | 14 |
| input parity | 11 (all PASS) |
| derived comparable | 0 |
| derived PASS | 0 |
| derived FAIL | 0 |
| not comparable | 3 (station chainage: REF-station-002/003/004) |

## Results (P02-03 vertical/crossfall/height)

| metric | count |
|---|---|
| total references | 14 |
| input parity | 11 (all PASS: crown heights 3, grades 5, crossfall 3) |
| derived comparable | 0 |
| derived PASS | 0 |
| derived FAIL | 0 |
| not comparable | 3 (section_height plan heights) |

## Honesty note

No expected value was generated from runtime; no tolerance was widened; no reference value
was altered; rows that cannot be reproduced honestly are NOT_COMPARABLE, not PASS. Input
parity is reported separately and is NOT counted as numeric calculation verification.
