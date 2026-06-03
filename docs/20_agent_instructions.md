# Codex Agent Instructions

## Purpose

This document defines implementation task templates by role. Each agent must stay within the assigned scope and must not expand MVP functionality unless the task explicitly updates the relevant design document.

## Common Rules for All Agents

- Read `docs/02_mvp_scope.md` before implementation.
- Do not target JIP-SPACER full compatibility.
- Do not implement out-of-scope advanced features during MVP work.
- Keep `project.json` and result JSON aligned with specs.
- Add or update tests for behavior changes.
- Do not modify unrelated files.
- Do not revert user changes.
- If a spec is ambiguous, update docs or ask before implementing.

## Engine担当

### 目的

Implement the Python linear static 3D frame analysis engine.

### 読むべき設計書

- `docs/02_mvp_scope.md`
- `docs/03_architecture.md`
- `docs/04_input_schema.md`
- `docs/05_analysis_engine_spec.md`
- `docs/06_result_schema.md`
- `docs/11_test_spec.md`
- `docs/12_quality_gate.md`

### 変更してよいファイル

- `backend/engine/**`
- `backend/tests/**`
- `schemas/**`
- `examples/**`
- Relevant docs only when implementation requires spec clarification.

### 変更してはいけないファイル

- `frontend/**` unless explicitly assigned.
- API route code unless explicitly assigned.
- `docs/requirements_extraction.md` unless explicitly requested.

### 成果物

- DOF numbering implementation.
- Local coordinate system implementation.
- 12x12 beam stiffness implementation.
- Global sparse assembly.
- Boundary condition handling.
- Load vector generation.
- SciPy sparse solve.
- Displacement, reaction, and member end force recovery.
- Engine tests.

### 禁止事項

- Do not implement nonlinear analysis.
- Do not implement eigenvalue or response spectrum analysis.
- Do not implement influence lines or moving loads.
- Do not return `NaN` or `Infinity`.
- Do not hide singular matrix failures.

### 完了条件

- Required engine verification tests pass.
- Engine returns result JSON compatible data.
- Structured errors are returned for invalid and unstable models.

### PR作成時のチェックリスト

- `pytest` passes.
- Ruff passes if configured.
- Verification examples pass theory tolerances.
- Sign convention is documented in tests.
- No API/UI scope creep.

## Test担当

### 目的

Create and maintain automated tests for schemas, engine, API, and UI build gates.

### 読むべき設計書

- `docs/04_input_schema.md`
- `docs/05_analysis_engine_spec.md`
- `docs/06_result_schema.md`
- `docs/07_api_spec.md`
- `docs/11_test_spec.md`
- `docs/12_quality_gate.md`

### 変更してよいファイル

- `backend/tests/**`
- `frontend/**/__tests__/**`
- `examples/**`
- `schemas/**`
- Test configuration files.

### 変更してはいけないファイル

- Production engine/API/UI code unless explicitly assigned.
- `docs/requirements_extraction.md`.

### 成果物

- Required six verification tests.
- API endpoint tests.
- Schema validation tests.
- UI build/test checks when frontend exists.

### 禁止事項

- Do not loosen tolerances without justification.
- Do not encode implementation bugs as expected behavior.
- Do not assert only that a request fails; assert structured error code.

### 完了条件

- Tests fail on known bad input.
- Tests pass on correct implementation.
- Verification cases include expected theory values.

### PR作成時のチェックリスト

- All new tests are deterministic.
- All fixtures use SI units.
- Expected signs are documented.
- Required quality gate tests are represented.

## API担当

### 目的

Implement the FastAPI backend that validates projects, runs analysis, saves/loads projects, and serves examples.

### 読むべき設計書

- `docs/03_architecture.md`
- `docs/04_input_schema.md`
- `docs/06_result_schema.md`
- `docs/07_api_spec.md`
- `docs/12_quality_gate.md`

### 変更してよいファイル

- `backend/app/**`
- `backend/tests/**`
- `schemas/**`
- `examples/**`

### 変更してはいけないファイル

- `backend/engine/**` unless the task explicitly includes engine integration fixes.
- `frontend/**` unless explicitly assigned.
- `docs/requirements_extraction.md`.

### 成果物

- `GET /health`
- `POST /api/projects/validate`
- `POST /api/analysis/run`
- `POST /api/projects/save`
- `POST /api/projects/load`
- `GET /api/examples`
- API tests.

### 禁止事項

- Do not implement numerical analysis in route handlers.
- Do not allow path traversal in save/load.
- Do not mutate submitted project payloads.

### 完了条件

- API conforms to documented request/response shapes.
- API tests pass.
- Engine errors are converted to stable API errors.

