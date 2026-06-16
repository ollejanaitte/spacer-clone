# Time History Analysis (Newmark-beta)

## 1. Feature Overview

Linear time history analysis is a direct-integration dynamic analysis method that computes the time-domain response of a structural model subjected to a prescribed time-varying excitation (typically ground acceleration).

The analysis solves the equation of motion step by step. At each step it advances the displacement, velocity, and acceleration states from the previous step using an implicit integration rule. The output is a complete time history of nodal responses, member forces, and support reactions, from which maximum (envelope) values can be derived.

### Position in the Analysis Stack

| Analysis | Layer | Uses |
| --- | --- | --- |
| Static analysis | Base | Builds the global stiffness matrix `K` and the static load vector. |
| Eigenvalue analysis | Modal base | Produces natural periods, mode shapes, and modal masses used for verification and damping calibration. |
| Response spectrum analysis | Modal-superposition (frequency domain) | Consumes eigen results and a user-supplied spectrum. |
| **Time history analysis** | Direct integration (time domain) | Consumes `K`, `M`, `C`, a ground motion record, and a time step; produces transient response histories. |

Time history analysis is the most general of the four. Modal superposition (response spectrum) is recovered as a special case of a damped linear system in the frequency domain; direct integration handles arbitrary time-varying loading including multi-support and base-acceleration inputs that modal superposition cannot represent faithfully.

### Why Newmark-beta

The MVP uses the Newmark-beta method with the average acceleration variant (beta = 1/4, gamma = 1/2). It is:

- Unconditionally stable for linear systems.
- Second-order accurate.
- Energy-conserving for the average acceleration variant.
- A standard textbook baseline that allows later extension to nonlinear time history without changing the time-stepping interface.

## 2. Analysis Scope

### Supported in MVP

- Linear elastic behavior (small deformations, no material nonlinearity).
- Multi-degree-of-freedom (MDOF) 3D frame model built from the same `K` matrix used by static analysis.
- Lumped or consistent mass matrix from the existing mass case.
- Ground acceleration excitation applied at the base in one or more global directions.
- Rayleigh damping (`C = alpha * M + beta * K`).
- Newmark-beta time integration with the average acceleration method.
- Extraction of envelope (maximum / minimum) response values from the time history.
- Storage of the full displacement, velocity, acceleration, reaction, and member force histories.

### Not Supported in MVP

- Material nonlinearity (elastic-plastic, bilinear, multi-linear).
- Geometric nonlinearity (P-delta, large displacement, large rotation).
- Plastic hinges, fiber sections, and concentrated damage models.
- Nonlinear bearings, isolators, and dampers.
- Soil-structure interaction and foundation impedance.
- Contact and friction models.
- Multi-support excitation with spatially varying ground motion (a single uniform input record is used in the MVP).
- Time-varying stiffness, mass, or damping.
- Implicit-explicit (IMEX) or explicit central-difference methods.
- A parallel or GPU solver.

The MVP is the linear baseline. Nonlinear extensions are scoped in section 14.

## 3. Mathematical Formulation

The equation of motion for a discrete 3D frame model with base acceleration excitation is:

```
M * u_ddot(t) + C * u_dot(t) + K * u(t) = P(t) - M * r * a_g(t)
```

where:

| Symbol | Meaning |
| --- | --- |
| `M` | Global mass matrix. Assembled from lumped (or, in future, consistent) mass at nodes. |
| `C` | Global damping matrix. In the MVP, Rayleigh damping `C = alpha * M + beta * K`. |
| `K` | Global stiffness matrix. Identical to the static-analysis `K`. |
| `u(t)` | Nodal displacement vector relative to the base. |
| `u_dot(t)` | Nodal velocity vector. |
| `u_ddot(t)` | Nodal acceleration vector. |
| `P(t)` | External applied nodal load vector (zero in the MVP for pure ground motion cases). |
| `r` | Influence vector that maps a unit base acceleration to nodal inertia forces. |
| `a_g(t)` | Scalar ground acceleration time history applied in a chosen direction. |

### Effective Load Vector

For uniform base excitation, the effective dynamic load is:

```
F_eff(t) = P(t) - M * r * a_g(t)
```

