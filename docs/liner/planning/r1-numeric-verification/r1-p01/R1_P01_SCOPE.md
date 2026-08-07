# R1_P01_SCOPE

- **Date**: 2026-08-07
- **Phase**: R1-P01 — reference value dataset & golden data preparation
- **Base**: `research/liner-r1-planning`

## 1. Purpose

R1-P01 is NOT a calculation-feature phase. It freezes known values from external
documents into a machine-readable, provenance-carrying, verifiable reference dataset for
reuse by R1-P02+ external golden tests.

## 2. Target categories

| Category | Source priority | Status |
|---|---|---|
| horizontal_alignment | 1: JIP-LINER output (SRC-004 sample calc) | IN SCOPE |
| station | 1: JIP-LINER output | IN SCOPE |
| vertical_profile | 1: JIP-LINER output | IN SCOPE |
| crossfall | 1: JIP-LINER output | IN SCOPE |
| section_height | 2: design calc / drawing | IN SCOPE |
| pier | 2: design calc | IN SCOPE |
| span | 2: design calc (支間長 table) | IN SCOPE |
| girder_point | 2: design calc (格点座標 table) | IN SCOPE |
| girder_span_length | 2: design calc | IN SCOPE |
| girder_panel_length | 2: design calc (格間長 table) | IN SCOPE |
| transverse_spacing | 2: design calc (横断間隔 table) | IN SCOPE |
| overhang | 2: design calc (床版張出し長 table) | IN SCOPE |
| ldist | 2: design calc (主桁支間長/格間長) | IN SCOPE |
| haunch | 2: design calc / drawing (ハンチ高) | IN SCOPE (limited) |
| hoso | 2: drawing (アスファルト舗装 t=80mm) | IN SCOPE (limited) |
| drawing_coordinate | 2: drawing 座標表 | PARTIAL (coordinates mainly UNRESOLVED) |
| dxf_coordinate | 3: dxf-unit mapping | PARTIAL (see unresolved) |

## 3. Source priority (authoritative ordering)

1. Real JIP-LINER output (sample calc PDF)
2. Real design calc tables/values (steel girder bridge design calc PDF)
3. Real drawing coordinates/dimensions (drawing PDF)
4. Independent-formula recomputation
5. legacy golden (not authoritative; record as classification)
6. self-referential golden (not authoritative; record as classification)
7. interpolated values (not authoritative; record as classification)

Sources 1-4 are authoritative candidates. Sources 5-7 are recorded as
classification/migration targets only, never frozen as authoritative golden.

## 4. Authoritative sources identified

| Source ID | Document | Location | Role |
|---|---|---|---|
| SRC-DESIGN-CALC | 鋼鈑桁橋_設計計算例.pdf | research sources/design_examples | span/panel/overhang/curvature/girder points |
| SRC-LINER-SAMPLE | 001_サンプル_LINER計算書_高架橋_入力結果_出力結果.PDF | research sources/design_examples | horizontal/vertical/profile/crossfall/station |
| SRC-DRAWING | 鋼鈑桁橋_図面例.pdf | research sources/design_examples | section height, hoso, drawing dims |
| SRC-R1P00 | R1-P00 foundation (frontend/src/liner/core/verification) | repo branch | types/validation foundation |

Note: PDFs are NOT committed to GitHub (copyright); only the extracted dataset + provenance
is committed.

## 5. Confirmed values (seed set, authoritative)

From SRC-DESIGN-CALC (PDF page 10, section 1.3 基本寸法一覧):

| value_name | value | unit | table | page |
|---|---|---|---|---|
| AG1 支間長 1 | 40291.5 | mm | 主桁支間長 | 10 |
| AG2 支間長 1 | 40020.1 | mm | 主桁支間長 | 10 |
| AG1 支間長 2 | 50974.5 | mm | 主桁支間長 | 10 |
| AG2 支間長 2 | 51051.0 | mm | 主桁支間長 | 10 |
| AG1 支間長 3 | 40287.1 | mm | 主桁支間長 | 10 |
| AG2 支間長 3 | 40025.9 | mm | 主桁支間長 | 10 |
| AG1 格間長 1 | 5344.0 | mm | 主桁格間長 | 10 |
| AG2 格間長 1 | 5020.1 | mm | 主桁格間長 | 10 |
| AG1 格間長 2-8 | 4992.5 | mm | 主桁格間長 | 10 |
| AG2 格間長 2-8 | 5000.0 | mm | 主桁格間長 | 10 |
| AG1 格間長 9 | 5097.4 | mm | 主桁格間長 | 10 |
| AG2 格間長 9 | 5105.1 | mm | 主桁格間長 | 10 |
| 床版張出し長 (全横断) | 1755.0 | mm | 床版張出し長(法線方向) | 14 |
| 曲率 AG1 (主桁中心) | 2998.5 | m | 曲率(主桁中心) | 15 |
| 曲率 AG2 (主桁中心) | 3003.0 | m | 曲率(主桁中心) | 15 |

From SRC-DESIGN-CALC (PDF page 13, 主桁格点座標): grid point coordinates for AG1/AG2
(X,Y per cross section 1..23+), unit mm.

From SRC-DESIGN-CALC (PDF page 11, 横断間隔長): cross-section interval lengths
(歩車道境界〜AG1, AG1〜AG2, 歩車道境界〜AG2, 合計) per cross section.

From SRC-LINER-SAMPLE (PDF page 7+): horizontal element length, radius, X/Y, station,
azimuth for the sample alignment; page 10 縦断線形 (crown height, grade, curve length);
page 13 横断 (crossfall, plan height).

From SRC-DRAWING (page 10): アスファルト舗装 t=80mm, 鋼コンクリート合成床版 t=230mm,
ハンチ高 100mm; 主桁高 2700mm; 主桁間隔 4500mm; 平均支間長 43800mm; 支間長 40201mm(ACL上).

## 6. Fail-closed exclusion rules

Values are NOT adopted as golden when:

- source page unknown
- unit unknown
- coordinate system unknown
- sign convention unknown
- transcription doubt
- OCR unverified
- self-referential value
- interpolated value
- rounding rule unknown
- tolerance unknown

## 7. Out of scope

- R1-P02 external comparison tests
- Calculation logic changes
- JIP golden bulk load beyond seed set
- UI / 2D / 3D / drawing changes
- Curved bridge / widening / pier-9 / unsupported haunch implementations
- package dependency changes
