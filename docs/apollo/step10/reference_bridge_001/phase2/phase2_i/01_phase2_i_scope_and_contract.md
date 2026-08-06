# Phase 2-I Scope and Extraction Contract

## 1. Purpose

Define the scope, method, coverage requirements, and status model for the complete structural decomposition of Reference Bridge 001 (RB-S10-001).

## 2. Phase 2-I Purpose

Complete structural decomposition of all source material into structured, machine-readable data with provenance, confidence, and verification status. Extraction is documentation-only — no production code is produced, no numeric design verification is performed.

## 3. What Is Extracted

| Source | Count | Description |
|--------|-------|-------------|
| Calculation book pages | 2226 | All PDF pages (PDF 1–2226) including front matter |
| Drawing sheets | 141 | All sheets (sheet 1–141, PDF 3–143) |
| Calculation sections | 92 | All sections from the Phase 1 catalog |
| Drawing groups | 34 | All groups from the Phase 1 catalog |

### 3.1 Calculation Book

- All 2226 PDF pages of the design calculation book
- Front matter: cover (PDF 1), title page (PDF 2), table of contents (PDF 3–5)
- Content pages: PDF 6–2226 (printed pages 1–2221)
- Text, tables, formulas, figures, notes, title blocks on every page
- Page-level extraction status tracked in `calculation_page_coverage.csv`

### 3.2 Drawing Set

- All 141 sheets from PDF pages 3–143
- Title blocks, dimensions, annotations, detail views, notes
- Sheet-level extraction status tracked in `drawing_sheet_coverage.csv`

## 4. What Is NOT Extracted

| Item | Rationale |
|------|-----------|
| Design verification | Out of scope — no recomputation of design values |
| Golden JSON | Out of scope — no single aggregated output format defined |
| Production code | Out of scope — documentation-only phase |
| Apollo schema changes | Out of scope — no modification to data model |
| PDF/image/CAD files | Out of scope — originals not committed to repository |
| Numeric analysis | Out of scope — extraction only, not verification |

## 5. Extraction Method

### 5.1 Text Layer Priority

All extraction must first attempt to use the PDF embedded text layer. The text layer provides character-level positioning and is the most reliable source for structured extraction.

### 5.2 Visual Verification

After text-layer extraction, verify visually for:

- **Tables:** Verify row/column alignment, cell boundary detection, header assignment
- **Title blocks:** Verify field labels against extracted key-value pairs
- **Drawing dimensions:** Verify dimension line labels against extracted text
- **Formulas:** Verify symbol extraction against visual layout

### 5.3 OCR

OCR is used **only** when:

- A page or region has no embedded text layer
- Embedded text is garbled, corrupted, or unreadable
- The region contains handwritten annotations or marks

OCR is **not** applied indiscriminately to all 2226 pages.

### 5.4 Prohibited Operations

| Operation | Prohibition |
|-----------|-------------|
| Value reconstruction from formulas | NO — extract what is written, do not recompute |
| Dimension back-calculation from lines | NO — extract dimension text only, do not measure |
| Indiscriminate OCR | NO — OCR only where embedded text is absent |

## 6. Coverage Requirements

| Metric | Target |
|--------|--------|
| Calculation pages | 2226 rows (one per PDF page) |
| Drawing sheets | 141 rows (one per sheet) |
| Calculation sections | 92 rows (one per section) |
| Drawing groups | 34 rows (one per group) |

## 7. Extraction Status Values

| Status | Meaning |
|--------|---------|
| NOT_STARTED | No extraction attempted |
| STRUCTURE_INDEXED | Page/sheet structure identified, elements enumerated |
| TEXT_EXTRACTED | Embedded text extracted, raw text captured |
| NUMERIC_EXTRACTED | Numeric values parsed and separated from text |
| VISUAL_VERIFIED | Visual inspection confirmed extraction accuracy |
| EXTRACTION_COMPLETE | All extraction steps finished successfully |
| EXTRACTION_PARTIAL | Some elements extracted, some pending |
| NO_EXTRACTABLE_CONTENT | Page/sheet contains no extractable design content |
| UNREADABLE_REQUIRES_HUMAN | Content illegible, requires human interpretation |
| SOURCE_CONFLICTING | Conflicting values found within or across sources |

## 8. Verification Status Values

| Status | Meaning |
|--------|---------|
| UNVERIFIED | No verification performed |
| SINGLE_PASS | One automated extraction pass completed |
| SECOND_PASS_VERIFIED | Two independent automated passes agree |
| VISUAL_VERIFIED | Human visual inspection confirmed |
| CROSS_SOURCE_VERIFIED | Values confirmed across multiple sources |
| HUMAN_CONFIRMATION_REQUIRED | Discrepancy found, human judgment needed |

## 9. Confidence Levels

| Level | Meaning |
|-------|---------|
| HIGH | Direct text extraction, visually confirmed, no ambiguity |
| MEDIUM | Direct extraction but formatting ambiguity present |
| LOW | OCR-extracted or indirect extraction |
| UNKNOWN | Source too degraded to assess confidence |

## 10. Contract Verdict

```text
PHASE2_I_EXTRACTION_CONTRACT_DEFINED: YES
PHASE2_I_SCOPE_CALC_PAGES: 2226
PHASE2_I_SCOPE_DRAWING_SHEETS: 141
PHASE2_I_SCOPE_SECTIONS: 68
PHASE2_I_SCOPE_GROUPS: 34
PHASE2_I_PRODUCTION_CODE_CHANGED: NO
PHASE2_I_NUMERIC_ANALYSIS_PERFORMED: NO
PHASE2_I_VERDICT: DEFINED
```