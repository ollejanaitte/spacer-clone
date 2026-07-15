# 04 Input Schema

<!-- DOC-AUTHORITY:START -->
> **Authority:** LEGACY / CURRENT IMPLEMENTATION REFERENCE
> This describes an MVP/current wire, engine, UI, or result design. It is not the target `BridgeFrameAnalysisDocument` or conceptual persisted result contract. Current capability is governed by [`../../scoping/stage5_frame_analysis_scope.md`](../../scoping/stage5_frame_analysis_scope.md), and target data and gaps by [`../../planning/stage6-10/target_data_model.md`](../../planning/stage6-10/target_data_model.md) and [`../../planning/stage6-10/stage10_gap_migration_sequence.md`](../../planning/stage6-10/stage10_gap_migration_sequence.md).
<!-- DOC-AUTHORITY:END -->

## 1. Purpose

This document defines the structure of `project.json`, the input data of the MVP. Subsequent implementations will use this document as the basis for the JSON Schema, API validation, UI input forms, and the analysis engine input model.

## 2. Scope

The MVP input is limited to the following:

- 3D node coordinates.
- Material definitions.
- Section definitions.
- 3D beam member definitions.
- Six-DOF support conditions.
- Load cases.
- Nodal concentrated loads.
- Member uniform distributed loads.
- Linear static analysis settings.

## 3. Out of Scope

The following input items are not defined in the initial MVP:

- Influence line loading points, grid shapes, lines, moving loads, automatic live load placement.
- Temperature loads, prestress, initial tension.
- Member springs, node-to-node springs, coupling springs.
- Member end releases, advanced load combinations.
- DXF, integration with external software, license information.

The inputs for eigenvalue analysis and response spectrum analysis are added later as the Phase E extension. See `schemas/project.schema.json`, [eigen-analysis.md](../analysis/eigen-analysis.md), and [response-spectrum-analysis.md](../analysis/response-spectrum-analysis.md). Section 4 of this document covers the linear static MVP.

## 4. Data Structure

### Top Level

```json
{
  "project": {},
  "units": {},
  "nodes": [],
  "materials": [],
  "sections": [],
  "members": [],
  "supports": [],
  "loadCases": [],
  "nodalLoads": [],
  "memberLoads": [],
  "analysisSettings": {}
}
```

All top-level keys are required.

### project

```json
{
  "id": "project-001",
  "name": "MVP Frame Model",
  "schemaVersion": "1.0.0",
  "description": "",
  "createdAt": "2026-01-01T00:00:00Z",
  "updatedAt": "2026-01-01T00:00:00Z"
}
```

- `id`: string, required.
- `name`: string, required.
- `schemaVersion`: for the MVP this is `1.0.0`.
- `description`: string, empty string allowed.
- `createdAt`, `updatedAt`: ISO 8601 strings.

### units

```json
{
  "length": "m",
  "force": "kN",
  "moment": "kN_m",
  "modulus": "kN_per_m2",
  "area": "m2",
  "inertia": "m4"
}
```

Only SI units are allowed in the MVP. Unit conversion is not implemented.

### nodes

```json
{
  "id": "N1",
  "x": 0.0,
  "y": 0.0,
  "z": 0.0,
  "label": "optional"
}
```

- `id`: unique.
- `x`, `y`, `z`: global coordinates, in meters.
- `label`: optional.

### materials

```json
{
  "id": "MAT1",
  "name": "Steel",
  "elasticModulus": 205000000.0,
  "shearModulus": 79000000.0,
  "poissonRatio": 0.3,
  "density": 0.0
}
```

- `elasticModulus`: `kN/m2`, positive.
- `shearModulus`: `kN/m2`, positive.
- `poissonRatio`, `density`: informational for the MVP analysis.

### sections

```json
{
  "id": "SEC1",
  "name": "Box Section",
  "area": 0.02,
  "iy": 0.0001,
  "iz": 0.0001,
  "j": 0.00005
}
```

- `area`: cross-section area, `m2`.
- `iy`: second moment of area about the local y-axis, `m4`.
- `iz`: second moment of area about the local z-axis, `m4`.
- `j`: torsional constant, `m4`.

### members

```json
{
  "id": "M1",
  "nodeI": "N1",
  "nodeJ": "N2",
  "materialId": "MAT1",
  "sectionId": "SEC1",
  "orientationVector": { "x": 0.0, "y": 0.0, "z": 1.0 },
  "label": ""
}
```

