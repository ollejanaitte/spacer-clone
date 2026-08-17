# Lane G — G-7 Final Product Acceptance Report

> **Phase:** Lane G / G-7
> **Status:** COMPLETE
> **Date:** 2026-08-17 (JST)
> **Base:** origin/main d91e6caa10408c84bfc9a7fd75efc1f43c3d8558 (Lane F completion)

## Method

Acceptance A–J are demonstrated with the F-4 E2E tiering (smoke/critical/full),
targeted unit/integration tests, and the production route/owner audits from
G-1…G-6. No new E2E infrastructure was created (per G-7 rule).

## Acceptance A — New Project

| Step | Evidence |
|---|---|
| App起動 → Business/Project作成 | `fixture-standardization.spec.ts` (smoke): `createProjectViaUi` → 業務一覧表示 → UUID projectId |
| Site Context / Terrain / Road / Bridge / Super / Sub / Analysis / 3D | `workflowE2E.test.tsx` (U-7): full workflow keeps the same PDC Project; `App.siteContextRoute.test.tsx` deep link |
| Save / Close / Reopen | `fixture-standardization` delete lifecycle + RB001 Full E2E Save→Close→Reopen |

**PASS** (canonical `/app` flow).

## Acceptance B — Reference Business 001

`reference-business-001-full.spec.ts` (full tier, 3 tests):

1. complete workflow: load → terrain(EPSG:6674) → road → bridge(6×50m) →
   superstructure → bearings → substructure → analysis → CIM 3D →
   deliverables → Save → Close → Reopen → no data loss → no console error.
2. EPSG:6674 / Gujo coordinate context preserved.
3. deterministic schema-valid project (UUID id).

Analysis page shows honest fail-closed message (NOT_RUN; no fabricated results).

**PASS** (3/3).

## Acceptance C — Legacy

| Input | Evidence |
|---|---|
| Legacy ProjectModel JSON (numeric v1) | `persistence/__tests__/migrationGuard.test.ts` (missing→v1, future/incompatible fail-closed), `validationBoundary.test.ts` (legacy v1 load), `unifiedRoundtrip.test.ts` (G-3 legacy rejection diagnostic) |
| migration → current save → reopen → canonical only | legacy chain intact on `/pro` (compat); PDC path explicitly redirects legacy to compatibility |

**PASS** (fail-closed + compatibility boundary).

## Acceptance D — .sitecontext

| Step | Evidence |
|---|---|
| import → canonical Project | `importAdapter.test.ts` (mapping, checksum, fail-closed) |
| Terrain seeding | `importAdapter.test.ts` "[G-2] seeds the elevation assetManifest on import" |
| Save → Reopen | `unifiedRoundtrip.test.ts` "F-2 Site Context import → Save → Reopen" |

**PASS** (G-2 elevation seed closes the F-1/F-2 gap).

## Acceptance E — old URL

- Lobby 実務編 → `/app/business` (canonical) — `design-platform-electron-startup.spec.ts` test1,
  `level0-navigation.spec.ts` professional test.
- `/pro` legacy reachable only via explicit link (HomePage `home-legacy-reference`).
- `/pro/platform` DesignPlatform retained as compatibility (smoke E2E passes).

**PASS** (single canonical entry; legacy URL = explicit/redirect).

## Acceptance F — Electron

- dev entry `/app` (`NEXT_APP_ENTRY`); packaged `file://` → `/app` (G-5 fix).
- `npm run electron:compile` PASS.

**PASS**.

## Acceptance G — no duplicate runtime

- IndexedDB terrain store: removed (G-4) — `grep` shows zero production callers.
- `filesystemProjectRepository`: removed (G-2) — zero references.
- Canonical save owner: PDC `PersistentProjectManager`; `/pro` App.tsx save is
  the legacy compatibility surface (G-5).
- Single canonical store: `/app` + `/pro` workflow share `getProjectManager()`.

**PASS** (audit + removal in G-2/G-4).

## Acceptance H — Terrain

Final ownership: project JSON `assetManifest` (base64 SCT1) = runtime + serialization
source of truth. Reopen restores terrain from the project itself.

- `acceptance.test.ts` "Reopen preserves terrain"
- `terrainIntegrationAcceptance.test.ts` (roundtrip + checksum)
- RB001 Full E2E terrain-module-doc after reopen.

**PASS** (G-2/G-4 final contract).

## Acceptance I — Viewer / coordinates

`integrated3d.test.ts` (S-8): Terrain + Road + Bridge + Superstructure + Bearings +
Substructure in one canonical EPSG:6674 frame; layer bounds overlap.

**PASS**.

## Acceptance J — Export / Deliverables

- RB001 Full E2E: `deliverables-module-page` reachable (fail-closed export).
- `DeliverablesModuleShellPage` uses canonical PDC modules; export gated by
  readiness (no artifact bytes fabricated).
- `deliverablesArtifacts` + road report / CIM GLB export from canonical project.

**PASS**.

## Summary

| Acceptance | Result |
|---|---|
| A New Project | PASS |
| B Reference Business 001 | PASS (3/3) |
| C Legacy | PASS (fail-closed + compatibility) |
| D .sitecontext | PASS |
| E old URL | PASS |
| F Electron | PASS |
| G no duplicate runtime | PASS |
| H Terrain | PASS |
| I Viewer/coordinates | PASS |
| J Export | PASS |

**RB001 Analysis readiness: BLOCKED-INPUT** (girder section has no trusted
RB001-specific values → honest NOT_RUN; road input adapter DONE in G-6).
Judged separately from Single App / Single Project completion.
