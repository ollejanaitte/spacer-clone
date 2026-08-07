# R1_P01_UNRESOLVED_REPORT

- **Date**: 2026-08-07
- **Phase**: R1-P01-04

## Unresolved values (fail-closed excluded)

Values that could not be confirmed as golden due to fail-closed rules are recorded in
`frontend/src/liner/core/verification/reference-data/dataset-haunch-hoso-drawing.ts`
(`HAUNCH_HOSO_DRAWING_UNRESOLVED`) and aggregated in `dataset.ts`.

| reference_id | category | reason |
|---|---|---|
| UNRESOLVED-drawing-001 | drawing_coordinate | 図面座標表は図形レイヤのため数値表として確定できない (page/table 疑義) |
| UNRESOLVED-drawing-002 | dxf_coordinate | DXF座標は図面図形レイヤ由来で単位・座標系・符号規約が機械可読で確定できない |

## Rules

- UNRESOLVED entries are never golden-usable.
- They carry an explicit rejection reason.
- They are handed to R1-P04 (drawing coordinate manual re-check) / R1-P06 (DXF 突合) for
  re-confirmation.
- Count: 2 unresolved (out of 67 + 2 = 69 recorded rows).

## Handover to later phases

- R1-P04/P01-05: drawing coordinate values require manual re-verification against the
  original drawing before adoption.
- R1-P06: DXF coordinate values require an authoritative unit/coordinate-system declaration
  from the DXF exporter before adoption.
