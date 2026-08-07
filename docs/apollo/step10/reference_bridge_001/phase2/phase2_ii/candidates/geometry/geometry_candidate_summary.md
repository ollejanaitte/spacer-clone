# Geometry Candidate Layer — Summary

> **Authority:** STEP 10 Reference Bridge 001 (RB-S10-001) — Phase 2-II
> **Numeric analysis performed:** NO (recalculation prohibited)
> **Verdict:** `PARTIAL` — Geometry candidates created; station, intermediate panel-point coordinates and a flange-width parity conflict are registered gaps.

## Baseline (Phase 2-I) counts

| Item | Count |
|------|-------|
| Phase 2-I element rows (calc+drawing CSVs) | 4075 |
| Phase 2-I domain index entries | 162 |
| Phase 2-I total (element + index) | 4237 |

## Generated candidate counts

| File | Rows |
|------|------|
| `alignment_candidate.csv` | 5 |
| `girder_line_candidate.csv` | 6 |
| `grid_point_candidate.csv` | 58 |
| `cross_section_candidate.csv` | 8 |
| `support_line_candidate.csv` | 4 |
| `elevation_crossfall_candidate.csv` | 7 |
| `geometry_entity_register.csv` | 8 |

## Registered gaps

- Station value on ACL not extracted in Phase 2-I (UNKNOWN_REQUIRES_REVIEW)
- Panel points 1002-1026 / 2002-2026 coordinates not extracted (UNKNOWN_REQUIRES_REVIEW)
- Bottom flange width conflict calc 680 mm vs drawing 700 mm (CONF-P2II-001)
- Deck elevation / ground level from sheet 141 OCR (HCR-001, PARTIAL)

## Layer verdict

`PARTIAL` — Geometry candidates created; station, intermediate panel-point coordinates and a flange-width parity conflict are registered gaps.

