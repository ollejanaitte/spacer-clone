# eigen-analysis.md

<!-- DOC-AUTHORITY:START -->
> **Authority:** ACTIVE FRAME REFERENCE
> This is subordinate feature/design evidence. Current implementation facts are governed by [`../../scoping/stage5_frame_analysis_scope.md`](../../scoping/stage5_frame_analysis_scope.md), and target responsibilities and gaps by [`../../planning/stage6-10/stage6_target_architecture.md`](../../planning/stage6-10/stage6_target_architecture.md) and [`../../planning/stage6-10/stage10_gap_migration_sequence.md`](../../planning/stage6-10/stage10_gap_migration_sequence.md). Partial or absent capabilities are not promoted to complete.
<!-- DOC-AUTHORITY:END -->

## 1. Purpose of Eigenvalue Analysis

Eigenvalue analysis is the analysis that computes the natural period, natural frequency, and mode shapes of a structure.

Response spectrum analysis is designed as a higher-level feature that depends on the result of eigenvalue analysis.

## 2. Analysis Equation

The basic equation is:

```text
K phi = lambda M phi
```

where

```text
K: global stiffness matrix
M: global mass matrix
phi: eigen mode
lambda: eigenvalue
omega: circular frequency
```

The relations are:

```text
lambda = omega^2
f = omega / (2*pi)
T = 2*pi / omega
```

## 3. Mass Matrix Policy

The MVP prioritizes lumped mass.

The unit of mass input, the conversion from weight by gravitational acceleration, and the handling of rotational inertia are designed explicitly.

The MVP uses `kN, m, s`.

The mass unit is:

```text
kN*s^2/m
```

In the MVP, mass is entered directly.

Automatic conversion from `kg`, `t`, and weight `kN` to mass is a future extension.

The initial policy is to assign mass to the three translational DOFs of each node.

```text
ux, uy, uz: mass is set
rx, ry, rz: in principle 0
```

Rotational inertia is a future extension. In the MVP, rotational inertia for `rx, ry, rz` is not handled.

## 4. Lumped Mass MVP

A mass case is defined, and a lumped mass is entered for each node.

Lumped mass is assigned only to the `ux, uy, uz` DOFs of a node.

Example:

```json
{
  "id": "mass-1",
  "name": "Mass for eigenvalue analysis",
  "method": "lumped",
  "source": "manual",
  "items": [
    {
      "nodeId": "N1",
      "mx": 10.0,
      "my": 10.0,
      "mz": 10.0,
      "irx": 0.0,
      "iry": 0.0,
      "irz": 0.0
    }
  ]
}
```

In the MVP, `mx, my, mz` are the primary fields.

DOF reduction is performed in two steps:

1. Eliminate the restrained DOFs and obtain the free DOF system `Kff`.
2. Among the free DOFs, separate the DOFs with a positive lumped mass as the master DOFs and the zero-mass DOFs as the slave DOFs.

When there are slave DOFs, they are reduced to the master system with the Guyan reduction (static condensation).

```text
K_reduced = Kmm + Kms * R
R = -Kss^-1 * Ksm
```

`Kmm` and `Mmm` are the reduced stiffness and mass corresponding to the master DOFs. When there is no slave, `K_reduced = Kmm`.

The eigenvalue analysis solves:

```text
K_reduced phi = lambda Mmm phi
```

Normalization, modal participation factors, and effective mass are computed on the master DOFs, and the slave mode components are recovered from `R`.

## 5. Consistent Mass for the Future

Consistent mass is built by forming the 12x12 element mass matrix from the distributed mass of beam elements and assembling it into the global mass matrix.

It is not implemented in the initial version.

Future items:

- Use of material density
- Linear density from cross-section area
- 3D beam element consistent mass
- Rotational inertia
- Combination with lumped mass

## 6. Mass Case Data Structure

The plan is to add `massCases` to the project.

```json
{
  "massCases": [
    {
      "id": "mass-1",
      "name": "Mass for eigenvalue analysis",
      "method": "lumped",
      "source": "manual",
      "items": []
    }
  ]
}
```

Future `source` values to consider:

```text
manual
fromSelfWeight
fromLoadCase
fromCombination
```

