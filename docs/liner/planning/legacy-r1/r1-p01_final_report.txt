# R1_P01_FINAL_REPORT

- **Date**: 2026-08-07
- **Phase**: R1-P01 — reference value dataset & golden data

## 1. Executive Summary

R1-P01 built the machine-readable, provenance-carrying, verifiable reference value
dataset for the LINER R1 numeric verification base. 67 reference values were frozen
(golden-usable, CROSS_CHECKED/APPROVED) across 14 target categories from the real JIP-LINER
sample calculation, the steel-girder bridge design calc, and the drawing. 2 values that
fail fail-closed rules were separated as unresolved. Delivered via 5 sequential PRs
(P01-00..P01-04) merged to `research/liner-r1-planning`, plus this integration PR
(P01-05). No main changes, no upper-structure changes, no calculation logic changes.

## 2. Worktree

- `~/Projects/spacer-clone-liner-r1-planning`

## 3. Integration Branch

- `research/liner-r1-planning`

## 4. Baseline

- Integration branch HEAD at R1-P01 start: `2bdda839e0d9542a623e53deaeea81e4b36f6bad`
- Integration branch final HEAD (after P01-05 merge): `03775e8f1030a96ae288d6d92a3190891b7b3875`

## 5. Source Inventory

- SRC-DESIGN-CALC (鋼鈑桁橋設計計算例): pages 10,11,13,14,15
- SRC-LINER-SAMPLE (001_サンプル_LINER計算書): pages 7,8,9,10,13,74
- SRC-DRAWING (鋼鈑桁橋図面例): pages 1,10
- PDF originals NOT committed (copyright); only extracted dataset + provenance committed.

## 6. Dataset Contract

- Row schema per R1_P01_DATA_CONTRACT.md: reference_id, case_id, category, value_name,
  source_* (document/page/section/table/row/column), source_value/unit,
  normalized_value/unit, coordinate_system, sign_convention, rounding_rule,
  display_precision, comparison_tolerance, extraction_method, expected_value_class,
  review_status, confidence, notes.
- Review status: UNREVIEWED/TRANSCRIBED/CROSS_CHECKED/APPROVED/REJECTED/UNRESOLVED.
- Golden-usable: CROSS_CHECKED, APPROVED.

## 7. Schema

`frontend/src/liner/core/verification/reference-data/types.ts` + validation.ts + manifest.ts
+ loader.ts + field-mapping.ts + provenance-index.ts. Reuses R1-P00 types
(classification, unit, coordinate, tolerance, provenance).

## 8. Reference Dataset

`frontend/src/liner/core/verification/reference-data/`
- `dataset-alignment-profile.ts` — 28 rows
- `dataset-bridge-geometry.ts` — 30 rows
- `dataset-haunch-hoso-drawing.ts` — 9 rows
- `dataset.ts` — aggregate (67 rows)

## 9. Provenance

Every row carries source_document, source_page, source_section, source_table,
source_row, source_column. `provenance-index.ts` maps source doc+page to categories.

## 10. Field Mapping

`field-mapping.ts` (20 entries) maps source fields (e.g. 主桁支間長) to normalized
fields (span.girder_span_length, unit m).

## 11. Unresolved Values

`dataset-haunch-hoso-drawing.ts` + `dataset.ts`:
- UNRESOLVED-drawing-001 (drawing_coordinate): 図面座標表 図形レイヤで数値確定不可
- UNRESOLVED-drawing-002 (dxf_coordinate): DXF座標 単位/座標系/符号規約が機械可読で確定不可
- 2 unresolved rows; never golden-usable.

## 12. Data Quality

- reference_id unique: PASS
- case_id consistent: PASS
- source document/page/value present: PASS
- unit known, normalized unit known: PASS
- coordinate system known: PASS
- expected value class known: PASS
- review status known: PASS
- no NaN/Infinity: PASS
- negative zero normalized: PASS (0 used)
- CSV/JSON parity: PASS (header + N rows)
- manifest hash: PASS (deterministic)
- unresolved separated: PASS
- self-reference separated: PASS (none golden)
- interpolated placeholder separated: PASS (none golden)

## 13. Tests

- 53 focused reference-data tests PASS
- `npm run typecheck` PASS
- `npm run build` PASS
- `npm test` full frontend: 326 files / 2551 tests PASS
- R1-P00 verification tests unchanged PASS

## 14. PR Ledger

See `R1_P01_PR_LEDGER.md`.

