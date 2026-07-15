# Integration with Frame Model

<!-- DOC-AUTHORITY:START -->
> **Authority:** LEGACY REFERENCE
> The body-level merge/tagging source-of-truth statement describes the current legacy integration path only. Target integration does not merge or replace the other product's authoritative document; it uses the immutable package, preview/diff/apply, and append-only record governed by the [transfer crosswalk](../../transfer/contract-index.md) and [formal contract](../../planning/stage6-10/road_to_frame_contract.md).
<!-- DOC-AUTHORITY:END -->

## Purpose

Define how the Linear Coordinate Calculation System connects to the existing 3D frame analysis application: entry points, data flow, responsibility boundaries, and the handoff from liner intermediate results to `project.json`.

This document is a **highest-priority** design artifact and the **source of truth** for merge/tagging policy, schema compatibility, and application-level integration.

## Scope

- Application-level integration: menus, navigation, session lifecycle.
- API or in-process calls between liner module and existing project management.
- Generation workflow: liner compute → validate → merge/replace frame model.
- Coexistence of liner project data and frame model in the application.
- Schema compatibility and traceability storage policy.
- Error propagation when generated frame model fails schema validation.

## Out of Scope

- Detailed node/member ID mapping rules ([frame_model_mapping.md](frame_model_mapping.md)).
- Analysis engine internals ([docs/frame/analysis/05_analysis_engine_spec.md](../../frame/analysis/05_analysis_engine_spec.md)).
- Bridge wizard FEM generator domain model (parallel path).

## Assumptions

- The existing `project.json` schema remains authoritative for analysis input.
- Frame model validation uses existing JSON Schema and reference integrity checks.
- Liner does not modify analysis settings unless user explicitly opts in.
- Electron shell and FastAPI backend patterns follow the [legacy MVP architecture](../../architecture/legacy-mvp-architecture.md).
- **MVP execution boundary:** TypeScript-only pure core and mapper in frontend; backend validates merged project schema only — no geometry recompute on server ([calculation_pipeline.md](../design/calculation_pipeline.md)).

## Design Topics

### 1. Integration mode — decision

**Chosen for MVP: Mode B — Embedded section**

Liner domain data stored in app project bundle under `liner`; one-click generate updates FEM section. Mode A (export-only) remains available as fallback export menu action.

| Mode | MVP status |
| --- | --- |
| A. Export-only | Secondary export path |
| **B. Embedded section** | **Primary** |
| C. Wizard bridge | Deferred — see §10 |

### 2. End-to-end flow

```text
User edits LinerProject (domain)
        ↓
Calculation pipeline (TypeScript) → LinerIntermediateResult
        ↓
FrameModelMapper (TypeScript, pure function)
        ↓
ProjectJson subset + linerTrace[]
        ↓
Merge into project (replace liner-tagged entities)
        ↓
POST /api/projects/validate  (schema + references)
        ↓
User runs analysis (existing flow)
```

Pipeline: **alignment → stations → grid → nodes → members → frame analysis model**.

**P1-5 headless path (no UI):** `buildIntermediateResult()` → `mapToFrameModel()` → `createHeadlessLinerFrameProject()` in `frontend/src/liner/headless/`. The helper assembles a `project.json`-compatible object, attaches P1-4 `liner` / `linerTrace`, and validates against `schemas/project.schema.json` plus reference integrity. Backend `validate_project` / `run_analysis` can be invoked from tests or automation when Python dependencies are available.

**P1-5 analysis boundary:** Projects without support templates remain schema-valid but fail linear static analysis (`MODEL_UNSTABLE`). P1-6/P1-7 must supply user-facing generate workflow and default support templates for production analysis-ready models.

### 3. Layer responsibilities

| Layer | Responsibility |
| --- | --- |
| `liner-core` (TS) | Domain → intermediate results |
| `liner-mapper` (TS) | Intermediate results → `project.json` subset + `linerTrace` |
| `frontend` liner UI | Edit domain, trigger compute, show preview |
| FastAPI | Validate merged project; **no** liner geometry logic |
| Analysis engine | Unchanged; consumes standard `project.json` |

### 4. Schema compatibility — decision (CR-03)

**Current state:** `schemas/project.schema.json` defines `node`, `member`, and `support` with `additionalProperties: false`. **`meta` is not allowed** on frame entities today.

**MVP policy (dual track):**

1. **Entity identification:** ID prefix namespace `N_LINER_*`, `M_LINER_*`, `S_LINER_*` scoped by `linerModelId`.
2. **Traceability storage:** Add optional top-level `linerTrace` array on project (schema extension vNext):

```json
{
  "linerTrace": [
    {
      "frameEntityId": "N_LINER_gc06_001_001",
      "frameEntityType": "node",
      "gridPointId": "GP-gc06-001-001",
      "sourceRevision": "abc123…",
      "linerModelId": "gc06"
    }
  ],
  "liner": { "domain": {}, "schemaVersion": "0.1.0" }
}
```

3. **Planned schema extension (vNext):** Add optional `meta` on `node`/`member` OR keep `linerTrace` as permanent audit table — decision by schema owners before implementation. Migration in [schema_migration_policy.md](schema_migration_policy.md).

