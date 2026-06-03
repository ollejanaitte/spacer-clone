# Architecture

## System Overview

The MVP is split into four layers:

- Python analysis core.
- FastAPI backend.
- React frontend.
- Three.js viewer.

The canonical data exchange format is `project.json`. Analysis results are returned as result JSON and can be exported to CSV.

## Component Boundaries

### Analysis Core

Responsibilities:

- Parse validated project data.
- Build model objects.
- Number global DOFs.
- Build element stiffness matrices.
- Assemble global sparse matrices.
- Apply support constraints.
- Solve linear static systems.
- Compute displacements, reactions, and member end forces.
- Return structured warnings and errors.

The core must not depend on FastAPI, React, or Three.js.

### API Backend

Responsibilities:

- Validate project JSON.
- Execute analysis through the core.
- Save and load project JSON.
- Serve example projects.
- Convert engine exceptions into stable API errors.

The backend must not implement numerical methods directly.

### React UI

Responsibilities:

- Maintain editable project state.
- Render model tables and property forms.
- Call validation and analysis APIs.
- Display result tables, warnings, errors, and logs.
- Trigger JSON and CSV exports.

The UI must not implement structural analysis logic.

### Three.js Viewer

Responsibilities:

- Draw nodes, members, supports, loads, labels, selected entities, and deformed shape.
- Convert project/result data into render primitives.
- Report selected entity IDs back to the React UI.

The viewer must be a visualization component, not a model editor, unless a later task explicitly expands scope.

## Data Flow

1. User edits model in React tables/forms.
2. React stores model as `project.json` compatible state.
3. User runs validation.
4. React sends project to `POST /api/projects/validate`.
5. User runs analysis.
6. React sends project to `POST /api/analysis/run`.
7. FastAPI calls analysis core.
8. Analysis core returns result JSON.
9. React displays result tables and deformed Three.js view.
10. User exports JSON or CSV.

## Directory Guidance

Recommended implementation layout:

- `backend/app/`: FastAPI application.
- `backend/engine/`: analysis core.
- `backend/tests/`: Python and API tests.
- `frontend/src/`: React application.
- `frontend/src/viewer/`: Three.js components.
- `schemas/`: JSON Schema files.
- `examples/`: example `project.json` files.
- `docs/`: specifications only.

## Internal Domain Model

Core entities:

- `Project`
- `Units`
- `Node`
- `Material`
- `Section`
- `Member`
- `Support`
- `LoadCase`
- `NodalLoad`
- `MemberLoad`
- `AnalysisSettings`
- `AnalysisResult`

IDs are strings in JSON. The engine may map them to dense integer indices internally.

## Units

MVP uses SI base conventions:

- Length: `m`
- Force: `kN`
- Moment: `kN_m`
- Stress/modulus: `kN_per_m2`
- Area: `m2`
- Second moment of area: `m4`

The engine must not silently convert unknown units. Unsupported units are validation errors.

## Error Strategy

Use structured errors:

- `VALIDATION_ERROR`: invalid project schema or references.
- `MODEL_ERROR`: model is structurally invalid after schema validation.
- `SOLVER_ERROR`: numerical solve failed.
- `POSTPROCESS_ERROR`: displacement solved but result recovery failed.
- `INTERNAL_ERROR`: unexpected bug.

All errors must include:

- `code`
- `message`
- `path` when applicable
- `entityType` when applicable
- `entityId` when applicable

## Extensibility Rules

- Add new analysis features behind explicit schema fields and feature flags.
- Keep MVP fields stable once implementation starts.
- Do not overload existing fields for advanced features.
- Preserve backward compatibility through `project.schemaVersion`.

## Non-Goals

- Desktop application architecture.
- JIP-SPACER binary/file compatibility.
- Multiple solver backends in MVP.
- Multi-user project management.
- Cloud persistence.
