# R1_P01_SOURCE_INVENTORY

- **Date**: 2026-08-07
- **Phase**: R1-P01

## Source inventory

| Source ID | Document | Type | Size | Role | Commit to GitHub? |
|---|---|---|---|---|---|
| SRC-DESIGN-CALC | 鋼鈑桁橋_設計計算例.pdf | PDF (copyright) | 9.7 MB | span/panel/overhang/curvature/girder points | NO (original) |
| SRC-LINER-SAMPLE | 001_サンプル_LINER計算書_高架橋_入力結果_出力結果.PDF | PDF | 0.5 MB | horizontal/vertical/profile/crossfall/station | NO (original) |
| SRC-DRAWING | 鋼鈑桁橋_図面例.pdf | PDF | 6.7 MB | section height, hoso, drawing dims | NO (original) |
| SRC-R1P00 | R1-P00 foundation module | TS (repo) | - | types/validation foundation | YES (already on branch) |
| SRC-MANUAL | JIP-LINER_マニュアル.pdf | PDF (copyright) | 3.7 MB | units/spec reference | NO (original) |

## Extraction method by source

| Source | Method | Notes |
|---|---|---|
| SRC-DESIGN-CALC | TABLE_EXTRACTION (pdftotext -layout) | pages 10,11,13,14,15 authoritative |
| SRC-LINER-SAMPLE | TEXT_EXTRACTION | pages 7,10,13 |
| SRC-DRAWING | TEXT_EXTRACTION | page 10 dims; coordinate tables mostly graphical -> UNRESOLVED |
| SRC-R1P00 | N/A | reuse types |

## Page maps (authoritative)

SRC-DESIGN-CALC (2226 pages):
- page 10: 主桁支間長, 主桁格間長 (section 1.3 基本寸法一覧)
- page 11: 横断間隔長
- page 13: 主桁格点座標 (AG1/AG2 X/Y)
- page 14: 床版張出し長(法線方向)
- page 15: 曲率(主桁中心)

SRC-LINER-SAMPLE (84 pages):
- page 7: horizontal alignment elements (要素長, 曲率半径, X/Y, 測点, 方位角)
- page 10: 縦断線形 HCL (crown height, 前/後勾配, 曲線長)
- page 13: 横断 (橋軸線 X座標 Y座標 計画高 横断勾配 交角 測点)

SRC-DRAWING (143 pages):
- page 10: 舗装 t=80mm, 床版 t=230mm, ハンチ高 100mm
- general view: 主桁高 2700mm, 主桁間隔 4500mm, 平均支間長 43800mm, 支間長 40201mm(ACL上)

## Recording rule

- The dataset records `source_document`, `source_page`, `source_section`, `source_table`,
  `source_row`, `source_column` for every value.
- PDF originals are never committed to GitHub.