In the MVP `P(t) = 0` and `r` is the unit vector in the excitation direction. Each constrained DOF that is fixed in the excitation direction contributes its mass to the inertia force.

### Mass Matrix

The MVP reuses the existing mass case. Lumped mass is applied to the translational DOFs of each free node. Rotational inertia is zero in the MVP (consistent with the eigenvalue analysis policy). The unit is `kN*s^2/m`.

The mass matrix `M` is symmetric positive semi-definite. The row and column of a fully-constrained DOF are removed before integration.

### Damping Matrix

`C` is built once before time stepping begins using the chosen Rayleigh coefficients:

```
C = alpha * M + beta * K
```

`C` is held constant for the entire analysis. Time-varying damping is out of scope.

### Stiffness Matrix

`K` is the same global stiffness matrix used by the static analysis. It is assembled once, factorized once at the start of the analysis, and reused for every time step.

### Ground Excitation Loading

Ground acceleration is read from a user-supplied time history file. The MVP accepts a two-column text file (time, acceleration) with a single record per direction. The acceleration is interpolated linearly to the integration time step.

Direction is one of:

```
X | Y | Z
```

Each direction produces a separate result. Multi-direction simultaneous excitation is a future extension (see section 14).

## 4. Newmark-beta Method

### Average Acceleration Variant

The MVP uses the **average acceleration method**:

```
beta = 1 / 4
gamma = 1 / 2
```

This variant is unconditionally stable for linear systems and conserves energy. It introduces no algorithmic damping, which is desirable for an analysis whose output includes maximum values.

### Recurrence Relations

Given the state at time `t_n` (`u_n`, `u_dot_n`, `u_ddot_n`), the state at `t_{n+1} = t_n + dt` is computed from the Newmark recurrence relations:

```
u_{n+1}   = u_n   + dt * u_dot_n   + dt^2 * ( (1/2 - beta) * u_ddot_n + beta * u_ddot_{n+1} )
u_dot_{n+1} = u_dot_n + dt * ( (1 - gamma) * u_ddot_n + gamma * u_ddot_{n+1} )
```

The unknowns at step `n+1` are `u_{n+1}` and `u_ddot_{n+1}` (or `u_dot_{n+1}`). They are obtained by substituting into the equation of motion at `t_{n+1}`.

### Effective Stiffness and Effective Load

Rearranging yields:

```
K_eff * u_{n+1} = F_eff_{n+1}
```

where the effective stiffness is:

```
K_eff = K + (gamma / (beta * dt)) * C + (1 / (beta * dt^2)) * M
```

and the effective load is:

```
F_eff_{n+1} = F(t_{n+1})
            + M * ( (1 / (beta * dt^2)) * u_n
                   + (1 / (beta * dt)) * u_dot_n
                   + (1 / (2 * beta) - 1) * u_ddot_n )
            + C * ( (gamma / (beta * dt)) * u_n
                   + (gamma / beta - 1) * u_dot_n
                   + dt * (gamma / (2 * beta) - 1) * u_ddot_n )
```

`K_eff` is symmetric, positive definite, and identical at every step. It is factorized **once** at the beginning of the analysis (sparse LU). Each subsequent step is a single sparse triangular solve.

### Time-Stepping Algorithm

```
1. Assemble M, C, K from the project.
2. Apply support boundary conditions (remove constrained DOFs).
3. Build K_eff = K + (gamma / (beta * dt)) * C + (1 / (beta * dt^2)) * M.
4. Factorize K_eff (sparse LU).
5. For each time step n = 0, 1, ..., N-1:
   a. Build F_eff_{n+1} from u_n, u_dot_n, u_ddot_n and F(t_{n+1}).
   b. Solve K_eff * u_{n+1} = F_eff_{n+1}.
   c. Recover u_ddot_{n+1} = (1 / (beta * dt^2)) * (u_{n+1} - u_n)
                            - (1 / (beta * dt)) * u_dot_n
                            - (1 / (2 * beta) - 1) * u_ddot_n.
   d. Recover u_dot_{n+1} = u_dot_n + dt * ( (1 - gamma) * u_ddot_n + gamma * u_ddot_{n+1} ).
   e. Store (u_{n+1}, u_dot_{n+1}, u_ddot_{n+1}) and post-process reactions and member forces.
6. Reduce histories to envelope values.
```