**Golden validation fixture:**

```text
examples/liner/gc-06-intermediate.expected.json
  → mapToFrameModel()
  → examples/liner/gc-06-project.generated.json
  → project.schema.json validation MUST pass
```

P2-0 status: `gc-06-intermediate.expected.json` is the current on-disk naming convention. `gc-06-project.generated.json` is still a planned committed fixture; the GC-06 headless validation path is currently covered by Vitest instead of that file.

### 5. Merge policy

When liner regenerates the frame model:

1. Collect IDs from `linerTrace[].frameEntityId` and any entity with ID prefix `N_LINER_{linerModelId}_`, `M_LINER_{linerModelId}_`, `S_LINER_{linerModelId}_`.
2. Remove those nodes, members, supports; remove dangling member loads referencing removed members.
3. Append newly mapped entities.
4. Replace `linerTrace` entries for the same `linerModelId`.
5. **Preserve:** User-owned entities without liner ID prefix or trace entry.

Tagging via embedded `meta` deferred until schema allows it; until then `linerTrace` is authoritative for replace scope.

### 6. Material and section assignment

- Generation settings reference existing `materials[]` and `sections[]` by ID.
- `memberGroupRules` resolve per [frame_model_mapping.md](frame_model_mapping.md) §5.
- If missing, mapper fails with `LINER_FRAME_MISSING_SECTION` (no silent create unless user enables auto-create).

### 7. Coordinate alignment

- Liner global frame matches frame model global frame ([coordinate_system_policy.md](../design/coordinate_system_policy.md)).
- No silent rotation at export; any project-level origin offset is applied once in domain `coordinatePolicy`.

### 8. UI integration points

**P1-6 preparation** ([ui_preparation.md](../ui/ui_preparation.md)):

| Future UI surface | Reserved path / id | Wired entry point |
| --- | --- | --- |
| Liner setup editor | `/pro/liner/setup` (`liner.setup`) | domain edit → `buildIntermediateResult` |
| Preview + diagnostics | `/pro/liner/preview` (`liner.preview`) | read intermediate; display diagnostics |
| Mapping review | `/pro/liner/mapping-review` (`liner.mappingReview`) | `mapToFrameModel` → merge → headless validate |
| Main menu / toolbar | i18n `liner.toolbar.*` | opens setup route (future) |
| Generate frame model | `liner.actions.confirmGenerate` | enabled when no error diagnostics |
| Post-generate | `liner.actions.openInViewer` | existing 3D viewer + analysis flow |

Routes are **not registered** until a later phase. Constants: `frontend/src/liner/uiPreparation.ts`.

### 9. Validation gate

Before merge:

1. Intermediate result diagnostics contain no `error` level entries.
2. Mapper output passes JSON Schema.
3. Reference integrity: all member node IDs exist.
4. Minimum structural connectivity check (warning if disconnected).
5. `linerTrace` entries reference valid frame entity IDs.

### 10. Relationship to bridge wizard — reuse policy

**MVP decision: Keep mapper separate; share only low-level helpers.**

| Aspect | Bridge wizard | Liner |
| --- | --- | --- |
| Domain | Bridge-centric semantic model | Alignment-centric model |
| Grid | Span × lane mesh | Station × offset grid |
| Output | `project.json` via generator | `project.json` via mapper |
| Shared code | Optional JSON entity builders, validation utils | Same |

Do **not** half-share domain models or `GenerationSettings` types in MVP. Revisit unification post-MVP if overlap stabilizes.

### 11. Multiple liner models in one project

Each liner model has unique `linerModelId`. Merge/replace operates per model ID. `linerTrace` entries include `linerModelId` to scope replacement.

## Open Questions

- Backend endpoint `POST /api/liner/generate-frame-model` vs. client-side mapper only? **MVP: client-side only.**
- Should generated models open in a new project tab or overwrite current?
- Version pinning when liner schema and project schema diverge?

## Related Documents

- [frame_model_mapping.md](frame_model_mapping.md)
- [intermediate_result_model.md](../design/intermediate_result_model.md)
- [project_file_format.md](project_file_format.md)
- [schema_migration_policy.md](schema_migration_policy.md)
- [validation_rules.md](../design/validation_rules.md)
- [calculation_pipeline.md](../design/calculation_pipeline.md)
- [docs/frame/contracts/04_input_schema.md](../../frame/contracts/04_input_schema.md)

## Pre-Implementation Checklist

- [x] Integration mode B chosen.
- [x] Merge/replace policy documented with ID prefix + `linerTrace`.
- [x] Schema compatibility policy documented (no `meta` until extension).
- [x] MVP TypeScript-only execution boundary decided.
- [x] Bridge wizard reuse policy: separate mapper, shared helpers only.
- [ ] Golden fixture passes schema validation when implemented.
- [x] Headless GC-06 pipeline validates via `createHeadlessLinerFrameProject` tests (P1-5).
- [x] UI entry points and i18n key groups listed (P1-6; [ui_preparation.md](../ui/ui_preparation.md)).
