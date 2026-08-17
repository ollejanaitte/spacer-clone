# Lane G — G-5 Single App Completion

> **Phase:** Lane G / G-5
> **Status:** COMPLETE
> **Date:** 2026-08-17 (JST)
> **Base:** origin/main d91e6caa10408c84bfc9a7fd75efc1f43c3d8558 (Lane F completion)

## Purpose

Converge the user-facing production App to exactly one canonical entry, keeping
legacy URLs as redirect/compatibility only.

## Decision (from G-1 evidence)

**CANONICAL production App = `/app` (NextApp / PDC Project System).**

- `frontend/src/next/NextApp.tsx` + `frontend/src/next/pages/*` — PDC `Project`
  lifecycle (business list → project → modules → save/close/reopen).
- Self-declared canonical: `frontend/src/next/pages/HomePage.tsx:62`
  ("本環境（/app）がproduction正です。canonicalデータの書込みはすべて /app 経由で行います。")
- Electron dev entry already `/app` (`desktop/electron/main.ts:79`).
- Persistence: `PersistentProjectManager` → `FilesystemProjectPersistence`
  (Electron IPC filesystem).

**`/pro` (legacy FEM App + DesignPlatform) = COMPATIBILITY / legacy reference.**
- Reachable only via explicit links from `/app` (HomePage "legacy /pro
  （資産確認・参照用）" button, `home-legacy-reference`).
- `/pro/platform` DesignPlatform remains reachable as a compatibility surface
  (smoke E2E `design-platform-business-flow.spec.ts` verifies it still works).
- No new project state is created by `/pro` in the default flow.

## Changes applied

| Item | File | Change |
|---|---|---|
| Lobby professional entry | `frontend/src/lobby/designPlatformEntry.ts` | `DESIGN_PLATFORM_ENTRY_PATH` `/pro/platform` → `/app/business` (canonical business list) |
| Packaged Electron `file://` entry | `frontend/src/main.tsx:13-23` | `file://` protocol → `/app` (canonical), instead of falling through to LobbyApp |
| NextApp initial path under `file://` | `frontend/src/next/NextApp.tsx` | `file://` → `NEXT_HOME_PATH` (`/app`) |
| Lobby tests | `lobby/__tests__/LobbyHome.test.tsx`, `Level0Top.test.tsx`, `designPlatformEntry.test.ts` | entry path assertions updated to `/app/business` |
| E2E | `design-platform-electron-startup.spec.ts` test 1, `level0-navigation.spec.ts` professional test | 実務編 → `/app/business` canonical flow |

## Canonical business flow

```
/ (Lobby) ──実務編──▶ /app/business (canonical 業務一覧)
   ▶ /app/business/new  (新規作成)
   ▶ /app/projects/<id> (Project top)
   ▶ /app/projects/<id>/modules/<module> (Road/Terrain/BridgeLayout/…)
   ▶ Save → Close → Reopen (PersistentProjectManager)
   └─▶ /pro (legacy reference, explicit link only)
```

## Back/forward / refresh / deep link

- `NextApp` listens for `popstate` (back/forward) and re-resolves the route.
- Refresh re-enters `NextApp` at the same pathname; `restoreFromPersistence`
  reloads saved projects (`NextApp.tsx:89-103`).
- Deep links `/app/...` resolve directly. Legacy `/pro/...` deep links keep
  working via the App router (compatibility).

## Electron entry

- **dev**: `http://127.0.0.1:5173/app` (`NEXT_APP_ENTRY`) — unchanged.
- **packaged**: `loadFile(index.html)` → frontend routes `file://` → `/app`
  (G-5 fix). Previously `file://` fell through to LobbyApp.
- `npm run electron:compile` PASS.

## Gates

- `npm run test:fast` 3499 PASS
- `npm run test:ui` 786 PASS
- `npm run build` PASS
- `npm run typecheck` PASS
- E2E smoke 19 PASS
- E2E critical 40 PASS
- `npm run electron:compile` PASS

## Remaining (G-6)

Single Project completion: canonical in-memory Project representation, module
slot ownership, workflow/analysis/viewer data path — `/app` PDC `Project`.
