# Phase 2-II Candidate Layer Contract

> **Authority:** STEP 10 Reference Bridge 001 (RB-S10-001) — Phase 2-II
> **Development approach:** documentation-only / data-only
> **Numeric analysis performed:** NO (recalculation prohibited)
> **Production code changed:** NO
> **PDF / DWG / image originals committed:** NO
> **Numeric design authorization:** NOT_GRANTED
> **Design or construction use:** PROHIBITED
> **Formal `APPROVED_GOLDEN_INPUT` creation:** PROHIBITED in Phase 2-II

## 1. Purpose

Define the layered candidate model that Phase 2-II produces from the Phase 2-I
source decomposition. Each layer holds **candidate** records only. Formal
"Golden input" promotion happens in Phase 3.

## 2. Layers

| # | Layer | Dir | Verdict field |
|---|-------|-----|---------------|
| 1 | Source | `candidates/source/` | SOURCE_LAYER_VERDICT |
| 2 | Input Candidate | `candidates/input/` | INPUT_CANDIDATE_VERDICT |
| 3 | Geometry Candidate | `candidates/geometry/` | GEOMETRY_CANDIDATE_VERDICT |
| 4 | Structural Model Candidate | `candidates/structural_model/` | STRUCTURAL_MODEL_CANDIDATE_VERDICT |
| 5 | Load Candidate | `candidates/load/` | LOAD_CANDIDATE_VERDICT |
| 6 | Analysis Candidate | `candidates/analysis/` | ANALYSIS_CANDIDATE_VERDICT |
| 7 | Design Candidate | `candidates/design/` | DESIGN_CANDIDATE_VERDICT |
| 8 | Adopted Design Candidate | `candidates/adopted_design/` | ADOPTED_DESIGN_CANDIDATE_VERDICT |
| 9 | Report Candidate | `candidates/report/` | REPORT_CANDIDATE_VERDICT |
| 10 | Drawing Candidate | `candidates/drawing/` | DRAWING_CANDIDATE_VERDICT |
| 11 | Traceability | `traceability/` | TRACEABILITY_VERDICT |

## 3. Candidate record minimum fields

Every candidate record carries:

- `candidate_id` — unique across the whole Phase 2-II dataset
- `entity_id` — structural/domain entity (e.g. `ENT-GIRDER-AG1`)
- `candidate_layer` — layer name (from table above)
- `field_path_candidate` — candidate field path
- `semantic_class` — from `candidate_enums.csv`
- `raw_value` / `raw_unit` — exactly as in source
- `normalized_value` / `normalized_unit` — SI-normalized
- `normalization_rule_id` — reference to `normalization_contract.md`
- `source_record_ids` — Phase 2-I record IDs (comma-separated)
- `calculation_locator` — `calc_pdf_p{page}` or empty
- `drawing_locator` — drawing sheet/view locator or empty
- `confidence` — HIGH / MEDIUM / LOW / UNKNOWN
- `verification_status` — from candidate_enums.csv
- `parity_status` — from candidate_enums.csv
- `adoption_status` — from candidate_enums.csv
- `issue_id` — issue reference or empty
- `conflict_id` — conflict reference or empty
- `human_confirmation_id` — human confirmation reference or empty
- `phase3_action` — recommended Phase 3 action
- `notes`

## 4. adoption_status enum (mandatory)

- `CANDIDATE_ONLY`
- `EXCLUDED_DERIVED_VALUE`
- `EXCLUDED_ANALYSIS_RESULT`
- `EXCLUDED_DESIGN_RESULT`
- `EXCLUDED_DRAWING_ONLY`
- `CONFLICT_REQUIRES_REVIEW`
- `HUMAN_CONFIRMATION_REQUIRED`

`APPROVED_GOLDEN_INPUT` is **prohibited** in Phase 2-II.

## 5. Rule: no silent upgrade

No source value is promoted to a "verified" or "Golden" status inside Phase 2-II.
Every value is a candidate; `parity_status` records whether the value is seen in
calculation, drawing, or both (or one source only).

## 6. Rule: no fabrication

Values that do not exist in the source must not be invented. When a model
property is absent from source, the layer records it as
`UNKNOWN_REQUIRES_REVIEW` / `ONE_SOURCE_ONLY` / `HUMAN_CONFIRMATION_REQUIRED`
rather than inventing a value.

## 7. Verdict semantics

- **PASS** — layer complete, no registered gaps.
- **PARTIAL** — layer exists with registered gaps (see registers).
- **FAIL** — layer incomplete without registration (must not be used).

## 8. Validation

`tools/validate_phase2_ii.py` (P2II-J) enforces: ID uniqueness, source
locator format, source record reference integrity, source↔candidate orphan
checks, semantic/adoption enums, raw/normalized separation, conflict/human
linkage, drawing 141 PARTIAL linkage, manifest path/row/SHA, source originals
non-tracked, formal Golden absence, and final_report/README/completion/handoff
count parity.
