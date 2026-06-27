# P2-1 Schema Readiness Review

## Purpose

Decide whether LINER Phase2 UI implementation needs additional schema work before React UI scaffolding starts.

## Scope

- Check the current `project.schema.json` liner extension state.
- Inventory schema-layer APIs used by the planned UI workflow.
- Separate initial UI readiness from future domain persistence and migration work.

## Out of Scope

- Changing `schemas/project.schema.json`.
- Adding `schemas/liner-project.schema.json`.
- Adding optional `meta` to frame entities.
- Wiring project-load migration into the application shell.

## Schema Readiness Conclusion

Initial Phase2 UI requires **no changes** to `schemas/project.schema.json`.

This is a schema-scoped conclusion only. The overall Phase1 gate still records fixture gaps, and this review does not override those gate findings.

The existing optional top-level `liner` and `linerTrace` fields are sufficient for the Phase2 path:

```text
draft BuildIntermediateInput
  -> buildIntermediateResult()
  -> mapToFrameModel()
  -> attachLinerMappingToProject()
  -> createHeadlessLinerFrameProject()
  -> generated ProjectModel for review / Viewer3D handoff
```

This conclusion applies only while the UI keeps user-editable liner domain input in draft or in-memory state. Persisting the full liner domain into a project bundle remains future schema work.

## Repository Facts

| Area | Fact | Evidence |
| --- | --- | --- |
| Project schema extension | `project.schema.json` already defines optional top-level `liner` and `linerTrace`. | `schemas/project.schema.json` properties and `$defs.projectLinerMetadata` / `$defs.linerTraceEntry` |
| Backward compatibility | Existing projects without `liner` or `linerTrace` remain valid. | `phase1_completion_gate.md` schema area is `PASS`; fields are optional |
| Integration metadata | Current `project.liner` stores metadata only: schema version, source revision, model id, coordinate policy, intermediate version, generated time, and source refs. | `schemas/project.schema.json`, `frontend/src/liner/schema/types.ts` |
| Traceability | `linerTrace` stores frame entity ids and grid/source provenance. | `frameModelMapper.ts`, `attachLinerMappingToProject.ts` |
| Entity `meta` | `node`, `member`, and `support` still disallow arbitrary properties. | `schemas/project.schema.json`; `integration_with_frame_model.md` |
| Domain schema | `schemas/liner-project.schema.json` is documented as future. | `project_file_format.md`, `schema_migration_policy.md` |
| UI state mismatch | `uiPreparation.ts` and `ui_preparation.md` describe the `domain` slice as persisted in `project.liner`, but the current schema stores integration metadata only. | `frontend/src/liner/uiPreparation.ts`, `docs/liner/ui_preparation.md`, `schemas/project.schema.json` |

## Schema Module API Inventory

| API | Location | Role | Phase2 UI use |
| --- | --- | --- | --- |
| `attachLinerMappingToProject()` | `frontend/src/liner/schema/attachLinerMappingToProject.ts` | Attach `liner` metadata and `linerTrace` to a project-like object. | Primary workflow entry point for explicit merge. |
| `createLinerProjectExtension()` | `frontend/src/liner/schema/attachLinerMappingToProject.ts` | Build the extension object without mutating the source project. | Adapter/helper use only. |
| `validateProjectLinerExtension()` | `frontend/src/liner/schema/validateProjectLinerExtension.ts` | Validate `liner` / `linerTrace` shape for frontend diagnostics. | Adapter/headless diagnostic support. |
| `migrateProjectLinerExtension()` | `frontend/src/liner/schema/projectLinerMigration.ts` | Backward-compatible normalization for persisted liner fields. | Future project-load path; not required for draft UI. |
| `ensureProjectLinerTraceArray()` | `frontend/src/liner/schema/projectLinerMigration.ts` | Add empty `linerTrace` when liner metadata exists. | Future project-load path; not required for draft UI. |
| `createHeadlessLinerFrameProject()` | `frontend/src/liner/headless/createHeadlessLinerFrameProject.ts` | Assemble generated frame model, attach extension, and validate schema/reference integrity. | Primary validation gate before review readiness. |

