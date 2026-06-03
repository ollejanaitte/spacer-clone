# Input Schema: project.json

## Purpose

`project.json` is the canonical MVP input format. It must contain all data needed to validate, run, and reproduce a linear static 3D frame analysis.

## Top-Level Structure

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

All top-level fields are required.

## project

Required fields:

- `id`: string, unique project identifier.
- `name`: string.
- `schemaVersion`: string, initially `1.0.0`.
- `description`: string, may be empty.
- `createdAt`: ISO 8601 string.
- `updatedAt`: ISO 8601 string.

Example:

```json
{
  "id": "example-cantilever",
  "name": "Cantilever Beam",
  "schemaVersion": "1.0.0",
  "description": "MVP verification model",
  "createdAt": "2026-01-01T00:00:00Z",
  "updatedAt": "2026-01-01T00:00:00Z"
}
```

## units

Required fields:

- `length`: must be `m`.
- `force`: must be `kN`.
- `moment`: must be `kN_m`.
- `modulus`: must be `kN_per_m2`.
- `area`: must be `m2`.
- `inertia`: must be `m4`.

MVP rejects unsupported unit values.

## nodes

Each node requires:

- `id`: string.
- `x`: number.
- `y`: number.
- `z`: number.

Optional:

- `label`: string.

Rules:

- `id` must be unique.
- Coordinates are global coordinates in meters.
- Duplicate coordinates are allowed.

Example:

```json
{ "id": "N1", "x": 0.0, "y": 0.0, "z": 0.0 }
```

## materials

Each material requires:

- `id`: string.
- `name`: string.
- `elasticModulus`: number, `kN/m2`.
- `shearModulus`: number, `kN/m2`.

Optional:

- `poissonRatio`: number.
- `density`: number.

Rules:

- `elasticModulus` must be greater than 0.
- `shearModulus` must be greater than 0.
- MVP does not derive `shearModulus` from `poissonRatio`; provide explicit `shearModulus`.

## sections

Each section requires:

- `id`: string.
- `name`: string.
- `area`: number, `m2`.
- `iy`: number, local y-axis second moment of area, `m4`.
- `iz`: number, local z-axis second moment of area, `m4`.
- `j`: number, torsional constant, `m4`.

Rules:

- All numeric section properties must be greater than 0.
- Shear deformation is out of MVP; no shear area fields are required.

## members

Each member requires:

- `id`: string.
- `nodeI`: node id.
- `nodeJ`: node id.
- `materialId`: material id.
- `sectionId`: section id.

Optional:

- `orientationNode`: node id used to define local y direction.
- `orientationVector`: object with `x`, `y`, `z` numbers.
- `label`: string.

Rules:

- `nodeI` and `nodeJ` must reference existing nodes.
- `nodeI` and `nodeJ` must not be identical.
- Member length must be greater than zero.
- If both `orientationNode` and `orientationVector` are omitted, the engine must use the default local axis rule in `docs/05_analysis_engine_spec.md`.
- If both are present, validation fails.

## supports

Each support requires:

- `nodeId`: node id.
- `ux`: boolean.
- `uy`: boolean.
- `uz`: boolean.
- `rx`: boolean.
- `ry`: boolean.
- `rz`: boolean.

Rules:

- `nodeId` must reference an existing node.
- At least one DOF must be constrained.
- Multiple support entries for the same node are invalid.

Example fixed support:

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

## loadCases

Each load case requires:

- `id`: string.
- `name`: string.
- `type`: string, MVP allows `static`.

Rules:

- `id` must be unique.
- MVP solves each load case independently.
- Advanced load combinations are out of scope.

## nodalLoads

Each nodal load requires:

- `id`: string.
- `loadCaseId`: load case id.
- `nodeId`: node id.
- `fx`: number.
- `fy`: number.
- `fz`: number.
- `mx`: number.
- `my`: number.
- `mz`: number.

Rules:

- Force components are in `kN`.
- Moment components are in `kN_m`.
- All six components are required; use `0.0` for unused components.

## memberLoads

Each member load requires:

- `id`: string.
- `loadCaseId`: load case id.
- `memberId`: member id.
- `coordinateSystem`: `local` or `global`.
- `type`: MVP allows `uniform`.
- `wx`: number.
- `wy`: number.
- `wz`: number.

Rules:

- Load intensity is `kN/m`.
- Uniform loads act over the full member length in MVP.
- Partial distributed loads are out of scope.
- Member moments distributed along the element are out of scope.

## analysisSettings

Required fields:

- `analysisType`: must be `linear_static`.
- `solver`: must be `scipy_sparse`.
- `includeShearDeformation`: boolean, must be `false` in MVP.
- `largeDisplacement`: boolean, must be `false`.

Optional:

- `tolerance`: number, default `1e-9`.
- `maxConditionWarning`: number.

## Validation Rules

Validation must check:

- Required top-level fields exist.
- IDs are unique per entity type.
- References point to existing entities.
- Numeric values are finite.
- Material and section stiffness values are positive.
- Members have nonzero length.
- At least one load case exists before analysis.
- At least one support exists.
- The model has enough constraints to avoid rigid body motion.

## Extension Fields

Objects may include `metadata` for non-analysis UI data. The engine must ignore `metadata`.

No other unknown fields should be accepted in MVP unless explicitly allowed by the JSON Schema.
