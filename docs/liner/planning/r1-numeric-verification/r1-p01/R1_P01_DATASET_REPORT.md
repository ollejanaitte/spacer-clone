# R1_P01_DATASET_REPORT

- **Date**: 2026-08-07
- **Phase**: R1-P01-02 (alignment/profile/station/crossfall/section height) + R1-P01-03 (bridge geometry/LDIST)

## Dataset added

`frontend/src/liner/core/verification/reference-data/`
- `dataset-alignment-profile.ts` — 28 reference rows (P01-02)
- `dataset-bridge-geometry.ts` — 30 reference rows (P01-03)
- `dataset.ts` — aggregate (version v1, generated_at 2026-08-07)
- integrity tests in `__tests__/dataset-alignment-profile.test.ts`, `__tests__/dataset-bridge-geometry.test.ts`

## Categories covered

| Category | Rows |
|---|---|
| horizontal_alignment | 10 |
| station | 4 |
| vertical_profile | 8 |
| crossfall | 3 |
| section_height | 5 (3 profile + 2 drawing) |
| span | 6 |
| girder_panel_length | 6 |
| girder_span_length | 6 (curvature + spacing) |
| ldist | 2 |
| overhang | 2 |
| transverse_spacing | 4 |
| girder_point | 6 |
| **Total** | **58** |

## Sources

- SRC-LINER-SAMPLE (JIP-LINER 実出力 サンプル計算書): pages 7,8,9,10,13
- SRC-DESIGN-CALC (鋼鈑桁橋設計計算例): pages 10,11,13,14,15
- SRC-DRAWING (鋼鈑桁橋図面例): page 1

## Review status

- All rows: CROSS_CHECKED (golden-usable). Confidence HIGH.
- No self-referential, no interpolated, no unresolved in this subset.

## Validation

- validateReferenceRow: all pass
- duplicate reference_id: none
- unit-group parity: pass
- expected categories covered: pass