Only `attachLinerMappingToProject()` and `createHeadlessLinerFrameProject()` are direct workflow capabilities in `uiPreparation.ts`; the other schema helpers should stay behind adapters or load/validation utilities.

## Deferred Schema Work

| Deferred item | Why it is not a P2-1 blocker | Trigger to revisit |
| --- | --- | --- |
| Full liner domain persistence | Phase2 directive allows `BuildIntermediateInput` to stay draft/in-memory for the first UI surface; this is not a repository schema capability yet. | Save/load of editable liner domain in project files. |
| `schemas/liner-project.schema.json` | The standalone liner project schema is documented as future. | Import/export or standalone liner file support. |
| Project-load migration wiring | Helpers exist, but initial UI does not depend on loading persisted liner domain. | First production save/load flow for projects containing liner metadata. |
| Optional `meta` on frame entities | MVP traceability uses `linerTrace` plus generated ID prefixes. | Product/schema decision to make trace data embedded per entity. |
| GC-06 generated project fixture | Headless validation is covered by Vitest; fixture file remains planned. | Golden fixture gate before claiming full fixture coverage. |

## P2-1 Gate

| Question | Answer |
| --- | --- |
| Is another `project.schema.json` PR required before P2-2/P2-3 UI work? | No. |
| Is the schema ready for mapping review and headless validation? | Yes for local generated `ProjectModel` review based on `liner` / `linerTrace`; production generate readiness still depends on the unresolved fixture gate. |
| Is the schema ready for full editable domain persistence? | No. |
| Should Phase2 UI write raw domain objects into `project.liner` now? | No. Current `project.liner` is integration metadata only. |
| Should Phase2 UI rely on entity `meta`? | No. Use `linerTrace` and ID prefixes. |

## Cursor CLI Utilization Log

| # | Timing | Purpose | Target | Result Summary |
| --- | --- | --- | --- | --- |
| 1 | Step 1 kickoff | Schema symbols and usage inventory | `project.schema.json`, schema/headless/mapper modules, schema docs | Confirmed `liner` / `linerTrace` are implemented and enough for initial UI; domain persistence remains future work. |
| 2 | Step 2 implementation planning | API names and document naming reference | schema API exports, `uiPreparation.ts`, schema docs | Confirmed six schema/headless API names and recommended `P2-1 Schema Readiness Review` naming. |
| 3 | Step 3 verification | Impact surface and citation check | P2-1 review diff, schema files, schema APIs | Confirmed the change is documentation-only and that schema/API citations are accurate. |
| 4 | Step 4 consistency check | Overclaim and prior-review carryover scan | P2-0 review, schema docs, Phase1 gate, P2-1 review | Flagged production fixture caveats and Phase2 directive wording; this review now scopes readiness to schema and carries the fixture gate into Human Review. |

## Human Review Required

| Fact | Evidence | Decision needed |
| --- | --- | --- |
| The `domain` state slice is marked persisted in UI preparation artifacts, but the current schema does not persist full domain input. | `uiPreparation.ts`, `ui_preparation.md`, `project.schema.json` | Whether to update UI preparation artifacts before implementing save/load behavior, or defer until domain schema work starts. |
| Full liner domain persistence is future schema work. | `project_file_format.md`, `schema_migration_policy.md` | Whether Phase2 MVP may ship with draft/in-memory domain only. |
| Project-load migration helpers exist but are not wired into a load path. | `projectLinerMigration.ts` and tests | Which project load boundary should call them when persisted liner data becomes user-facing. |
| Phase1 fixture gaps remain even though schema shape is ready for local UI scaffolding. | `phase1_completion_gate.md`, `schema_migration_policy.md`, P2-0 review | Whether fixture completion blocks P2-2/P2-3 or remains a visible gate before production generate. |
| Other docs still contain stale or planned GC-06 fixture references. | `frame_model_mapping.md`, `test_plan_geometry.md`, `test_plan_cad_report.md`, `schema_migration_policy.md` | Whether to normalize these references before the generated fixture is committed. |

## Pre-Implementation Checklist

- [x] `project.schema.json` readiness checked.
- [x] Schema-layer API names checked.
- [x] `meta` deferral confirmed.
- [x] Full domain persistence gap recorded.
- [ ] Editable domain save/load schema designed.
- [ ] Project-load migration wiring designed.
