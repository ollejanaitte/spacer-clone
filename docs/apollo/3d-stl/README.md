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
- `16_linux_electron_launcher_smoke_solid_verification.md`

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

Friday, July 31, 2026 Linux Electron / wrapper follow-up:

- `start-ubuntu.sh` now installs traps before backend launch, tracks frontend PGID, and avoids killing reused backends
- `desktop/electron/main.ts` now aligns the dev URL to `http://127.0.0.1:5173` and can skip splash under `SPACER_AUTOMATION=1`
- direct wrapper failure-path checks confirmed backend teardown and port release on Ubuntu
- fallback banner `診断を開く` now opens the view panel path that actually contains diagnostics
- `frontend/scripts/verifyApolloElectron.mjs` now records attach, route, sample load, fallback, diagnostics, screenshots, window URLs, and cleanup artifacts
- browser Apollo sample confirmed `WebGL 3D` with `solidCount=80`
- Linux Electron under `xvfb-run` confirmed `2D fallback` with `solidCount=80` and `fallbackReason=WebGL renderer initialization failed`
