# Chapter 1: 設計条件 (Design Conditions) — Extraction Summary

## Scope
- PDF pages: 6–15 (printed pages 1–10)
- Sections: 1.1 (設計条件), 1.2 (上部工構造一般図), 1.3 (基本寸法一覧)

## Content Extracted

### 1.1 設計条件 (PDF 7 / Printed 2)
- Full design condition table extracted: 36 values
- Road spec (A規格), speed (40km/h), live load (B活荷重)
- Bridge geometry: length 134.001m, girder length 133.151m, spans 40.201+51.000+40.200m
- Width: total 8.010m, effective 7.000m
- Skew angles, horizontal/vertical alignments
- Pavement (80mm), deck (230mm composite steel-concrete)
- Materials: SM520, SM490Y, SM400, SS400; concrete σck=30/24/30 N/mm²; rebar SD345
- Seismic coefficients, design standards references
- Design policy notes (2 notes)

### 1.2 上部工構造一般図 (PDF 8-9 / Printed 3-4)
- General structural drawings (sheet 1 S=1:200, sheet 2 S=1:50)
- Cross sections at PU15(S1), AR2(S2), PR1, PR2 supports
- Cross-section dimension annotations extracted as page elements

### 1.3 基本寸法一覧 (PDF 10-15 / Printed 5-10)
- Main girder span lengths table: 3 spans × 2 girders = 6 cells
- Main girder panel lengths table: 26 panels × 2 girders = 52 cells
- Cross-section interval lengths table: 6 transverse × 4 columns = 24 cells

## Files Created
- `page_elements.csv`: 39 elements
- `tables.csv`: 83 rows (86 span/panel/cross values + 1 design condition reference)
- `values.csv`: 36 design condition values
- `formulas.csv`: 0 rows (empty — formulas in ch1 are embedded in design conditions)
- `notes.csv`: 2 notes

## Confidence
- All text-layer embedded values: HIGH
- Table values parsed from structured layout: HIGH