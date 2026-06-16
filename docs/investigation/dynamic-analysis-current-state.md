# dynamic-analysis-current-state.md

## 1. Current Analysis Engine Structure

The current analysis engine targets linear static analysis.

The main flow is:

1. Receive the model: nodes, members, materials, sections, supports, loads.
2. Build a 6-DOF per node DOF map.
3. Build a 12x12 element stiffness matrix for each member.
4. Assemble the element stiffness into the global stiffness matrix.
5. Build the load vector.
6. Solve the free-DOF system obtained by removing the restrained DOFs.
7. Restore the displacement to the full DOF vector.
8. Compute reactions and member end forces.

## 2. Node DOF Organization

Each node has 6 DOFs. The order is:

```text
ux, uy, uz, rx, ry, rz
```

For a node with internal index `i`, the global DOF indices are:

```text
6*i + 0: ux
6*i + 1: uy
6*i + 2: uz
6*i + 3: rx
6*i + 4: ry
6*i + 5: rz
```

The dynamic analysis reuses this DOF map as is.

## 3. Element Stiffness Matrix

Currently, a 3D Euler-Bernoulli beam element is used.

- Local stiffness matrix: 12x12.
- Coordinate transformation: `k_global = T.T @ k_local @ T`.
- Shear deformation is not considered.
- Member end release, geometric stiffness, and nonlinearity are not implemented.
- The mass matrix is not implemented.

## 4. Global Stiffness Matrix Assembly

The global-coordinate stiffness `k_global` of each member is added into the global DOFs corresponding to the 12 member DOFs.

The sparse matrix format is `coo_matrix(...).tocsr()`.

In the dynamic analysis, the existing `assemble_stiffness` is reused to build the global stiffness matrix `K`.

## 5. Boundary Condition Processing

Currently, the DOFs whose support flag is `true` are treated as restrained DOFs.

The static analysis solves the reduced system:

```text
Kff * Uf = Ff
```

Restrained DOF displacements are set to 0.

In the initial stage of the dynamic analysis, the same approach is used. The free-DOF-only matrices are formed as:

```text
Kff
Mff
Cff
```

## 6. Parts Reusable from the Existing Code

Reusable parts:

- DOF map
- 6-DOF per node ordering
- Node, member, material, section data structures
- Coordinate transformation
- Local stiffness matrix
- Global stiffness matrix assembly
- Restrained DOF extraction
- Displacement restoration
- Skeleton of reaction calculation
- Skeleton of member end force calculation
- FastAPI endpoint layout
- Save / load / validate flow

## 7. Missing Pieces for Eigenvalue Analysis

Currently unimplemented:

- Mass case
- Lumped mass
- Consistent mass
- Added mass
- Global mass matrix
- Restrained mass matrix
- Eigenvalue solver
- Natural period
- Natural frequency
- Mode shape
- Mode normalization
- Modal participation factor
- Effective mass
- Response spectrum input
- Damping ratio
- Excitation direction
- Modal combination (SRSS / CQC)
- Dynamic analysis result schema
- UI input screen
- Mode shape display

## Policy

The first implementation target is eigenvalue analysis with lumped mass.

Consistent mass, time history analysis, and standard spectrum auto-generation are deferred to later phases.
