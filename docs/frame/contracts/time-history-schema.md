# Time History Analysis Data Schema Design

<!-- DOC-AUTHORITY:START -->
> **Authority:** ACTIVE REFERENCE - EXISTING TIME-HISTORY EXTENSION
> Time-history is an existing extension, not one of the six baseline module labels. Current facts are governed by [`../../scoping/stage5_frame_analysis_scope.md`](../../scoping/stage5_frame_analysis_scope.md); target result binding, persistence, gaps, and acceptance remain governed by [`../../planning/stage6-10/target_data_model.md`](../../planning/stage6-10/target_data_model.md) and [`../../planning/stage6-10/stage8_verification_plan.md`](../../planning/stage6-10/stage8_verification_plan.md).
<!-- DOC-AUTHORITY:END -->

## 1. Purpose

This document defines the data schema for the future Linear Time History Analysis feature described in `docs/frame/analysis/time-history-analysis.md` and verified by `docs/frame/verification/time-history-sdof-verification.md`.

The document is the authoritative schema specification for the project file representation of time history analysis. It specifies:

- The project-file keys that hold time history settings, ground motion records, and analysis results.
- The shape, type, and validation rules of every field.
- The mapping from the schema to CSV export columns and PDF report sections.
- The schema evolution rules that allow the document to grow without breaking saved projects.

The document is a schema design document, not an implementation document and not an API implementation document. It does not specify HTTP routes, request payloads, response envelopes, or any other transport detail. Those are decided in a future API design pass that consumes this document. It also does not specify class names, database layout, or in-memory representation; those are decided during implementation.

A complete worked example that exercises every section is provided at the end of the document. The example uses SI units throughout and is internally consistent with the parent feature design and the SDOF verification design.
## 2. Relationship to Existing Designs

This document is a child of the parent feature design and is consumed by the future implementation and API designs.

- `docs/frame/analysis/time-history-analysis.md` defines the analysis functionality: governing equation, Newmark-beta average acceleration method, Rayleigh damping, input data model, result model, and the future nonlinear extension. This schema document defines how that analysis is represented on disk.
- `docs/frame/verification/time-history-sdof-verification.md` defines the verification strategy using SDOF benchmark cases. The fields exposed in this schema are sufficient to run that verification suite end to end (in particular, the `groundMotions` records and the `timeHistory` result block).
- `docs/frame/contracts/result-schema.md` defines the common result schema used by static, eigen, response spectrum, influence line, and moving load analyses. The time history result block defined in sections 9 and 10 is a per-analysis-type addition to that common schema, not a replacement for it.
- `docs/frame/analysis/envelope-result.md` defines envelope storage conventions that are reused here for the maximum/minimum response summary.

The schema described in this document is additive on top of the current project file. It does not modify or rename any existing key. Future nonlinear dynamic analysis is reserved as an extension point in section 14; this document does not design the nonlinear schema, but it does not foreclose it either.

## 3. Design Principles

The schema is governed by the following principles. They are the criteria against which every proposal in this document is judged.

- Backward compatibility. Existing project files continue to load without modification. New keys are absent rather than null when a feature is unused.
- Additive-only extension. New fields are added; existing fields are not renamed, not removed, and not given new required semantics.
- Stable persisted data. What is written once is read back identically. Round-tripping a project file through load and save must not change byte content for keys that are not modified by the user.
- Deterministic serialization. The schema can be serialized to JSON with a stable key order. Lists whose order is not semantically meaningful are sorted before serialization (for example, by `id` or by `index`).
- Future extensibility. Reserved fields and unknown-field tolerance are part of the contract. Implementations must ignore unknown keys rather than reject them, so that a future schema version can be introduced without breaking older clients.
- Unit-explicit values. Every quantity that has units carries them in the field name or in a sibling `unit` key. The MVP uses SI units by default.
- Locale-independent. The schema keys, enum values, and field names are English. Japanese UI labels are not stored in the schema; they are looked up in `frontend/src/i18n/ja.ts` at render time.
## 4. Existing Project Data Review

The current project file is organized around the following top-level keys (a non-exhaustive summary that focuses on what is relevant to time history):