| Step | PR | Branch | Merge commit |
|---|---|---|---|
| P01-00 | #448 | research/liner-r1-p01-00-freeze | 2c81b050 |
| P01-01 | #449 | research/liner-r1-p01-01-schema | ef34c8c4 |
| P01-02 | #450 | research/liner-r1-p01-02-alignment-profile | e2061611 |
| P01-03 | #451 | research/liner-r1-p01-03-bridge-ldist | 669bebcc |
| P01-04 | #452 | research/liner-r1-p01-04-haunch-hoso-drawing | eb8928c3 |
| P01-05 | #453 | research/liner-r1-p01-05-integration | 03775e8f |

All 6 PRs merged to `research/liner-r1-planning`. Final integration HEAD: `03775e8f`.

## 15. Files Changed

- `frontend/src/liner/core/verification/reference-data/**` (types, validation, manifest,
  field-mapping, provenance-index, loader, datasets, index, tests)
- `frontend/src/liner/core/verification/index.ts` (additive)
- `docs/liner/planning/r1-numeric-verification/r1-p01/**`
- `docs/liner/planning/r1-numeric-verification/BRANCH_STATUS.md`

## 16. Calculation Logic Non-Modification

- No existing calculation module modified (`geometry/*`, `pipeline/*`, `haunch/*`,
  `hoso/*`, `ldist/*`, `station/*`, `grid/*`, `width/*`, `zMerge.ts`, `crossSection*`,
  `vertical*`). No calculation results changed (all golden tests pass).

## 17. Upper-Structure Non-Modification

- `~/Projects/spacer-clone` untouched by R1-P01. Commands there were read-only preflight
  only. Upper repo HEAD changes (if any during the session) were caused by the parallel
  track's external pulls, not R1-P01. R1-P01 commits exist only on
  `research/liner-r1-planning` + step branches.

## 18. Apollo Non-Modification

- No Apollo / docs/apollo changes in any R1-P01 PR.

## 19. Main Non-Modification

- No push / PR / merge to main from R1-P01. All PRs base=`research/liner-r1-planning`.
- main advanced externally during the session by the parallel track (not R1-P01).

## 20. Risks

- drawing/dxf coordinates unresolved; require manual re-verification (R1-P04/R1-P06).
- Confidence MEDIUM for drawing-derived values (graphical source).

## 21. Open Questions

- Authoritative DXF unit/coordinate declaration needed before adopting dxf_coordinate.
- Drawing coordinate table needs manual re-verification against original page.

## 22. R1-P02 Entry Conditions

- Review dataset (67 rows approved, 2 unresolved) on the dedicated branch.
- Approve tolerances, coordinate conventions, and authoritative data set.
- Confirm field mapping and target cases.
- Requires explicit user approval to start R1-P02.

## 23. Final Verdicts

- PREFLIGHT_VERDICT: PASS
- P01_00_FREEZE_VERDICT: PASS
- P01_01_SCHEMA_VERDICT: PASS
- P01_02_ALIGNMENT_PROFILE_DATASET_VERDICT: PASS
- P01_03_BRIDGE_LDIST_DATASET_VERDICT: PASS
- P01_04_HAUNCH_HOSO_DRAWING_DATASET_VERDICT: PASS
- P01_05_INTEGRATION_VERDICT: PASS
- SOURCE_PROVENANCE_VERDICT: PASS
- DATASET_SCHEMA_VERDICT: PASS
- CSV_JSON_PARITY_VERDICT: PASS
- FIELD_MAPPING_VERDICT: PASS
- UNRESOLVED_VALUE_VERDICT: PASS
- MANIFEST_HASH_VERDICT: PASS
- FOCUSED_TEST_VERDICT: PASS
- TYPECHECK_VERDICT: PASS
- BUILD_VERDICT: PASS
- CALCULATION_LOGIC_NON_MODIFICATION_VERDICT: PASS
- UPPER_STRUCTURE_NON_MODIFICATION_VERDICT: PASS
- APOLLO_NON_MODIFICATION_VERDICT: PASS
- CURVED_BRIDGE_NON_IMPLEMENTATION_VERDICT: PASS
- GUI_NON_IMPLEMENTATION_VERDICT: PASS
- MAIN_NON_MODIFICATION_VERDICT: PASS
- STEPWISE_PR_MERGE_VERDICT: PASS
- REMOTE_BRANCH_VERDICT: PASS
- R1_P02_NON_EXECUTION_VERDICT: PASS
- OVERALL_VERDICT: PASS
