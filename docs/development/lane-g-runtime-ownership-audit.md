# Lane G — G-1 Residual PORT / Runtime Ownership Audit

> **Phase:** Lane G / G-1
> **Method:** cross-cutting audit of production code, import graphs, route graph,
> and runtime read-write paths. No large deletions performed in G-1; only clearly
> evidenced small dead code may be removed.
> **Classification legend:** CANONICAL / COMPATIBILITY ONLY / DUPLICATE /
> PORT REQUIRED / RETIRE CANDIDATE / DEFERRED BLOCKER.
> **Date:** 2026-08-17 (JST)
> **Base:** origin/main d91e6caa10408c84bfc9a7fd75efc1f43c3d8558 (Lane F completion)

## Purpose

Before any removal, measure what is actually used in production. Determine the
single canonical owner for each runtime responsibility so that G-2…G-8 can
safely remove duplicates, complete migration, retire old runtimes, and converge
to one App / one Project / one persistence / one Terrain ownership.

## 1. Project model / type

| Component | Path | Classification |
|---|---|---|
| Legacy `ProjectModel` | `frontend/src/types.ts:250-296` | **COMPATIBILITY ONLY** |
| PDC `Project` (zod `projectSchema`) | `frontend/src/next/project/schema.ts:27-46` | **CANONICAL** |
| PDC create/parse/serialize/migrate | `frontend/src/next/project/projectDataCore.ts:12-117` | **CANONICAL** |
| Legacy JSON Schema contract (`schemas/project.schema.json`) + Ajv | `schemas/project.schema.json` (3113 lines), `frontend/src/persistence/projectSchemaValidator.ts:1-12` | **COMPATIBILITY ONLY** (legacy persisted format contract) |
| zod (PDC module schemas + parseProject) | `frontend/src/next/modules/*`, `projectDataCore.ts:36-76` | **CANONICAL** |
| Legacy migration shim | `frontend/src/projectMigration.ts:3-16` | **COMPATIBILITY ONLY** |
| Legacy fail-closed migration chain | `frontend/src/persistence/migrationGuard.ts:168-221` | **COMPATIBILITY ONLY** |
| PDC migration (semver, future fail-closed) | `frontend/src/next/project/projectDataCore.ts:91-117` | **CANONICAL** |
| Unified roundtrip (PDC save/load JSON) | `frontend/src/next/persistence/unifiedRoundtrip.ts:80-143` | **CANONICAL** |
| `PersistentProjectManager` + `FilesystemProjectPersistence` | `frontend/src/next/project/persistentProjectManager.ts:13-242`, `frontend/src/next/persistence/filesystemProjectPersistence.ts:52-125` | **CANONICAL** |
| `filesystemProjectRepository.ts` | `frontend/src/next/persistence/filesystemProjectRepository.ts:9` | **DUPLICATE / RETIRE CANDIDATE** (test-only, unused in production) |
| Design Platform business registry + localStorage manifest | `frontend/src/platform/business/businessRegistry.ts:3,135-169`, `frontend/src/platform/storage/businessProjectPersistence.ts:10,42-81` | **DUPLICATE** (business-list runtime, separate model) |
| LINER importer localStorage projects | `frontend/src/liner/importer/storage/importerStorage.ts:8-10` | **DUPLICATE** (parallel project store; import-only into PDC) |

### 1.1 Runtime ownership table (who writes / who reads / who is canonical)

| Concern | Writer | Reader | Canonical |
|---|---|---|---|
| New-project create | `NextApp.tsx` / `NewProjectPage` / `projectManager.createProject` | `/app` pages | PDC `Project` via `getProjectManager()` |
| Workflow (site context/road/bridge) | `App.tsx:410-483` `persistWorkflowProject` → `workflowProjectPersistence.ts:68-83` | `App.tsx:453-475` restore; workflow pages | PDC `Project` (filesystem) |
| Legacy FEM model | `App.tsx` `commitProject` (line 290) | `/pro` FEM shell / Viewer3D / analysis | legacy `ProjectModel` (in-memory + file dialog) |
| Business list (/pro/platform) | `businessRegistry` localStorage | `BusinessWorkspace` | localStorage manifest (**DUPLICATE**) |

### 1.2 Decision for G-6 (Single Project)

- **CANONICAL Project = PDC `Project`** (`frontend/src/next/project/schema.ts`),
  persisted via `PersistentProjectManager` → `FilesystemProjectPersistence`
  (Electron IPC filesystem; browser fallback is in-memory `MemoryFileSystemGateway`).
- Legacy `ProjectModel` + Ajv JSON-Schema chain retained **as migration/compatibility
  boundary only** (load old project.json → migrate → hydrate to canonical).
- `filesystemProjectRepository.ts` is test-only dead code → retire in G-2/G-4.