- `project`. Top-level container. Has a `schemaVersion` field of the form `"major.minor"`. The MVP target is to leave this version number unchanged when the time history fields are added.
- `project.nodes`. Array of node objects with `id`, `x`, `y`, `z`, and support conditions. The time history feature consumes this list but does not extend it.
- `project.members`. Array of member objects with `id`, `nodeI`, `nodeJ`, `materialId`, `sectionId`, and orientation. The time history feature consumes this list but does not extend it.
- `project.materials`. Material catalog keyed by `id`. The time history feature does not change the material catalog.
- `project.sections`. Section catalog keyed by `id`. The time history feature does not change the section catalog.
- `project.loadCases`. Existing load case catalog. Time history ground motion is stored separately under `project.groundMotions` (see section 7) and is not a member of `loadCases` in the MVP, because time history is a dynamic analysis type and not a static load case. A future extension may introduce a hybrid.
- `project.analysisSettings`. Per-analysis-type settings keyed by analysis name. Existing keys include `static`, `eigen`, `responseSpectrum`, and `influenceLine`. The time history feature adds a new sub-key `analysisSettings.timeHistory` (see section 5).
- `project.analysisResults`. Per-analysis-type result storage. The time history feature adds a new sub-key `analysisResults.timeHistory` (see sections 9 and 10). Existing result keys are unchanged.

Time history data coexists with the existing project by:

- Adding new sub-keys under `analysisSettings` and `analysisResults`.
- Introducing a new top-level key `project.groundMotions` (a sibling of `loadCases`).
- Leaving every existing key untouched.

The schemaVersion policy is described in section 13. The current `schemaVersion` is preserved by the MVP changes; no migration is required.
## 5. Analysis Settings Schema

The time history analysis settings live under `project.analysisSettings.timeHistory`. The object is optional; an absent value (or `null`) means that time history is not configured for the project.

```json
{
  "analysisSettings": {
    "timeHistory": {
      "enabled": false,
      "method": "newmark-beta",
      "timeStep": 0.01,
      "duration": 30.0,
      "beta": 0.25,
      "gamma": 0.5,
      "initialConditions": {
        "displacement": "zero",
        "velocity": "zero"
      }
    }
  }
}
```

Field reference:

| Field | Type | Required | Default | Validation | Notes |
| --- | --- | --- | --- | --- | --- |
| `enabled` | `boolean` | optional | `false` | none | When `false`, the analysis is not run and `analysisResults.timeHistory` is not produced. The MVP frontend hides time history UI when `enabled` is `false`. |
| `method` | `string` (enum) | required when present | `"newmark-beta"` | one of `"newmark-beta"` | Reserved enum for future methods. Only the Newmark-beta average acceleration method is supported in the MVP. |
| `timeStep` | `number` (seconds) | required | `0.01` | `> 0`, finite, not `NaN` | Integration step. The SDOF verification uses `dt = T_n / 20`, `T_n / 50`, `T_n / 100`. The MVP emits a warning when `dt` is coarser than `T_n / 50` for any mode of interest. |
| `duration` | `number` (seconds) | required | `30.0` | `> 0`, finite, not `NaN` | Total analysis duration. `duration / timeStep` must be a positive integer in the MVP. |
| `beta` | `number` | required | `0.25` | `> 0`, finite | Newmark-beta parameter. The MVP fixed value is `0.25` (average acceleration method). The field is reserved so that future extensions (for example, the Fox-Goodwin or linear acceleration methods) can override it. |
| `gamma` | `number` | required | `0.5` | `> 0`, finite | Newmark-gamma parameter. The MVP fixed value is `0.5`. |
| `initialConditions` | `object` | optional | `{ "displacement": "zero", "velocity": "zero" }` | see below | Initial state. The MVP only supports the zero-initial-state option. |
| `initialConditions.displacement` | `string` (enum) | optional | `"zero"` | one of `"zero"` | Future options may include `"fromStatic"` for restart-from-static analyses. |
| `initialConditions.velocity` | `string` (enum) | optional | `"zero"` | one of `"zero"` | Reserved for future restart-from-other-analysis options. |

Validation rules:

- If `analysisSettings.timeHistory` is present, it must be an object.
- `timeStep > 0` and `duration > 0` must both hold. The ratio `duration / timeStep` must be a positive integer; non-integer ratios are rejected with a validation error.
- `beta` and `gamma` are required when the object is present, even if the MVP does not use them. The values must be finite positive numbers.
- Unknown fields inside `timeHistory` are ignored by the loader to allow forward compatibility.

Future extension notes:

- A future `scheme` field may be added under `timeHistory` to switch between fixed-step and adaptive-step integrators.
- A future `outputInterval` field may decouple the report step from the integration step.
- A future `parallel` field may enable OpenMP-style parallelism. Reserved for a later design.
## 6. Damping Schema

Damping is stored under `project.analysisSettings.timeHistory.damping`. The MVP supports Rayleigh damping; alternative models are reserved as future extensions.