- `nodeI`, `nodeJ`: existing node IDs.
- `materialId`: existing material ID.
- `sectionId`: existing section ID.
- `orientationVector`: optional. If omitted, the analysis engine uses the default local coordinate rule.
- `orientationNode`: optional. Cannot be specified together with `orientationVector`.

### supports

```json
{
  "nodeId": "N1",
  "ux": true,
  "uy": true,
  "uz": true,
  "rx": true,
  "ry": true,
  "rz": true
}
```

- Each boolean indicates that the corresponding DOF is restrained.
- A node must not have more than one support entry.

### loadCases

```json
{
  "id": "LC1",
  "name": "Dead Load",
  "type": "static"
}
```

In the MVP, `type` is always `static`.

### nodalLoads

```json
{
  "id": "NL1",
  "loadCaseId": "LC1",
  "nodeId": "N2",
  "fx": 0.0,
  "fy": -10.0,
  "fz": 0.0,
  "mx": 0.0,
  "my": 0.0,
  "mz": 0.0
}
```

- Forces are in `kN`.
- Moments are in `kN_m`.
- Unused components must be written explicitly as `0.0`.

### memberLoads

```json
{
  "id": "ML1",
  "loadCaseId": "LC1",
  "memberId": "M1",
  "coordinateSystem": "local",
  "type": "uniform",
  "wx": 0.0,
  "wy": -2.0,
  "wz": 0.0
}
```

- `type`: in the MVP this is always `uniform`.
- `coordinateSystem`: `local` or `global`.
- Load intensity is `kN/m`.
- Only uniform distributed loads over the full member length are supported.

### analysisSettings

```json
{
  "analysisType": "linear_static",
  "solver": "scipy_sparse",
  "includeShearDeformation": false,
  "largeDisplacement": false,
  "tolerance": 1e-9
}
```

In the MVP, `includeShearDeformation` and `largeDisplacement` must be `false`.

## 5. Phase E Extension (Eigenvalue and Response Spectrum)

After the linear static MVP is complete, the following are added to `project.json`. The authoritative reference is `schemas/project.schema.json`.

### massCases (optional array)

```json
{
  "id": "mass-1",
  "name": "Mass case for eigenvalue analysis",
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

In the MVP, only `method: "lumped"` and `source: "manual"` are allowed. `mx/my/mz` are the primary fields. `irx/iry/irz` are fixed to 0.

### analysisSettings.eigen (optional)

```json
{
  "massCaseId": "mass-1",
  "modeCount": 10
}
```

### analysisSettings.responseSpectrum (optional)

```json
{
  "modeCount": 10,
  "massCaseId": "mass-1",
  "spectrumCaseId": "spec-1",
  "direction": "X",
  "dampingRatio": 0.05,
  "targetCumulativeMassRatio": 0.9,
  "spectrumPoints": [
    { "period": 0.1, "value": 1.0 },
    { "period": 1.0, "value": 0.5 }
  ]
}
```

The spectrum is stored as a point list inside `spectrumPoints` rather than as a top-level `spectrumCases` array. Interpolation is **linear**, and values outside the period range use the **end values**. For details, see [response-spectrum-analysis.md](../analysis/response-spectrum-analysis.md).

## 6. Error Handling

- Missing required fields: `SCHEMA_ERROR`.
- Duplicate IDs: `DUPLICATE_ID`.
- Non-existent references: `INVALID_REFERENCE`.
- Non-finite values, non-positive stiffness values: `INVALID_VALUE`.
- Zero-length member: `ZERO_LENGTH_MEMBER`.
- Insufficient supports: `MODEL_UNSTABLE` (returned by validation or analysis).
- Errors should include `path`, `entityType`, and `entityId` whenever possible.

## 7. Test Viewpoints

- A valid cantilever model passes schema validation.
- Missing required top-level fields are detected.
- Invalid references to nodes, materials, sections, and load cases are detected.
- Duplicate IDs are detected.
- `NaN`, `Infinity`, and string-encoded numbers are rejected.
- Adding out-of-MVP fields is handled explicitly by the JSON Schema.

## 8. Definition of Done

- All required items of `project.json` are defined.
- A JSON Schema implementer can create the schema from this document alone.
- The UI owner can build the input tables.
- The engine owner can build the analysis input model.
- Inputs for features outside the MVP are explicitly listed as out of scope.
- The Phase E extension inputs do not contradict the design documents or `schemas/project.schema.json`.
