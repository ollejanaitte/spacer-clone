# 05 Analysis Engine Specification

## 1. Purpose

This document defines the linear static 3D frame analysis processing that the Python analysis engine must implement for the MVP. It clarifies the responsibility of the numerical layer so that no analysis logic leaks into FastAPI or React.

## 2. Scope

- Six-DOF per node numbering.
- 3D Euler-Bernoulli beam elements.
- 12x12 local stiffness matrix.
- Member local coordinate system.
- Coordinate transformation.
- Global stiffness matrix assembly.
- Support boundary condition processing.
- Nodal concentrated load and member uniform distributed load vector construction.
- Linear system solution using the SciPy sparse solver.
- Computation of displacements, reactions, and member end forces.

## 3. Out of Scope

- Geometric and material nonlinearity.
- Timoshenko beams and shear deformation.
- Member end releases.
- Member springs and node-to-node springs.
- Temperature loads, prestress, and initial tension.
- Influence line analysis, moving loads, and automatic live load placement.
- Advanced load combination processing.

Eigenvalue analysis and response spectrum analysis are added later as the Phase E extension. See [eigen-analysis.md](design/eigen-analysis.md) and [response-spectrum-analysis.md](design/response-spectrum-analysis.md). Section 4 of this document covers the linear static MVP.

## 4. Processing Specification

### DOF Numbering

Each node has the following six DOFs in order:

```text
UX, UY, UZ, RX, RY, RZ
```

If the internal index of a node is `i`, the global DOF indices are:

```text
UX = 6*i + 0
UY = 6*i + 1
UZ = 6*i + 2
RX = 6*i + 3
RY = 6*i + 4
RZ = 6*i + 5
```

### Local Coordinate System

- The local x-axis points from `nodeI` to `nodeJ`.
- If `orientationVector` is given, it is used as the candidate for the local y-axis.
- If `orientationNode` is given, the vector from `nodeI` to that node is used as the candidate for the local y-axis.
- If neither is given, the global Z-axis is used as the candidate reference.
- If the member x-axis is nearly parallel to the global Z-axis, the global Y-axis is used as the candidate reference.
- The candidate vector is projected onto the plane perpendicular to the local x-axis, normalized, and used as the local y-axis.
- The local z-axis is defined as `x cross y`.

### 12x12 Beam Element Stiffness Matrix

The element DOF order is:

```text
uix, uiy, uiz, rix, riy, riz, ujx, ujy, ujz, rjx, rjy, rjz
```

Required section and material values:

- `E`: Young''s modulus.
- `G`: shear modulus.
- `A`: cross-section area.
- `Iy`: second moment of area about the local y-axis.
- `Iz`: second moment of area about the local z-axis.
- `J`: torsional constant.
- `L`: member length.

Required stiffness terms:

- Axial stiffness `EA/L`.
- Torsional stiffness `GJ/L`.
- Bending stiffness `E Iy` associated with the local z direction.
- Bending stiffness `E Iz` associated with the local y direction.

The sign convention is fixed by the tests and must agree with the member end force output.

### Coordinate Transformation

- Build a direction cosine matrix `R` from the local axes.
- Place `R` in both the translational and rotational blocks of the 12x12 transformation matrix `T`.
- The implementation uses `u_local = T @ u_global`.
- In that case, `k_global = T.T @ k_local @ T`.
- Equivalent nodal loads and member end force recovery use the same convention.

### Global Stiffness Assembly

- The total DOF count is `6 * node_count`.
- The 12 DOFs of each member are mapped to global DOFs.
- The matrix is assembled in SciPy sparse form.
- Aggregation in `coo_matrix` is recommended, with conversion to `csr_matrix` or `csc_matrix` before solving.

### Boundary Condition Processing

In the MVP, restrained DOFs are eliminated.

1. Build the global stiffness `K` and load `F`.
2. Collect the restrained DOF set from the supports.
3. Extract the free DOFs `freeDofs`.
4. Solve `Kff * Uf = Ff`.
5. Restrained DOF displacements are set to 0.

Support settlement is not supported.

### Load Vector Construction

- Nodal concentrated loads are added directly to the six DOFs of the target node.
- Member uniform distributed loads are converted to equivalent nodal loads in the local frame, then converted to the global frame and added to the global load vector.
- Member loads with `coordinateSystem = "global"` are first converted to the member local frame.
- The MVP only supports uniform distributed loads over the full member length.

### SciPy Sparse Solver

- `scipy.sparse.linalg.spsolve` is the standard solver.
- The input matrix is in CSR or CSC form.
- Singular matrices, zero pivots, and non-finite solutions are treated as analysis failures.

### Result Computation

- Displacement: `ux, uy, uz, rx, ry, rz` of all nodes.
- Reaction: computed as `R = K_full @ U_full - F_full`.
- Member end force: computed as `f_local = k_local @ u_local - f_equiv_local`.
- Member end forces are output in the local coordinate system at the I end and the J end.

## 5. Error Handling

- Invalid reference: `INVALID_REFERENCE` before analysis.
- Zero-length member: `ZERO_LENGTH_MEMBER`.
- Cannot define a local coordinate system: `INVALID_ORIENTATION`.
- Insufficient restraints or singular matrix: `MODEL_UNSTABLE` or `SOLVER_ERROR`.
- Solver exception: `SOLVER_ERROR`.
- Postprocessing failure: `POSTPROCESS_ERROR`.
- On analysis failure, partial results must not be returned as success.

## 6. Test Viewpoints

- Displacements, rotations, and reactions of a cantilever with a tip load.
- Center displacement and reactions of a simple beam with a center load.
- Center displacement and reactions of a simple beam with a uniform load.
- Rotation angle and reaction moment of a 3D cantilever under torsion.
- Failure of an under-constrained model.
- Failure of a model with invalid references.
- The local coordinate system is orthogonal and normalized.
- The global stiffness matrix is symmetric.

## 7. Definition of Done

- The required verification cases in `docs/11_test_spec.md` pass.
- The numerical tolerances in `docs/12_quality_gate.md` are satisfied.
- The engine can run analyses standalone, without the API or UI.
- The results can be converted into the format described in `docs/06_result_schema.md`.

## 8. Phase E Extension (Eigenvalue and Response Spectrum)

These are added after the linear static MVP is complete. The design documents are the authoritative reference.

### Common Reuse

- The DOF map, the global stiffness assembly, and the restrained DOF extraction follow the same rules as the linear static analysis.
- The analysis logic lives in `backend/engine`. No numerical processing is added to FastAPI or React.

### Eigenvalue Analysis

- Build a lumped mass vector and separate the master and slave DOFs.
- If slave DOFs exist, statically condense them into the master system.
- Solve `K_reduced phi = lambda Mmm phi` using `scipy.linalg.eigh`.
- Compute mass normalization, modal participation factors, effective masses, and cumulative effective mass ratios.
- Reference: [eigen-analysis.md](design/eigen-analysis.md)

### Response Spectrum Analysis

- Internally call the eigenvalue analysis at runtime.
- The Sa spectrum uses **linear interpolation**, and values outside the period range use the **end values**.
- Truncate modes by `cumulativeEffectiveMassRatios` and combine the displacement envelope with SRSS.
- In the MVP, reactions and section forces are returned as empty arrays.
- Reference: [response-spectrum-analysis.md](design/response-spectrum-analysis.md)
