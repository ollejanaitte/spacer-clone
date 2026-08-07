# Traceability — Summary

> **Authority:** STEP 10 Reference Bridge 001 (RB-S10-001) — Phase 2-II
> **Numeric analysis performed:** NO (recalculation prohibited)
> **Verdict:** `PARTIAL` — Source->candidate->entity trace built for all PR-2 candidate layers; value/formula/adopted/calc-drawing/report-drawing chains registered; one-source-only and human-confirm chains logged.

## Generated candidate counts

| File | Rows |
|------|------|
| `entity_crosswalk.csv` | 12 |
| `source_to_candidate_traceability.csv` | 4116 |
| `value_traceability.csv` | 13 |
| `formula_result_traceability.csv` | 15 |
| `calculation_drawing_traceability.csv` | 17 |
| `adopted_value_traceability.csv` | 14 |
| `report_drawing_traceability.csv` | 141 |

## Registered gaps

- Value chains are partial where a subject has no explicit OK verdict or no drawing counterpart (wrapping, bracket, camber, AG2 sections)
- One-source-only records: camber (drawing only), deck level / ground level (sheet 141 OCR), effective width (calc only)
- Orphan/partial chains: stiffeners, splice, welding (design policy/table only, no numeric result)
- report_drawing_traceability uses group->chapter mapping (link_type=group_mapping) plus source references where present

## Layer verdict

`PARTIAL` — Source->candidate->entity trace built for all PR-2 candidate layers; value/formula/adopted/calc-drawing/report-drawing chains registered; one-source-only and human-confirm chains logged.

