# Phase 1 Final Verification

**Date:** 2026-07-16
**Scope:** P1-D06 final acceptance verification for road/liner Phase 1 only.
**Verdict:** PASS — Phase 1 remediation evidence is complete; do not infer Phase 2 readiness beyond an explicit next-step request.

## Authoritative inputs

- `docs/road/README.md`
- `docs/history/road/phase1_completion_gate.md`
- `docs/history/road/reviews/P2-0_ui_alignment_review.md`
- `docs/planning/stage6-10/stage10_gap_migration_sequence.md`
- `docs/road/design/calculation_pipeline.md`
- `docs/road/design/intermediate_result_model.md`
- `docs/road/design/geometry_core.md`
- `docs/road/design/station_rules.md`
- `docs/road/design/coordinate_system_policy.md`
- `docs/road/verification/test_plan_geometry.md`
- `docs/road/legacy-integration/integration_with_frame_model.md`
- `docs/road/legacy-integration/schema_migration_policy.md`

## Phase 1 remediation PRs

| Step | PR | Merge commit | Evidence summary |
| --- | --- | --- | --- |
| P1-D02 | #147 | `32f4590ce0eda7c4ef3b02039ac48f6c8105574d` | GC-01 through GC-07 committed canonical intermediate expected fixtures and golden fixture regression harness. |
| P1-D03 | #148 | `aca387acd78c98b80698df3e56e575a9409c4213` | Fixture naming/docs consistency, diagnostic `messageKey` defaults, public API surface hygiene, and legacy/canonical compatibility evidence. |
| P1-D04 | #149 | `1565bdc2252657633fe60f2628f72654a53269ef` | GC-08 through GC-10 classified as Phase 1 fail-closed while clothoid remains guarded by the Phase 0 approximation flag. |
| P1-D05 | #150 | `07da7132fd9cef3dd8b0865090e355124cd3f638` | User-reachable LINER setup/preview/mapping review and canonical save/load round-trip evidence. |

GitHub checks were not configured on these PRs; local validation is the recorded evidence.

## Acceptance matrix

| Area | Verdict | Evidence |
| --- | --- | --- |
| Planar alignment | PASS | `frontend/src/liner/core/__tests__/geometry.test.ts`, `horizontalCurveGolden.test.ts`, and GC-01 through GC-07 golden fixtures. |
| Line | PASS | GC-01 committed expected snapshot and golden fixture harness. |
| Arc | PASS | GC-02 / GC-03 committed expected snapshots and horizontal geometry tests. |
| Clothoid | PASS | Phase 1 fail-closed: `isPhase0ClothoidApproximation()` remains true; invalid clothoid parameter/radius diagnostics are tested. Numeric GC-08 through GC-10 baselines are not committed without an independent source, per `test_plan_geometry.md`. |
| Station | PASS | GC-04 committed expected snapshot, `station.test.ts`, and station-format tests. |
| CoordinateContext / coordinate policy | PASS | `coordinate_system_policy.md`; GC-07 committed expected snapshot verifies left-normal sign at 45°. |
| Geometry API | PASS | Public pure core tests under `frontend/src/liner/core/**`; no React/backend dependency in pipeline. |
| RoadDesignDocument / current canonical project equivalent | PASS | Target `RoadDesignDocument` remains a Stage 6-10 target; Phase 1 current persistence equivalent is canonical `project.liner.domainDraft`, covered by App Vitest and focused E2E save/load. |
| Legacy Adapter | PASS | `legacyRoadAdapter.test.ts` and `legacyFrameAdapter.test.ts`. |
| Migration | PASS | `migrationIntegration.test.ts` and liner domain draft migration tests. |
| read-old/write-target | PASS | `docs/planning/stage6-10/stage10_gap_migration_sequence.md` governance; `migrationIntegration.test.ts` verifies target write behavior without legacy dual-write. |
| Stable ID | PASS | Contract primitive and legacy adapter stable-ID tests; saved/reloaded LINER IDs are asserted in App/E2E tests. |
| Fail-closed | PASS | Clothoid production guard, invalid geometry diagnostics, migration fail-closed tests, and schema validation failure tests. |
| UI integration | PASS | Existing `/pro/liner`, `/pro/liner/setup`, `/pro/liner/preview`, and `/pro/liner/mapping-review` paths covered by App tests and focused E2E. |
| Save | PASS | App toolbar `project.json` save covered by `App.linerSaveLoad.test.tsx` and `p1-d05-liner-ui-save-load.spec.ts`. |
| Load | PASS | App toolbar file-open path covered by App Vitest and focused E2E. |
| Round trip | PASS | Saved canonical `project.liner.domainDraft` reload restores alignment/model IDs, element length, and station settings. |
| Viewer/Preview connection | PASS | Preview reflects edited geometry/station state; mapping review reaches Viewer3D-backed generated project review and enables confirm action. |
| Canonical fixture | PASS | `examples/liner/gc-01` through `gc-07` domain fixtures are committed. |
| Golden expected | PASS | `examples/liner/gc-01` through `gc-07` intermediate expected snapshots are committed and compared fail-closed. |
| Numeric regression | PASS | Golden fixture harness uses committed expected data with numeric tolerance; regression suite passes. |
| Diagnostics | PASS | `diagnostics.test.ts` verifies stable `liner.errors.*` message keys and override preservation. |
| Public API surface | PASS | Top-level canonical public API excludes legacy `frameMappingPreview`; public mapper API tests pass. |
| E2E | PASS | Focused P1-D05 browser scenario passes. |
| Build | PASS | `npm run build` passes; Vite reports existing chunk-size/eval warnings only. |
| Source hygiene | PASS | `npm run lint` passes, including source hygiene and Japanese string scan scripts. |