## 7. Eigenvalue Solver Candidates

Python / SciPy is assumed.

Candidates:

```text
scipy.sparse.linalg.eigsh
scipy.linalg.eigh
```

Initially, dense `eigh` is considered for small models and sparse `eigsh` for medium and large models.

In the MVP, `scipy.linalg.eigh` is used for the number of master DOFs.

Verification items:

- `Mmm` is positive definite.
- The reduced stiffness `K_reduced` is non-singular for eigenvalue analysis.
- A singular `Kss` configuration of the slaves is detected.
- Zero or negative eigenvalues are detected.
- The requested mode count does not exceed the number of master DOFs.

Mode normalization is fixed to mass normalization in the MVP.

```text
phi^T M phi = 1
```

## 8. API

Endpoint:

```text
POST /api/analysis/eigen
```

Request: `project` is required. `massCaseId` and `modeCount` are read from the request or from `analysisSettings.eigen`.

```json
{
  "project": {},
  "massCaseId": "mass-1",
  "modeCount": 10
}
```

In the MVP, `normalization` is fixed to `"mass"` and is not accepted from the request.

The response follows `docs/frame/contracts/06_result_schema.md` and `schemas/result.schema.json`. Eigenvalue-specific data is stored under `eigenResult`.

```json
{
  "analysisSummary": {
    "analysisType": "eigen",
    "status": "success"
  },
  "displacements": [],
  "reactions": [],
  "memberEndForces": [],
  "eigenResult": {
    "massCaseId": "mass-1",
    "normalization": "mass",
    "totalMassByDirection": [],
    "modes": [
      {
        "modeNo": 1,
        "eigenvalue": 0.0,
        "circularFrequency": 0.0,
        "frequency": 0.0,
        "period": 0.0,
        "modalMass": 0.0,
        "participationFactors": [],
        "effectiveMassRatios": [],
        "effectiveMasses": [],
        "cumulativeEffectiveMassRatios": [],
        "shape": []
      }
    ]
  },
  "warnings": [],
  "errors": []
}
```

For the detailed type definition, see [result-schema.md](../contracts/result-schema.md).

## 9. Output Data Structure

The following are output per mode. The field names follow `schemas/result.schema.json` `eigenMode`.

* `modeNo`: mode number
* `eigenvalue`: eigenvalue
* `circularFrequency`: circular frequency
* `frequency`: natural frequency
* `period`: natural period
* `shape`: mode shape
* `modalMass`: modal mass
* `participationFactors`: modal participation factors
* `effectiveMasses`: effective masses (absolute)
* `effectiveMassRatios`: effective mass ratios
* `cumulativeEffectiveMassRatios`: cumulative effective mass ratios

`eigenResult.totalMassByDirection` is attached to the overall result as the total mass per direction.

The modal participation factor, the effective mass, and the effective mass ratio are defined as follows.

```text
Gamma = phi^T M r / phi^T M phi
M_eff = Gamma^2 phi^T M phi
effective mass ratio = M_eff / (r^T M r)
```

Here, `r` is the excitation direction vector.

Under mass normalization this becomes:

```text
phi^T M phi = 1
Gamma = phi^T M r
M_eff = Gamma^2
```

## 10. UI Plan

Add the following to the left pane or the analysis settings:

```text
Analysis
  - Linear static analysis
  - Eigenvalue analysis
  - Response spectrum analysis
```

Eigenvalue analysis screen:

- Mass case selection
- Number of modes to compute
- Normalization method
- Per-direction modal participation factor display
- Natural period list
- Mode shape display

## 11. Verification Cases

Initial verification cases:

1. One-DOF spring-mass system
2. First natural period of a cantilever beam
3. Two-mass shear model
4. 3D frame model with constraints
5. Model with mass-zero DOFs

## 12. Implementation Phases

### Phase 1

- Add the mass case schema
- Lumped mass input
- Build the global mass matrix
- Eliminate restrained DOFs
- Run the eigenvalue analysis
- Output the natural period and frequency

### Phase 2

- Mode shape display
- Modal participation factors
- Effective masses
- Effective mass ratios

### Phase 3

- Connection to response spectrum analysis
