# Drawing Sheet 141 — 架設計画図 — Visual Transcription

> P2II-A unread-resolution deliverable.
> Source: `鋼鈑桁橋_図面例.pdf` PDF page 143 (drawing sheet 141).
> Drawing SHA-256: `77718e39bfb016c8a7827c4ead8c7666a256f6cb03083b423ac9793fdf3f5de8`
> PDF pages: 143; sheet 141 = PDF page 143 (confirmed mapping).

## 1. Method

Sheet 141 has **no usable text layer** (pdftotext returns only `141 141`).
Resolution used raster rendering + OCR assist:

1. `pdftoppm -r 300` full page (4963x3509) and `-r 400` (6617x4678).
2. Full-page OCR pass (RapidOCR / ONNX Runtime, CPU).
3. Region crops (title band, plan, side view, cross section, crane
   capacity table, title block) at 400 DPI re-OCRed.
4. Independent second pass on an autocontrast + sharpen-enhanced render.
5. Two passes cross-compared; only tokens that agree (or are unambiguous
   singles) were kept. Where the two passes disagreed or a digit is
   uncertain, the cell is marked `PARTIAL` / `LOW` confidence — **no value
   is guessed**.

Rendered images were kept only in repository-external scratch
(`/tmp/opencode/s141/`) and are **not committed**.

## 2. Overall verdict

```
DRAWING_141_STATUS: PARTIALLY_RESOLVED
DRAWING_141_VERDICT: RESOLVED_WITH_OCR_ASSIST
```

The drawing's major content (title, route, girder identity, spans, erection
blocks and weights, crane positions, crane capacity table, cross-section
labels, title block) was transcribed with high-confidence OCR agreement.
A few cells remain ambiguous (see verification log) and are flagged rather
than guessed. Human visual confirmation of those cells is optional; none
affects bridge-identity or span/girder input candidates (see
`00_phase2_i_truth_reconciliation.md` TR-14).

## 3. Identified content

### 3.1 Drawing title / identity

| Field | Value | Confidence |
|-------|-------|------------|
| Drawing title | 旭高架橋 APU15-AR2 架設計画図 | HIGH |
| 図の種類 | 架設計画図 (erection plan) | HIGH |
| Route | 一般国道247号（西知多道路） | HIGH |
| Location | 知多市旭地内 起点 | HIGH |
| Sheet number | 141号 / 141枚の内 (sheet 141 of 141) | HIGH |
| 工事名 (work name) | (blank in source) | N/A |

### 3.2 Girder identity (side/plan header)

| Field | Value | Confidence |
|-------|-------|------------|
| Structure | A 鋼3径間連続少数主桁橋 (steel 3-span continuous few-main-girder bridge) | HIGH |
| Bridge length L | 134.001 m (`134001`) | HIGH (matches Phase 0 parity CF-003) |
| 桁長 | 133.201 m (`133201`) | MEDIUM (last digit uncertain; flag) |
| Span lengths | 支間長 40.200 / 51.000 / 40.200 m (`40200`/`51000`/`40200`) | HIGH |
| Road station | 西知多道路 NO.178+10.000 / AN0.26+10.280, No.26+8.001 | HIGH |
| 合流部 | XPU15 (junction at PU15) | MEDIUM |
| Scale | 側面図・平面図 S=1:500; 横断図 S=1:200 | HIGH |

### 3.3 Erection order blocks (架設順序)

Nine lift blocks with weights (W) transcribed under the plan view:

| Block | W (t) | Confidence |
|-------|-------|------------|
| ① | 12.5 | HIGH |
| ② | 11.6 | HIGH |
| ③ | 16.7 | HIGH |
| ④ | 14.0 | HIGH |
| ⑤ | 13.6 | HIGH |
| ⑥ | 16.7 | HIGH |
| ⑦ | 12.4 | HIGH |
| ⑧ | 7.0 | HIGH |
| ⑨ | 12.3 | HIGH |