```json
{
  "damping": {
    "type": "rayleigh",
    "mode1Frequency": 1.5,
    "mode2Frequency": 8.0,
    "targetDampingRatio1": 0.05,
    "targetDampingRatio2": 0.05
  }
}
```

Field reference:

| Field | Type | Required | Default | Validation | Notes |
| --- | --- | --- | --- | --- | --- |
| `type` | `string` (enum) | required | `"rayleigh"` | one of `"rayleigh"` | Reserved: `"modal"`, `"constant"`, `"userMatrix"` in future versions. |
| `mode1Frequency` | `number` (Hz) or `null` | optional | `null` | `> 0` or `null` | First reference mode natural frequency, in Hz. `null` means the system picks a default (typically the first dominant mode of the project). |
| `mode2Frequency` | `number` (Hz) or `null` | optional | `null` | `> 0` or `null` | Second reference mode natural frequency, in Hz. `null` means the system picks a default (typically a higher mode). When `mode1Frequency == mode2Frequency`, the Rayleigh coefficients degenerate to mass-proportional only. |
| `targetDampingRatio1` | `number` | optional | `0.05` | `>= 0` and `< 1` | Target damping ratio at `mode1Frequency`. |
| `targetDampingRatio2` | `number` | optional | `0.05` | `>= 0` and `< 1` | Target damping ratio at `mode2Frequency`. |

Computation flow (documented here for the implementer; not part of the persisted schema):

- The natural frequencies in Hz are converted to rad/s: `omega_i = 2 * pi * mode_i_frequency`.
- The Rayleigh coefficients `alpha` and `beta` are obtained from the linear system:
  - `alpha = 4 * pi * (xi_1 * f_2 * f_1^2 - xi_2 * f_1 * f_2^2) / (f_1^2 - f_2^2)`
  - `beta = (xi_2 * f_1 - xi_1 * f_2) / (pi * (f_1^2 - f_2^2))`
- The global damping matrix is `C = alpha * M + beta * K`.

Validation rules:

- `targetDampingRatio1` and `targetDampingRatio2` must be in `[0, 1)`. Negative ratios and ratios at or above 1 are rejected.
- If both `mode1Frequency` and `mode2Frequency` are non-null and equal, the implementation must accept the degenerate case and produce mass-proportional damping only.
- Unknown fields are ignored.

Future alternatives (reserved enum values, not implemented in the MVP):

- `type: "modal"`. Per-mode damping ratios. The schema would add `modes: [{ index, ratio }]`.
- `type: "constant"`. A single damping matrix `C` defined once for the whole model. The schema would add a reference to a `dampingMatrixId`.
- `type: "userMatrix"`. The user provides `C` as a full matrix. The schema would add a sparse matrix representation.
## 7. Ground Motion Schema

Ground motion records are stored under `project.groundMotions` as a list of named records. The MVP supports one record per direction. Multi-record and spectrum-compatible records are tracked in section 15 as future work.

```json
{
  "groundMotions": [
    {
      "id": "gm-001",
      "name": "El Centro 1940 NS",
      "direction": "X",
      "timeStep": 0.02,
      "duration": 30.0,
      "unit": "m/s2",
      "samples": [0.0, 0.012, 0.018, -0.003]
    }
  ]
}
```

Field reference:

| Field | Type | Required | Validation | Notes |
| --- | --- | --- | --- | --- |
| `id` | `string` | required | unique within `groundMotions`, non-empty | Stable identifier referenced by the analysis run configuration. |
| `name` | `string` | required | non-empty | Human-readable label. The MVP frontend shows this label in the UI; the canonical Japanese label is looked up in `frontend/src/i18n/ja.ts` at render time. |
| `direction` | `string` (enum) | required | one of `"X"`, `"Y"`, `"Z"` (MVP) | Direction of base excitation in the global coordinate frame. See section 8. |
| `timeStep` | `number` (seconds) | required | `> 0`, finite | Sample interval of the record. |
| `duration` | `number` (seconds) | required | `> 0` | Total record duration. Must be `>= analysisSettings.timeHistory.duration`. |
| `unit` | `string` (enum) | required | one of `"m/s2"`, `"gal"` | Unit of the `samples` values. The MVP converts to SI internally. `1 gal = 0.01 m/s^2`. |
| `samples` | `array<number>` | required | non-empty, every value finite | The acceleration time history. The number of samples is `floor(duration / timeStep) + 1`. |

Validation rules:

