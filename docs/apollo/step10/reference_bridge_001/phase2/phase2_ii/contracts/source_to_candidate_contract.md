# Phase 2-II Source-to-Candidate Contract

> **Authority:** STEP 10 Reference Bridge 001 (RB-S10-001) — Phase 2-II

## 1. Purpose

Define how Phase 2-I extraction records (the **source layer**) are promoted into
candidate records without fabrication or numeric recalculation.

## 2. Source layer

The `candidates/source/` CSVs are catalogs derived from Phase 2-I extraction:

- `source_record_catalog.csv` — one row per Phase 2-I record id (values,
  tables, formulas, notes, figures, page elements, drawing elements).
- `source_value_catalog.csv` — value-bearing records.
- `source_formula_catalog.csv` — formula records.
- `source_table_catalog.csv` — table records.
- `source_figure_catalog.csv` — figure records.
- `source_note_catalog.csv` — note records.

## 3. Derivation rules

- `source_record_ids` in a candidate are copied verbatim from Phase 2-I.
- `calculation_locator` = `calc_pdf_p{pdf_page_number}` from the source record.
- `drawing_locator` = `DWG-S{sheet}` from the drawing record.
- `raw_value`/`raw_unit` copied verbatim; `normalized_value`/`normalized_unit`
  derived only by unit conversion per `normalization_contract.md`.
- `semantic_class` follows the Phase 2-I semantic classes
  (see `candidate_enums.csv`).
- `parity_status` records whether a value is seen in the calculation book, the
  drawing set, or both (`CALC_ONLY` / `DRAWING_ONLY` / `BOTH` /
  `ONE_SOURCE_ONLY`).

## 4. Gap policy

- Missing linkable source record → candidate carries empty
  `source_record_ids` and is logged in `registers/orphan_record_register.csv`
  (P2II-J).
- Value seen in only one source → `parity_status = ONE_SOURCE_ONLY`.
- Low-confidence or OCR-assisted value (drawing 141) →
  `confidence = MEDIUM/LOW`, `verification_status = PARTIAL`,
  `human_confirmation_id = HCR-…`.

## 5. Verdict

```
PHASE2_II_SOURCE_LAYER_DERIVED_FROM_P2I: YES
PHASE2_II_SOURCE_ORIGINALS_NOT_COMMITTED: PASS
```