Initial conditions in the MVP are quiescent:

```
u_0 = 0
u_dot_0 = 0
u_ddot_0 = 0
```

A free-field pre-initialization step is a future extension.

### Numerical Stability

The average acceleration variant is unconditionally stable for linear systems. The MVP adds the following safeguards:

- The integration time step is bounded from above by the user. The default upper bound is `dt <= T_min / 10`, where `T_min` is the smallest period of interest (typically obtained from a prior eigenvalue analysis).
- The matrix solve uses a sparse direct solver; ill-conditioning is reported as a warning when the condition number estimate exceeds a threshold.
- Mass and stiffness are dimensionally consistent with the eigenvalue analysis. The same mass and stiffness units are reused.
- Damping coefficients `alpha` and `beta` are bounded to keep the modal damping ratio in `[0, 1]`.

## 5. Damping Model

### Rayleigh Damping

The MVP uses Rayleigh damping:

```
C = alpha * M + beta * K
```

`alpha` and `beta` are user-supplied constants. The resulting modal damping ratio for mode `i` with circular frequency `omega_i` is:

```
xi_i = alpha / (2 * omega_i) + beta * omega_i / 2
```

The MVP does not derive `alpha` and `beta` from two target damping ratios and two target frequencies. Instead, the user provides the coefficients directly, or selects one of the preset templates.

### User Inputs

| Field | Type | Description |
| --- | --- | --- |
| `dampingModel` | string | Fixed to `"rayleigh"` in the MVP. |
| `alpha` | number | Mass-proportional coefficient. |
| `beta` | number | Stiffness-proportional coefficient. |
| `preset` | string (optional) | One of `concrete-bridge`, `steel-bridge`, `user`. Default `user`. |

Preset templates are documentation-level references; the MVP uses the user-supplied `alpha` and `beta` directly.

### Calculation Flow

1. Read `alpha`, `beta`, and (optionally) a `preset`.
2. Compute `C = alpha * M + beta * K` once.
3. Apply the same constrained-DOF reduction used for `K` and `M`.
4. Reuse `C` for every Newmark step.

### Future Extensibility

The damping model is abstracted behind an interface. Future versions may add:

- Modal damping directly specified per mode.
- Per-member damping factors.
- Hysteretic (frequency-dependent) damping.
- Equivalent linearized damping from a nonlinear model.

The Newmark step only requires that `C * v` can be evaluated; the construction is separated from the time integration.

## 6. Input Data Model

The MVP does not modify the existing `project.json` schema. It introduces a new optional section under `analysisSettings` and a new optional sub-array for ground motion records.

### `project.analysisSettings.timeHistory`

```json
{
  "timeHistory": {
    "timeStep": 0.01,
    "duration": 20.0,
    "excitationDirection": "X",
    "dampingModel": "rayleigh",
    "alpha": 0.0,
    "beta": 0.005,
    "groundMotionId": "gm-1",
    "outputRequests": [
      "displacement",
      "velocity",
      "acceleration",
      "memberForce",
      "reaction"
    ]
  }
}
```

| Field | Type | Description |
| --- | --- | --- |
| `timeStep` | number (s) | Integration time step. Must be positive. |
| `duration` | number (s) | Total analysis duration. Must be positive. |
| `excitationDirection` | `"X" \| "Y" \| "Z"` | Global excitation direction. |
| `dampingModel` | `"rayleigh"` | Fixed in the MVP. |
| `alpha` | number | Mass-proportional damping coefficient. |
| `beta` | number | Stiffness-proportional damping coefficient. |
| `groundMotionId` | string | Reference to a `groundMotions` entry. |
| `outputRequests` | string[] | Which histories to retain. See section 9. |

### `project.groundMotions`

A new optional top-level array. Each entry is a self-contained record:

```json
{
  "id": "gm-1",
  "name": "El Centro 1940 NS",
  "unit": "m_s2",
  "directionLabel": "NS",
  "timeUnit": "s",
  "sampleCount": 2688,
  "points": [
    { "time": 0.0, "value": 0.0 },
    { "time": 0.02, "value": 0.036 }
  ]
}
```