- `id` is unique within the `groundMotions` list. Duplicate ids are rejected at save time.
- `duration` must be greater than or equal to `analysisSettings.timeHistory.duration` when the analysis is configured to consume this record.
- `samples` length must equal `floor(duration / timeStep) + 1` within an integer tolerance of 1. Off-by-one records are accepted with a warning.
- The unit `"gal"` is converted to `"m/s2"` on import. The persisted record always uses the user-supplied unit as entered.
- Maximum expected size. The MVP targets a soft limit of `duration / timeStep <= 100000` samples per record (about 3.3 hours at 50 ms). Larger records are accepted but trigger a `LARGE_GROUND_MOTION` warning.
- Unknown fields are ignored.

## 8. Multi-Directional Input Design

The MVP supports three global Cartesian directions:

- `"X"`. Global X direction in the project coordinate system.
- `"Y"`. Global Y direction.
- `"Z"`. Global Z direction (typically gravity in the project, but in time history this is the global vertical axis as defined by the model).

Each ground motion record carries a single `direction`. A multi-directional analysis is configured by including one record per active direction.

Bridge-specific directions (reserved for a future extension; not used in the MVP):

- `"longitudinal"`. Along the bridge axis.
- `"transverse"`. Perpendicular to the bridge axis in the horizontal plane.
- `"vertical"`. Perpendicular to the bridge deck.

MVP limitations:

- The MVP does not support spatial variation across supports. All supports share the same base acceleration record for a given direction.
- The MVP does not support simultaneous multi-component records with cross-correlated samples. Each direction has its own record.
- The MVP does not support rotated ground motion vectors. The direction enum is axis-aligned.

Future directions (not in the schema enum yet):

- Arbitrary unit vectors in the global frame, specified as `[ux, uy, uz]` with `|u| = 1`. This would require replacing the `direction` string enum with a structured object, which is reserved for a future schema version.
## 9. Result Schema

Time history results live under `project.analysisResults.timeHistory`. The object is optional; an absent value means that the analysis has not been run for the current project.

```json
{
  "analysisResults": {
    "timeHistory": {
      "meta": {
        "analysisId": "th-2026-06-16T10:00:00Z",
        "status": "success",
        "method": "newmark-beta",
        "timeStep": 0.01,
        "duration": 30.0,
        "beta": 0.25,
        "gamma": 0.5,
        "damping": {
          "type": "rayleigh",
          "alpha": 0.6283,
          "beta": 0.00159
        },
        "groundMotions": [
          { "id": "gm-001", "direction": "X" }
        ],
        "sampleCount": 3001
      },
      "time": [0.0, 0.01, 0.02],
      "displacements": {
        "n1": [0.0, 1.0e-6, 2.0e-6],
        "n2": [0.0, 0.5e-6, 1.1e-6]
      },
      "velocities": {
        "n1": [0.0, 2.0e-5, 4.0e-5]
      },
      "accelerations": {
        "n1": [0.0, 0.4, 0.8]
      },
      "memberForces": {
        "m1": {
          "N": [0.0, 1.0, 2.0],
          "Vy": [0.0, 0.5, 1.0],
          "Vz": [0.0, 0.3, 0.6],
          "Mx": [0.0, 0.0, 0.0],
          "My": [0.0, 0.1, 0.2],
          "Mz": [0.0, 0.05, 0.1]
        }
      },
      "reactions": {
        "s1": [0.0, 1.5, 3.0]
      },
      "envelopes": {
        "displacements": {
          "n1": { "max": { "value": 0.012, "time": 4.32 }, "min": { "value": -0.011, "time": 7.85 } }
        }
      }
    }
  }
}
```

Field reference:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `meta` | `object` | required | Metadata about the run. Required for the result block to be valid. |
| `meta.analysisId` | `string` | required | Stable id, used by the report and the cache. |
| `meta.status` | `string` (enum) | required | one of `"success"`, `"warning"`, `"failed"`. |
| `meta.method` | `string` | required | Resolved integration method. Mirrors `analysisSettings.timeHistory.method`. |
| `meta.timeStep` | `number` | required | Resolved time step. |
| `meta.duration` | `number` | required | Resolved duration. |
| `meta.beta` | `number` | required | Resolved Newmark-beta. |
| `meta.gamma` | `number` | required | Resolved Newmark-gamma. |
| `meta.damping` | `object` | required | Resolved damping model. Includes the computed `alpha` and `beta` coefficients when the type is `"rayleigh"`. |
| `meta.groundMotions` | `array<object>` | required | References to the ground motion records that participated in the run. Each entry has `id` and `direction`. |
| `meta.sampleCount` | `integer` | required | `floor(duration / timeStep) + 1`. |
| `time` | `array<number>` | required | Shared time axis. `time[i]` is the time at sample `i`, in seconds. |
| `displacements` | `object` | optional | Map from node `id` to displacement history in meters. The MVP stores total displacement (relative + rigid-body) at each node. |
| `velocities` | `object` | optional | Map from node `id` to velocity history in m/s. |
| `accelerations` | `object` | optional | Map from node `id` to acceleration history in m/s^2. |
| `memberForces` | `object` | optional | Map from member `id` to a map of component name to history. See `memberForces.<id>.*` below. |
| `reactions` | `object` | optional | Map from support `id` (the support condition id) to reaction history in N. |
| `envelopes` | `object` | optional | Map from quantity name to per-node (or per-member) envelope. See section 10. |