## 2. Route / UI

| Entry | Routes | Classification |
|---|---|---|
| **`/app` NextApp** | `/app`, `/app/business*`, `/app/projects/*/modules/*` | **CANONICAL** (self-declared production, `next/pages/HomePage.tsx:62`; Electron dev entry) |
| `/pro` `App` FEM shell + all sub-branches | `/pro`, `/pro/workflow/*`, `/pro/site-context`, `/pro/liner*`, `/pro/importer*`, `/pro/apollo*`, `/pro/compare`, `/pro/th/*` | **DUPLICATE / legacy runtime** (reference asset; workflow pages inside it consume the same PDC manager) |
| `/pro/platform` DesignPlatform (business list/workspace) | `/pro/platform*` | **DUPLICATE** (third business model in localStorage) |
| `LobbyApp` | `/`, `/learn`, `/level0*` | **RETIRE CANDIDATE** as production business entry (landing/learn portal only) |
| legacy redirects `/th/*`, `/compare` | `frontend/src/timeHistory/routeRedirect.ts:1-21` | **COMPATIBILITY ONLY** (replaceState rewrite) |
| Apollo entry guard | `frontend/src/apollo/entryGuard.ts:15-26` | **COMPATIBILITY ONLY** (flag-gated deny+redirect) |

### 2.1 Route reachability notes

- `main.tsx:24` calls `redirectLegacyRoutes()` before routing; then
  `isNextAppPath` → `/pro*` → `LobbyApp`.
- Electron dev entry = `http://127.0.0.1:5173/app` (`desktop/electron/main.ts:79`).
  **Packaged `file://` entry falls through to `LobbyApp`** (does not match `/app`
  or `/pro`) — G-5 must fix so packaged Electron reaches the canonical app.
- Lobby "実務編" button targets `/pro/platform` (`lobby/designPlatformEntry.ts:6`),
  not `/app` — G-5 redirect to canonical app.

### 2.2 Decision for G-5 (Single App)

- **CANONICAL production app = `/app` (NextApp)** for the business/project runtime.
- `/pro` retained as compatibility/legacy reference surface, reachable only via
  explicit links from `/app` (not the default landing). Old `/pro/platform` →
  redirect to `/app/business` canonical path. Lobby becomes landing only.

## 3. Terrain

| Component | Path | Classification |
|---|---|---|
| PDC terrain module slot | `frontend/src/next/project/schema.ts:36`, `next/modules/terrainModule.ts:31-43` | **CANONICAL** |
| `assetManifest` (base64 SCT1 inside project JSON) | `frontend/src/terrain/terrainPersistence.ts:71-78` → `modules.terrain.data.assetManifest` | **CANONICAL (de-facto production source of truth)** |
| `terrainDocument` (surfaceReference / assetReferences metadata) | `next/modules/terrainModule.ts:37-38`; consumed by bridgeLayout/CIM/substructure | **CANONICAL (metadata)** |
| IndexedDB store (`scp-terrain`/`elevations`, port of site-context) | `frontend/src/terrain/terrainAssetStore.ts:48-143` | **RETIRE CANDIDATE** — documented as runtime truth (`terrainPersistence.ts:7-21`) but **never instantiated/wired in production** (`createIndexedDbTerrainElevationStore` has zero production callers; save/load only in tests) |
| `saveTerrainElevation` / `loadTerrainElevation` / `verifyReopenedTerrain` | `frontend/src/terrain/terrainPersistence.ts:174-252` | **RETIRE CANDIDATE** (test-only) |
| `reopenUnifiedProject` store verification | `frontend/src/next/persistence/unifiedRoundtrip.ts:108-143` | **RETIRE CANDIDATE** (test-only path) |
| `.sitecontext` import elevation | `frontend/src/next/integration/siteContext/siteContextMapping.ts:339-340` | **GAP** — writes path refs only; elevation bytes not embedded/seeded on import |

### 3.1 Runtime ownership table

| Concern | Writer | Reader | Canonical |
|---|---|---|---|
| Elevation bytes (production) | `persistTerrain` (`terrainPersistence.ts:58-100`) — GUJO button `SiteContextPage.tsx:285`, RB001 loader `savedProject.ts:61`, tutorial `tutorialSample.ts:80` | reopen via `workflowProjectPersistence.ts:89-109` / `filesystemProjectPersistence.ts:98-125` (PDC JSON) | **project JSON `assetManifest` (base64)** |
| Elevation bytes (IndexedDB) | test only | test only | — (documented-as-canonical but unwired) |
| Terrain metadata | `siteContextMapping`, `terrainImportAdapter`, fixtures | bridgeLayout/CIM/substructure | `modules.terrain.data.terrainDocument` |

### 3.2 Decision for G-2 (Terrain final ownership)

