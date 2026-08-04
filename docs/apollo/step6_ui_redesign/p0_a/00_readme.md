# Step 6-UI-P0-A — Current UI and Dependency Audit

**STEP_ID:** `APOLLO_STEP_6_UI_P0_A`  
**BASE_MAIN_SHA:** `98ad5be376223be03449da835aec9a60f40e1cd9`  
**DOCUMENTATION_ONLY:** YES  
**APPLICATION_CODE_CHANGED:** NO  
**Updated:** 2026-08-05T00:37:09+09:00

## Purpose

Apollo UI大幅改良の実装前に、現行 `main` を正本として画面・コンポーネント・状態・データフロー・試験依存を事実ベースで棚卸しする。

## Scope

- In scope: documentation under `docs/apollo/step6_ui_redesign/p0_a/` and a concise `final_report.txt` progress block.
- Out of scope: any application/CSS/test/package/lockfile/schema/canonical/checksum/workflow-logic change.

## Evidence root

| File | Content |
|------|---------|
| `01_screen_inventory.md` | All screens, modes, major regions |
| `02_component_inventory.csv` | Component matrix |
| `03_state_and_data_flow.md` | Shell state, WorkflowStateModel, Viewer path |
| `04_navigation_map.md` | Mode/step/slide transitions |
| `05_viewer_data_flow.md` | ProjectModel → visualization → Viewer3D / STL |
| `06_test_inventory.csv` | Unit + E2E UI dependency inventory |
| `07_current_ui_problem_mapping.md` | User requirements 1–8 → code locations |
| `08_invariants_and_no_touch_areas.md` | Protected areas for UI redesign |
| `09_p0_a_completion_gate.md` | Exit criteria for P0-A |

## Formal authorization baseline

- `NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED` (unchanged)
- `DESIGN_OR_CONSTRUCTION_USE: PROHIBITED` (unchanged)
- `FORMAL_RELEASE_READINESS: NO_GO_PENDING_HUMAN_VALIDATION` (unchanged)

## Next

Proceed to **P0-B** only after this PR is merged to `main`.
