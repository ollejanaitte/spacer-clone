# 03 Architecture

## 1. Purpose

Following the JIP-SPACER idea of separating input, execution, result display, reporting, and rendering, this document defines the architecture of the in-house 3D frame analysis system, limited to the MVP. The goal is to let subsequent Codex implementation agents build the system without confusing responsibility boundaries.

## 2. Scope

- Input, validation, linear static analysis, result display, and CSV / JSON output of 3D frame models.
- The Python analysis engine.
- The FastAPI backend.
- The React input UI.
- The Three.js line-model display.
- The Electron desktop application shell.
- Desktop GPU compatibility modes for older GPUs.
- Data exchange centered on `project.json` and the analysis result JSON.

## 3. Out of Scope

The MVP does not implement the following:

- Influence line analysis, moving loads, automatic live load placement.
- Eigenvalue analysis, response spectrum analysis.
- Temperature loads, prestress, initial tension.
- Member springs, node-to-node springs.
- Advanced load combination processing.
- DXF output, integration with external analysis software.
- License management.
- Full compatibility with JIP-SPACER.

## 4. Processing Specification

### Overall Layers

- `frontend`: React UI. Responsible for model input, validation, analysis run, and result display.
- `viewer`: Three.js display. Responsible for nodes, members, supports, loads, and deformed shape.
- `desktop/electron`: Electron main and preload. Responsible only for displaying the existing React UI, window management, and Chromium launch flags for GPU compatibility modes.
- `backend/app`: FastAPI. Responsible for the API contract, save/load, and invocation of the analysis engine.
- `backend/engine`: Python analysis engine. Responsible only for numerical analysis and result calculation.
- `schemas`: JSON Schema. Validates `project.json` and the result JSON.
- `examples`: Sample models used for MVP verification.
- `docs`: Design documents only. No implementation code is placed here.

### Data Flow

1. The React UI edits data that is compatible with `project.json`.
2. The UI sends the data to `POST /api/projects/validate`.
3. FastAPI validates the data against the JSON Schema and reference integrity.
4. The UI sends the data to `POST /api/analysis/run`.
5. FastAPI invokes the Python analysis engine.
6. The analysis engine computes displacements, reactions, and member end forces.
7. FastAPI returns the result JSON.
8. The UI uses the result JSON for result tables, the Three.js deformed shape, and CSV / JSON export.

In the Electron build, the React UI above is displayed inside a desktop window. Electron contains no analysis logic and does not change the API contract, the structure of `project.json`, or the result JSON.

In development:

```text
Electron -> http://localhost:5173
```

In production:

```text
Electron -> frontend/dist/index.html
```

### Dependency Directions

- The UI depends only on the API contract.
- The Three.js display depends only on `project.json` and the result JSON.
- FastAPI depends on the analysis engine.
- The analysis engine does not depend on FastAPI, React, or Three.js.
- The analysis engine knows nothing about file storage or HTTP.
- The Electron main process does not change the analysis engine, the analysis API specification, the JSON Schema, or the result specification.
- GPU compatibility settings are treated as application or desktop settings. They are not stored in `project.json` or in the analysis result JSON.

### Electron GPU Compatibility Modes

The Electron main process lets the user switch the Chromium launch flags among the following modes:

```text
normal:
  No additional GPU flag.

compat-gpu-blocklist:
  --ignore-gpu-blocklist

compat-angle-gl:
  --ignore-gpu-blocklist
  --use-angle=gl

legacy-desktop-gl:
  --ignore-gpu-blocklist
  --use-gl=desktop
```

Design constraints:

- The default mode is `normal`.
- `legacy-desktop-gl` is treated as a last-resort compatibility mode because of the broad side effects on Chrome UI rendering, and must not be used by default.
- The GPU compatibility mode is switchable from launch arguments, environment variables, or in-app settings.
- `app.commandLine.appendSwitch()` must be called before `app.whenReady()`.
- GPU flags are not forced on all users unconditionally.
- Changing the GPU compatibility mode must not change the analysis engine, the API, `project.json`, or the result JSON.

### Recommended Directory Layout

```text
desktop/
  electron/
    main.ts
    preload.ts
backend/
  app/
  engine/
  tests/
frontend/
  src/
    viewer/
schemas/
examples/
docs/
```

## 5. Error Handling

- UI input errors are displayed attached to the relevant table row or field.
- The API returns structured errors.
- The analysis engine must not leak exceptions outward; it must convert failures into error-coded results.
- The main error codes are:
  - `SCHEMA_ERROR`
  - `INVALID_REFERENCE`
  - `MODEL_UNSTABLE`
  - `SOLVER_ERROR`
  - `POSTPROCESS_ERROR`
  - `INTERNAL_ERROR`
- JSON output must not contain `NaN` or `Infinity`.

## 6. Test Viewpoints

- The responsibilities of the layers are not mixed.
- The UI contains no analysis logic.
- The Electron main process contains no analysis logic.
- The selection of Electron GPU compatibility flags is unit-testable.
- The API does not implement numerical analysis directly.
- The analysis engine does not depend on HTTP or the UI.
- Results are reproducible from `project.json`.
- The quality standards in `docs/12_quality_gate.md` are respected.

## 7. Definition of Done

- The main layers and their responsibility boundaries needed for subsequent implementation are clear.
- Features outside the MVP are explicitly listed as out of scope at the architecture level.
- The document does not contradict `docs/04_input_schema.md`, `docs/05_analysis_engine_spec.md`, `docs/06_result_schema.md`, or `docs/07_api_spec.md`.