- **Keep the product-correct de-facto canonical: project JSON `assetManifest`
  (base64 SCT1) is THE runtime + serialization source of truth.** Reasons:
  single-file `.spacerproj` package self-containment, deterministic
  Save/Close/Reopen across machines, no browser-storage quota dependency, works
  in browser fallback and Electron identically. This is also what
  site-context-prototype's `packageExport.ts` ultimately does (embed elevation
  into the package zip).
- **Close the documented-vs-actual gap:** update `terrainPersistence.ts` header
  contract + docs so the manifest is the declared canonical, and **retire the
  IndexedDB runtime ownership claim**. The IDB store module may remain only as a
  compatibility/test seam or be removed entirely per G-2 evidence.
- **Close the `.sitecontext` import gap:** on `.sitecontext` import where the
  elevation binary resource is available in the package, seed
  `assetManifest`/base64 into `modules.terrain.data` so Save→Close→Reopen keeps
  the terrain (G-3/G-6). If the source package has no embedded binary, fail-closed
  with an explicit "elevation not embedded" state — never fabricate.

## 4. site-context-prototype residual PORT candidates

Reference: `/home/masaharu/Projects/site-context-prototype` (HEAD
9e499c0, absorbed repo, canonical = spacer-clone).

| Prototype asset | Status in SPACER | Classification |
|---|---|---|
| Terrain store (`app/src/store/terrainAsset.ts`, IndexedDB scp-terrain/elevations) | PORTed T-5 (`terrainAssetStore.ts`) — but unwired in production | **RETIRE CANDIDATE** (see §3; manifest becomes canonical) |
| DEM fetch/cache (`app/src/map/demFetch.ts`) | not ported | **PORT REQUIRED only if production DEM import is needed** — currently no production caller; G-2 re-evaluate. Defer unless required. |
| DemWizard UI (`app/src/components/DemWizard.tsx`) | not ported | DEFERRED (no production caller) |
| Package export (`app/src/store/packageExport.ts`) | equivalent = `.spacerproj` package (`next/persistence/package/projectPackage.ts`) | **CANONICAL (SPACER equivalent exists)** |
| Node generation persistence (`packages/core/src/persistence/generation.ts`) | not ported (SPACER chose single-file project.json + base64) | **RETIRE CANDIDATE / NOT PORTED** — superseded by canonical single-file design |
| GeoTIFF/XYZ importers (`packages/core/src/importer/*`) | SPACER has `next/modules/terrain/terrainImport.ts` | not needed |
| businessStore (`app/src/store/businessStore.ts`) | not ported | DEFERRED (SPACER `/app/business` PDC list supersedes) |

## 5. Viewer

| Component | Path | Classification |
|---|---|---|
| `Viewer3D` (production /pro 3D) | `frontend/src/viewer/Viewer3D.tsx` (wired `App.tsx:1715-1741`) | **CANONICAL (current production viewer)** |
| `Cim3DViewer` | `frontend/src/next/components/Cim3DViewer.tsx:74` (only `/app` CimModuleShellPage) | **CANONICAL within `/app`** |
| `UnifiedViewer` + `buildLayerScene` + `layerContract` (Lane V) | `frontend/src/viewer/unified/`, `viewer/layers/` | **PORT REQUIRED → intended canonical viewer (disconnected)** — demo-entry only today; G-5 must wire to production data path OR explicitly keep Viewer3D as canonical and document. |
| `demoEntry.tsx` + `unified-viewer-demo.html` | `frontend/src/viewer/unified/demoEntry.tsx`, `frontend/unified-viewer-demo.html` | **RETIRE CANDIDATE** (demo harness) |
| Apollo visualization model builder | `frontend/src/apollo/visualization/` | COMPATIBILITY (feeds Viewer3D as data model) |
| MountainViaduct sample viewer | `frontend/src/liner/samples/mountain-viaduct-500/viewer.tsx` | COMPATIBILITY (sample-scoped) |

### 5.1 Decision path for G-5/G-6

- Single data path: **canonical Project (PDC) → viewer adapter → one 3D entry.**
- Lane V `UnifiedViewer` is the design-intended replacement; G-5 will either wire
  it to the production PDC data path (preferred per lane intent) or, if not
  product-ready, formally keep `Viewer3D`/`Cim3DViewer` as canonical and mark
  `UnifiedViewer` demo as retired harness. No third viewer may be created.

## 6. Workflow

| Component | Path | Classification |
|---|---|---|
| Canonical workflow model (10 steps) | `frontend/src/workflow/canonicalWorkflow.ts:28-138` | **CANONICAL** |
| Workflow state writes into PDC modules | `frontend/src/workflow/workflowState.ts:71,107,126` | **CANONICAL** |
| Workflow persistence | `frontend/src/workflow/workflowProjectPersistence.ts:68-125` → `unifiedRoundtrip` + `PersistentProjectManager` | **CANONICAL** (F-2 fixed transient-state gap) |
| Workflow progress | derived from PDC modules (`projectStatus.ts`) | CANONICAL (no independent store — ACCEPTED) |

