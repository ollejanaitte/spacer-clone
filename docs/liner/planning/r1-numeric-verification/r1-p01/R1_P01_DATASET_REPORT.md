# R1_P01_DATASET_REPORT

- **Date**: 2026-08-07
- **Phase**: R1-P01-02/03/04 (reference value dataset)

## Dataset added

`frontend/src/liner/core/verification/reference-data/`
- `dataset-alignment-profile.ts` — 28 reference rows (P01-02)
- `dataset-bridge-geometry.ts` — 30 reference rows (P01-03)
- `dataset-haunch-hoso-drawing.ts` — 9 reference rows + 2 unresolved (P01-04)
- `dataset.ts` — aggregate (version v1, generated_at 2026-08-07)
- integrity tests in `__tests__/`

## Categories covered

| Category | Rows |
|---|---|
| horizontal_alignment | 10 |
| station | 4 |
| vertical_profile | 8 |
| crossfall | 3 |
| section_height | 6 (3 profile + 1 drawing + 1 girder height + 1 plan) |
| span | 6 |
| girder_panel_length | 6 |
| girder_span_length | 6 |
| ldist | 2 |
| overhang | 2 |
| transverse_spacing | 4 |
| girder_point | 6 |
| haunch | 3 |
| hoso | 3 |
| drawing_coordinate | 2 |
| **Total reference rows** | **67** |
| **Unresolved rows** | **2** |

## Sources

- SRC-LINER-SAMPLE (JIP-LINER 実出力 サンプル計算書): pages 7,8,9,10,13,74
- SRC-DESIGN-CALC (鋼鈑桁橋設計計算例): pages 10,11,13,14,15
- SRC-DRAWING (鋼鈑桁橋図面例): pages 1,10

## Review status

- All 67 reference rows: CROSS_CHECKED (golden-usable). Confidence HIGH/MEDIUM.
- 2 unresolved rows separated (drawing/dxf coordinate), never golden-usable.
- No self-referential, no interpolated in the golden-usable set.

## Validation

- validateReferenceRow: all pass
- duplicate reference_id: none
- unit-group parity: pass
- expected categories covered: pass
