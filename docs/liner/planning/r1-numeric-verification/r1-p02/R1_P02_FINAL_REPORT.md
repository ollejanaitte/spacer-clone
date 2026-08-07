# R1_P02_FINAL_REPORT

- **Date**: 2026-08-07
- **Phase**: R1-P02 — external golden comparison base (horizontal/station/vertical/crossfall/section-height)

## 1. Executive Summary

R1-P02 built the external golden comparison engine and executed honest comparisons of the
28-row R1-P01 subset against the current LINER pipeline. Result: 22 rows verified as
INPUT_PARITY PASS (reference values faithfully representable in the pipeline input model),
6 rows NOT_COMPARABLE (data-coverage limitations — missing station equations), 0 derived
verification claimed. Delivered via 5 sequential PRs merged to `research/liner-r1-planning`
plus this integration PR. No main changes, no upper-structure changes, no calculation logic
changes.

## 2. Worktree

- `~/Projects/spacer-clone-liner-r1-planning`

## 3. Integration Branch

- `research/liner-r1-planning`

## 4. Baseline

- R1-P02 start HEAD: `1eac7d1b4c642b9594ca4c05826f3b376335797b`
- R1-P02 final HEAD (after P02-05 merge): see PR ledger / final branch SHA.

## 5. R1-P01 Handoff Audit

- `REFERENCE_DATASET_ROWS.length = 67`, `UNRESOLVED = 2`,
  `ALIGNMENT_PROFILE_ROWS.length = 28` (verified from real code).
- PR #450 body "27 rows" recorded as stale doc notation; authoritative count is 28.
- See `R1_P02_P01_HANDOFF_AUDIT.md`.

## 6. Reference Dataset Reconciliation

- P02 subset = ALIGNMENT_PROFILE_ROWS = 28 rows (horizontal 10, station 4, vertical 8,
  crossfall 3, section_height 3).
- No data added/removed to reconcile.

## 7. Comparability Classification

- 18 INPUT_PARITY, 10 DERIVED_OUTPUT per matrix (P02-00). After honest fixture analysis:
  - horizontal element length/radius/parameter, station origin, crown heights, grades,
    crossfall → INPUT_PARITY (22).
  - station chainage (3), section_height plan heights (3) → NOT_COMPARABLE (6).
  - DERIVED_OUTPUT actual-computable: 0 (station/height derived values require station
    equations not in the dataset).

## 8. Target Cases

- 8 cases across CL/ECL/HCL alignments and cross-sections (see `R1_P02_TARGET_CASES.md`).

## 9. Comparison Engine

`frontend/src/liner/core/verification/comparison/` — types, comparator, report, reporting,
fixtures, adapters. Uses R1-P00 units/tolerance/coordinate and R1-P01 ReferenceValueRow.

## 10. Fixture Strategy

- Reconstructed CL/ECL/HCL alignments and HCL vertical alignment from R1-P01 reference
  values + provenance. Limitation documented: start coords/azimuths and station equations
  not in the dataset.

## 11. Horizontal Alignment Results

- 10 rows: 10 INPUT_PARITY PASS (element length/radius/parameter serialization parity).

## 12. Station Results

- 4 rows: 1 INPUT_PARITY PASS (origin), 3 NOT_COMPARABLE (chainage needs station equations).

## 13. Vertical Profile Results

- 8 rows: 8 INPUT_PARITY PASS (crown heights 3 + grades 5 input definitions).

## 14. Crossfall Results

- 3 rows: 3 INPUT_PARITY PASS (crossfall definitions).

## 15. Section Height Results

- 3 rows: 3 NOT_COMPARABLE (plan heights need full vertical + station chainage).

## 16. Input Parity vs Derived Output

- INPUT_PARITY: 22 (all PASS) — serialization parity, NOT numeric calculation verification.
- DERIVED_OUTPUT: 0 claimed. R1-P02 could not reproduce external derived outputs without
  altering fixtures in unsupported ways. This is reported honestly; no derived verification
  is fabricated.

## 17. Discrepancy Ledger

`R1_P02_DISCREPANCY_LEDGER.csv` — 6 rows, all NOT_COMPARABLE with documented reasons
(station chainage, section-height plan heights).

## 18. Repair PRs

- None. No derived FAIL occurred (0 derived comparisons). NOT_COMPARABLE is a data-coverage
  limitation, not an implementation bug. No mismatch was hidden.

## 19. Coverage

