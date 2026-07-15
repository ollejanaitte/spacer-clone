# 06 Result Schema

<!-- DOC-AUTHORITY:START -->
> **Authority:** LEGACY / CURRENT IMPLEMENTATION REFERENCE
> This describes an MVP/current wire, engine, UI, or result design. It is not the target `BridgeFrameAnalysisDocument` or conceptual persisted result contract. Current capability is governed by [`../../scoping/stage5_frame_analysis_scope.md`](../../scoping/stage5_frame_analysis_scope.md), and target data and gaps by [`../../planning/stage6-10/target_data_model.md`](../../planning/stage6-10/target_data_model.md) and [`../../planning/stage6-10/stage10_gap_migration_sequence.md`](../../planning/stage6-10/stage10_gap_migration_sequence.md).
<!-- DOC-AUTHORITY:END -->

## 1. Purpose

This document defines the structure of the result JSON returned by the analysis engine and the API. The UI, reports, CSV export, and regression tests depend on this format.

## 2. Scope

- Linear static analysis summary.
- Nodal displacements.
- Support reactions.
- Member end forces.
- Warnings.
- Errors.

## 3. Out of Scope

- Influence line results.
- Moving load results.
- Specialized results from temperature loads, prestress, and initial tension.
- DXF, drawing files, and report templates.

Eigenvalue and response spectrum results are added later as the Phase E extension. See section 8 of this document, `schemas/result.schema.json`, [eigen-analysis.md](../analysis/eigen-analysis.md), and [response-spectrum-analysis.md](../analysis/response-spectrum-analysis.md). Section 4 of this document covers the linear static MVP.

## 4. Data Structure

### Top Level

```json
{
  "projectId": "project-001",
  "schemaVersion": "1.0.0",
  "analysisSummary": {},
  "displacements": [],
  "reactions": [],
  "memberEndForces": [],
  "warnings": [],
  "errors": []
}
```

### analysisSummary

```json
{
  "analysisType": "linear_static",
  "status": "success",
  "startedAt": "2026-01-01T00:00:00Z",
  "finishedAt": "2026-01-01T00:00:01Z",
  "durationMs": 1000.0,
  "nodeCount": 2,
  "memberCount": 1,
  "loadCaseCount": 1,
  "totalDof": 12,
  "freeDof": 6,
  "constrainedDof": 6,
  "solver": "scipy_sparse"
}
```

`status` is one of `success`, `warning`, or `failed`.

### displacements

```json
{
  "loadCaseId": "LC1",
  "nodeId": "N2",
  "ux": 0.0,
  "uy": -0.001,
  "uz": 0.0,
  "rx": 0.0,
  "ry": 0.0,
  "rz": -0.0001
}
```

- Translational displacements are in meters.
- Rotational displacements are in radians.
- Output covers all nodes and all load cases.

### reactions

```json
{
  "loadCaseId": "LC1",
  "nodeId": "N1",
  "fx": 0.0,
  "fy": 10.0,
  "fz": 0.0,
  "mx": 0.0,
  "my": 0.0,
  "mz": 20.0,
  "constrainedDofs": ["ux", "uy", "uz", "rx", "ry", "rz"]
}
```

- Forces are in kN.
- Moments are in kN_m.
- One entry per support-defined node.

### memberEndForces

```json
{
  "loadCaseId": "LC1",
  "memberId": "M1",
  "coordinateSystem": "local",
  "i": {
    "fx": 0.0,
    "fy": 10.0,
    "fz": 0.0,
    "mx": 0.0,
    "my": 0.0,
    "mz": 20.0
  },
  "j": {
    "fx": 0.0,
    "fy": -10.0,
    "fz": 0.0,
    "mx": 0.0,
    "my": 0.0,
    "mz": 0.0
  }
}
```

- Member end forces are in the local coordinate system.
- The I end and J end are stored separately.
- The sign convention follows the analysis engine specification and the tests.

### warnings

```json
{
  "code": "DISCONNECTED_NODE",
  "message": "Node N9 is not connected to any member.",
  "path": "/nodes/8",
  "entityType": "node",
  "entityId": "N9"
}
```

Warnings do not prevent a successful analysis.

### errors

```json
{
  "code": "MODEL_UNSTABLE",
  "message": "The model has insufficient support constraints.",
  "path": "/supports",
  "entityType": "support",
  "entityId": null
}
```

If `errors` is non-empty, `analysisSummary.status` is `failed`.

## 5. Error Handling

- A result with a non-empty `errors` array must not be treated as success.
- The API should return the same result structure even on failure when possible.
- Values must not be `NaN`, `Infinity`, or string-encoded numbers.
- Missing values generated during postprocessing are reported as `POSTPROCESS_ERROR`.

## 6. Test Viewpoints

- A successful result conforms to the JSON Schema.
- A failed result contains `errors` and may have empty result arrays.
- All components of displacement, reaction, and member end force are numeric.
- The result is convertible to CSV output.
- The UI can filter by `loadCaseId`, `nodeId`, and `memberId`.

## 7. Definition of Done

- The API, UI, and report owners can handle the result data using this document alone.
- The required items `displacements`, `reactions`, `memberEndForces`, `analysisSummary`, `warnings`, and `errors` are defined.
- The CSV specification in `docs/frame/output/10_report_spec.md` does not contradict this document.

## 8. Phase E Extension (Eigenvalue and Response Spectrum)

The authoritative reference is `schemas/result.schema.json`. For the meaning of eigenvalue results, see [eigen-analysis.md](../analysis/eigen-analysis.md). For the meaning of response spectrum results, see [response-spectrum-analysis.md](../analysis/response-spectrum-analysis.md).

### Common

- The top-level `displacements`, `reactions`, and `memberEndForces` are empty arrays.
- `analysisSummary.analysisType` is `"eigen"` or `"response_spectrum"`.

### eigenResult

Attached when the eigenvalue analysis succeeds.

```json
{
  "massCaseId": "mass-1",
  "normalization": "mass",
  "totalMassByDirection": [
    { "direction": "X", "value": 0.0 }
  ],
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
}
```

`totalMassByDirection`, `effectiveMasses`, and `cumulativeEffectiveMassRatios` are optional extensions starting from Phase E-1b.

### responseSpectrumResult

Attached when the response spectrum analysis succeeds. The same result also contains `eigenResult`.

```json
{
  "spectrumCaseId": "spec-1",
  "direction": "X",
  "dampingRatio": 0.05,
  "combinationMethod": "SRSS",
  "interpolationMethod": "linear",
  "targetCumulativeMassRatio": 0.9,
  "usedModes": [1],
  "modalResults": [],
  "combinedResult": {
    "method": "SRSS",
    "displacements": [],
    "reactions": [],
    "memberSectionForces": []
  },
  "directionResults": []
}
```

The meaning of each field:

- `combinationMethod`: `SRSS` or `CQC`. The MVP default is `SRSS`.
- `interpolationMethod`: `linear` or `logLog`. The default is `linear`.
- `usedModes`: the list of mode numbers used in the analysis.
- `combinedResult.reactions` / `combinedResult.memberSectionForces`: the combined dynamic reactions and member section forces.
- `directionResults`: per-direction results. Even for a single direction run, this array contains one element.