| Field | Type | Description |
| --- | --- | --- |
| `id` | string | Unique identifier within the project. |
| `name` | string | Human-readable label. |
| `unit` | `"m_s2" \| "gal"` | Acceleration unit. |
| `directionLabel` | string (optional) | Free-form horizontal-direction label, e.g. `"NS"` or `"EW"`. |
| `timeUnit` | `"s"` | Fixed in the MVP. |
| `sampleCount` | number | Number of samples; must match `points.length`. |
| `points` | array | Time-acceleration pairs. |

The MVP stores the full record inline. Future versions may store only a reference to a server-side library.

### Backward Compatibility

- The new fields are optional. Existing project files without them remain valid.
- A new `analysisType` value is added to the result summary, but the existing `linear_static`, `eigen`, and `response_spectrum` values are unchanged.
- The existing `displacements`, `reactions`, and `memberEndForces` arrays are unchanged. Time history results are added under a new `timeHistoryResult` field; existing fields are reused where possible.

## 7. JSON Schema Extension Proposal

The schema extensions are additive. No existing field is renamed, removed, or repurposed.

### `schemas/project.schema.json`

Two new optional sections:

- `project.groundMotions[]` - array of ground motion records.
- `project.analysisSettings.timeHistory` - time history analysis settings (object).

### `schemas/result.schema.json`

A new optional top-level field:

- `result.timeHistoryResult` - time history result object. See section 9.

A new value in `analysisSummary.analysisType`:

- `"time_history"` - identifier for the time history analysis.

These additions do not invalidate existing result files.

## 8. Backend API Design

This section proposes the API surface for time history analysis. No implementation is included.

### Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/analysis/time-history` | Run linear time history analysis. |
| `POST` | `/api/projects/{project_id}/ground-motions` | Upload a ground motion record. |
| `GET` | `/api/projects/{project_id}/ground-motions` | List ground motions for a project. |
| `GET` | `/api/analysis/time-history/{result_id}/history` | Fetch a specific history (displacement, velocity, etc.) for a node or member. |

The result of `POST /api/analysis/time-history` is the same envelope as the other analyses but extended with `timeHistoryResult` (see section 9). The full histories are stored server-side and fetched on demand through the history endpoint.

### `POST /api/analysis/time-history` Request

```json
{
  "project": {},
  "options": {
    "returnCsv": false,
    "storeHistories": true,
    "maxStoredNodes": 50,
    "maxStoredMembers": 50
  }
}
```

| Field | Type | Description |
| --- | --- | --- |
| `returnCsv` | boolean | Reserved for future CSV export integration. MVP returns JSON. |
| `storeHistories` | boolean | Whether to retain full time histories on the server. Default `true`. |
| `maxStoredNodes` | number | Cap on the number of nodes whose full history is retained. |
| `maxStoredMembers` | number | Cap on the number of members whose full history is retained. |

The request takes priority over `analysisSettings.timeHistory` when both are provided.

### Response

```json
{
  "projectId": "project-001",
  "schemaVersion": "1.0.0",
  "analysisSummary": {
    "analysisType": "time_history",
    "status": "success",
    "startedAt": "2026-01-01T00:00:00Z",
    "finishedAt": "2026-01-01T00:00:01Z",
    "durationMs": 1000.0,
    "nodeCount": 2,
    "memberCount": 1,
    "loadCaseCount": 0,
    "totalDof": 12,
    "freeDof": 6,
    "constrainedDof": 6,
    "solver": "newmark_beta"
  },
  "timeHistoryResult": {},
  "warnings": [],
  "errors": []
}
```

### Errors

| Code | Description |
| --- | --- |
| `INVALID_TIME_STEP` | `timeStep <= 0` or `timeStep` larger than `T_min / 10`. |
| `INVALID_DURATION` | `duration <= 0`. |
| `GROUND_MOTION_NOT_FOUND` | `groundMotionId` does not match any record in `project.groundMotions`. |
| `DAMPING_MODEL_UNSUPPORTED` | `dampingModel` is not `"rayleigh"`. |
| `SINGULAR_K_EFF` | `K_eff` is singular; the model has unconstrained DOFs under the chosen excitation. |
| `SOLVER_ERROR` | The sparse solver failed during factorization or solve. |
| `INTEGRATION_DIVERGED` | The Newton-type residual did not converge (reserved for the nonlinear extension). |

