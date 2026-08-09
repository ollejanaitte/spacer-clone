# Phase 0-PRE: Required Source Pre-Survey

**Status:** COMPLETED
**Date:** 2026-08-06
**Repository investigated (read-only):** /home/masaharu/Projects/spacer-clone
**HEAD:** 0fadc1c2fa984f702b94af12f249a97fc2842705

## Purpose

This survey identifies the required design standards, analysis theories,
calculation examples, vendor manuals, and golden verification data needed
for curved bridge development in spacer-clone. It is conducted entirely
outside the repository, with read-only access to the source code.

## Deliverables

| # | File | Content |
|---|------|---------|
| 1 | 01_repository_curved_capability_inventory.md | Repository curved bridge capability inventory |
| 2 | 02_required_source_categories.md | Required source categories (L0-L10) |
| 3 | 03_design_standard_requirements.md | Design standard requirements (道路橋示方書, 鋼橋設計便覧, etc.) |
| 4 | 04_alignment_geometry_requirements.md | Alignment geometry requirements |
| 5 | 05_structural_model_requirements.md | Structural model requirements |
| 6 | 06_analysis_theory_requirements.md | Analysis theory requirements (torsion, warping, etc.) |
| 7 | 07_load_support_requirements.md | Load and support requirements |
| 8 | 08_design_check_requirements.md | Design check requirements |
| 9 | 09_calculation_example_requirements.md | Calculation example requirements |
| 10 | 10_existing_source_inventory.md | Existing source inventory |
| 11 | 11_missing_source_register.md | Missing source register |
| 12 | 12_user_search_guide.md | User search guide |
| 13 | 13_scope_progression_by_source_availability.md | Scope progression by source availability |
| 14 | 14_phase0_handoff.md | Phase 0 handoff |
| - | required_source_matrix.csv | Required source matrix (47 items) |
| - | repository_capability_matrix.csv | Repository capability matrix (39 items) |
| - | missing_source_register.csv | Missing source register (20 items) |
| - | completion_report.md | Completion report with final verdict |

## Key Verdicts

- Road alignment geometry: FULLY IMPLEMENTED (arc, clothoid, station/offset, local frame)
- Curved bridge structure: NOT_IMPLEMENTED (straight bridge only)
- Warping torsion / secondary stress / centrifugal load: NOT_IMPLEMENTED
- Analysis: BLOCKED until theory sources found
- Design check: BLOCKED until design standards found

## Next Steps

1. User searches for P0 missing sources (see 12_user_search_guide.md)
2. Phase 0 can start with non-numeric geometry/model work
3. Analysis, design check, report, drawing wait for source availability
4. Integration into spacer-clone after continuous bridge completion
   (see handoff/integration_plan.md)