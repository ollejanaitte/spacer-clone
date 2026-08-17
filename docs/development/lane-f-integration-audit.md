# Lane F — All-Lane Integration Audit (F-1)

> **Phase:** Lane F / F-1
> **Method:** cross-cutting audit of production code, schema, fixtures, tests, and
> docs on `lane-f/integration-e2e` (base `main` 19dfdfb).
> **Classification legend:** BLOCKER / MUST FIX IN F / DEFER TO G / ACCEPTED.
> **Date:** 2026-08-17 (JST)

## Purpose

Verify that the Wave 1–3 lane deliverables (A Persistence, B Site Context
Adapter, T Terrain, V Unified Viewer, U Workflow, S Reference Business 001)
connect as a single product data flow rather than as individually-passing
islands. This is an audit; no new feature development is performed.

## Audit scope and data-flow checks

### 1. Project lifecycle

| Step | Status | Evidence |
|---|---|---|
| Project create | PDC `ProjectManager.createProject` → `PersistentProjectManager` (autosave) | `frontend/src/next/project/projectManager.ts:23`, `persistentProjectManager.ts:130` |
| Site Context import | adapter inspect/import → PDC project into transient `workflowProject` React state | `frontend/src/workflow/SiteContextPage.tsx:170-195`, `App.tsx:1469` |
| Terrain | Gujo sample / DEM → TerrainDocument + assetManifest written into PDC `modules.terrain.data` | `frontend/src/terrain/terrainPersistence.ts:58-100` |
| Road / Bridge / Superstructure / Bearings / Substructure | written into PDC module slots (workflowState + documents) | `frontend/src/workflow/workflowState.ts`, `frontend/src/liner/samples/reference-business-001/*` |
| Analysis | `buildAnalysisModel` → AnalysisDocument (NOT_RUN, fail-closed) | `frontend/src/next/modules/analysis/analysisModel.ts:83-110` |
| 3D | production `CimModuleShellPage` → `Cim3DViewer` (real PDC modules) | `frontend/src/next/pages/CimModuleShellPage.tsx:87-92,264` |
| Save | PDC serialize → project.json (filesystem, temp+rename, backup) | `frontend/src/next/persistence/filesystemProjectPersistence.ts:52-123` |
| Close/Reopen | `restoreFromPersistence` on mount; RB001 pure `saveCloseReopenRb001Project` | `frontend/src/next/NextApp.tsx:89-103`, `frontend/src/liner/samples/reference-business-001/savedProject.ts:111-120` |

### 2. Persistence path (serialize → validation → JSON → migration → validation → hydrate)

- **Legacy canonical chain** is intact and fail-closed:
  `canonicalRoundtrip.ts:30-64` → `validationBoundary.ts` (save/load) →
  `migrationGuard.ts` (future/incompatible versions fail-closed) →
  `projectSchemaValidator.ts` (Ajv2020, `additionalProperties:false`).
- **PDC chain** (`projectDataCore.ts:36-76`): zod `parseProject` (strict),
  `serializeProject`, `deserializeProject`, `migrateProject` with empty
  `PROJECT_MIGRATIONS`. Fail-closed on invalid input.
- **Gap (A↔U):** the unified workflow (Site Context → Road → Bridge) operates
  on a **transient `workflowProject` React state** (`App.tsx:189,1469`) that is
  **never written to `PersistentProjectManager`/filesystem**. All workflow edits
  are lost on page refresh / reopen. RB001 itself is persisted only through a
  pure function used by tests, not a production UI path.

### 3. Terrain source of truth

- Documented contract: IndexedDB (`terrainAssetStore.ts`, store `scp-terrain` /
  `elevations` / `projectId`) = runtime source of truth;
  `modules.terrain.data.assetManifest` = derived serialized view
  (`terrainPersistence.ts:7-21`).
- **Reality:** in production the IndexedDB store is **not wired into
  save/load**; the PDC project JSON `assetManifest` (base64 SCT1) is the de-facto
  persisted terrain. `saveTerrainElevation` / `loadTerrainElevation` /
  `verifyReopenedTerrain` are exercised only by tests.
