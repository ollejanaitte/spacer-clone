# Apollo Phase 1 3D/STL Freeze Docs

正式入口:

- `00_p0_completion_confirmation.md`
- `01_visualization_contract_freeze.md`
- `02_data_ownership_freeze.md`
- `03_implementation_plan_and_scope_freeze.md`
- `04_completion_gate.md`
- `05_risk_register.md`
- `06_test_plan.md`
- `07_poc_a_line_model_design.md`
- `08_selection_validation_integration_design.md`
- `09_simple_solid_model_design.md`
- `10_stl_export_design.md`
- `11_persistence_reload_electron_design.md`
- `12_step4_to_step8_design_readiness_gate.md`
- `13_traceability_matrix.md`
- `14_axis_camera_main_viewer_bug_report.md`
- `15_windows_viewer_controls_fallback_diagnostics.md`

現在の全体判定:

- `APOLLO_3D_STEP0_TO_STEP3_COMPLETION_VERDICT: COMPLETE`
- `APOLLO_3D_STEP4_TO_STEP8_IMPLEMENTATION_READINESS: READY_WITH_PROVISIONAL_POC_ASSUMPTIONS`
- `APOLLO_3D_PRODUCTION_IMPLEMENTATION_VERDICT: IN_PROGRESS`
- `RECOMMENDED_NEXT_STEP: IMPLEMENTATION_PR_5_BINARY_STL_AND_MANIFEST`

Thursday, July 30, 2026 status snapshot:

- PR-1 contract + derived builder: merged
- PR-2 line-model viewer: merged
- PR-3 selection + validation integration: merged
- PR-4 simple bridge solids: merged
- axis / camera / main viewer correction PRs: merged
- PR-5 binary STL + companion manifest: implementation in progress on current branch

Friday, July 31, 2026 Windows viewer follow-up:

- Apollo viewer control labels updated to bridge-domain terms
- Apollo default isometric direction updated for Windows operator expectation
- fallback disclosure + runtime diagnostics implemented in viewer layer
- Electron preload bridge extended with GPU mode / app version in a sandbox-safe way
