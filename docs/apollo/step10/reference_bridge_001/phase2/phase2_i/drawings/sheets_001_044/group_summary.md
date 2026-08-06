# Reference Bridge 001 — Drawings Sheets 001-044 (PDF pages 3-46)

## Overview

44 drawing sheets from the Reference Bridge 001 (旭高架橋 Aランプ PU15ｰAR2) set, covering location, general arrangement, quantities, cross-sections, girder details, and stud layouts.

## Sheet Group Breakdown

| Group | Sheets | PDF Pages | Description |
|-------|--------|------------|-------------|
| Location | 1 | 3 | 位置図 — site location map |
| General Arrangement | 2-4 | 4-6 | 橋梁一般図 — bridge general arrangement (3 sheets) |
| Quantities | 5-7 | 7-9 | 数量総括表 — quantity summary (3 sheets) |
| Structure General | 8-9 | 10-11 | 上部工構造一般図 — superstructure general arrangement |
| Alignment | 10-12 | 12-14 | 線形図 — alignment (plan, support heights) |
| Cross Section | 13-16 | 15-18 | 断面構成図 — cross-section diagrams (non-composite + composite) |
| Common Details | 17-19 | 19-21 | 共通詳細図 — stiffener, hanger, sole plate details |
| Camber | 20 | 22 | キャンバー図 — camber diagram |
| Main Girder AG1 | 21-29 | 23-31 | 主桁AG1 — 9 sheets, 16 field splices (J-1 to J-16) |
| Main Girder AG2 | 30-38 | 32-40 | 主桁AG2 — 9 sheets, 16 field splices (J-1 to J-16) |
| Stud Layout | 39-44 | 41-46 | スタッド配置図 — 6 sheets, φ22 stud placement |

## Key Dimensions

- **Bridge length**: 134,001 mm (ACL)
- **Girder length**: AG1=133,151 mm, AG2=132,847 mm
- **Spans**: 40,201 / 51,000 / 40,200 mm (3-span continuous)
- **Girder spacing**: 4,500 mm
- **Girder height**: 2,700 mm
- **Deck thickness**: 230 mm (steel-concrete composite)
- **Top flange**: 620 mm wide, thickness varies 22-39 mm (AG1/AG2)
- **Bottom flange**: 700 mm wide, thickness varies 28-40 mm
- **Web**: 14 mm thick, height ~2,537-2,657 mm
- **Cantilever overhang**: ~2,750 mm each side

## AG1 Main Girder (Sheets 21-29)

9 sheets covering 16 field splice segments (J-1 to J-16). Each sheet shows:
- Upper flange (UFLG) plates with dimensions and material grade (SM490YB)
- Web plates (WEB) with dimensions (SM490YA)
- Splice plate assemblies (SPL) with bolt quantities (TCB M22)
- Jack-up stiffener and hanger fitting locations
- Water stop plate at ends

Splice locations: 7,216 / 6,241 / 8,737 / 6,241 / 8,737 / 6,306 / 8,921 / 8,921 / 8,921 / 8,921 / 8,921 / 6,370 / 8,916 / 6,368 / 8,916 / 6,206 / 6,698 mm along girder.

## AG2 Main Girder (Sheets 30-38)

9 sheets, structurally similar to AG1 with slightly different plate lengths and girder length (132,847 mm vs 133,151 mm).

Splice locations: 6,895 / 6,250 / 8,750 / 6,250 / 8,750 / 6,316 / 8,934 / 8,934 / 8,934 / 8,934 / 8,934 / 6,380 / 8,929 / 6,378 / 8,929 / 6,126 / 6,475 mm along girder.

## Cross Sections (Sheets 13-16)

- **Sheet 13 (AG1 non-composite)**: 9 design sections (Sec-1 to Sec-9), flange/web thickness changes, 16 field splice locations
- **Sheet 14 (AG2 non-composite)**: Same section layout as AG1 with different panel lengths
- **Sheet 15 (AG1 composite)**: Bending moment envelopes (Md1, Md2, ML, Md2+ML)
- **Sheet 16 (AG2 composite)**: Bending moment envelopes for composite condition

## Stud Layout (Sheets 39-44)

- φ22 x 200 mm studs (SS400), typically in groups of 3 or 5 per row
- Stud layout shown for each girder segment with quantities
- Special detailing at splice locations and expansion joint areas
- Stud detail at 1:5 scale, layout at 1:30 scale

## Data Files

| File | Rows | Content |
|------|------|---------|
| `sheet_elements.csv` | 44 + header | One row per sheet with title, line count, preview |
| `views.csv` | 65 + header | Views identified per sheet |
| `dimensions.csv` | 34 + header | Key dimensions and values |
| `annotations.csv` | 471 + header | Annotations, scales, notes |
| `members.csv` | 56 + header | Member references |
| `tables.csv` | 10 + header | Quantity tables |
| `title_blocks.csv` | 44 + header | Title block metadata |
| `references.csv` | 44 + header | Cross-references to calc sections |