- **Classification:** MUST FIX IN F (F-2). Resolve the documented-vs-actual
  mismatch without creating a second source of truth: wire IndexedDB into the
  production save/reopen path (seed from assetManifest on `.spacerproj` import,
  verify checksum/assetReference on reopen), or explicitly re-document the
  actual single source of truth. Do not keep two active sources.

### 4. Site Context Adapter (B)

- Public interface frozen (`adapterContract.ts`), drift guard test present
  (`contract.test.ts`, `adapterContract.test.ts`), Status FROZEN.
- Imported project flows to `onProjectChange` → `workflowProject` state →
  workflow pages. **It does not reach `PersistentProjectManager` / filesystem**
  and terrain is not seeded into IndexedDB on import.
- **Classification:** MUST FIX IN F (F-2): make `.sitecontext` import →
  Save → Reopen a real persisted path.

### 5. Unified Viewer (V)

- `UnifiedViewer` + `realScene.ts` build a real scene from real RB001 sample
  data with a **representative deterministic terrain heightfield**
  (`realScene.ts:256,277`) — no production mock mixing, but terrain is not the
  committed project terrain.
- The viewer demo is mounted only via `unified-viewer-demo.html` /
  `demoEntry.tsx`; **not** mounted in `App.tsx` / `NextApp.tsx` / `main.tsx`.
- Production 3D is `Cim3DViewer` (real PDC modules) — a different viewer.
- **Classification:** ACCEPTED with documented boundary (production 3D =
  `Cim3DViewer`; `UnifiedViewer` = demo harness). The demo viewer's representative
  heightfield must not be treated as project terrain. Revisit in F-7 only if the
  RB001 E2E scenario requires the unified viewer specifically; otherwise keep the
  production CIM 3D path as the E2E target.

### 6. Workflow (U)

- 10-step canonical workflow, routes connected, prev/next, status derived from
  project data (no independent progress store) — correct design
  (`canonicalWorkflow.ts`, `projectStatus.ts:1-15`, `workflowState.ts`).
- Back/forward/refresh within one App instance keeps the same `workflowProject`
  (`workflowE2E.test.tsx`). **Full page reload recreates an empty PDC project**
  (`App.tsx:440-447`) because nothing is persisted.
- **Classification:** MUST FIX IN F (F-2): workflow context must survive
  Save/Close/Reopen through the canonical persistence path.

### 7. Reference Business 001 (S)

- Complete RB001 project (`buildRb001CompleteProject`) covers terrain/road/
  bridge/superstructure/substructure/analysis modules and round-trips through
  `serialize/deserialize` — test-verified.
- **Gap:** not reachable from the production UI; the E2E scenario in F-7 must
  open it through a real workflow + save/close/reopen.

### 8. Analysis (RB001 NOT_RUN audit)

- **Why NOT_RUN (confirmed in code):**
  1. `analysisModel.ts:91` and `analysisDocument.ts:103` default
     `analysisStatus: "NOT_RUN"` (no solver invocation).
  2. RB001 superstructure declares `girderSectionModel` with **all-null
     dimensions** (`superstructure.ts:78`).
  3. `computeSuperstructureSectionProperties` returns `null` when any dimension
     is null (`superstructureComponents.ts:29-45`).
  4. `superstructureAdapter.ts:314-328` emits issue "girder section properties
     are NOT_AVAILABLE (analysis cannot run)" and emits a degenerate section
     (area=0) → `analysisValidation.ts:224-244` rejects it → `validation.ok=false`.
  5. No load cases (`buildAnalysisLoads` never called in `buildAnalysisModel`;
     `loadCases`/`loadCombinations` empty).
  6. **Road draft format gap (F-7 confirmed):** the production analysis page
     (`AnalysisModuleShellPage` → `buildDerivedAnalysisDocument` in
     `analysisCimLayer.ts:60-90`) requires `readRoadData` in the
     `roadEditorDraft` format, but RB001's `modules.road` stores only a
     `workflowState` (no full `roadEditorDraft`). The analysis page therefore
     fails at "解析Documentを生成できませんでした（上部工/Bridge Layoutの構成を確認してください）"
     before reaching the solver. Independent of the section gap.
