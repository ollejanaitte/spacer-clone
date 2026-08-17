# Lane G — G-6 Single Project Completion

> **Phase:** Lane G / G-6 (最重要工程)
> **Status:** COMPLETE
> **Date:** 2026-08-17 (JST)
> **Base:** origin/main d91e6caa10408c84bfc9a7fd75efc1f43c3d8558 (Lane F completion)

## Purpose

Unify the production runtime Project to exactly ONE canonical representation,
persistence lifecycle, and module-slot ownership. Legacy exists only as a
read/migration boundary.

## Canonical Project (final)

**Production Single Project = PDC `Project` (`frontend/src/next/project/schema.ts`, zod strict).**

| Concern | Canonical | Evidence |
|---|---|---|
| identity | PDC `projectId` (UUID), created once via `ProjectManager.createProject` | `next/project/projectManager.ts:23` |
| representation | PDC `Project` (zod `projectSchema`) | `next/project/schema.ts:27-46` |
| schemaVersion | string semver `1.0.0` (`PROJECT_SCHEMA_VERSION`) | `next/project/schema.ts:3` |
| persistence | `PersistentProjectManager` → `FilesystemProjectPersistence` (`project.json`, temp+rename+backup) | `next/project/persistentProjectManager.ts`, `next/persistence/filesystemProjectPersistence.ts` |
| module slots | `road/terrain/bridgeLayout/superstructure/substructure/analysis/cim/deliverables` | `next/project/schema.ts:5-14` |
| Save | `saveUnifiedProject` / `PersistentProjectManager` writes (serialize → zod validate → write) | `next/persistence/unifiedRoundtrip.ts:63-74` |
| Load | `loadUnifiedProject` → migrate → `parseProject` (fail-closed) | `unifiedRoundtrip.ts:80-96` |
| Migration | `migrateProject` (semver, future-major fail-closed) | `next/project/projectDataCore.ts:101-117` |
| workflow | all pages read the same PDC Project via `getProjectManager()` singleton | `next/project/projectManagerInstance.ts`, `workflow/workflowProjectPersistence.ts` |
| viewer | PDC modules → adapters (CIM / Viewer3D) | G-5 doc |

## G-6 changes applied

### A. Canonical Road → analysis input adapter

**Problem (Lane F §8 confirmed):** the production analysis page
(`AnalysisModuleShellPage` → `buildDerivedAnalysisDocument`) requires a
`roadEditorDraft`-format road input (`loadRoadEditorDraft`), but RB001's
`modules.road` stored only `workflowState` (no full `roadData`), so analysis
failed at "解析Documentを生成できませんでした" before reaching the solver.

**Fix (canonical, no fabricated values):**

- `frontend/src/liner/samples/reference-business-001/roadAlignment.ts`:
  `buildRb001RoadDomainDraft()` builds a `LinerDomainDraftVNext` from RB001's
  **trusted** horizontal / vertical / crossSection fixtures (S-3). No invented
  geometry.
- `frontend/src/next/modules/road/roadModuleCanonicalWriter.ts`:
  `writeCanonicalRoadDataToProject()` writes `modules.road.data.roadData`
  (canonical `CanonicalRoadData`, checksum-validated) onto a Project object,
  preserving existing module data (workflowState).
- `frontend/src/liner/samples/reference-business-001/savedProject.ts`:
  RB001 complete project now seeds canonical roadData from the trusted fixture.
- The analysis page can now `readRoadData` → `loadRoadEditorDraft` → build the
  derived AnalysisDocument from the same canonical Road.

**Boundary kept honest:** the `girderSectionModel` remains all-null (no trusted
RB001-specific section values exist; Apollo golden values belong to a different
bridge). Analysis stays `NOT_RUN` / fail-closed. The road adapter only enables
the *input preparation*, not a fabricated result.

### B. Single canonical store confirmed

- `/app` NextApp and `/pro` workflow both use the **same** `getProjectManager()`
  singleton (`next/project/projectManagerInstance.ts`) — one canonical store.
- Workflow Project (`persistWorkflowProject`/`restoreWorkflowProject`) routes
  through `unifiedRoundtrip` + `PersistentProjectManager` (F-2, confirmed).
- No third store was created.

### C. Hidden project state

- Canonical `/app` business data lives only in PDC filesystem persistence
  (`project.json`). No localStorage/React transient state holds canonical
  business data in the `/app` flow.
- `/pro/platform` DesignPlatform keeps its own localStorage manifest
  (`spacer.designPlatform.*`) — this is the **compatibility surface** (G-5),
  not the canonical project runtime.

### D. Legacy boundary

- Legacy `ProjectModel` (numeric schemaVersion v1) + Ajv JSON-Schema chain remain
  **migration/load boundary only** (G-3 matrix). The PDC unified load rejects
  legacy input with an explicit diagnostic pointing to the legacy path.
- After migration / load, the canonical PDC `Project` is the only live runtime
  object.

## Tests

- `acceptance.test.ts` new: "[G-6] canonical road module → analysis input
  adapter" — verifies `modules.road.data.roadData` (canonical) converts via
  `loadRoadEditorDraft` to a valid editor draft (alignment/vertical/crossSections
  from trusted RB001 fixtures).
- RB001 Full E2E 3 PASS (analysis remains honest fail-closed).
- test:fast 3500 PASS / test:ui 786 PASS / test:3d 209 PASS / typecheck PASS.

## RB001 Analysis readiness (separate judgment)

- **Road input adapter: DONE** (this G-6 change).
- **Girder section / plate dimensions: BLOCKED-INPUT** — no trusted
  RB001-specific values exist. Analysis remains honestly `NOT_RUN`.
  This does NOT fail Single App / Single Project completion; it is judged
  separately.
