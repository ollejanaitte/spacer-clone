# Lane G — G-4 Old Runtime Retirement Manifest

> **Phase:** Lane G / G-4
> **Status:** COMPLETE
> **Date:** 2026-08-17 (JST)
> **Base:** origin/main d91e6caa10408c84bfc9a7fd75efc1f43c3d8558 (Lane F completion)

## Purpose

After G-2/G-3 moved callers to the canonical path, retire old runtimes that are
no longer reachable from production, and isolate required compatibility code.

## Retirement rule applied (per removal)

Before each removal we verified: `rg`/grep usage, import graph, route
reachability, tests, migration dependency, external export/import dependency.
No batch deletion; each item removed individually with evidence.

## Removed (G-4)

| Item | Path | Evidence | Replacement |
|---|---|---|---|
| IndexedDB terrain store implementation (`createIndexedDbTerrainElevationStore`, `openDb`, `IndexedDbLike`, `DB_NAME/STORE/DB_VERSION`) | `frontend/src/terrain/terrainAssetStore.ts` | zero callers in production **and** tests (grep confirmed; tests use `createMemoryTerrainElevationStore` only) | `TerrainElevationStore` interface + memory store kept as test-only seam |
| Low-level store wrappers `saveTerrainBinary` / `loadTerrainBinary` | `frontend/src/terrain/terrainPersistence.ts` | zero callers in production **and** tests | removed; `saveTerrainElevation`/`loadTerrainElevation` (test seam) retained |
| `filesystemProjectRepository.ts` (repository cache wrapper) | `frontend/src/next/persistence/filesystemProjectRepository.ts` | production usage 0; canonical path = `PersistentProjectManager` + `InMemoryProjectRepository`; duplicate behavior covered by `restartRestore`/`projectManager` tests | removed in G-2 (same manifest) |

## Retained for compatibility / tests

| Item | Path | Why |
|---|---|---|
| `saveTerrainElevation` / `loadTerrainElevation` / `verifyReopenedTerrain` | `terrain/terrainPersistence.ts` | test seam for legacy site-context terrain store semantics (used by `terrainRoundtrip`/`unifiedRoundtrip`/`acceptance` tests) |
| `TerrainElevationStore` interface + `createMemoryTerrainElevationStore` | `terrain/terrainAssetStore.ts` | test-only seam (memory store) |
| `reopenUnifiedProject` store cross-check param | `next/persistence/unifiedRoundtrip.ts` | test-only seam; documented as retired-runtime cross-check |
| legacy `ProjectModel` + Ajv JSON-Schema chain | `types.ts`, `persistence/validationBoundary.ts`, `schemas/project.schema.json` | **migration/load boundary** — legacy project.json read support (G-3 matrix) |
| `migrationGuard` / `projectMigration` | `persistence/migrationGuard.ts`, `projectMigration.ts` | legacy fail-closed migration boundary |
| `/pro` FEM App (legacy reference) | `App.tsx` | retained as legacy reference surface until G-5 Single App decision |
| `unified-viewer-demo.html` + `demoEntry.tsx` | `frontend/unified-viewer-demo.html`, `viewer/unified/demoEntry.tsx` | Lane V viewer demo harness; kept pending G-5 viewer wiring decision (not production-reachable) |
| synthetic site-context package | `workflow/samplePackage.ts` | documented convenience default (Lane F audit §10 ACCEPTED); production default input, not dead code |
| LINER importer localStorage store | `liner/importer/storage/importerStorage.ts` | import-only ingestion store; G-5/G-6 will redirect import into canonical path |

## Deferred

| Item | Reason |
|---|---|
| `/pro/platform` DesignPlatform business-list runtime (localStorage) | duplicate business-list runtime vs `/app` PDC — G-5 Single App decides canonical route, then redirect/retire |
| `/pro` legacy FEM surface | G-5 Single App decides `/app` vs `/pro` |
| UnifiedViewer demo vs Viewer3D | G-5 viewer data-path decision |
| LINER legacy `/pro/liner*` UI flow | G-5/G-6 single-app/single-project consolidation |

## Post-retirement gates

- `npm run test:fast` 3499 PASS
- `npm run test:ui` 786 PASS
- `npm run build` PASS
- `npm run typecheck` PASS
- terrain/persistence/RB001 targeted tests PASS

## Key invariant

No production runtime keeps two sources of truth. IndexedDB is fully removed as
a runtime store; the project JSON `assetManifest` (base64 SCT1) is the sole
canonical terrain owner. The memory store remains only as a test seam.
