# Linear Time History Analysis API Contract (TH-5c)

## 1. Purpose

This document freezes the HTTP response contract of the
`/api/analysis/time-history` endpoint added in TH-5a. The contract is
the single source of truth for the UI implementation that follows.
Anything not described here is implementation detail and may change
without notice.

The contract is enforced at runtime by
`backend.engine.time_history_analysis._assert_envelope_contract` and at
test time by the contract validation tests in
`backend/tests/test_time_history_api.py`.

## 2. Endpoint

| Method | Path                          | Content-Type       |
| ------ | ----------------------------- | ------------------ |
| POST   | `/api/analysis/time-history`  | `application/json` |

The endpoint accepts a single JSON object. The handler delegates to
`backend.engine.run_time_history_analysis` and wraps the result in
`safe_json_response({"result": ...})`. The HTTP status is always `200`;
failures are reported inside the envelope.

## 3. Request Shape

```jsonc
{
  "project": {
    // The full project payload. The MVP only inspects the
    // analysisSettings.timeHistory, groundMotions, and massCases
    // blocks; the rest is round-tripped to the engine unchanged.
  }
}
```

The handler also accepts an optional per-call override block, which is
merged on top of `analysisSettings.timeHistory`:

```jsonc
{
  "project": { /* ... */ },
  // optional overrides (e.g. analysisId):
  "analysisId": "user-supplied-id"
}
```

## 4. Response Shape (Success)

The success envelope is a JSON object with the **frozen** top-level
key set below. Adding, removing, or renaming a key is a breaking
change.

```jsonc
{
  "projectId": "th-5a-sdof",
  "schemaVersion": "1.0.0",
  "analysisSummary": {
    "analysisType": "time_history",
    "status": "success",
    "startedAt": "2026-06-17T01:13:02.542082Z",
    "finishedAt": "2026-06-17T01:13:02.544183Z",
    "durationMs": 2.101,
    "nodeCount": 2,
    "memberCount": 1,
    "loadCaseCount": 1,
    "totalDof": 12,
    "freeDof": 1,
    "constrainedDof": 11,
    "solver": "newmark_beta"
  },
  "displacements": [],
  "reactions": [],
  "memberEndForces": [],
  "warnings": [],
  "errors": [],
  "timeHistoryResult": {
    "meta": { /* see Section 5 */ },
    "time": [0.0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5],
    "displacements": { "N2": [0.0, -1.4e-7, /* ... */] },
    "velocities":     { "N2": [0.0, -5.7e-6, /* ... */] },
    "accelerations":  { "N2": [-0.0, -0.0,  /* ... */] }
  }
}
```

Top-level keys (frozen, exact set):

| Key                | Type                       | Notes                                        |
| ------------------ | -------------------------- | -------------------------------------------- |
| `projectId`        | `string`                   | Mirror of `project.id`.                      |
| `schemaVersion`    | `string`                   | `"1.0.0"`.                                   |
| `analysisSummary`  | `object`                   | See `analysisSummary` table below.           |
| `displacements`    | `array` (MVP: empty)       | Reserved; populated in a future task.       |
| `reactions`        | `array` (MVP: empty)       | Reserved; populated in a future task.       |
| `memberEndForces`  | `array` (MVP: empty)       | Reserved; populated in a future task.       |
| `warnings`         | `array`                    | Empty array on success.                      |
| `errors`           | `array`                    | Empty array on success.                      |
| `timeHistoryResult`| `object \| null`           | `null` on failure. See Section 5.            |

`analysisSummary` keys (frozen, exact set):

| Key               | Type     | Notes                                          |
| ----------------- | -------- | ---------------------------------------------- |
| `analysisType`    | `string` | Always `"time_history"`.                       |
| `status`          | `string` | `"success"` \| `"warning"` \| `"failed"`.      |
| `startedAt`       | `string` | ISO-8601 timestamp.                            |
| `finishedAt`      | `string` | ISO-8601 timestamp.                            |
| `durationMs`      | `number` | Wall-clock duration in milliseconds.           |
| `nodeCount`       | `number` | Number of nodes in the parsed model.           |
| `memberCount`     | `number` | Number of members in the parsed model.         |
| `loadCaseCount`   | `number` | Number of load cases in the parsed model.      |
| `totalDof`        | `number` | Total DOF count (DOF map).                     |
| `freeDof`         | `number` | Unconstrained DOF count.                       |
| `constrainedDof`  | `number` | Constrained DOF count.                         |
| `solver`          | `string` | Always `"newmark_beta"`.                       |

## 5. `timeHistoryResult` Block

The result block is the MVP shape of the persisted
`analysisResults.timeHistory` block (see `result-schema.md`). The block
is the same object that the TH-4 loader (`parse_time_history_result`)
accepts, so UI consumers can persist the result without translation.

### 5.1 Top-level Keys (Frozen)

| Key             | Type    | Notes                                                |
| --------------- | ------- | ---------------------------------------------------- |
| `meta`          | `object`| Required. See Section 5.2.                           |
| `time`          | `array<number>` | Required. Length == `meta.sampleCount`.     |
| `displacements` | `object<string, array<number>>` | Required (may be `{}`).       |
| `velocities`    | `object<string, array<number>>` | Required (may be `{}`).       |
| `accelerations` | `object<string, array<number>>` | Required (may be `{}`).       |

