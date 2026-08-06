# Drawing Sheet Catalog

## 1. Purpose

Catalog all 141 drawing sheets of Reference Bridge 001 (RB-S10-001) with
PDF page mapping, catalog title, title block title, grouping, and source status.

## 2. Drawing catalog source

The drawing catalog (図面目録) is on PDF page 2 of the drawing PDF.
Title blocks confirm sheet numbers on each page.

## 3. Sheet-to-PDF mapping

Mapping rule: `pdf_page = sheet_number + 2`

Verified at multiple points:
- Start: PDF 3 = sheet 1 (位置図)
- Middle: PDF 23 = sheet 21 (主桁AG1その1), PDF 47 = sheet 45 (端横桁その1)
- End: PDF 141 = sheet 139 (ノーズ部ガードレールその2), PDF 142 = sheet 140 (ノーズ部止水構造図)
- Final: PDF 143 = sheet 141 (架設計画図, text-extracted "141" visible)

No gaps or duplicates found. All 141 sheets map 1:1 to PDF pages 3-143.

## 4. Sheet groups

| Group | Sheets | Count | Description |
|-------|--------|-------|-------------|
| Location/General | 1-4 | 4 | 位置図、橋梁一般図 |
| Quantities | 5-7 | 3 | 数量総括表 |
| Structure general | 8-9 | 2 | 上部工構造一般図 |
| Alignment | 10-12 | 3 | 線形図 |
| Cross-section | 13-16 | 4 | 断面構成図 |
| Common details | 17-19 | 3 | 共通詳細図 |
| Camber | 20 | 1 | キャンバー図 |
| Main girder AG1 | 21-29 | 9 | 主桁AG1 |
| Main girder AG2 | 30-38 | 9 | 主桁AG2 |
| Stud layout | 39-44 | 6 | スタッド配置図 |
| End cross beam | 45-46 | 2 | 端横桁 |
| Pier cross beam | 47-48 | 2 | 中間支点横桁 |
| Intermediate cross beam | 49-60 | 12 | 中間横桁 |
| Lateral bracing | 61-71 | 11 | 上下横構 |
| Wrapping concrete | 72-79 | 8 | 巻き立てコンクリート |
| Wrapping concrete stud | 80-83 | 4 | 巻き立てコンクリートスタッド図 |
| Composite deck layout | 84 | 1 | 合成床版割付図 |
| Bearing details | 85-88 | 4 | 支承詳細図 |
| Expansion joints | 89-92 | 4 | 伸縮装置 |
| Parapet reinforcement | 93-99 | 7 | 壁高欄配筋図 |
| Lighting pedestal | 100 | 1 | 照明受台配筋図 |
| Deck drainage | 101-111 | 11 | 上部工排水装置 |
| Substructure drainage | 112-114 | 3 | 下部工排水装置 |
| Bridge deck drainage | 115 | 1 | 橋面排水工 |
| Superstructure inspection | 116-125 | 10 | 上部工検査路 |
| Substructure inspection | 126-130 | 5 | 下部工検査路 |
| Slope stairs | 131 | 1 | 法面階段 |
| Falling object prevention | 132 | 1 | 落下物防止柵 (参考図) |
| Spalling prevention | 133-134 | 2 | 剥落防止対策工 |
| Step prevention | 135-136 | 2 | 段差防止構造 |
| Bridge nameplate | 137 | 1 | 橋名板・橋歴板 (参考図) |
| Nose guardrail | 138-139 | 2 | ノーズ部ガードレール (参考図) |
| Nose water stop | 140 | 1 | ノーズ部止水構造図 (参考図) |
| Erection plan | 141 | 1 | 架設計画図 |

Total: 141 sheets

## 5. Scale information

Extracted from representative title blocks:

| Sheet | Scale |
|-------|-------|
| 1 (位置図) | — |
| 8 (上部工構造一般図その1) | S=1:200 |
| 9 (上部工構造一般図その2) | S=1:50 |
| 21 (主桁AG1その1) | — |
| 45 (端横桁その1) | S=1:30 |
| 87 (支承詳細図その3) | S=1:15 |
| 91 (伸縮装置その3) | — |

## 6. Title block verification

Representative sheets checked for title block content:
- 位置図 (sheet 1): 旭高架橋 Aランプ PU15-AR2, 一般国道247号, 知多市旭地内始め
- 上部工構造一般図(その1) (sheet 8): Full design conditions match calc
- 下部工排水装置 (sheet 112-114): Same bridge/work/route/location
- ノーズ部ガードレール (sheet 138-139): Same bridge/work/route/location

All checked sheets show consistent bridge/work/route/location metadata.

## 7. Sheet notes

- Sheets 132, 137-140 are marked 参考図 (reference drawing)
- All sheets share the same title block format with "全 141 葉の内 X 号"
- No revision column or revision mark found in title blocks
- Sheet numbering is continuous 1-141 with no gaps or duplicates

## 8. Verdict

DRAWING_SHEET_CATALOG_VERDICT: PASS