# Project File Format

<!-- DOC-AUTHORITY:START -->
> **Authority:** LEGACY REFERENCE
> This document is retained as current/compatibility evidence. Direct `project.json` generation, frame numbering, and `BridgeDefinition` write-authority claims are superseded for the target design by `RoadDesignDocument` and the versioned `RoadToFrameTransferPackage`; see [`../../planning/stage6-10/road_to_frame_contract.md`](../../planning/stage6-10/road_to_frame_contract.md).
<!-- DOC-AUTHORITY:END -->

## Purpose

Define the on-disk format for persisting liner domain input, settings, and optional cached metadata. The format must be original and versioned; it is distinct from `project.json` (frame model).

## Scope

- Top-level file structure (single file vs. project bundle).
- Schema version field and namespace for liner-specific keys.
- Serialization of domain entities defined in [domain_model.md](../design/domain_model.md).
- `linerTrace` reference policy when embedded in app project.
- Metadata: created/updated timestamps, author, description.

## Out of Scope

- Frame analysis `project.json` schema (see [docs/frame/contracts/04_input_schema.md](../../frame/contracts/04_input_schema.md)).
- Binary or proprietary third-party formats.
- Full intermediate result persistence (recompute on load).

## Assumptions

- JSON is the primary serialization format.
- English camelCase keys for persisted fields.
- UTF-8 encoding per repository [language policy](../../development/language-policy.md).

## Design Topics

### 1. Standalone liner project shape

```json
{
  "linerProject": {
    "id": "liner-001",
    "linerModelId": "lm-bridge-01",
    "name": "",
    "schemaVersion": "0.1.0",
    "description": "",
    "createdAt": "",
    "updatedAt": ""
  },
  "units": {},
  "coordinatePolicy": {},
  "alignments": [],
  "profiles": [],
  "grids": [],
  "spans": [],
  "piers": [],
  "stationEquations": [],
  "generationSettings": {},
  "metadata": {}
}
```

### 2. Embedded in application project

```json
{
  "liner": {
    "schemaVersion": "0.1.0",
    "sourceRevision": "abc123…",
    "linerModelId": "gc06",
    "coordinatePolicyId": "global",
    "intermediateSchemaVersion": "0.2.0",
    "generatedAt": "2026-01-01T00:00:00.000Z",
    "source": {
      "alignmentId": "alignment-1",
      "gridDefinitionId": "grid-1"
    }
  },
  "linerTrace": [
    {
      "frameEntityId": "N_LINER_gc06_001_001",
      "frameEntityType": "node",
      "linerModelId": "gc06",
      "coordinatePolicyId": "global",
      "sourceRevision": "abc123…",
      "gridPointId": "GP-gc06-001-001"
    }
  ],
  "nodes": [],
  "members": []
}
```

P1-4 persists integration metadata and trace entries produced by `createLinerProjectExtension()` / `attachLinerMappingToProject()` in `frontend/src/liner/schema/`. P1-5 adds `createHeadlessLinerFrameProject()` in `frontend/src/liner/headless/` to assemble full `nodes` / `members` / `supports` plus `liner` / `linerTrace` for headless validation and analysis smoke tests. Documented fixture materials (`MAT_LINER_*`, `SEC_LINER_*`) are placeholders for tests only.

`linerTrace` defined in [integration_with_frame_model.md](integration_with_frame_model.md). Schema extension in [schema_migration_policy.md](schema_migration_policy.md).

### 3. File extension

- Proposed: `.liner-project.json` (original; not third-party extensions).
- Embedded mode: no separate extension.

### 4. Not persisted

- Full `LinerIntermediateResult` blobs (recompute on load).
- Formatted station label strings.

### 5. JSON Schema

Future location: `schemas/liner-project.schema.json`.

## Open Questions

- Single global app project vs. separate files? **Primary: embedded.**

## Related Documents

- [domain_model.md](../design/domain_model.md)
- [schema_migration_policy.md](schema_migration_policy.md)
- [import_export_policy.md](import_export_policy.md)
- [integration_with_frame_model.md](integration_with_frame_model.md)
- [file_io_edge_cases.md](file_io_edge_cases.md)

## Pre-Implementation Checklist

- [x] `schemaVersion` semver policy agreed.
- [x] linerTrace embedding documented.
- [ ] Sample file under `examples/` when implementing.
- [ ] JSON Schema draft planned.
