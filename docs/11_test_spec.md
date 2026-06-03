# Test Specification

## Purpose

This document defines minimum verification and regression tests for the MVP. Numerical tests must be automated with `pytest`.

## General Test Rules

- Tests use SI units.
- Tests must compare against closed-form theory where practical.
- Relative tolerance target is `1e-5`.
- Absolute tolerance may be used near zero values.
- Every expected sign must be documented in the test.
- Validation error tests must assert structured error codes, not only message text.

## Required Verification Cases

### 1. Cantilever Beam with Tip Concentrated Load

Model:

- One horizontal member of length `L`.
- Node I fixed.
- Node J free.
- Vertical point load `P` at free end.

Expected theory:

- Tip displacement: `delta = P L^3 / (3 E I)`.
- Tip rotation: `theta = P L^2 / (2 E I)`.
- Fixed end shear reaction: `P`.
- Fixed end moment reaction: `P L`.

Assertions:

- Free end displacement matches theory.
- Free end rotation matches theory.
- Support reactions match equilibrium.
- Member end forces match support equilibrium.

### 2. Simply Supported Beam with Center Concentrated Load

Model:

- Beam length `L`, split into two equal members or one member with center node.
- End supports restrain vertical displacement; one end also restrains axial displacement for stability.
- Point load `P` at center node.

Expected theory:

- Midspan displacement: `delta = P L^3 / (48 E I)`.
- End reactions: `P / 2` each.
- Maximum moment: `P L / 4`.

Assertions:

- Center displacement matches theory.
- Reactions sum to `P`.
- Reaction distribution is symmetric.

### 3. Simply Supported Beam with Uniform Distributed Load

Model:

- Beam length `L`.
- Uniform load `w` over full span.
- End supports as above.

Expected theory:

- Midspan displacement: `delta = 5 w L^4 / (384 E I)`.
- End reactions: `w L / 2` each.
- Maximum moment: `w L^2 / 8`.

Assertions:

- Midspan displacement matches theory when model has a center node.
- Reactions match theory.
- Member end forces are consistent with equivalent nodal load convention.

### 4. 3D Cantilever Torsion

Model:

- One member along global X.
- Node I fixed.
- Node J free.
- Torsional moment `T` about member local X at free end.

Expected theory:

- Twist angle: `phi = T L / (G J)`.
- Fixed torsional reaction: `T`.

Assertions:

- Free end `RX` matches theory.
- Fixed support `MX` matches equilibrium.
- No unintended transverse displacement above tolerance.

### 5. Insufficient Support Error

Model:

- Valid nodes, member, material, section.
- No supports or insufficient restraints causing rigid body motion.

Expected:

- Validation or analysis fails.
- Error code is `MODEL_UNSTABLE` or `SOLVER_ERROR` according to implementation boundary.
- No displacement results are returned.

### 6. Invalid Member Reference Error

Model:

- Member references a missing node.

Expected:

- Validation fails before analysis.
- Error code is `INVALID_REFERENCE`.
- Error path points to the invalid member field.

## API Tests

Required:

- `GET /health` returns `ok`.
- `POST /api/projects/validate` accepts valid cantilever example.
- `POST /api/projects/validate` rejects invalid member reference.
- `POST /api/analysis/run` returns expected cantilever result.
- `POST /api/projects/save` rejects path traversal.
- `POST /api/projects/load` rejects missing file.
- `GET /api/examples` returns required examples.

## UI Tests

Minimum:

- UI builds successfully.
- Tables render for nodes, members, materials, sections, supports, and loads.
- Run analysis button is disabled or reports error when validation fails.
- Result tables render after successful analysis.

## Regression Data

Every verification case should have:

- Example `project.json`.
- Expected result values.
- Tolerance values.
- Notes on sign convention.
