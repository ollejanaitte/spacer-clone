# 20 Agent Instructions

## 1. Purpose

To let subsequent Codex implementation agents determine, without hesitation, which design documents to read, what is the editable scope, what is prohibited, and what is the definition of done, by their role.

## 2. Scope

Roles covered:

- Engine owner.
- Test owner.
- API owner.
- UI owner.
- 3D owner.
- Desktop / Electron owner.
- Report owner.
- Review owner.

## 3. Out of Scope

- Implementation directives for features outside the MVP.
- Implementation of influence line analysis, moving loads, eigenvalue analysis, response spectrum analysis, temperature loads, prestress, DXF, and license management.
- Full compatibility with JIP-SPACER.
- The implementation code itself.

## 4. Role-specific Processing Specification

### Common Rules

- Read `docs/README.md` and `docs/02_mvp_scope.md` first.
- Follow the quality standards in `docs/12_quality_gate.md`.
- Do not add features outside the MVP.
- When the implementation differs from the design, update the design in the same PR.
- `SPACER Operation Manual.pdf` is a reference, not a basis for adding features outside the MVP.
- GPU compatibility settings are treated as app settings or desktop settings. They are not mixed into `project.json`, the API contract, or the analysis result JSON.

### Engine Owner

Purpose:

- Implement the Python analysis engine.

Design documents to read:

- `docs/02_mvp_scope.md`
- `docs/04_input_schema.md`
- `docs/05_analysis_engine_spec.md`
- `docs/06_result_schema.md`
- `docs/11_test_spec.md`
- `docs/12_quality_gate.md`

Files that may be modified:

- `backend/engine/**`
- `backend/tests/**`
- `schemas/**`
- `examples/**`

Files that must not be modified:

- `frontend/**`
- API routes, unless explicitly instructed.
- `docs/requirements_extraction.md`

Deliverables:

- DOF numbering.
- Local coordinate system.
- 12x12 beam element stiffness.
- Global stiffness assembly.
- Boundary condition processing.
- Load vector construction.
- SciPy sparse solve.
- Displacement, reaction, member end force.

Prohibitions:

- Do not implement nonlinear analysis, eigenvalue analysis, or response spectrum analysis.
- Do not implement influence line analysis or moving loads.
- Do not put `NaN` or `Infinity` into the result.

Definition of done:

- The required analysis verification cases pass.
- The result is convertible to the result JSON.
- Structured errors can be returned.

PR checklist:

- `pytest` passes.
- Ruff passes.
- Type hints are present.
- Theoretical value error is within tolerance.

### Test Owner

Purpose:

- Create automated tests that guarantee the MVP quality.

Design documents to read:

- `docs/04_input_schema.md`
- `docs/05_analysis_engine_spec.md`
- `docs/06_result_schema.md`
- `docs/07_api_spec.md`
- `docs/11_test_spec.md`
- `docs/12_quality_gate.md`

Files that may be modified:

- `backend/tests/**`
- `frontend/**/__tests__/**`
- `examples/**`
- `schemas/**`

Files that must not be modified:

- Production code, unless explicitly instructed.
- `docs/requirements_extraction.md`

Deliverables:

- The 6 required analysis verification cases.
- API tests.
- JSON Schema tests.
- UI build tests.

Prohibitions:

- Do not loosen the tolerance without reason.
- Do not freeze bugs as expected values.
- Do not rely only on the error message text.

Definition of done:

- Both the success and failure cases are verified.
- All required cases can be run in CI.

PR checklist:

- Tests are deterministic.
- Units are SI.
- Sign convention comments are present.

### API Owner

Purpose:

- Implement the FastAPI MVP API.

Design documents to read:

- `docs/03_architecture.md`
- `docs/04_input_schema.md`
- `docs/06_result_schema.md`
- `docs/07_api_spec.md`
- `docs/12_quality_gate.md`

Files that may be modified:

- `backend/app/**`
- `backend/tests/**`
- `schemas/**`
- `examples/**`

Files that must not be modified:

- `backend/engine/**`, except when explicitly instructed to modify the engine interface.
- `frontend/**`
- `docs/requirements_extraction.md`

Deliverables:

- `GET /health`
- `POST /api/projects/validate`
- `POST /api/analysis/run`
- `POST /api/projects/save`
- `POST /api/projects/load`
- `GET /api/examples`

Prohibitions:

- Do not implement numerical analysis inside the API routes.
- Do not allow path traversal.
- Do not implicitly modify the received project.

Definition of done:

- API tests pass.
- All endpoints are visible in OpenAPI.
- The error format is stable.

PR checklist:

- Both success and failure tests exist.
- HTTP 500 does not leak internal details.
- The engine call boundary is clear.

### UI Owner

Purpose:

- Implement the React MVP UI.

Design documents to read:

- `docs/02_mvp_scope.md`
- `docs/04_input_schema.md`
- `docs/06_result_schema.md`
- `docs/07_api_spec.md`
- `docs/08_ui_spec.md`
- `docs/12_quality_gate.md`

Files that may be modified:

- `frontend/src/**`
- `frontend/tests/**`
- Frontend configuration files.

Files that must not be modified:

- `backend/engine/**`
- `backend/app/**`
- `docs/requirements_extraction.md`

Deliverables:

- Top toolbar.
- Left model tree.
- Center 3D view area.
- Right property panel.
- Bottom result / error / log panel.
- MVP input tables.
- Analysis execution screen.
- Result display screen.

Prohibitions:

- Do not implement analysis logic inside the UI.
- Do not create live operation entry points for features outside the MVP.
- Do not emit errors only to the console.

Definition of done:

- The UI build succeeds.
- Input, validation, analysis execution, and result display are connected to the API.