### 5.2 `meta` Keys (Frozen)

| Key             | Type                       | Notes                                                |
| --------------- | -------------------------- | ---------------------------------------------------- |
| `analysisId`    | `string`                   | **Required.** Echoed from the request (default `"th-mvp"`). |
| `status`        | `string`                   | **Required.** `"success"` \| `"failed"`.              |
| `method`        | `string`                   | **Required.** Always `"newmark-beta"`.                |
| `timeStep`      | `number`                   | **Required.** Time step in seconds.                   |
| `duration`      | `number`                   | **Required.** Analysis duration in seconds.           |
| `beta`          | `number`                   | Newmark beta coefficient.                             |
| `gamma`         | `number`                   | Newmark gamma coefficient.                            |
| `damping`       | `object`                   | `{ "type": "rayleigh", "alpha": number, "beta": number }`. |
| `groundMotions` | `array<object>`            | One entry per ground motion record used.              |
| `sampleCount`   | `number`                   | **Required.** Number of samples in `time` / histories.|

Required `meta` keys (subset that the contract tests pin): `analysisId`,
`method`, `timeStep`, `duration`, `sampleCount`.

## 6. Error Envelope

The failure envelope is the same shape as the success envelope, with
two differences:

1. `analysisSummary.status` is `"failed"`.
2. `timeHistoryResult` is `null`.
3. `errors` contains at least one entry of shape
   `{ code, message, path, entityType, entityId }`.

```jsonc
{
  "projectId": "th-5a-sdof",
  "schemaVersion": "1.0.0",
  "analysisSummary": {
    "analysisType": "time_history",
    "status": "failed",
    "startedAt": "2026-06-17T01:13:02.542082Z",
    "finishedAt": "2026-06-17T01:13:02.544183Z",
    "durationMs": 0.0,
    "nodeCount": 2,
    "memberCount": 1,
    "loadCaseCount": 1,
    "totalDof": 0,
    "freeDof": 0,
    "constrainedDof": 0,
    "solver": "newmark_beta"
  },
  "displacements": [],
  "reactions": [],
  "memberEndForces": [],
  "warnings": [],
  "errors": [
    {
      "code": "TIME_HISTORY_GROUND_MOTION_MISSING",
      "message": "Time history analysis requires a single ground motion record.",
      "path": "/groundMotions",
      "entityType": null,
      "entityId": null
    }
  ],
  "timeHistoryResult": null
}
```

The contract guarantees the same top-level key set on success and
failure so a single shape is enough for UI consumers.

## 7. Example Request Payload

```jsonc
{
  "project": {
    "id": "th-5a-sdof",
    "name": "TH-5a SDOF",
    "schemaVersion": "1.0.0",
    "units": { "length": "m", "force": "N", /* ... */ },
    "nodes": [
      { "id": "N1", "x": 0.0, "y": 0.0, "z": 0.0 },
      { "id": "N2", "x": 1.0, "y": 0.0, "z": 0.0 }
    ],
    "supports": [
      { "nodeId": "N1", "ux": true, "uy": true, "uz": true,
        "rx": true, "ry": true, "rz": true }
    ],
    "members": [
      { "id": "M1", "nodeI": "N1", "nodeJ": "N2",
        "materialId": "MAT1", "sectionId": "SEC1" }
    ],
    "massCases": [
      { "id": "m-1", "method": "lumped", "source": "manual",
        "items": [{ "nodeId": "N2", "mx": 1.0 }] }
    ],
    "analysisSettings": {
      "timeHistory": {
        "enabled": true,
        "method": "newmark-beta",
        "timeStep": 0.05,
        "duration": 0.5,
        "beta": 0.25,
        "gamma": 0.5,
        "damping": { "type": "rayleigh", "alpha": 0.0, "beta": 0.0 }
      }
    },
    "groundMotions": [
      { "id": "gm-001", "direction": "X",
        "timeStep": 0.05, "duration": 0.5, "unit": "m/s2",
        "samples": [0.0, 0.95, 0.59, -0.59, -0.95, 0.0, 0.95, 0.59, -0.59, -0.95, 0.0] }
    ]
  }
}
```

## 8. Frozen Key Sets (Implementation Mirror)

The implementation exposes the frozen key sets as Python `frozenset`
constants in `backend.engine.time_history_analysis`:

- `TIME_HISTORY_ENVELOPE_KEYS`
- `TIME_HISTORY_RESULT_KEYS`
- `TIME_HISTORY_RESULT_META_KEYS`
- `TIME_HISTORY_RESULT_REQUIRED_META_KEYS`

These constants are re-exported from `backend.engine` and are the
authoritative source of truth. The contract validation tests compare
the live envelope against these constants on every run.

## 9. Out of Scope

- frontend / UI
- CSV / PDF export
- result viewer / animation
- performance optimization
- nonlinear time history analysis

These items are intentionally excluded from TH-5c.