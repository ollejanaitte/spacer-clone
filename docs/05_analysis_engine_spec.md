# Analysis Engine Specification

## Purpose

The Python analysis engine performs MVP linear static 3D frame analysis. It accepts validated `project.json` data and returns result JSON.

## Responsibilities

- Build internal model arrays.
- Assign global DOF numbers.
- Define member local coordinate systems.
- Compute each member 12x12 local stiffness matrix.
- Transform local matrices to global coordinates.
- Assemble the global stiffness matrix.
- Build global load vectors.
- Apply boundary conditions.
- Solve with SciPy sparse solver.
- Recover displacements, reactions, and member end forces.
- Emit structured warnings and errors.

## Degrees of Freedom

Each node has six DOFs in this fixed order:

1. `UX`
2. `UY`
3. `UZ`
4. `RX`
5. `RY`
6. `RZ`

For node index `i`, global DOF indices are:

- `UX = 6*i + 0`
- `UY = 6*i + 1`
- `UZ = 6*i + 2`
- `RX = 6*i + 3`
- `RY = 6*i + 4`
- `RZ = 6*i + 5`

The engine must keep a mapping from node ID to node index and DOF indices.

## Local Coordinate System

For each member:

- Local `x` axis points from `nodeI` to `nodeJ`.
- Local `y` and `z` axes must form a right-handed orthonormal basis.

Priority:

1. If `orientationVector` is provided, project it onto the plane normal to local `x` and use it as local `y`.
2. If `orientationNode` is provided, use vector from `nodeI` to that node and project it onto the plane normal to local `x`.
3. Otherwise, use a default global reference vector.

Default reference rule:

- Try global `Z = (0, 0, 1)` as reference.
- If member local `x` is nearly parallel to global `Z`, use global `Y = (0, 1, 0)`.
- Project the reference vector onto the plane perpendicular to local `x`.
- Normalize as local `y`.
- Compute local `z = x cross y`.

Validation/error conditions:

- Orientation vector must not be zero.
- Orientation vector must not be parallel to local `x`.
- Resulting transform must be orthonormal within tolerance.

## 12x12 Beam Element Stiffness Matrix

Use a prismatic Euler-Bernoulli 3D beam element.

Element DOF order in local coordinates:

1. `uix`
2. `uiy`
3. `uiz`
4. `rix`
5. `riy`
6. `riz`
7. `ujx`
8. `ujy`
9. `ujz`
10. `rjx`
11. `rjy`
12. `rjz`

Inputs:

- `E`: elastic modulus.
- `G`: shear modulus.
- `A`: area.
- `Iy`: second moment about local y.
- `Iz`: second moment about local z.
- `J`: torsional constant.
- `L`: member length.

Required stiffness terms:

- Axial: `EA/L`.
- Torsion: `GJ/L`.
- Bending about local z using `EIz`.
- Bending about local y using `EIy`.

Shear deformation is not included in MVP.

## Coordinate Transformation

Build a 3x3 direction cosine matrix `R` whose rows or columns are consistently defined as local axes in global coordinates. The convention must be documented in code and tests.

Build a 12x12 transformation matrix `T` by placing `R` blocks for translations and rotations at node I and node J.

Required operations:

- `k_global = T.T @ k_local @ T` if `u_local = T @ u_global`.
- Equivalent nodal loads must use the same convention.
- Member end force recovery must transform global member displacements back to local coordinates.

## Global Stiffness Matrix Assembly

Use sparse assembly:

- Precompute row indices, column indices, and values.
- Assemble into SciPy `coo_matrix`.
- Convert to `csr_matrix` before solving.

Rules:

- Total DOF count is `6 * node_count`.
- Each member contributes a 12x12 matrix to the DOFs of `nodeI` and `nodeJ`.
- Matrix symmetry should be preserved within numerical tolerance.

## Boundary Conditions

MVP uses elimination of constrained DOFs:

- Build full `K` and `F`.
- Identify constrained DOFs from `supports`.
- Free DOFs are all others.
- Solve `Kff * Uf = Ff`.
- Fill constrained displacements as zero.

Support settlements are out of scope.

## Load Vector Creation

### Nodal Loads

Add `fx`, `fy`, `fz`, `mx`, `my`, `mz` directly to the global load vector at the node DOFs.

### Member Uniform Loads

For each full-length uniform member load:

- Convert load components to local coordinates when `coordinateSystem` is `global`.
- Keep components as-is when `coordinateSystem` is `local`.
- Generate consistent fixed-end equivalent nodal loads in local coordinates.
- Transform equivalent nodal loads to global coordinates.
- Add to global load vector.

The sign convention must be tested with simple beam examples.

## SciPy Sparse Solver

Use SciPy sparse direct solver:

- Preferred: `scipy.sparse.linalg.spsolve`.
- Input matrix: `Kff` in CSR or CSC format.
- Detect singular or ill-conditioned systems where possible.

If solve fails, return `SOLVER_ERROR`.

## Displacement Recovery

For each load case:

- Store global nodal displacement components for every node.
- Use component names `ux`, `uy`, `uz`, `rx`, `ry`, `rz`.

## Reaction Recovery

Compute full reaction vector:

```text
R = K_full @ U_full - F_full
```

Return reaction components only for constrained DOFs, grouped by support node.

## Member End Force Recovery

For each member and load case:

1. Extract global member displacement vector.
2. Transform to local displacement vector.
3. Compute local member end force:

```text
f_local = k_local @ u_local - f_equiv_local
```

4. Return end forces at I and J ends in local member axes.

Output components:

- `fx`
- `fy`
- `fz`
- `mx`
- `my`
- `mz`

## Analysis Errors

The engine must return structured errors for:

- Missing referenced node/material/section/load case.
- Zero-length member.
- Invalid orientation.
- No supports.
- Rigid body mode or singular stiffness matrix.
- Empty load case list.
- Non-finite numeric input.
- Solver failure.

## Warnings

Warnings do not block analysis. Examples:

- Load case has no loads.
- Node is disconnected.
- Very short member.
- Very large displacement relative to member length.
- High estimated condition number if available.

## Numerical Tolerances

Initial defaults:

- Coordinate tolerance: `1e-9 m`.
- Matrix symmetry tolerance: `1e-8`.
- Verification relative error target: `1e-5` unless test spec states otherwise.

## Out of Scope

- Geometric nonlinearity.
- Material nonlinearity.
- Shear deformation.
- End releases.
- Springs.
- Thermal, prestress, initial tension.
- Dynamic analysis.