## 9. Result Model

### `timeHistoryResult`

```ts
export type TimeHistoryResult = {
  resultId: string;
  groundMotionId: string;
  excitationDirection: "X" | "Y" | "Z";
  timeStep: number;
  duration: number;
  sampleCount: number;
  damping: {
    model: "rayleigh";
    alpha: number;
    beta: number;
    modalRatios: Array<{ modeNo: number; xi: number }>;
  };
  timeArray: number[];
  envelope: {
    displacements: NodeDisplacementEnvelope[];
    reactions: NodeReactionEnvelope[];
    memberEndForces: MemberEndForceEnvelope[];
  };
  histories: {
    storedNodeIds: string[];
    storedMemberIds: string[];
    displacements: Record<string, HistoryArray>;
    velocities: Record<string, HistoryArray>;
    accelerations: Record<string, HistoryArray>;
    reactions: Record<string, HistoryArray>;
    memberEndForces: Record<string, HistoryArray>;
  };
  warnings: string[];
};

export type HistoryArray = {
  component: string;
  values: number[];
  unit: string;
};

export type NodeDisplacementEnvelope = {
  nodeId: string;
  ux: { min: number; max: number; atTime: { min: number; max: number } };
  uy: { min: number; max: number; atTime: { min: number; max: number } };
  uz: { min: number; max: number; atTime: { min: number; max: number } };
  rx: { min: number; max: number; atTime: { min: number; max: number } };
  ry: { min: number; max: number; atTime: { min: number; max: number } };
  rz: { min: number; max: number; atTime: { min: number; max: number } };
};
```

### Output Components

| Component | Description |
| --- | --- |
| `displacement` | Six components per node: `ux, uy, uz, rx, ry, rz`. |
| `velocity` | Same six components per node. |
| `acceleration` | Same six components per node. |
| `reaction` | Six components per constrained node. |
| `memberForce` | Six components at the I-end and J-end of each member. |

The MVP includes the **envelope** in the main response and stores the full **histories** server-side for retrieval. The full history is fetched via `GET /api/analysis/time-history/{result_id}/history` with parameters for the node, member, and component.

### Envelope Definition

For a quantity `q(t)`, the envelope is:

```
q_max = max over t in [0, duration] of q(t)
q_min = min over t in [0, duration] of q(t)
atTime = the time at which the extreme is reached
```

`atTime` is reported in seconds from the start of the analysis.

## 10. UI Design

This section describes the conceptual layout only. No JSX or styling is specified.

### Analysis Settings Panel

The settings panel is integrated into the existing `PropertyPanel`. A new section **"Time History"** is added under `analysisSettings`. The fields are:

- Time step (`dt`)
- Duration (`T`)
- Excitation direction (`X / Y / Z`)
- Damping model selector (only `Rayleigh` in the MVP)
- Rayleigh `alpha` and `beta`
- Ground motion selector (dropdown of `project.groundMotions`)

The same panel is reused for the report and CSV export.

### Ground Motion Import Workflow

A new dialog imports a ground motion record. The MVP accepts:

- A two-column text file (`time`, `acceleration`).
- Inline paste of the same content.
- Predefined template records bundled with the project (out of scope for the MVP).

The dialog shows:

- A preview plot of the acceleration time history.
- A summary of `sampleCount`, `dt`, `duration`, `unit`.
- Validation messages for non-monotonic time, negative `dt`, or zero-length records.

The imported record is stored under `project.groundMotions` with a generated `id` and a user-supplied `name`.

### Result Visualization

The MVP adds two new tabs under the **Results** panel:

- **Time history** tab: shows the envelope table and, for a selected node or member, the corresponding time history plot.
- **Time history (compare)** tab: optional side-by-side comparison of two analyses with different `alpha` / `beta` or different ground motion records.

The plots use the existing 2D plotting module. The deformed shape at a specific time can be overlaid on the 3D viewer in a future extension.

### Existing Analysis Tabs

The existing **Static**, **Eigen**, **Response spectrum**, and **Influence line** tabs are unchanged.

## 11. CSV Export Design

