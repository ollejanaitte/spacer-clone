# Schema Migration Policy

<!-- DOC-AUTHORITY:START -->
> **Authority:** LEGACY REFERENCE
> This document is retained as current/compatibility evidence. Direct `project.json` generation, frame numbering, and `BridgeDefinition` write-authority claims are superseded for the target design by `RoadDesignDocument` and the versioned `RoadToFrameTransferPackage`; see [`../../planning/stage6-10/road_to_frame_contract.md`](../../planning/stage6-10/road_to_frame_contract.md).
<!-- DOC-AUTHORITY:END -->

## Purpose

Define how liner project, intermediate result, and **project.json extension** schema versions evolve, migrate, and remain backward compatible.

## Scope

- Semver rules for `schemaVersion` fields.
- Migration scripts or in-loader transforms.
- Deprecation window for old fields.
- `liner` section and `linerTrace` extension to `project.schema.json`.
- Planned optional `meta` on frame entities.

## Out of Scope

- Migration of third-party files.
- Database migrations (liner uses JSON files).

## Assumptions

- Migrations are deterministic and tested.
- One-step migration (v0.1 → v0.2); chained migrations composed if needed.
- Frame schema changes coordinated with [integration_with_frame_model.md](integration_with_frame_model.md).

## Design Topics

### 1. Semver policy

- **Minor:** additive fields (safe for old readers).
- **Major:** renames, removals, type changes.

### 2. Liner domain schema

- File: `schemas/liner-project.schema.json` (future).
- Baseline: `0.1.0`; intermediate result `0.2.0` adds grid provenance ([intermediate_result_model.md](../design/intermediate_result_model.md)).

### 3. project.schema.json extensions (planned)

| Change | Version | Status |
| --- | --- | --- |
| Optional top-level `liner` object | project schema minor bump | **Implemented (P1-4)** |
| Optional top-level `linerTrace[]` | project schema minor bump | **Implemented (P1-4)** |
| Optional `meta` on `node`/`member` | project schema minor bump | Under review |

**MVP without meta:** Use `linerTrace` + ID prefix until `meta` approved.

Migration helpers live in `frontend/src/liner/schema/projectLinerMigration.ts`. Old projects without `liner` or `linerTrace` remain valid. When liner metadata is present but `linerTrace` is omitted, `ensureProjectLinerTraceArray()` can add an empty trace array during load.

Persisted `liner` metadata (P1-4) stores integration provenance from the canonical intermediate result:

- `schemaVersion`: liner integration block version (`0.1.0`)
- `sourceRevision`, `linerModelId`, `coordinatePolicyId`, `intermediateSchemaVersion`
- optional `generatedAt`, `source.alignmentId`, `source.gridDefinitionId`

Full liner domain persistence remains a separate future extension of the same top-level `liner` object.

### 4. Golden validation path

```text
gc-06-project.generated.json → validate against project.schema.json (current + vNext)
```

Required before enabling frame generate in production.

### 5. Read compatibility

Support N-1 project schema version in same app release.

## Open Questions

- User prompt before auto-migrate on open?

## Related Documents

- [project_file_format.md](project_file_format.md)
- [intermediate_result_model.md](../design/intermediate_result_model.md)
- [integration_with_frame_model.md](integration_with_frame_model.md)
- [file_io_edge_cases.md](file_io_edge_cases.md)

## Pre-Implementation Checklist

- [x] Semver policy written.
- [x] linerTrace extension documented.
- [x] Meta extension decision tracked.
- [ ] First migration stub planned (0.1.0 baseline).
- [ ] Golden fixture schema validation test planned.
