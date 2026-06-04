# MVP Scope

## Purpose

This document fixes the MVP boundary for the independent 3D frame analysis system. The system uses JIP-SPACER as a reference for workflow concepts, but it does not target full compatibility with JIP-SPACER files, UI, reports, or advanced analysis modules.

## MVP Goal

Build a minimal, verifiable 3D frame analysis application that can:

- Define a 3D frame model.
- Run linear static analysis with 3D beam elements.
- Output nodal displacements, support reactions, and member end forces.
- Save and load model data as `project.json`.
- Export results as JSON and CSV.
- Provide a minimal React input UI.
- Display the model using a minimal Three.js line view.

## MVP In Scope

- 3D frame model only.
- 1 node has 6 degrees of freedom: `UX`, `UY`, `UZ`, `RX`, `RY`, `RZ`.
- Linear static analysis only.
- 3D Euler-Bernoulli beam element with 12 element degrees of freedom.
- Node coordinates.
- Member definitions.
- Material definitions.
- Section definitions.
- 6 degree support constraints.
- Nodal concentrated loads.
- Uniform member distributed loads.
- Displacement output.
- Reaction output.
- Member end force output.
- CSV output.
- JSON output.
- Minimal React UI.
- Minimal Three.js line model display.

## MVP Explicitly Out of Scope

- Influence line analysis.
- Moving loads.
- Automatic live load placement.
- Response spectrum analysis.
- Eigenvalue analysis.
- Temperature loads.
- Prestress.
- Initial tension.
- Member springs.
- Node-to-node springs.
- Advanced load combination processing.
- Report template editing.
- DXF output.
- License management.
- External analysis software integration.

## Design Constraints

- Use SI units internally.
- Do not implement JIP-SPACER file compatibility in MVP.
- Do not implement hidden automatic engineering assumptions.
- Every analysis result must be reproducible from `project.json`.
- Every numerical feature must have a verification test with known theory or a stable reference value.
- Advanced features must not leak into MVP schemas except as reserved extension fields.

## Phase Plan

### Phase 1: Specification, JSON, Test Criteria

- Finalize MVP docs.
- Define `project.json`.
- Define result JSON.
- Define API request and response shapes.
- Define verification examples and numerical tolerances.

### Phase 2: Python Analysis Engine

- Implement validation and parsing.
- Implement DOF numbering.
- Implement local coordinate systems.
- Implement 12x12 beam stiffness.
- Implement coordinate transformation, global assembly, boundary condition handling, sparse solve, reactions, and member end forces.

### Phase 3: FastAPI

- Expose validation, analysis run, save/load, and example endpoints.
- Add API tests.
- Keep API stateless in MVP except for explicit save/load operations.

### Phase 4: React Input UI

- Implement toolbar, model tree, property panel, model tables, and analysis run screen.
- Use `project.json` as the client-side source of truth.

### Phase 5: Three.js Display

- Render nodes, members, supports, loads, labels, selection, and deformed shape.
- Keep viewer read-only in MVP unless explicitly assigned later.

### Phase 6: Result Tables, Graphs, Reports

- Implement displacement, reaction, and member force result tables.
- Export JSON and CSV.
- Add minimal printable report page.

### Phase 7: Distribution and Quality Improvement

- Add packaging, example projects, documentation checks, and CI quality gates.
- Improve diagnostics and UI ergonomics without expanding analysis scope.

### Phase 8 and Later: Advanced Features

- Influence lines.
- Moving loads.
- Live load automation.
- Eigenvalue analysis.
- Response spectrum analysis.
- Advanced report layouts.
- Drawing exports.

## MVP Completion Definition

MVP is complete only when:

- All required schema files are implemented and validated.
- The six required verification cases in `docs/11_test_spec.md` pass.
- API endpoints in `docs/07_api_spec.md` pass tests.
- React UI builds and can edit all MVP model entities.
- Three.js viewer renders model, supports, loads, labels, and deformed shape.
- Results export to JSON and CSV.
- Quality gates in `docs/12_quality_gate.md` pass.