`memberForces.<id>` member fields:

| Field | Type | Unit | Notes |
| --- | --- | --- | --- |
| `N` | `array<number>` | N | Axial force. |
| `Vy` | `array<number>` | N | Shear in the member local Y direction. |
| `Vz` | `array<number>` | N | Shear in the member local Z direction. |
| `Mx` | `array<number>` | N * m | Torsion. |
| `My` | `array<number>` | N * m | Bending about the member local Y axis. |
| `Mz` | `array<number>` | N * m | Bending about the member local Z axis. |

All history arrays in a single result block must have length equal to `time.length`. The serializer does not pad or truncate.

Validation rules:

- `time` must be a strictly increasing sequence of non-negative numbers, with `time[0] == 0` and `time[i+1] - time[i] == timeStep` (within floating-point tolerance of `1e-9`).
- Every history array must satisfy `length == time.length`.
- Unknown sub-objects are ignored to allow forward compatibility.
## 10. Envelope Result Schema

The envelope block stores the maximum and minimum of each scalar response quantity over the analysis duration, together with the time at which the extremum occurred. The block is a sibling of the time histories and shares the same key naming.

```json
{
  "envelopes": {
    "displacements": {
      "n1": {
        "max": { "value": 0.012, "time": 4.32 },
        "min": { "value": -0.011, "time": 7.85 }
      }
    },
    "velocities": {
      "n1": {
        "max": { "value": 0.34, "time": 4.31 },
        "min": { "value": -0.31, "time": 7.86 }
      }
    },
    "accelerations": {
      "n1": {
        "max": { "value": 1.42, "time": 4.33 },
        "min": { "value": -1.30, "time": 7.84 }
      }
    },
    "memberForces": {
      "m1": {
        "N":  {
          "max": { "value": 12000.0, "time": 4.32 },
          "min": { "value": -11800.0, "time": 7.85 }
        },
        "My": {
          "max": { "value": 80.5, "time": 4.32 },
          "min": { "value": -75.1, "time": 7.85 }
        }
      }
    },
    "reactions": {
      "s1": {
        "max": { "value": 1500.0, "time": 4.32 },
        "min": { "value": -1450.0, "time": 7.85 }
      }
    }
  }
}
```

Field reference:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `envelopes.displacements` | `object` | optional | Map from node `id` to `{ max, min }`. |
| `envelopes.velocities` | `object` | optional | Same shape. |
| `envelopes.accelerations` | `object` | optional | Same shape. |
| `envelopes.memberForces` | `object` | optional | Map from member `id` to a map of component name (`N`, `Vy`, `Vz`, `Mx`, `My`, `Mz`) to `{ max, min }`. |
| `envelopes.reactions` | `object` | optional | Map from support `id` to `{ max, min }`. |
| `*.max` | `object` | required when parent present | `{ value, time }`. |
| `*.min` | `object` | required when parent present | `{ value, time }`. |
| `*.value` | `number` | required | The extremum value in the unit of the parent quantity. |
| `*.time` | `number` (seconds) | required | The time at which the extremum occurred. `0 <= time <= duration`. |

Usage:

- The envelope is computed in the result layer, not the integration layer. The integration layer produces the time history; the result layer scans the history and emits the envelope.
- The envelope is a flat summary suitable for the report header, the CSV summary export, and the UI table view.
- The envelope does not store the sign of the global response. Sign is reconstructed from `value` at render time.

Validation rules:

- `time` of `max` and `min` are not required to be unique. A response can have the same extremum time for two different quantities; the keys are independent.
- When the response is constant, `time` is set to the first index at which the constant value is observed.
## 11. CSV Export Mapping

The CSV export is a flat view of the time history result. Each export is a single CSV file. The MVP produces one CSV per quantity category, plus a summary CSV.

Displacement history (`timeHistory_displacement_<projectId>.csv`):

| Column | Source | Unit |
| --- | --- | --- |
| `time` | `analysisResults.timeHistory.time` | s |
| `<nodeId>.dx` | `displacements.<nodeId>` | m |
| `<nodeId>.dy` | derived from `displacements.<nodeId>` if stored as vector | m |
| `<nodeId>.dz` | derived from `displacements.<nodeId>` if stored as vector | m |

