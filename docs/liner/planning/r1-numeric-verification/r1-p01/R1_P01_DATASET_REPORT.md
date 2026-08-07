# R1_P01_DATASET_REPORT (P01-02 subset)

- **Date**: 2026-08-07
- **Phase**: R1-P01-02 (alignment / profile / station / crossfall / section height)

## Dataset added

`frontend/src/liner/core/verification/reference-data/`
- `dataset-alignment-profile.ts` — 27 reference rows
- `dataset.ts` — aggregate (version v1, generated_at 2026-08-07)
- `__tests__/dataset-alignment-profile.test.ts` — integrity tests

## Categories covered

| Category | Rows |
|---|---|
| horizontal_alignment | 10 |
| station | 4 |
| vertical_profile | 8 |
| crossfall | 3 |
| section_height | 3 |
| **Total** | **28** (27 in alignment-profile module; dataset aggregate tracks all) |

## Sources

- SRC-LINER-SAMPLE (JIP-LINER 実出力 サンプル計算書):
  - page 7: 平面線形 (CL) — element length / radius / station
  - page 8: 平面線形 (ECL)
  - page 9: 平面線形 (HCL)
  - page 10: 縦断線形 (HCL) — crown height / grade
  - page 13: 横断 橋軸線 — crossfall / plan height (section_height)

## Review status

- All rows: CROSS_CHECKED (golden-usable). Confidence HIGH.
- No self-referential, no interpolated, no unresolved in this subset.

## Validation

- validateReferenceRow: all pass
- duplicate reference_id: none
- unit-group parity: pass
- expected categories covered: pass