The CSV export module is extended with a new file type: `time_history_envelope.csv`. This file contains the per-node and per-member envelope values:

```text
type,id,component,min,max,at_time_min,at_time_max,unit
node,N1,ux,..,..,..,..,m
node,N1,uy,..,..,..,..,m
...
member,M1,i_fx,..,..,..,..,kN
member,M1,j_fx,..,..,..,..,kN
...
reaction,B1,fx,..,..,..,..,kN
```

For full time histories, a second file `time_history_{nodeId_or_memberId}_{component}.csv` is generated per requested node, member, and component. The format is:

```text
time,value
0.00,0.0000
0.01,0.0012
...
```

Each history file is requested on demand from the history endpoint and bundled into a single ZIP archive.

## 12. PDF Report Design

The PDF report module adds a new chapter **"Time History Analysis"**. The chapter contains:

- Analysis summary (time step, duration, direction, damping, ground motion name).
- A ground motion preview plot.
- An envelope table for nodal displacements.
- An envelope table for support reactions.
- An envelope table for member end forces (I-end and J-end).
- An optional appendix with up to `N` selected time history plots.

`N` is configurable in the report settings. The default is 6. Plots are rendered server-side and embedded in the PDF.

The chapter appears in the table of contents alongside **Static Analysis**, **Eigenvalue Analysis**, and **Response Spectrum Analysis**. The chapter numbering follows the existing convention.

## 13. Verification Plan

The verification strategy combines analytical benchmarks, numerical checks, and regression tests.

### Single-Degree-of-Freedom Benchmark

A canonical SDOF oscillator with mass `m`, stiffness `k`, natural period `T_n = 2*pi*sqrt(m/k)`, and damping ratio `xi` is subjected to a known ground acceleration. The numerical response is compared against the analytical Duhamel integral or a closed-form solution for special inputs (free vibration, harmonic base excitation, impulsive base velocity).

Cases:

- Free vibration with zero damping.
- Free vibration with 5% damping.
- Harmonic base excitation at `T_n / 4`.
- Harmonic base excitation at `T_n`.

The Newmark-beta result is required to match the analytical solution to within `1e-6` relative error on displacement at the same time step.

### Multi-Degree-of-Freedom Benchmark

The two-span continuous beam from the existing benchmark suite is reused. The eigenvalue result is used to verify that the time history result matches the closed-form modal superposition for a small set of modes.

### Analytical Solution Comparison

For each verification case, the time history result is post-processed to compute:

- The maximum displacement, compared with the closed-form maximum.
- The period of the dominant response, compared with the smallest natural period from the eigenvalue analysis.
- The energy balance (kinetic + potential + dissipated), compared with the energy injected by the base excitation.

The relative error in energy balance must be below `1e-3` over the analysis duration.

### Numerical Stability Checks

The verification suite includes:

- A convergence test: halving `dt` must change the maximum displacement by less than `0.1%`.
- An ill-conditioning test: a near-singular `K` (one unconstrained DOF under base excitation) must be reported as `SINGULAR_K_EFF` without a crash.
- A long-duration test: a 60-second analysis with `dt = 0.001` must complete without numerical drift (final displacement within `1e-6` of the analytical rest state for free vibration).

### Regression Testing

The verification artifacts are checked in under `backend/tests/verification/`. Each artifact contains:

- The input model.
- The expected envelope (with a tolerance).
- The expected maximum and minimum times.
- A short report on the convergence and stability results.

Existing regression tests for static, eigen, and response spectrum are unchanged.

## 14. Future Nonlinear Extension

The MVP is a linear baseline. The architecture is designed so that the Newmark-beta step is the only place that needs to change to introduce material or geometric nonlinearity.

### Bilinear Springs

A future extension may add a `BilinearSpring` element that carries a yield force and a post-yield stiffness. The element exposes:

- A residual force vector `R(u)`.
- A tangent stiffness matrix `K_t(u)`.
- State variables (yielded, plastic displacement).

These elements participate in the Newmark step as additional internal forces and additional tangent terms. The Newmark-beta time-stepping interface (input: state, output: converged state) is preserved.

### Plastic Hinges