## Final validation commands

| Command | Result | Counts / notes |
| --- | --- | --- |
| `git status --short && git diff --check` | PASS | Clean at command start; whitespace check clean. |
| `cd frontend && npm run typecheck` | PASS | `tsc -b --pretty false`. |
| `cd frontend && npm run lint` | PASS | Includes typecheck, source hygiene, and Japanese string scan. |
| `cd frontend && npm run test -- src/liner src/contracts/persistence src/contracts/legacy src/App.linerSaveLoad.test.tsx src/App.linerReset.test.tsx src/App.linerDelete.test.tsx` | PASS | 89 files, 505 tests. |
| `cd frontend && npm run test:regression` | PASS | 1 file, 6 tests. |
| `cd frontend && npm run test -- src/liner/core/__tests__/goldenFixture.test.ts src/liner/core/__tests__/clothoid.test.ts src/liner/core/__tests__/geometry.test.ts src/liner/core/__tests__/diagnostics.test.ts src/liner/mapper/__tests__/publicApi.test.ts` | PASS | 5 files, 23 tests. |
| `cd frontend && npm run test -- src/contracts/__tests__/contractsPrimitives.test.ts src/contracts/legacy/__tests__/legacyRoadAdapter.test.ts src/contracts/legacy/__tests__/legacyFrameAdapter.test.ts src/contracts/persistence/__tests__/migrationIntegration.test.ts` | PASS | 4 files, 61 tests. |
| `cd frontend && npx playwright test tests/e2e/p1-d05-liner-ui-save-load.spec.ts` | PASS | 1 browser test. |
| `cd frontend && npm run build` | PASS | 3,627 modules transformed; Vite chunk-size and Maker.js eval warnings only. |

## Final notes

- No source code changes were required by final verification.
- No schema or migration version changes were made.
- `gc-06-project.generated.json` remains deferred by P1-D03 decision; GC-06 mapper/project validation is covered by Vitest rather than an on-disk generated project fixture.
- GC-08 through GC-10 clothoid endpoint baselines remain deliberately uncommitted until an independent numeric source is available; Phase 1 accepts fail-closed blocking for production shipment.