- **Existing trusted section data:** the repo contains golden-derived section
  candidates (`frontend/src/apollo/design/autoDesign.ts:27-36`): depth 2.7 m
  (G-GEO-0008), upper-flange width 0.62 m (G-GEO-0020), web thickness 0.014 m
  (G-GEO-0022), plus full plate dimensions in
  `docs/apollo/step10/reference_bridge_001/phase4/golden/*` (G-DES-*:
  uflg 620×22…, web …, lflg 680×…). **These belong to the Apollo Reference
  Bridge 001 (AG1: 3 spans, ~134 m, girder spacing 4.5 m), which is a
  DIFFERENT structure from RB001 (6 spans × 50 m, girder spacing 8 m).**
  Connecting them to RB001 would be importing another bridge's design values —
  fabrication-by-attribution, not a legitimate data connection.
- **F-7 conclusion:** RB001 analysis requires (a) a full `roadEditorDraft`
  road model and (b) RB001-specific girder section / plate dimensions. Neither
  exists as trusted repo data. Per Lane F rules: no fabricated values, no
  fake Full-E2E PASS. Analysis stays honestly NOT_RUN (fail-closed). This is a
  documented blocker with the exact missing inputs listed above.
- **Classification:** BLOCKER (analysis RUN) — RB001-specific section + road
  draft data missing. Wave-3 fail-closed NOT_RUN is the honest state.

### 9. Duplicated runtime state / dual Project model

- Dual Project model (legacy `ProjectModel` + new PDC `Project`) coexists with
  independent schemas / validation (Ajv vs zod) / persistence roots.
  **DEFER TO G** (explicitly Lane G work; do not remove in F).
- Terrain dual representation (IndexedDB vs project-JSON assetManifest) is a
  real gap → MUST FIX IN F (F-2, see §3).
- Transient `workflowProject` is an unpersisted third state → MUST FIX IN F (F-2).
- Workflow progress correctly lives inside PDC modules (no independent store) —
  ACCEPTED.

### 10. Stale docs / dead route / dead adapter / duplicate public interface

- `docs/development` has no lane-f doc; this audit doc is the first (this file).
- No dead PDC routes found; production 3D uses `Cim3DViewer` (not the demo
  `UnifiedViewer`). The demo entry is explicitly separate — ACCEPTED.
- Site Context default input is a synthetic package
  (`buildSyntheticSiteContextPackage`, `workflow/samplePackage.ts:78`) — a
  documented convenience; real `.sitecontext` fixtures exist in adapter tests.

## Issue classification summary

| # | Issue | Classification | Owner phase |
|---|---|---|---|
| 1 | Workflow edits live in transient `workflowProject` React state; lost on refresh/reopen; not persisted via canonical path | MUST FIX IN F | F-2 |
| 2 | `.sitecontext` import result not persisted to filesystem; terrain not seeded into IndexedDB on import | MUST FIX IN F | F-2 |
| 3 | Terrain IndexedDB store not wired into production save/reopen; project-JSON assetManifest is de-facto truth (documented-vs-actual mismatch) | MUST FIX IN F | F-2 |
| 4 | RB001 analysis NOT_RUN; existing golden-derived section data can be connected (or blocker) | MUST FIX IN F | F-7 |
| 5 | No E2E coverage for PDC `/app`, workflow, RB001, or unified viewer | MUST FIX IN F | F-3/F-4/F-7 |
| 6 | E2E tiering incomplete (only `test:e2e:smoke` exists; no critical/full) | MUST FIX IN F | F-4 |
| 7 | CI runs only test:fast/typecheck/build; no E2E smoke, UI/3D, or E2E isolation wiring | MUST FIX IN F | F-5 |
| 8 | No mechanical enforcement of dev rules (PDC schema drift guard absent; E2E fixture rule / skip/fixme policy not enforced) | MUST FIX IN F | F-6 |
| 9 | Dual Project model (legacy + PDC) | DEFER TO G | G |
| 10 | `UnifiedViewer` demo not mounted in production; production 3D = `Cim3DViewer` | ACCEPTED (documented boundary) | — |
| 11 | Representative terrain heightfield in viewer demo is not project terrain | ACCEPTED (demo boundary) | — |
| 12 | Wave-3 fail-closed NOT_RUN analysis (no fabricated results) | ACCEPTED (Wave 3) / re-open in F-7 | F-7 |

## Small integration fixes applied during F-1

None required beyond this document (audit only). All MUST FIX IN F items are
executed in F-2…F-7 with per-step commits.