A future extension may add fiber-section beam elements that integrate plasticity across the section. The integration point state is updated by a return-mapping algorithm (e.g. radial return for J2 plasticity). The element returns its residual and tangent to the Newmark solver in the same way as the bilinear spring.

### Nonlinear Bearings

Nonlinear bearings (lead-rubber bearings, friction pendulum bearings) are modeled as zero-length elements with a nonlinear force-displacement law. They are integrated into the time step as additional internal forces.

### Newton-Raphson Iteration

The MVP uses a single linear solve per step because the system is linear. The future nonlinear extension uses an iterative Newton-Raphson scheme within each time step:

1. Initialize `u_{n+1}^0 = u_n`.
2. For iteration `k = 0, 1, ..., K_max`:
   a. Compute the residual `R(u_{n+1}^k) = F_eff_{n+1} - (M * u_ddot_{n+1}^k + C * u_dot_{n+1}^k + K * u_{n+1}^k)`.
   b. Compute the effective tangent `K_t = K + (gamma / (beta * dt)) * C + (1 / (beta * dt^2)) * M`.
   c. Solve `K_t * delta_u = R`.
   d. Update `u_{n+1}^{k+1} = u_{n+1}^k + delta_u`.
3. Stop when `|R|` is below a tolerance or `K_max` is reached.

The MVP step is the special case `K_max = 1` with linear `K_t`.

### Nonlinear Direct Integration

A future extension may replace Newmark-beta with the generalized-alpha method, the HHT-alpha method, or the Bathe composite method. The interface between the time-stepping module and the rest of the system is designed to allow this without changing the input or result schema.

### Architectural Sketch

```
TimeStepper
  - NewmarkBetaLinearStep     <- MVP
  - NewmarkBetaNewtonStep      <- future
  - GeneralizedAlphaStep       <- future
  - BatheCompositeStep         <- future
```

Each step consumes a `TimeStepperInput` (current state, current tangent, current residual) and produces a `TimeStepperOutput` (next state). The MVP implements only `NewmarkBetaLinearStep`.

## 15. Open Technical Questions

The following design issues are open and require further investigation before implementation:

1. **Time step size policy.** Should the time step be uniform throughout, or should the framework support sub-stepping for nonlinear elements added later? The MVP assumes a uniform step.
2. **Ground motion interpolation.** Linear interpolation in the time direction is assumed. Higher-order interpolation, especially near sharp peaks, is a future extension.
3. **Multi-direction excitation.** A single uniform excitation in one direction is assumed. The combination rule for multiple simultaneous directions (SRSS, 100-30-30) is a future extension.
4. **Multi-support excitation.** Spatial variation of the ground motion across supports is out of scope. Whether to support it through the same `r` vector or a per-support influence vector is an open question.
5. **Initial conditions.** The MVP assumes zero initial conditions. A future extension may support pre-analysis static preload, pre-stressed initial state, or a free-field initial displacement.
6. **Number of stored histories.** Capping the number of stored node and member histories is a pragmatic MVP choice. Whether to expose the cap to the user or auto-select the most active nodes and members is a UX question.
7. **Convergence tolerance for the future Newton step.** The MVP does not need a tolerance. A future extension will need a per-step and per-iteration tolerance. Whether to use energy norm, displacement norm, or force norm is open.
8. **Damping model selection.** Should the MVP expose modal damping in addition to Rayleigh, or wait for the nonlinear extension? The schema is designed to allow `dampingModel: "modal"` later, but the MVP uses `"rayleigh"` only.
9. **Mass matrix reuse.** The MVP reuses the mass matrix from the eigenvalue analysis. Whether the mass matrix can differ between eigenvalue and time history analyses (e.g. additional lumped mass on a tributary area) is an open question.
10. **Numerical precision.** Double precision is assumed. The effect of single precision on long-duration analyses is not yet characterized.
11. **Result storage policy.** The MVP stores full histories server-side. Whether to also store histories on the client, or only on demand, is a UX and storage question.
12. **Solver reuse.** The MVP reuses the sparse LU factorization of `K_eff` for every step. A future extension may need to refactorize when the tangent changes (nonlinearity). The interface is designed to support this.
13. **Report appendix size.** The PDF report appendix may include up to `N` time history plots. The choice of `N` and the selection rule (most active, first N, by node ID) is a UX question.