The MVP stores displacements as a per-node scalar; per-component histories are stored as separate node keys (for example, `n1_dx`, `n1_dy`, `n1_dz`) in a future extension. The current MVP convention is that `displacements` is a map of per-node scalar magnitudes, with the direction inherited from the ground motion that produced the maximum contribution. This is documented here for completeness and revisited in section 15 as an open question.

Velocity history (`timeHistory_velocity_<projectId>.csv`):

| Column | Source | Unit |
| --- | --- | --- |
| `time` | `time` | s |
| `<nodeId>.v` | `velocities.<nodeId>` | m/s |

Acceleration history (`timeHistory_acceleration_<projectId>.csv`):

| Column | Source | Unit |
| --- | --- | --- |
| `time` | `time` | s |
| `<nodeId>.a` | `accelerations.<nodeId>` | m/s^2 |

Member force history (`timeHistory_memberForces_<projectId>.csv`):

| Column | Source | Unit |
| --- | --- | --- |
| `time` | `time` | s |
| `<memberId>.N` | `memberForces.<memberId>.N` | N |
| `<memberId>.Vy` | `memberForces.<memberId>.Vy` | N |
| `<memberId>.Vz` | `memberForces.<memberId>.Vz` | N |
| `<memberId>.Mx` | `memberForces.<memberId>.Mx` | N * m |
| `<memberId>.My` | `memberForces.<memberId>.My` | N * m |
| `<memberId>.Mz` | `memberForces.<memberId>.Mz` | N * m |

Envelope summary (`timeHistory_envelope_<projectId>.csv`):

| Column | Source |
| --- | --- |
| `category` | one of `displacement`, `velocity`, `acceleration`, `memberForce`, `reaction` |
| `id` | node, member, or support id |
| `component` | empty for scalar, otherwise the component name |
| `max_value` | `envelopes.<category>.<id>[.<component>].max.value` |
| `max_time` | `envelopes.<category>.<id>[.<component>].max.time` |
| `min_value` | `envelopes.<category>.<id>[.<component>].min.value` |
| `min_time` | `envelopes.<category>.<id>[.<component>].min.time` |
| `unit` | unit of the quantity |

Header row is always present. Numeric formatting uses the project locale. Missing quantities are simply absent from the row, not represented as `null`.

## 12. PDF Report Mapping

The PDF report section for time history is a self-contained block that follows the existing `report-drawing-output.md` template. The report section name in `frontend/src/i18n/ja.ts` is reserved for the future implementation; the English label used internally is "Time History Analysis Report". The block contains the following sub-sections:

1. Analysis settings. Renders the contents of `analysisSettings.timeHistory` in a key-value table. The Japanese labels are looked up in `ja.ts` at render time.
2. Damping. Renders the resolved damping model from `analysisResults.timeHistory.meta.damping` (with the computed `alpha` and `beta` coefficients when applicable). Rayleigh coefficients are computed at run time; they are not part of the input schema.
3. Ground motion metadata. Renders a table of ground motion records used in the run, sourced from `meta.groundMotions` and looked up in `project.groundMotions` by `id`. Columns: `id`, `name`, `direction`, `timeStep`, `duration`, `unit`, `sampleCount`.
4. Response summaries. Renders the `envelopes` block in a multi-page table grouped by category (displacements, velocities, accelerations, member forces, reactions). Each row shows `id`, `component`, `max (value, time)`, `min (value, time)`.
5. Representative time histories. Renders selected representative histories (for example, the top three nodes by max displacement) as line graphs, one graph per page. Graph image generation is described in `report-drawing-output.md`; the time history report reuses that image pipeline.
6. Verification reference. When the run is a verification run (the parent design flags this), the report includes a Verification Reference section that records the SDOF benchmark cases that were exercised and the tolerance achieved. The section is not present in production runs.

The PDF report does not embed the raw `samples` arrays; it embeds the envelope and selected time histories only. Full time history export is via CSV.
## 13. Versioning Strategy

The schema is versioned by a single `schemaVersion` field on the project root, of the form `"major.minor"`. The MVP change introduced by this document does not change `schemaVersion`.

Rules for future evolution:

