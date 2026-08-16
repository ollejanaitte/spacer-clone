# Vitest Test Gates

**Authority:** OPERATIONAL
**Status:** ACTIVE

How frontend verification is organized into fast, targeted gates so that routine changes do not
require running the full Vitest suite every time.

## Why gates

- The single all-in-one Vitest run used to take 30+ minutes and never completed reliably.
  Root causes (both fixed):
  1. `ApolloPhase1Shell` fell into an infinite re-render loop when the draft had no nodes and the
     selection was already empty (`clearApolloSelection()` allocates a fresh object every call),
     which froze both the app and the test worker.
  2. Heavy `bridgeProject` / `mountain500` full-chain tests are genuinely expensive (6-12 s/test).
- Test files are classified into **FAST / UI / 3D / SLOW** (plus Electron, E2E and the full gate) so
  that daily work only runs what is actually affected.

## Test classification

`frontend/scripts/testIndex.mjs` is the single source of truth. It scans `frontend/src` and
classifies every `*.test.{ts,tsx}` file (596 files, no overlaps) by this priority:

| Group | Condition | Example |
| --- | --- | --- |
| SLOW | heavy integration E2E (bridgeProject / mountain500 / fullchain) | `src/bridgeProject/__tests__/*` |
| 3D | Three.js / Canvas / WebGL / 3D viewer tests | `src/viewer/Viewer3D*`, `src/apollo/visualization/*` |
| UI | file contains `@vitest-environment jsdom` | React component / DOM tests |
| FAST | everything else (pure functions, domain logic, utilities, stores) | `src/contracts/*`, `src/liner/core/*` |

Rules:

- **FAST excludes nothing that is fast.** It covers all pure-logic tests for routine fixes.
- **SLOW / 3D tests are never skipped or deleted** — they run in their own gate and in FULL.
- `phase10SbQuantityDerivation.test.ts` requires `P10_SB_OUTPUT` (oracle comparator) and is
  deliberately excluded from all daily gates; it runs via `vitest.sb.config.ts` only.
- `regression.golden.test.ts` runs via `vitest.regression.config.ts` (golden regression).

## Gate commands (run from `frontend/`)

| Command | Scope | Measured (2026-08-16) |
| --- | --- | --- |
| `npm run test:fast` | pure logic, node env | 425 files / 3163 tests, ~35 s |
| `npm run test:ui` | React/DOM (jsdom) | 125 files / 758 tests, ~46 s |
| `npm run test:3d` | Three.js / Canvas / WebGL | 30 files / 170 tests, ~6 s |
| `npm run test:slow` | heavy integration E2E | 15 files / 106 tests, ~64 s |
| `npm run test:electron` | desktop/electron pure logic | 4 files / 26 tests, <1 s |
| `npm run test:regression` | golden regression | 1 file / 6 tests, ~3 s |
| `npm run test:parity-cli` | parity CLI | 1 file / 9 tests, ~6 s |
| `npm run test:full` | FAST+UI+3D+SLOW+Electron+regression+parity (sequential) | ~160 s |
| `npm run test:e2e` | Playwright real browser (server required) | heavy, on demand |
| `npm run typecheck` | `tsc -b` | ~24 s |
| `npm run build` | production Vite build | ~37 s |

Aliases kept for compatibility: `npm test` (`vitest run`, all src), `electron:test`
(`= test:electron`), `test:all` (`= test:full`).

## Standard gates for AI agents / developers

| Change type | Gate to run |
| --- | --- |
| Backend-only or docs-only | none (frontend gates not required) |
| Frontend pure logic | `npm run test:fast` + `npm run typecheck` |
| Frontend UI component | `npm run test:fast` + `npm run test:ui` + `npm run typecheck` + `npm run build` |
| 3D / Canvas / viewer | `npm run test:fast` + `npm run test:3d` (+ `test:electron`/`test:e2e` if Electron/UI affected) |
| Electron | `npm run test:fast` + `npm run test:electron` + `npm run typecheck` + `npm run build` |
| Milestone / final | `npm run test:full` + `npm run typecheck` + `npm run build` (+ Electron/E2E as needed) |

- **`test:full` is the final gate. Do not run the full suite repeatedly during normal work.**
- If a change touches many areas, run `test:fast` + the targeted gates for each area, then one
  `test:full` at the end.

## Warnings policy

- jsdom lacks a canvas implementation; the UI setup
  (`frontend/src/test/ui.setup.ts`) installs a minimal 2D context stub and enables React 19 `act`.
  This provides the missing API (it is not console suppression). Canvas-correct rendering is
  verified in the 3D / E2E / Electron gates.
- `THREE.WARNING: Multiple instances of Three.js being imported` is a pre-existing dependency
  issue (`stats-gl` pins `three@0.170.0` next to the top-level `three@0.184.0`). It is cosmetic;
  dependency changes are out of scope.

## Flaky tests

- Order-dependent flakiness was eliminated by (a) fixing the infinite re-render loop and
  (b) running each gate in its own isolated Vitest process.
- If a flaky reappears: run the file alone, then with `--sequence.shuffle`, then the surrounding
  gate. Check for shared mutable state, un-restored mocks, timers, `localStorage`/`history`
  residue, and module singletons.
