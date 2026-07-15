# 11 Test Specification

## 1. Purpose

This document defines the minimum test specification used to verify the MVP''s analysis accuracy, API contract, UI display, and error handling. Subsequent implementations will automate the verification cases in this document.

## 2. Scope

- Theoretical value comparison of the Python analysis engine.
- Input schema validation.
- Result schema validation.
- FastAPI endpoints.
- React UI build and basic display.
- Basic Three.js display.
- 2D fallback when Three.js initialization fails.
- GPU compatibility mode selection logic of the Electron desktop main process.

## 3. Out of Scope

- Verification of influence line analysis, moving loads, and automatic live load placement.
- Verification of eigenvalue analysis and response spectrum analysis.
- Verification of temperature loads, prestress, and initial tension.
- Verification of DXF, PDF report templates, and license management.
- Compatibility verification with external analysis software.
- Schema / API extension tests for storing GPU compatibility settings in `project.json`, the API, or the analysis result JSON.

## 4. Test Specification

### Common Criteria

- Units are SI.
- The standard relative tolerance for theoretical value comparison is `1e-5`.
- Near zero, an absolute tolerance is stated explicitly.
- The sign convention is recorded in test comments.
- `NaN` and `Infinity` are treated as failure.

### Required Analysis Verification Cases

#### 1. Cantilever beam with tip load

Model:

- One member.
- I end fixed, J end free.
- A vertical concentrated load `P` applied at the J end.

Theoretical values:

- Tip displacement `delta = P L^3 / (3 E I)`.
- Tip rotation `theta = P L^2 / (2 E I)`.
- Reaction at the fixed end `P`.
- Moment at the fixed end `P L`.

#### 2. Simple beam with center load

Model:

- A simple beam with a center node.
- Vertical support at both ends, with an axial restraint at one end to prevent rigid body motion.
- A concentrated load `P` applied at the center node.

Theoretical values:

- Center displacement `delta = P L^3 / (48 E I)`.
- Reaction `P / 2`.
- Maximum bending moment `P L / 4`.

#### 3. Simple beam with uniform load

Model:

- A simple beam with a center node.
- A uniform load `w` over the full length.

Theoretical values:

- Center displacement `delta = 5 w L^4 / (384 E I)`.
- Reaction `w L / 2`.
- Maximum bending moment `w L^2 / 8`.

#### 4. 3D cantilever beam under torsion

Model:

- A cantilever along the X axis.
- A torsional moment `T` about the local X axis at the free end.

Theoretical values:

- Twist angle `phi = T L / (G J)`.
- Reaction moment at the fixed end `T`.

#### 5. Insufficient supports error

Model:

- Valid nodes, members, materials, and sections.
- No supports, or insufficient restraints to prevent rigid body motion.

Expectation:

- `MODEL_UNSTABLE` or `SOLVER_ERROR`.
- The result must not be treated as a success.

#### 6. Invalid member reference error

Model:

- A member references a non-existent node ID.

Expectation:

- Pre-analysis validation returns `INVALID_REFERENCE`.
- The `path` points at the offending field.

### API Tests

- `GET /health` succeeds.
- `POST /api/projects/validate` reports a valid model as valid.
- `POST /api/projects/validate` detects invalid references.
- `POST /api/analysis/run` returns a cantilever result.
- `POST /api/projects/save` rejects path traversal.
- `POST /api/projects/load` handles missing files appropriately.
- `GET /api/examples` returns the required examples.

### UI / 3D Tests

- The UI build succeeds.
- The tables for nodes, members, materials, sections, supports, and loads are displayed.
- Validation errors are shown in the UI.
- The tables for a successful result are shown.
- The Three.js view does not crash on an empty model.
- Nodes, members, supports, loads, and the deformed shape are displayed.
- Three.js initialization failure does not crash the whole UI.
- Mocking `WebGLRenderer` construction failure switches to the 2D fallback.
- In the 2D fallback, nodes, members, rough supports, rough nodal loads, selection highlight, and fit to model are visible.
- The WebGL initialization failure is shown in the bottom panel, not only in the console.
- A guidance message such as "Please restart in compatibility rendering mode" is shown on WebGL initialization failure.

### Desktop / Electron Tests

- The GPU flag selection logic of the Electron main process is unit-testable.
- GPU compatibility mode setting values can be saved and loaded.
- The default setting is `normal`.
- `legacy-desktop-gl` is not the default setting.
- `compat-gpu-blocklist` selects `--ignore-gpu-blocklist`.
- `compat-angle-gl` selects `--ignore-gpu-blocklist` and `--use-angle=gl`.
- `legacy-desktop-gl` selects `--ignore-gpu-blocklist` and `--use-gl=desktop`.
- The design applies GPU flags before `app.whenReady()`.
- The development path `http://localhost:5173` and the production path `frontend/dist/index.html` are both verified.
- The Electron-side GPU compatibility setting must not leak into `project.json`, the API request, or the analysis result JSON.

## 5. Error Handling

- Tests verify error codes, not the full error message text.
- Partial results must not be returned as success on analysis failure.
- The API returns 500 only for unexpected internal exceptions.

## 6. Test Viewpoints

- Agreement with theoretical analysis values.
- Equilibrium of support reactions.
- Consistency between member end forces and reactions.
- Strictness of schema validation.
- Stability of the API contract.
- The UI does not expose features outside the MVP.
- WebGL failure does not produce a blank screen.
- GPU compatibility modes do not break the default mode.

## 7. Definition of Done

- The six required verification cases are automated.
- `pytest` passes.
- The API tests pass.
- The UI build passes.
- The 2D fallback test for Three.js initialization failure passes.
- The Electron main process test or the Electron build passes.
- The acceptance criteria in `docs/development/quality-gates.md` are satisfied.