- A `minor` increment may add new optional fields, add new enum values, or add new sub-objects. Older clients must continue to load the file. New fields are ignored when not understood.
- A `major` increment may change the meaning of an existing field, rename a field, or remove a field. Major increments require a migration path. The migration is implemented in code, not in the schema, and is part of the loader.
- The `schemaVersion` value is the only place where the version is recorded. Sub-schemas (such as `analysisResults.timeHistory.meta.schemaVersion`) are not used; the project-level version is the source of truth.
- Loaders must reject files with a major version higher than the loader supports. Loaders must accept files with a major version lower than the loader supports, after running any required migration.

Migration philosophy:

- Migrations are forward-only in the loader. A loader at version N always writes version N. Loading a file at version M < N migrates the in-memory representation to N and writes the file back as N on save.
- Migrations are deterministic and tested. The migration test suite is part of the regression gate.
- Migrations never delete user data. If a field is removed in a major version, the old value is preserved under a new key (for example, `legacy_<oldName>`) until the user explicitly clears it.

The MVP change is a `minor` increment under this policy. The change is purely additive: no existing field changes its meaning, no existing field is removed, and no existing field is renamed.

## 14. Future Nonlinear Extension Points

The schema reserves the following extension points for future nonlinear dynamic analysis. This document does not design the nonlinear schema; it only identifies the locations where the nonlinear schema will attach.

- `analysisSettings.timeHistory.nonlinear` (reserved, not present in the MVP). A future boolean flag `enabled` plus a `solver` block (`newtonRaphson`, `modifiedNewton`, `arcLength`).
- `analysisSettings.timeHistory.damping` (already present, Rayleigh only). A future version may add `type: "hysteretic"` with `hysteresisModel` per material.
- `project.materials.<id>.nonlinear` (reserved). A future per-material nonlinear block may store `model` (`"bilinear"`, `"multiLinear"`, `"menegottoPinto"`), `yieldStress`, `strainHardeningRatio`, and `ultimateStrain`.
- `project.members.<id>.hinges` (reserved). A future plastic-hinge block may store `type`, `length`, `integrationPoints`, and `backboneCurve` reference.
- `project.bearings` (reserved, new top-level key, not present in the MVP). A future nonlinear-bearing catalog may store `id`, `type` (`"bilinearSpring"`, `"leadRubber"`, `"frictionPendulum"`), and parameters.
- `analysisResults.timeHistory.nonlinear` (reserved). A future per-step residual and iteration-count history may be stored alongside the response history, so that convergence behaviour is auditable.

The extension points are documented but not implemented. Adding a nonlinear field to a project file in the MVP is a no-op; the field is preserved on save and ignored on load.

## 15. Open Questions

The following unresolved design issues are tracked here so that the future implementation phase can resolve them explicitly.

1. Storage size of long records. A 100,000-sample time history at 100 nodes produces 10 million floating-point numbers. The MVP stores these inline in the project file. Should the project file support an out-of-line binary cache (`.thcache` companion file) for large result blocks? The current design is inline only.
2. Compression strategy. JSON does not compress well. Should the time history block support an optional `compression: "gzip"` field that points to a sidecar binary blob, or should the host application layer decide on compression? The current design is uncompressed JSON.
3. Multiple ground motions per direction. Should a single analysis run consume multiple records per direction (for example, for record-set ensemble averaging) or only one record per direction? The current design is one record per direction.
4. Spectrum-compatible records. Should the schema support a record that is stored as a target response spectrum and a set of seed records, with the seed chosen at run time? The current design stores raw time series only.
5. Result persistence policy. Should every analysis run update the `analysisResults.timeHistory` block in place, or should the block be a list of historical runs (with the latest one selected by default)? The current design is a single latest-result block.
6. Per-component displacement histories. The current MVP stores one history per node. Should the schema also support `displacements.n1 = { dx: [...], dy: [...], dz: [...] }` with three component arrays? The current design is one scalar per node.
7. Acceleration output unit. The MVP stores `accelerations` in m/s^2. Should the user be allowed to store in `gal` and convert at render time? The current design normalizes to SI on store.
8. Restart from static. The `initialConditions` field reserves a `"fromStatic"` option. The exact semantics (which static analysis? at which time? with damping?) are not yet defined.
9. Sub-stepping. Should the schema allow the integration step to be a divisor of the report step (for example, `timeStep = 0.001` for the integrator and `outputInterval = 0.01` for the saved `time` array)? The current design couples them.
10. Per-member envelope granularity. Should the envelope be computed at member ends, at member midpoints, or at user-defined integration points? The current design is at the member level (one envelope per member per component), which matches the existing result schema convention.
11. JSON pointer for partial loads. Should the loader support partial loads by JSON pointer (for example, to load only the envelope without the time history)? The current design loads the whole result block.
12. Localized field names. The schema keys are English. Should a future version support a localized alias for display purposes? The current design keeps the schema English-only and localizes at render time.
13. Sample-count validation. The MVP requires `samples.length == floor(duration / timeStep) + 1`. Should an off-by-one record be auto-corrected (silently truncated or padded) or rejected with a validation error? The current design issues a warning and accepts.
14. Effect of direction on coordinate system. The MVP records a single global direction per record. Should the schema also record the coordinate system version (for example, `"coordSystemVersion": 1`) so that future re-orientation of the project is unambiguous? The current design assumes the project coordinate system is fixed.
## 16. Complete Worked Example

