# Design Standard Reference Register

## 1. Purpose

Record all design standards referenced in the calculation book and drawing set.
Separate H29_REFERENCE (source original standard) from R7_COMPLIANCE (future
target).

## 2. Standards referenced in source originals

The following standards are explicitly listed in the calculation book (section
1.1, printed page 2) and the drawing title block (sheet 8).

| # | Standard title | Organization | Edition | Year | Source locator |
|---|---------------|--------------|---------|------|----------------|
| 1 | 道路橋示方書・同解説 | 日本道路協会 | H29.11 | 2017 | calc_pdf_p7, drawing_pdf_p9 |
| 2 | 橋梁設計の手引き | 愛知県建設局 | R1.7 | 2019 | calc_pdf_p7, drawing_pdf_p9 |
| 3 | 道路設計要領 設計編 | 中部地方整備局 | H26.3 | 2014 | calc_pdf_p7, drawing_pdf_p9 |
| 4 | 長寿命化に向けた設計の手引き(案) 第2版 | 中部地方整備局 | H26.3 | 2014 | calc_pdf_p7, drawing_pdf_p9 |
| 5 | 鋼道路橋設計便覧 | 日本道路協会 | R2.9 | 2020 | calc_pdf_p7, drawing_pdf_p9 |
| 6 | 鋼道路橋疲労設計便覧 | 日本道路協会 | R2.9 | 2020 | calc_pdf_p7, drawing_pdf_p9 |

## 3. Additional standard referenced in calculation body

| # | Standard title | Organization | Locator | Notes |
|---|---------------|--------------|---------|-------|
| 7 | 複合構造標準示方書 | 土木学会 | 2014 | calc_pdf_p2221 (孔あき鋼板ジベル設計) |

## 4. H29_REFERENCE vs R7_COMPLIANCE

| Standard | H29_REFERENCE | R7_COMPLIANCE |
|----------|--------------|---------------|
| 道路橋示方書 | H29.11 (source) | R7 (future target, not yet assessed) |
| 橋梁設計の手引き | R1.7 (source) | — |
| 道路設計要領 | H26.3 (source) | — |
| 長寿命化設計の手引き | H26.3 (source) | — |
| 鋼道路橋設計便覧 | R2.9 (source) | — |
| 鋼道路橋疲労設計便覧 | R2.9 (source) | — |
| 複合構造標準示方書 | 2014 (source) | — |

The Reference Bridge 001 source set uses H29 (2017) standards. R7 compliance
is not evaluated in Phase 1 and is deferred to STEP 10 Phase 15.

## 5. Verdict

DESIGN_STANDARD_REFERENCE_VERDICT: PASS