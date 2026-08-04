# 01 — User Requirements (Step 6-UI-P0-B)

**STEP_ID:** `APOLLO_STEP_6_UI_P0_B`  
**BASE_MAIN_SHA:** `ed14922aa9f1745df1ccd44d58f847d4d1574047`  
**Depends on:** P0-A (`docs/apollo/step6_ui_redesign/p0_a/`) merged via PR #380  
**DOCUMENTATION_ONLY:** YES

## Purpose

Convert the eight user complaints into verifiable UI requirements without changing application code. Formal authorization presentation may be **re-laid-out**; authorization **values** stay `NOT_GRANTED` / `PROHIBITED`.

## Requirement themes → IDs

| Theme | requirement_id(s) |
|-------|-------------------|
| Header mode vs actions separation | UR-01, UR-02 |
| Save state explicit | UR-03 |
| Authorization display compact | UR-04 |
| Unified progress (6-step + G01–G15) | UR-05 |
| Guided sticky footer | UR-06 |
| Input + 3D desktop 2-pane | UR-07 |
| Tablet stacked layout | UR-08 |
| Mobile input / 3D tabs | UR-09 |
| Workflow master-detail | UR-10 |
| Diagnostics priority | UR-11 |
| General vs technical info | UR-12 |
| Beginner vs expert responsibility | UR-13 |
| Preserve canonical / state logic | UR-14 |

Full acceptance criteria and verification methods: `02_ui_requirements.csv`.

## Non-negotiable preservations (all requirements)

- Single `ProjectModel` for Guided, list, Workflow, Viewer, STL
- WorkflowStateModel evaluation unchanged
- G01–G15 meanings / order unchanged
- WF-01..WF-15 meanings / order unchanged
- Japanese L1 catalog foundation maintained
- Formal authorization tokens unchanged
- Schema / checksum / save-reload / STALE unchanged
