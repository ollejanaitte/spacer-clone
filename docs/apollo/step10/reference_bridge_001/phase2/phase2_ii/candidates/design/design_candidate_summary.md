# Design Candidate Layer — Summary

> **Authority:** STEP 10 Reference Bridge 001 (RB-S10-001) — Phase 2-II
> **Numeric analysis performed:** NO (recalculation prohibited)
> **Verdict:** `PARTIAL` — Design candidates created from design_check_index + section_3_2 tables/values + fatigue + chapter_04 composite + chapter_05 bearing checks; camber / stiffener / splice / weld numeric detail and wrapping-concrete verdict are registered gaps.

## Generated candidate counts

| File | Rows |
|------|------|
| `section_property_candidate.csv` | 49 |
| `stress_candidate.csv` | 104 |
| `limit_candidate.csv` | 16 |
| `check_ratio_candidate.csv` | 35 |
| `judgment_candidate.csv` | 23 |
| `formula_trace_candidate.csv` | 18 |

## Registered gaps

- Camber values exist only on drawing sheet 20 (no calc values); registered EXCLUDED_DRAWING_ONLY
- Vertical stiffener design numeric checks not extracted (note only)
- Field splice bolt-level results not individually extracted
- Flange-web weld per-weld values not extracted
- Wrapping-concrete rebar-count check has no OK/NG verdict (HCR-002)
- AG2 individual section properties not extracted (table T30 summary only)
- AG1 Sec-6 lower stress: table reads -222 vs design-check -224 (source inconsistency, both recorded)
- candidate_enums.csv extended with semantic_class 'fatigue' and 'welding' (source=phase2_i_extraction) for fatigue stress-range and weld-design candidates

## Layer verdict

`PARTIAL` — Design candidates created from design_check_index + section_3_2 tables/values + fatigue + chapter_04 composite + chapter_05 bearing checks; camber / stiffener / splice / weld numeric detail and wrapping-concrete verdict are registered gaps.