PR checklist:

- The UI build passes.
- The implementation matches the API contract.
- Errors are shown in the UI.

### 3D Owner

Purpose:

- Implement the Three.js MVP display.

Design documents to read:

- `docs/04_input_schema.md`
- `docs/06_result_schema.md`
- `docs/08_ui_spec.md`
- `docs/09_3d_view_spec.md`

Files that may be modified:

- `frontend/src/viewer/**`
- Viewer-related tests.

Files that must not be modified:

- `backend/**`
- `docs/requirements_extraction.md`

Deliverables:

- Node display.
- Member line display.
- Support symbols.
- Load arrows.
- Labels.
- Deformed shape.
- 2D fallback display when Three.js initialization fails.
- Camera controls.
- Selection highlight.

Prohibitions:

- Do not implement CAD editing.
- Do not mutate the project inside the viewer.
- Do not implement DXF support.
- Do not report WebGL initialization failure only in the console.
- Do not mix GPU compatibility settings into `project.json` or the result JSON.

Definition of done:

- A sample model can be displayed.
- Selection is synchronized with the UI state.
- The deformed shape is drawn from the result JSON.
- When `WebGLRenderer` construction fails, the view switches to the 2D fallback.

PR checklist:

- An empty model does not crash.
- The display works even without a result.
- The display scale works.
- WebGL initialization failure does not produce a blank screen.

### Desktop / Electron Owner

Purpose:

- Launch the existing React UI as an Electron desktop application, and implement GPU compatibility modes for older GPUs.

Design documents to read:

- `docs/02_mvp_scope.md`
- `docs/03_architecture.md`
- `docs/08_ui_spec.md`
- `docs/09_3d_view_spec.md`
- `docs/11_test_spec.md`
- `docs/12_quality_gate.md`

Files that may be modified:

- `desktop/**`
- Electron configuration files.
- Required frontend launch settings.

Files that must not be modified:

- `backend/engine/**`
- `backend/app/**`, unless explicitly instructed.
- `schemas/**`. Do not modify them for GPU compatibility settings.
- `docs/requirements_extraction.md`

Deliverables:

- Electron startup.
- Development-time localhost load.
- Production-time dist load.
- GPU compatibility mode switching.
- WebGL failure guidance.

Prohibitions:

- Do not put analysis logic into the Electron main process.
- Do not change the API specification on your own.
- Do not make `legacy-desktop-gl` the default mode.
- Do not force GPU flags on all users unconditionally.
- Do not mix GPU settings into the analysis schema in `project.json`.
- Do not include GPU information in the analysis result JSON.

Definition of done:

- Electron can display the existing React UI.
- In development, it loads `http://localhost:5173`.
- In production, it loads `frontend/dist/index.html`.
- `normal`, `compat-gpu-blocklist`, `compat-angle-gl`, and `legacy-desktop-gl` can be switched.
- `app.commandLine.appendSwitch()` runs before `app.whenReady()`.
- On WebGL failure, the user can be guided to restart in a compatibility rendering mode.

PR checklist:

- The Electron main process test or the Electron build passes.
- There are unit tests for the GPU flag selection logic.
- The default mode is `normal`.
- `legacy-desktop-gl` is the last-resort compatibility mode.
- The analysis engine, the API, the schema, and the result specification are not extended.

### Report Owner

Purpose:

- Implement the JSON / CSV / HTML report output.

Design documents to read:

- `docs/06_result_schema.md`
- `docs/10_report_spec.md`
- `docs/12_quality_gate.md`

Files that may be modified:

- Report / export related modules.
- Report related tests.

Files that must not be modified:

- The analysis algorithm.
- The 3D viewer.
- `docs/requirements_extraction.md`

Deliverables:

- Result JSON output.
- Displacement CSV.
- Reaction CSV.
- Member end force CSV.
- Minimal HTML report.

Prohibitions:

- Do not serialize JSON numbers as strings.
- Do not implement report template editing.
- Do not implement DXF output.

Definition of done:

- The CSV headers follow the specification.
- A report can be generated even for an error result.

PR checklist:

- CSV tests pass.
- Units are shown.
- Empty results can be handled.

### Review Owner

Purpose:

- Confirm that the PR is consistent with the MVP scope, the quality standards, and the design documents.

Design documents to read:

- All design documents, following the reading order in `docs/README.md`.

Files that may be modified:

- In principle none. Review comments are the deliverable.

Files that must not be modified:

- Implementation files, unless a fix is requested.

Deliverables:

- Findings sorted by severity.
- File and line numbers.
- Impact description.
- Remaining risks when there are no findings.

Prohibitions:

- Do not overlook the introduction of features outside the MVP.
- Do not trivialize numerical error or sign convention changes.
- Do not approve insufficient tests.

Definition of done:

- Schema, engine, API, UI, 3D, report, tests, and quality gate are confirmed.

PR checklist:

- Within the MVP scope.
- Passes the quality gate.
- Implementation matches the design documents.
- Results are reproducible from `project.json`.

## 5. Error Handling

When an owner finds that the design is insufficient or contradictory during implementation, do not implement by guess. Do one of the following:

- Update the design in the same PR.
- Ask as a blocker.
- Explicitly state the decision not to implement as outside the MVP.

## 6. Test Viewpoints

- The deliverable in the owner''s scope satisfies `docs/12_quality_gate.md`.
- Features outside the MVP are not accidentally enabled.
- No files outside the editable scope are changed.
- Errors are structured.

## 7. Definition of Done

- Each owner can determine the work scope from this document alone.
- The prohibitions and the PR checklist are clear.
- There is no contradiction with the MVP scope in `docs/02_mvp_scope.md`.
