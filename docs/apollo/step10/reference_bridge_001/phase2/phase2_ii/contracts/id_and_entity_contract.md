# Phase 2-II ID and Entity Contract

> **Authority:** STEP 10 Reference Bridge 001 (RB-S10-001) — Phase 2-II

## 1. Purpose

Define ID prefix rules and the entity registry used by candidate layers and
traceability. This is a **candidate** registry; it does not grant Golden status.

## 2. ID rules

- `candidate_id` must be unique across all Phase 2-II CSVs.
- Prefixes follow `candidate_schema.md` §3.
- `entity_id` uses the form `ENT-{TYPE}-{NAME}`.
- Locator IDs reuse Phase 2-I formats:
  - calculation: `calc_pdf_p{pdf_page_number}`
  - drawing: `DWG-S{sheet_3digit}` / `DWG-S{sheet_3digit}-V{seq_2digit}`
- `source_record_ids` reference Phase 2-I record IDs verbatim.

## 3. Entity registry (candidate)

| entity_id | name | kind | notes |
|-----------|------|------|-------|
| ENT-LINE-ACL | ACL | alignment center line | bridge alignment |
| ENT-LINE-A-L1 | A-L1 | lane line | outer lane 1 |
| ENT-LINE-A-L2 | A-L2 | lane line | outer lane 2 |
| ENT-LINE-A-R1 | A-R1 | lane line | outer lane 1 opposite |
| ENT-LINE-A-R2 | A-R2 | lane line | outer lane 2 opposite |
| ENT-GIRDER-AG1 | AG1 | main girder | main girder 1 |
| ENT-GIRDER-AG2 | AG2 | main girder | main girder 2 |
| ENT-SUPPORT-PU15 | PU15 | pier | outer pier PU15 |
| ENT-SUPPORT-PR1 | PR1 | pier | pier PR1 |
| ENT-SUPPORT-PR2 | PR2 | pier | pier PR2 |
| ENT-SUPPORT-AR2 | AR2 | abutment | outer abutment AR2 |
| ENT-DECK | deck | deck | RC deck |
| ENT-NOSE | nose | nose | nose girder |

## 4. Verdict

```
PHASE2_II_ID_SCHEMA_DEFINED: YES
PHASE2_II_ENTITY_REGISTRY_CANDIDATE: YES
PHASE2_II_GOLDEN_PROMOTION: PROHIBITED
```
