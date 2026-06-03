# Result Schema

## Purpose

Analysis result JSON is the canonical output from `POST /api/analysis/run`. It must be stable enough for UI display, CSV export, and regression tests.

## Top-Level Structure

```json
{
  "projectId": "example",
  "schemaVersion": "1.0.0",
  "analysisSummary": {},
  "displacements": [],
  "reactions": [],
  "memberEndForces": [],
  "warnings": [],
  "errors": []
}
```

If `errors` is non-empty, numerical result arrays may be empty.

## analysisSummary

Required fields:

- `analysisType`: `linear_static`.
- `status`: `success`, `warning`, or `failed`.
- `startedAt`: ISO 8601 string.
- `finishedAt`: ISO 8601 string.
- `nodeCount`: integer.
- `memberCount`: integer.
- `loadCaseCount`: integer.
- `totalDof`: integer.
- `freeDof`: integer.
- `constrainedDof`: integer.
- `solver`: string.
- `durationMs`: number.

Optional fields:

- `maxDisplacement`: object.
- `maxReaction`: object.
- `maxMemberEndForce`: object.

## displacements

One record per load case and node.

Required fields:

- `loadCaseId`: string.
- `nodeId`: string.
- `ux`: number.
- `uy`: number.
- `uz`: number.
- `rx`: number.
- `ry`: number.
- `rz`: number.

Units:

- Translational displacement: `m`.
- Rotational displacement: `rad`.

Example:

```json
{
  "loadCaseId": "LC1",
  "nodeId": "N2",
  "ux": 0.0,
  "uy": -0.0012,
  "uz": 0.0,
  "rx": 0.0,
  "ry": 0.0,
  "rz": -0.0008
}
```

## reactions

One record per load case and supported node.

Required fields:

- `loadCaseId`: string.
- `nodeId`: string.
- `fx`: number.
- `fy`: number.
- `fz`: number.
- `mx`: number.
- `my`: number.
- `mz`: number.
- `constrainedDofs`: array of strings.

Units:

- Force: `kN`.
- Moment: `kN_m`.

Unconstrained DOF reaction components should be `0.0`.

## memberEndForces

One record per load case and member.

Required fields:

- `loadCaseId`: string.
- `memberId`: string.
- `coordinateSystem`: must be `local`.
- `i`: object.
- `j`: object.

End force object fields:

- `fx`: number.
- `fy`: number.
- `fz`: number.
- `mx`: number.
- `my`: number.
- `mz`: number.

Units:

- Force: `kN`.
- Moment: `kN_m`.

Sign convention:

- Forces are local member end forces.
- Positive directions follow the member local axes.
- The exact finite element sign convention must match `docs/05_analysis_engine_spec.md` and verification tests.

## warnings

Warning object fields:

- `code`: string.
- `message`: string.
- `path`: string, optional.
- `entityType`: string, optional.
- `entityId`: string, optional.

Warnings do not block result generation.

## errors

Error object fields:

- `code`: string.
- `message`: string.
- `path`: string, optional.
- `entityType`: string, optional.
- `entityId`: string, optional.
- `details`: object, optional.

Errors block successful analysis. API responses may still use HTTP 200 for validation-style failures if the response has `status: failed`, but unexpected server failures must use 5xx.

## CSV Export Mapping

MVP exports three CSV tables:

- `displacements.csv`
- `reactions.csv`
- `member_end_forces.csv`

CSV headers must match JSON field names where possible.

Displacements header:

```text
loadCaseId,nodeId,ux,uy,uz,rx,ry,rz
```

Reactions header:

```text
loadCaseId,nodeId,fx,fy,fz,mx,my,mz,constrainedDofs
```

Member end forces header:

```text
loadCaseId,memberId,end,fx,fy,fz,mx,my,mz
```

## Stability Requirements

- Numeric values must be JSON numbers, not formatted strings.
- UI formatting is separate from result JSON.
- Missing results must not be represented as `NaN` or `Infinity`.
- If a value cannot be computed, analysis must fail with an error.
