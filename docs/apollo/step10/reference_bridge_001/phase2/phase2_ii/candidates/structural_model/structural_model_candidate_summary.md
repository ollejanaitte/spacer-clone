# Structural Model Candidate Layer — Summary

> **Authority:** STEP 10 Reference Bridge 001 (RB-S10-001) — Phase 2-II
> **Numeric analysis performed:** NO (recalculation prohibited)
> **Verdict:** `PARTIAL` — Structural model candidates created; local axes, rigid offsets, DOF fixity and full section-assignment are registered gaps.

## Baseline (Phase 2-I) counts

| Item | Count |
|------|-------|
| Phase 2-I element rows (calc+drawing CSVs) | 4075 |
| Phase 2-I domain index entries | 162 |
| Phase 2-I total (element + index) | 4237 |

## Generated candidate counts

| File | Rows |
|------|------|
| `node_candidate.csv` | 54 |
| `member_candidate.csv` | 20 |
| `connectivity_candidate.csv` | 4 |
| `local_axis_candidate.csv` | 3 |
| `support_restraint_candidate.csv` | 5 |
| `rigid_offset_candidate.csv` | 1 |
| `section_assignment_candidate.csv` | 4 |
| `model_entity_register.csv` | 21 |

## Registered gaps

- Local axis convention not stated in source (UNKNOWN_REQUIRES_REVIEW)
- Rigid offsets not stated in chapter_03 model notes
- Per-DOF support fixity not explicitly stated
- Explicit cross-beam node-pair connectivity not extracted
- Full AG1/AG2 section layout assignment needs human confirmation

## Layer verdict

`PARTIAL` — Structural model candidates created; local axes, rigid offsets, DOF fixity and full section-assignment are registered gaps.

