# R1-P01 — Reference Value Dataset & Golden Data

This directory documents R1-P01: building the machine-readable, provenance-carrying,
verifiable reference value dataset for R1-P02+ external golden tests, from real JIP-LINER
output, the sample LINER calculation, the steel-girder bridge design calc, the drawing,
and existing test assets.

## Status

- Phase: R1-P01 (see `BRANCH_STATUS.md`)
- Base: `research/liner-r1-planning`
- No main merge, no PR to main.
- No calculation logic changes.

## Documents

- `R1_P01_SCOPE.md` — target categories, authoritative sources, seed values, fail-closed rules
- `R1_P01_SOURCE_INVENTORY.md` — source docs + page maps + extraction method
- `R1_P01_DATA_CONTRACT.md` — row schema, review status, confidence, ID rules, normalization
- `R1_P01_EXTRACTION_RULES.md` — extraction method priority, OCR rules, prohibitions
- `R1_P01_PR_BREAKDOWN.md` — stepwise PR plan (P01-00..P01-05)
- `R1_P01_SCHEMA_REPORT.md` — schema + validation report (P01-01)
- `R1_P01_DATASET_REPORT.md` — dataset summary (P01-05)
- `R1_P01_UNRESOLVED_REPORT.md` — fail-closed excluded values (P01-05)
- `R1_P01_TEST_REPORT.md` — focused test report (P01-01/P01-05)
- `R1_P01_SCOPE_AUDIT.md` — scope audit (P01-05)
- `R1_P01_PR_LEDGER.md` — per-PR record
- `R1_P01_FINAL_REPORT.md` — final report

## Deliverables (code/data)

```
frontend/src/liner/core/verification/reference-data/
```
