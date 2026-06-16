# Design Documents README

## 1. Purpose

This README is the entry point for the design documents of the in-house 3D frame analysis system that is being built with reference to JIP-SPACER. Subsequent Codex implementation agents should start from this README to navigate the design documents.

## 2. Scope

- The recommended reading order for the MVP design documents.
- The role of each document.
- The priority order when making MVP decisions.
- The quality standards that must be confirmed before implementation.

## 3. Out of Scope

- Implementation code.
- Detailed derivations of equations.
- Full compatibility specification with JIP-SPACER.
- Implementation details of features outside the MVP.

## 4. List of Design Documents and Reading Order

1. `docs/requirements_extraction.md`
   - Broad requirements extracted from the SPACER operation manual.
   - Reference material that also includes features outside the MVP.
2. `docs/02_mvp_scope.md`
   - The top-level decision criteria for the MVP scope.
   - Must be read before any implementation.
3. `docs/12_quality_gate.md`
   - PR acceptance criteria.
   - Defines the standards for tests, Ruff, type hints, JSON Schema, numerical error, API, UI build, and Electron/GPU compatibility.
4. `docs/03_architecture.md`
   - Overall system composition, responsibility boundaries, and data flow.
5. `docs/04_input_schema.md`
   - The input structure of `project.json`.
6. `docs/05_analysis_engine_spec.md`
   - Processing specification of the Python analysis engine.
7. `docs/06_result_schema.md`
   - Structure of the analysis result JSON.
8. `docs/07_api_spec.md`
   - FastAPI endpoint specification.
9. `docs/08_ui_spec.md`
   - React UI screen composition.
10. `docs/09_3d_view_spec.md`
    - Three.js rendering specification and the 2D fallback specification.
11. `docs/10_report_spec.md`
    - JSON / CSV / HTML report specification.
12. `docs/11_test_spec.md`
    - Required verification cases and test viewpoints.
13. `docs/20_agent_instructions.md`
    - Per-agent implementation instruction templates for Codex.

### Priority Order

When the documents conflict, the following priority applies.

1. `docs/02_mvp_scope.md`
2. `docs/12_quality_gate.md`
3. `docs/04_input_schema.md`
4. `docs/05_analysis_engine_spec.md`
5. `docs/06_result_schema.md`
6. `docs/07_api_spec.md`
7. The individual UI / 3D / report / test specifications.
8. `docs/requirements_extraction.md`

`docs/requirements_extraction.md` is reference material and must not be used as a basis for extending the MVP scope.

## 5. Error Handling

If there is a conflict between design documents:

- Update the relevant design document before continuing the implementation.
- If a feature outside the MVP is about to creep in, follow `docs/02_mvp_scope.md`.
- For decisions that touch the quality standards, follow `docs/12_quality_gate.md`.
- Electron / GPU compatibility settings are treated as app settings or desktop settings. They must not be mixed into `project.json`, the API, or the analysis result JSON.
- `legacy-desktop-gl` is the last-resort compatibility mode and must not be promoted to the default mode.
- Influence line analysis, moving loads, eigenvalue analysis, response spectrum analysis, temperature loads, prestress, DXF, and license management must not be implemented inside the MVP. When in doubt, confirm the design before coding.

## 6. Test Viewpoints

Every implementation PR must satisfy all of the following:

- It covers the required verification cases listed in `docs/11_test_spec.md`.
- It satisfies the PR acceptance criteria in `docs/12_quality_gate.md`.
- Inputs, results, the API, and the UI are consistent with their respective design documents.
- When WebGL initialization fails, the UI does not become a blank screen but switches to the 2D fallback or shows an explicit message.
- The Electron main process does not contain analysis logic.
- No feature outside the MVP is implemented.

## 7. Definition of Done

- The role of every design document is clear.
- The reading order is clear.
- Subsequent Codex implementation agents can reach the relevant document for the area they are responsible for.