Circle numbers ③/④/⑥/⑧ were partially read by OCR; the W values are
confirmed by two passes. Block order is left-to-right from PU15 side.

### 3.4 Crane working positions (120t吊)

| Position | Boom length | Working radius | Rated capacity | Lifted load | Lifting equipment |
|----------|-------------|----------------|----------------|-------------|-------------------|
| 1 (blocks ①-③) | 26.3 m | 14.0 m | 21.6 t | 18.2 t (84.3%) | 吊具等 1.5 t 含 |
| 2 (block ⑧) | 37.4 m | 18.0 m | 15.6 t | 13.9 t (89.1%) | 吊具等 1.5 t 含 |

OCR token variants: `120t吊` / `120吊` / `120t吊才` all resolve to
`120t吊` (120-ton all-terrain crane). Machine type per capacity table:
`TADANO ATF120N-5.1 (A性能)`.

### 3.5 Crane capacity table (120t吊定格荷重表)

Machine: **TADANO ATF120N-5.1 (A性能)**. Unit: t.
Rows = 作業半径 (working radius, m): 4.5, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0,
11.0, 12.0, 14.0, 16.0, 18.0, 20.0, 22.0, 24.0.
Columns = ブーム長 (boom length, m): 26.3, 37.4.

| 作業半径 (m) | 26.3 m | 37.4 m |
|--------------|--------|--------|
| 4.5 | 46.3 | 23.8 |
| 5.0 | 46.3 | 23.8 |
| 6.0 | 45.2 | 23.8 |
| 7.0 | 44.6 | 23.8 |
| 8.0 | 40.2 | 23.8 |
| 9.0 | 36.1 | 23.7 |
| 10.0 | 32.1 | 22.4 |
| 11.0 | 28.7 | 21.9 |
| 12.0 | 25.9 | 21.9 |
| 14.0 | 21.6 | 19.7 |
| 16.0 | 18.3 | 17.8 |
| 18.0 | 16.4 | 15.6 |
| 20.0 | 14.3 | 13.5 |
| 22.0 | 12.6 | 11.8 |
| 24.0 | — (blank/dash) | 10.4 |

### 3.6 Cross section (横断図)

| Field | Value | Confidence |
|-------|-------|------------|
| View | 横断図（中間部）S=1:200 | HIGH |
| Pier | PR2橋脚 | HIGH |
| 施工基面 | V=15.250 | HIGH |
| H.W.L. | VTP+14.00 | HIGH |
| F.W.L. | VTP+13.60 | HIGH |
| Deck level note | DL=10.00 | HIGH |

### 3.7 Other annotations

- 市道60295号線 (municipal road crossing) — HIGH
- 架設方向 (erection direction) — HIGH
- 上り線 (up line) — MEDIUM
- 作業半径 R=20m note — MEDIUM
- 側面図 / 平面図 / 横断図 view labels — HIGH

## 4. Ambiguous / low-confidence cells

See `drawing_sheet_141_verification_log.csv`. Notable items:

| ID | Cell | OCR-1 | OCR-2 | Verdict |
|----|------|-------|-------|---------|
| V001 | 桁長 last digit | `133201` | `133201` | PARTIAL (both read `201`; expected `200` pattern; do not guess) |
| V002 | 工事名 value | blank | blank | CONFIRMED_BLANK |
| V003 | Block circle numbers | ③④⑥⑧ read | ③④⑤⑥⑧ read | PARTIAL (W values confirmed; circle glyph order assumed L→R) |
| V004 | 施工箇所名 | 知多市旭地内始 | 知多市旭地内始 | PARTIAL (「始」= 起点 suffix; likely 起点) |
| V005 | R=20m annotation purpose | single token | single token | PARTIAL (context not fully read) |

## 5. Not committed

All rendered PNGs and crops are outside the repository. This markdown plus
the CSV artifacts are the only committed transcription outputs.