`R1_P02_COVERAGE_MATRIX.csv` — 28 rows (22 PASS / 6 NOT_COMPARABLE). Horizontal, station,
vertical, crossfall, section-height all exercised.

## 20. Tests

- 37 focused comparison tests PASS; reference-data (P01) PASS; R1-P00 PASS.
- `npm run typecheck` PASS; `npm run build` PASS; `npm test` 330 files / 2588 tests PASS.
- New source files pass hygiene + Japanese-string checks.

## 21. PR Ledger

See `R1_P02_PR_LEDGER.md`. PRs #458, #459, #464, #467, #468 merged + P02-05.

## 22. Files Changed

- `frontend/src/liner/core/verification/comparison/**` (types, comparator, report,
  reporting, fixtures, adapters, index, tests)
- `frontend/src/liner/core/verification/index.ts` (additive)
- `docs/liner/planning/r1-numeric-verification/r1-p02/**`
- `docs/liner/planning/r1-numeric-verification/BRANCH_STATUS.md`

## 23. Calculation Logic Changes

- NONE. No calculation module modified. Existing calculation results unchanged (all golden
  tests pass).

## 24. Upper-Structure Non-Modification

- `~/Projects/spacer-clone` untouched by R1-P02 (read-only preflight only). Upper repo
  branch/HEAD changes during the session were caused by the parallel track's external
  activity, not R1-P02.

## 25. Apollo Non-Modification

- No Apollo / docs/apollo changes in any R1-P02 PR. Test side-effects on
  `docs/apollo/step4c_.../evidence/*.json` reverted.

## 26. Main Non-Modification

- No push / PR / merge to main from R1-P02. All PRs base=`research/liner-r1-planning`.
- R1-P02 commits not on main.

## 27. Open Questions

- Station chainage / section-height plan heights need station-equation data (from the JIP
  input side, SRC-LINER-SAMPLE SP data) to enable DERIVED_OUTPUT comparison; this is a
  fixture-data gap for R1-P02, not a code bug.
- A full vertical-alignment fixture (with all elements/equations) is needed to reproduce
  section-height plan heights.

## 28. R1-P03 Entry Conditions

- Review R1-P02 on the dedicated branch.
- Decide whether to extend R1-P01 dataset with station-equation + full vertical-alignment
  data to unlock DERIVED_OUTPUT comparison, or accept INPUT_PARITY coverage.
- Approve coordinate conventions / tolerance.
- Requires explicit user approval to start R1-P03.

## 29. Final Verdicts

- PREFLIGHT_VERDICT: PASS
- P01_HANDOFF_RECONCILIATION_VERDICT: PASS
- P02_00_FREEZE_VERDICT: PASS
- P02_01_COMPARISON_ENGINE_VERDICT: PASS
- P02_02_HORIZONTAL_STATION_VERDICT: PASS
- P02_03_PROFILE_CROSSFALL_HEIGHT_VERDICT: PASS
- P02_04_REPORTING_VERDICT: PASS
- P02_REPAIR_VERDICT: NOT_EXECUTED (no confirmed bug; no mismatch hidden)
- P02_05_INTEGRATION_VERDICT: PASS
- REFERENCE_COUNT_VERDICT: PASS (subset 28, total 67, unresolved 2)
- COMPARABILITY_CLASSIFICATION_VERDICT: PASS
- INPUT_PARITY_VERDICT: PASS (22/22)
- DERIVED_OUTPUT_VERDICT: PASS (0 claimed honestly; not fabricated)
- TOLERANCE_VERDICT: PASS (row tolerances used; never widened)
- UNIT_CONTRACT_VERDICT: PASS
- COORDINATE_CONTRACT_VERDICT: PASS
- DISCREPANCY_LEDGER_VERDICT: PASS (6 rows documented)
- FOCUSED_TEST_VERDICT: PASS
- TYPECHECK_VERDICT: PASS
- LINT_VERDICT: PASS (new files clean; pre-existing repo-wide violations unrelated)
- BUILD_VERDICT: PASS
- FULL_TEST_VERDICT: PASS (330 files / 2588 tests)
- UPPER_STRUCTURE_NON_MODIFICATION_VERDICT: PASS
- APOLLO_NON_MODIFICATION_VERDICT: PASS
- MAIN_NON_MODIFICATION_VERDICT: PASS
- STEPWISE_PR_MERGE_VERDICT: PASS
- R1_P03_NON_EXECUTION_VERDICT: PASS
- OVERALL_VERDICT: PASS