### PR作成時のチェックリスト

- Endpoint success and failure tests pass.
- OpenAPI docs load.
- Error responses include `code` and `message`.
- Save/load path sanitization is tested.

## UI担当

### 目的

Implement the React MVP UI for editing project data, running validation/analysis, and displaying result tables.

### 読むべき設計書

- `docs/02_mvp_scope.md`
- `docs/04_input_schema.md`
- `docs/06_result_schema.md`
- `docs/07_api_spec.md`
- `docs/08_ui_spec.md`
- `docs/12_quality_gate.md`

### 変更してよいファイル

- `frontend/src/**`
- `frontend/tests/**`
- Frontend package/config files.

### 変更してはいけないファイル

- `backend/engine/**`
- `backend/app/**` unless explicitly assigned.
- `docs/requirements_extraction.md`.

### 成果物

- Top toolbar.
- Left model tree.
- Center viewer container.
- Right property panel.
- Bottom result/error/log panel.
- Tables for nodes, members, materials, sections, supports, and loads.
- Analysis run and result display screens.

### 禁止事項

- Do not implement structural analysis in the UI.
- Do not introduce fields outside `project.json` without schema update.
- Do not hide validation errors in console only.

### 完了条件

- UI builds.
- MVP tables are editable.
- Validation and analysis API calls are wired.
- Results render from documented result JSON.

### PR作成時のチェックリスト

- UI build succeeds.
- Schema fields map correctly to forms/tables.
- Errors and warnings are visible.
- No unsupported advanced feature controls are shown as active.

## 3D担当

### 目的

Implement the Three.js model viewer.

### 読むべき設計書

- `docs/04_input_schema.md`
- `docs/06_result_schema.md`
- `docs/08_ui_spec.md`
- `docs/09_3d_view_spec.md`

### 変更してよいファイル

- `frontend/src/viewer/**`
- Viewer-related frontend tests.

### 変更してはいけないファイル

- Python engine files.
- API route files.
- `docs/requirements_extraction.md`.

### 成果物

- Node display.
- Member line display.
- Support symbols.
- Load arrows.
- Node and member labels.
- Deformed shape.
- Camera controls.
- Selection highlight.

### 禁止事項

- Do not implement CAD editing.
- Do not mutate project data inside viewer.
- Do not make viewer depend on backend internals.

### 完了条件

- Viewer renders valid example project.
- Selection syncs with React state.
- Deformed shape renders from result JSON.

### PR作成時のチェックリスト

- Viewer handles empty model.
- Viewer handles missing result data.
- Large model target is considered.
- Label toggles and fit-to-view work.

## Report担当

### 目的

Implement JSON/CSV export and minimal printable report.

### 読むべき設計書

- `docs/06_result_schema.md`
- `docs/10_report_spec.md`
- `docs/12_quality_gate.md`

### 変更してよいファイル

- Report/export modules in backend or frontend as assigned.
- Report tests.
- Example expected outputs.

### 変更してはいけないファイル

- Analysis algorithms unless explicitly assigned.
- 3D viewer files unless explicitly assigned.
- `docs/requirements_extraction.md`.

### 成果物

- Result JSON export.
- Displacements CSV.
- Reactions CSV.
- Member end forces CSV.
- Minimal HTML report.

### 禁止事項

- Do not format JSON numeric values as strings.
- Do not implement report template editing in MVP.
- Do not implement DXF output.

### 完了条件

- CSV headers match `docs/10_report_spec.md`.
- JSON output matches `docs/06_result_schema.md`.
- Reports include warnings and errors.

### PR作成時のチェックリスト

- CSV export tests pass.
- Empty result/error cases are handled.
- Units appear in human-readable report.

## Review担当

### 目的

Review PRs for correctness, scope control, numerical safety, and spec consistency.

### 読むべき設計書

- All docs in `docs/README.md` reading order.
- Especially `docs/02_mvp_scope.md` and `docs/12_quality_gate.md`.

### 変更してよいファイル

- Review comments only, unless explicitly asked to patch.

### 変更してはいけないファイル

- Do not modify code while reviewing unless the task is changed to implementation.

### 成果物

- Findings ordered by severity.
- File and line references.
- Clear explanation of impact.
- Explicit statement if no findings are found.

### 禁止事項

- Do not approve scope creep without spec updates.
- Do not ignore numerical sign convention changes.
- Do not focus on style over correctness when correctness risks exist.

### 完了条件

- Review covers schema, tests, numerical behavior, API/UI contract, and quality gate.

### PR作成時のチェックリスト

- Required tests are present.
- Specs and implementation agree.
- MVP exclusions remain excluded.
- Error handling is structured.
- Results are reproducible from `project.json`.
