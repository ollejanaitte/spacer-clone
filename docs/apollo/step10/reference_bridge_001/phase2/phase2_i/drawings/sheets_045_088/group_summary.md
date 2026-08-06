# Reference Bridge 001 — Drawing Sheets 45–88: Group Summary

## Overview

- **PDF pages extracted**: 47–90 (44 sheets total)
- **Extraction method**: `pdftotext -layout` per page
- **Sheet range**: 45 (端横桁) through 88 (支承詳細図)

## Sheet Group Breakdown

| Group | Sheets | Count | Description |
|---|---|---|---|
| end_cross_beam | 45–46 | 2 | 端横桁 (End cross beam) |
| pier_cross_beam | 47–48 | 2 | 中間支点横桁 (Pier cross beam) |
| intermediate_cross_beam | 49–60 | 12 | 中間横桁 (Intermediate cross beam) |
| lateral_bracing | 61–71 | 11 | 上下横構 (Lateral bracing) |
| wrapping_concrete | 72–79 | 8 | 巻き立てコンクリート (Wrapping concrete) |
| wrapping_concrete_stud | 80–83 | 4 | 巻き立てコンクリートスタッド図 (Wrapping concrete stud) |
| composite_deck_layout | 84 | 1 | 合成床版割付図 (Composite deck layout) |
| bearing_detail | 85–88 | 4 | 支承詳細図 (Bearing details) |

## Cross Beam Data (Sheets 45–60)

- All cross beams span **4500 mm** between girders (端横桁: 4512.2 ± overhang)
- **End cross beams**: UFLG 400×19 central + 250×12 ends; web 2537×32×791 (SM490YB)
- **Pier cross beam**: UFLG 560×32×2896, web 2614×40×791 (heaviest section)
- **Intermediate cross beams**: UFLG 250×12 varying lengths (3196–3496 mm); thickness t=12–22mm
- Bolt patterns: M22 S10T, varying counts (8–102 per connection)
- Studs: φ22×200 (SS400), 4 or 6 per location

## Lateral Bracing Data (Sheets 61–71)

- Gusset plates: SM490YB, thickness 12–22mm, dimensions vary per panel
- Panel lengths: 4992.5 mm (typical), 5097.4 mm at PR2
- Bolt patterns: M22 S10T, sizes M22×60 through M22×80, counts 6–52 per connection
- Connection plate (K.L. detail): 20×30×30×20 profile

## Wrapping Concrete Data (Sheets 72–83)

- Rebar: D19 (K-series: K1–K7) and D25 (H-series: H1–H11)
- Sections at 1650 mm intervals (H–L sections)
- Stud spacing: 5×300=1500 mm transverse, 4×300=1200 mm longitudinal
- Slopes: 2.000%–2.600%

## Bearing Data (Sheets 85–88)

- **Type**: 鉛プラグ入り積層ゴム支承 (Lead rubber bearing) NR+SM490A+SS400+Pb
- **PU15-AR2 (Bearings 1, 3)**: Rmax=2000kN, Rheq1=1354kN, ΔL1=49.4mm, bolts M36/M45/M72, anchor D41
- **PR1-PR2 (Bearings 2, 4)**: Rmax=4730kN, Rheq1=3391kN, ΔL1=15.7mm, bolts M45/M48/M90, anchor D41
- Sole plates: SM490A+SS400, dimensions 990×700 (PU15) / 1340×1100 (PR)

## Data Quality Notes

- Text extraction via `pdftotext -layout` preserves approximate spatial layout
- Non-layout extraction misses table structure; manual grouping applied
- Some design condition values marked ---- (not specified) in later bearing sheets
- Bearing sheet 3–4 lack most reaction values; likely refers to sheet 1–2 data
