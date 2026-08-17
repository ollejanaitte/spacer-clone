# Lane G — G-3 Legacy Migration Completion (Migration Support Matrix)

> **Phase:** Lane G / G-3
> **Status:** COMPLETE
> **Date:** 2026-08-17 (JST)
> **Base:** origin/main d91e6caa10408c84bfc9a7fd75efc1f43c3d8558 (Lane F completion)

## Purpose

Complete the final migration boundary so legacy inputs are not thrown away but
safely absorbed into the Single (canonical) Project. This document is the
migration support matrix and records the disposition of every legacy input type
and the stale LINER E2E specs.

## Canonical lifecycle (G-3 target)

```
legacy input
  → inspect/detect
  → explicit migration
  → canonical Project (PDC zod)
  → official validation (parseProject, fail-closed)
  → save in current format (project.json / .spacerproj)
  → reopen
  → canonical runtime only (no live legacy object)
```

## Supported legacy inputs (matrix)

| # | Input | Detect | Migrate | Validate | Disposition |
|---|---|---|---|---|---|
| 1 | `.sitecontext` package (ProjectV2, exported from site-context-prototype) | `next/integration/siteContext/importAdapter.ts` (envelope format/version/profile + schemaVersion) | `buildMappingOutcome` → PDC `Project` with metadata + module slots | `validateTargetProject` (zod parseProject, fail-closed) | **CANONICAL IMPORT** — G-2 seeds elevation assetManifest so terrain survives Save→Close→Reopen |
| 2 | PDC `Project` JSON (current format, string semver `1.0.0`) | `unifiedRoundtrip.detectSchemaVersion` (string) | `projectDataCore.migrateProject` (future-major fail-closed) | `parseProject` (zod) | **CANONICAL** |
| 3 | Legacy `ProjectModel` JSON (numeric `schemaVersion` v1, FEM bridge model) | `/pro` legacy chain: `validateLoadedProjectJsonBeforeHydrate` → `migrationGuard.migrateProjectSafely` | `MIGRATION_CHAIN` (v1→current, empty steps today) | Ajv `schemas/project.schema.json` | **COMPATIBILITY / legacy canonical path** (`/pro`). Not auto-migrated into PDC in Lane G; PDC path fails it closed with a clear diagnostic. |
| 4 | `schemaVersion` missing | `migrationGuard` treats missing numeric version as legacy v1; PDC path treats missing string as fail-closed | legacy: back-fill v1; PDC: reject | Ajv / zod | **COMPATIBILITY** (legacy) / **fail-closed** (PDC) |
| 5 | future / incompatible schemaVersion | `migrationGuard` (`future-version` / `incompatible-version`), `projectDataCore.isFutureSchemaVersion` | none — rejected | n/a | **FAIL-CLOSED** |
| 6 | corrupt / invalid JSON | `validateLoadedProjectJsonBeforeHydrate` (`invalid-json`), `unifiedRoundtrip` JSON.parse guard | none — rejected | n/a | **FAIL-CLOSED** |
| 7 | LINER persisted data (roadDesignDocument RDD) | `linerProjectDraft.hydrateProjectLinerFromPersistence` | `roadDesignDocument → domainDraft` (`:99-118`), legacy `draft → vNext` (`:120-137`) | LINER frame validation | **CANONICAL within legacy ProjectModel**; roundtrip covered by `linerProjectDraft.test.ts` (30) + `App.linerSaveLoad.test.tsx` |
| 8 | old `.spacerproj` package | package builder `next/persistence/package/projectPackage.ts` (single `project.json`) | PDC `loadUnifiedProject` | `parseProject` | **CANONICAL** |

## Migration rules enforced

- **future/incompatible:** fail-closed (never silently treated as latest).
- **corrupt:** fail-closed (never partially hydrated).
- **unknown extra fields:** PDC `projectSchema` is `strictObject` — unknown fields
  are rejected at parse (fail-closed); legacy Ajv schema uses
  `additionalProperties: false`.
- **after migration:** no live legacy runtime object is kept; the canonical PDC
  `Project` is the only runtime representation.

## G-2 / G-3 terrain integration

- `.sitecontext` import now embeds elevation base64 into
  `modules.terrain.data.assetManifest` (`siteContextMapping.ts`, G-2), closing
  the F-1/F-2 "elevation bytes lost on import" gap. Save→Close→Reopen restores
  terrain from the project itself.
- `mappingManifest.ts` documents the elevation embedding.

## G-3 disposition: legacy LINER stale E2E (7 specs)

All 7 were failing at the Lane F baseline as KNOWN_BROKEN_PREEXISTING. Root
cause (confirmed by run + code):

- A-05 `validatePersistedProjectForSave` (`validationBoundary.ts:70-81`)
  fail-closes saving any project whose persisted form does not satisfy the
  official Ajv schema (`schemas/project.schema.json`): non-empty
  `nodes/materials/sections/loadCases` and `analysisSettings.solver` required.
- The specs build a LINER-only model on an **empty FEM base** and expect a save
  to succeed — a pre-A-05 contract the current product spec intentionally rejects.

**Judgment per spec: RETIRE (with evidence).** Equivalent functionality is
covered by current-spec tests:

| Spec | Assertion being tested | Current-spec coverage |
|---|---|---|
| p1-d05 LINER save/load | RDD roundtrip | `App.linerSaveLoad.test.tsx:186` |
| p3-f03 RDD bridge/drawing persistence | bridge layout + drawing settings, DrawingDocument not persisted | `App.linerSaveLoad.test.tsx:261,409` |
| p4-d01 multi-alignment | alignments | `linerProjectDraft.test.ts` |
| p4-d02 ldist | ldistJobs roundtrip | `linerProjectDraft.test.ts:571,606` |
| p4-d03 haunch | haunch capability | `linerProjectDraft.test.ts` |
| p4-d04 hoso | hoso capability | `linerProjectDraft.test.ts` |
| p4-d08 roundtrip | full roundtrip + DrawingDocument stripping | `App.linerSaveLoad.test.tsx:409`, `linerProjectDraft.test.ts` |

Actions taken:
- Removed from `FULL_SPECS` (`frontend/playwright.tiers.ts`).
- Moved to `frontend/tests/e2e/retired/legacy-liner-save-load/` (with README).
- Excluded from default `test:e2e` via `testIgnore` (`frontend/playwright.config.ts`).
- `p4-d05` / `p4-d06` (critical tier) are current-spec and retained.

No deletion-only-for-green: each spec's covered behavior is retained in
current-spec jsdom + unit tests, and the retirement rationale is documented here
and in the retired README.
