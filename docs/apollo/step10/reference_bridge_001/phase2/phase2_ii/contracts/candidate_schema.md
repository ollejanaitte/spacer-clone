# Phase 2-II Candidate Schema

> **Authority:** STEP 10 Reference Bridge 001 (RB-S10-001) — Phase 2-II
> Companion to `candidate_layer_contract.md`.

## 1. File format

- UTF-8, LF line endings, no BOM.
- CSV with header row; quoted fields when the value contains commas/`"`.
- One record per row; no blank rows inside the table.
- Standard-library Python 3.10 tooling only.

## 2. Candidate record schema

| Field | Type | Required | Rule |
|-------|------|----------|------|
| candidate_id | string | yes | unique across all Phase 2-II CSVs |
| entity_id | string | yes | from `entity` id registry or empty if n/a |
| candidate_layer | string | yes | layer name from `candidate_layer_contract.md` |
| field_path_candidate | string | yes | candidate field path |
| semantic_class | string | yes | value from `candidate_enums.csv` |
| raw_value | string | yes | source text value (may be empty for notes/figures) |
| raw_unit | string | yes* | source unit or empty |
| normalized_value | string | yes* | SI value or empty |
| normalized_unit | string | yes* | SI unit or empty |
| normalization_rule_id | string | yes* | rule id from `normalization_contract.md` or `NONE` |
| source_record_ids | string | yes | comma-separated Phase 2-I record IDs |
| calculation_locator | string | yes* | `calc_pdf_p{page}` or empty |
| drawing_locator | string | yes* | `DWG-S{sheet}` / `DWG-S{sheet}-V{view}` or empty |
| confidence | string | yes | HIGH / MEDIUM / LOW / UNKNOWN |
| verification_status | string | yes | from `candidate_enums.csv` |
| parity_status | string | yes | from `candidate_enums.csv` |
| adoption_status | string | yes | from `candidate_layer_contract.md` §4 |
| issue_id | string | yes* | `ISSUE-...` or empty |
| conflict_id | string | yes* | `CONF-...` or empty |
| human_confirmation_id | string | yes* | `HCR-...` or empty |
| phase3_action | string | yes | recommended Phase 3 action |
| notes | string | yes* | free text or empty |

`*` = empty allowed only when the field is genuinely not applicable and the
reason is captured in `notes` or a register.

## 3. ID prefixes

| Prefix | Entity |
|--------|--------|
| SRC-… | source record (reuse Phase 2-I IDs where present) |
| INP-… | input candidate |
| GEO-… | geometry candidate |
| SM-… | structural model candidate |
| LD-… | load candidate |
| AN-… | analysis candidate |
| DS-… | design candidate |
| AD-… | adopted design candidate |
| RP-… | report candidate |
| DR-… | drawing candidate |
| TR-… | traceability record |
| ISSUE-… / CONF-… / HCR-… | registers |

## 4. Entity ID examples

`ENT-GIRDER-AG1`, `ENT-GIRDER-AG2`, `ENT-LINE-ACL`, `ENT-LINE-A-L1`,
`ENT-SUPPORT-PU15`, `ENT-SUPPORT-PR1`, `ENT-SUPPORT-PR2`,
`ENT-SUPPORT-AR2`, `ENT-DECK`, `ENT-NOSE`.

## 5. Normalization

- Normalization rules live in `normalization_contract.md`.
- `raw_value` is never rewritten; `normalized_value` is derived and stored
  separately.
- Rule id is `NOR-001`, `NOR-002`, … (see normalization contract).

## 6. Source ↔ candidate linkage

- `source_record_ids` reference Phase 2-I record IDs (`CH1-VAL-005`,
  `CAL-VAL-P00119-003`, `DWG-DIM-S001-001`, …).
- `calculation_locator` / `drawing_locator` are derived from the Phase 2-I
  `source_locator` values.
- A candidate that cannot be linked to any source record is logged in the
  orphan register (`registers/orphan_record_register.csv`).