## 7. LINER legacy (incl. stale E2E 8件)

### 7.1 Runtime

| Component | Path | Classification |
|---|---|---|
| LINER save serializer | `frontend/src/liner/adapters/linerProjectDraft.ts:145` `serializeProjectForPersistence` (embeds RDD, strips domain/draft/drawingDocument) | **COMPATIBILITY / current legacy path** |
| LINER load hydration | `frontend/src/liner/adapters/linerProjectDraft.ts:99` `hydrateProjectLinerFromPersistence` | **COMPATIBILITY / current legacy path** |
| Legacy LINER draft→vNext migration | `frontend/src/liner/adapters/linerProjectDraft.ts:120-137` | COMPATIBILITY |
| LINER E2E stale specs (p1-d05, p3-f03, p4-d01..d04, p4-d08) | `frontend/tests/e2e/p1-d05-*.spec.ts`, `p3-f03-*.spec.ts`, `p4-d0{1,2,3,4,8}-*.spec.ts` | **DEFERRED BLOCKER → G-3 judgment** |

### 7.2 Stale E2E disposition plan (executed in G-3, with evidence)

| Spec | Failure cause (from audit) | G-3 disposition (to confirm against code) |
|---|---|---|
| p1-d05 | asserts old save-button title (`:67-70`) | update to current spec (or compatibility) |
| p3-f03 | asserts `drawingDocument`, now stripped by serializer (`:181-184`) | update to current RDD spec, or move to compatibility |
| p4-d01 | legacy save/load flow | update or compatibility/retire per evidence |
| p4-d02 | legacy save/load flow | update or compatibility/retire per evidence |
| p4-d03 | legacy save/load flow | update or compatibility/retire per evidence |
| p4-d04 | legacy save/load flow | update or compatibility/retire per evidence |
| p4-d08 | asserts `drawingDocument`; roundtrip | update to current spec, or compatibility |

Rule: no deletion-only green. Each spec is updated to current behavior, moved to
a compatibility test tier, or retired with code-based justification.

## 8. Analysis (RB001)

Per Lane F §8 (audit confirmed, unchanged):
- production analysis page requires `roadEditorDraft`-format road input
  (`analysisCimLayer.ts:60-90`), while RB001 `modules.road` holds only
  `workflowState`. → **canonical Road → analysis-input adapter** is a legitimate
  G-6 implementation (no fabricated values).
- `girderSectionModel` all-null, load cases empty. Trusted RB001-specific section
  values are **not present**; Apollo golden values belong to a different bridge
  (AG1 3-span vs RB001 6×50m) → **must not be imported**.
- **Decision:** G-6 adds the road→analysis adapter if the canonical road module
  can produce the required input shape; girder section stays honest NOT_RUN.
  RB001 analysis readiness is judged separately from Single App/Single Project
  completion.

## 9. G-1 evidence-backed small cleanups

Per G-1 rules (small dead code only, with evidence, targeted test):
- None removed in G-1. `filesystemProjectRepository.ts` and IndexedDB terrain
  store are deferred to G-2/G-4 where usage==0 is re-verified before removal.

## 10. Summary classification

| Item | Classification |
|---|---|
| PDC `Project` + zod + PersistentProjectManager + FilesystemProjectPersistence | **CANONICAL Project + persistence** |
| Legacy `ProjectModel` + Ajv JSON-Schema chain | **COMPATIBILITY ONLY (migration/load boundary)** |
| `/app` NextApp | **CANONICAL production app** |
| `/pro` App + DesignPlatform + importer localStorage | **DUPLICATE (legacy/parallel)** |
| project JSON `assetManifest` (base64) | **CANONICAL terrain ownership (final)** |
| IndexedDB terrain store + `saveTerrainElevation`/`loadTerrainElevation`/`verifyReopenedTerrain` | **RETIRE CANDIDATE (unwired)** |
| `.sitecontext` import elevation seeding | **GAP → G-3/G-6** |
| `UnifiedViewer` (Lane V) | **PORT REQUIRED (disconnected)** → wire or retire in G-5 |
| Viewer3D / Cim3DViewer | CANONICAL production viewers today |
| `filesystemProjectRepository.ts` | **DUPLICATE / RETIRE CANDIDATE (test-only)** |
| LINER stale E2E 7件 | **DEFERRED BLOCKER → G-3 individual judgment** |
| RB001 analysis girder section | **DEFERRED BLOCKER (no trusted values → NOT_RUN)** |