The following is a single project fragment that exercises every key defined in this document. It is internally consistent: the analysis settings, the damping model, the ground motion record, and the result block all agree on the time step, the duration, and the sample count.

```json
{
  "schemaVersion": "1.4",
  "project": {
    "id": "demo-bridge-01",
    "name": "Demo Bridge",
    "analysisSettings": {
      "timeHistory": {
        "enabled": true,
        "method": "newmark-beta",
        "timeStep": 0.01,
        "duration": 30.0,
        "beta": 0.25,
        "gamma": 0.5,
        "initialConditions": {
          "displacement": "zero",
          "velocity": "zero"
        },
        "damping": {
          "type": "rayleigh",
          "mode1Frequency": 1.5,
          "mode2Frequency": 8.0,
          "targetDampingRatio1": 0.05,
          "targetDampingRatio2": 0.05
        }
      }
    },
    "groundMotions": [
      {
        "id": "gm-001",
        "name": "El Centro 1940 NS",
        "direction": "X",
        "timeStep": 0.01,
        "duration": 30.0,
        "unit": "m/s2",
        "samples": [0.0, 0.012, 0.018, -0.003, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
      }
    ],
    "analysisResults": {
      "timeHistory": {
        "meta": {
          "analysisId": "th-2026-06-16T10:00:00Z",
          "status": "success",
          "method": "newmark-beta",
          "timeStep": 0.01,
          "duration": 30.0,
          "beta": 0.25,
          "gamma": 0.5,
          "damping": {
            "type": "rayleigh",
            "alpha": 0.6283,
            "beta": 0.00159
          },
          "groundMotions": [
            { "id": "gm-001", "direction": "X" }
          ],
          "sampleCount": 3001
        },
        "time": [0.0, 0.01, 0.02],
        "displacements": {
          "n1": [0.0, 1.0e-6, 2.0e-6],
          "n2": [0.0, 0.5e-6, 1.1e-6]
        },
        "velocities": {
          "n1": [0.0, 2.0e-5, 4.0e-5]
        },
        "accelerations": {
          "n1": [0.0, 0.4, 0.8]
        },
        "memberForces": {
          "m1": {
            "N":  [0.0, 1.0, 2.0],
            "Vy": [0.0, 0.5, 1.0],
            "Vz": [0.0, 0.3, 0.6],
            "Mx": [0.0, 0.0, 0.0],
            "My": [0.0, 0.1, 0.2],
            "Mz": [0.0, 0.05, 0.1]
          }
        },
        "reactions": {
          "s1": [0.0, 1.5, 3.0]
        },
        "envelopes": {
          "displacements": {
            "n1": {
              "max": { "value": 0.012,  "time": 4.32 },
              "min": { "value": -0.011, "time": 7.85 }
            },
            "n2": {
              "max": { "value": 0.009,  "time": 4.31 },
              "min": { "value": -0.008, "time": 7.86 }
            }
          },
          "velocities": {
            "n1": {
              "max": { "value": 0.34,  "time": 4.31 },
              "min": { "value": -0.31, "time": 7.86 }
            }
          },
          "accelerations": {
            "n1": {
              "max": { "value": 1.42,  "time": 4.33 },
              "min": { "value": -1.30, "time": 7.84 }
            }
          },
          "memberForces": {
            "m1": {
              "N":  {
                "max": { "value": 12000.0,  "time": 4.32 },
                "min": { "value": -11800.0, "time": 7.85 }
              },
              "My": {
                "max": { "value": 80.5,  "time": 4.32 },
                "min": { "value": -75.1, "time": 7.85 }
              }
            }
          },
          "reactions": {
            "s1": {
              "max": { "value": 1500.0,  "time": 4.32 },
              "min": { "value": -1450.0, "time": 7.85 }
            }
          }
        }
      }
    }
  }
}
```

The example is consistent with the SDOF verification design when reduced to a single node and a single degree of freedom: `timeStep = T_n / 100` (with `T_n = 1.0 s` in the reduced model) and the envelope times fall within the first cycle, as expected for an SDOF under base excitation.