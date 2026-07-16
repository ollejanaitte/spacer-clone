# Phase 3 Final Verification

**Date:** 2026-07-16
**Scope:** P3-D09 final acceptance verification for road/liner Phase 3 (bridge layout, DrawingDocument, formal drawing, Japanese bands, multi-page, preview/print/DXF parity, persistence).
**Verdict:** COMPLETE — Phase 3 acceptance gates pass locally with documented PARTIAL items (RDD App write-target projection only; one focused E2E skip inherited from Phase 2).

## Authoritative inputs

- `docs/road/README.md`
- `docs/history/road/phase1_final_verification.md`
- `docs/history/road/phase2_final_verification.md`
- `docs/planning/stage6-10/stage10_gap_migration_sequence.md`
- `docs/road/design/calculation_pipeline.md`
- `docs/road/design/intermediate_result_model.md`
- `docs/road/design/geometry_core.md`
- `docs/road/design/station_rules.md`
- `docs/road/design/coordinate_system_policy.md`
- `docs/road/verification/test_plan_geometry.md`
- `docs/road/legacy-integration/integration_with_frame_model.md`
- `docs/road/legacy-integration/schema_migration_policy.md`

## Phase 3 remediation commits

| Step | Commit | Evidence summary |
| --- | --- | --- |
| P3-D01 | `e188663` | Bridge layout evaluation connected to pipeline spans/piers generation. |
| P3-D02 | `5cd3dab` | Bridge layout pier/span editor on LinerEditPage review tab. |
| P3-D03 | `8fb4ed0` | DXF export formalized via DrawingDocument; fixed-z draft validation. |
| P3-D04 | `11da147` | Bridge layout pier/span annotations in formal plan builders. |
| P3-D05 | `f11696b` | Coordinate tables, segment dimensions, Japanese plan band rows. |
| P3-D06 | `a72387a` | Multi-page DrawingDocument assembly with sheet frame, scale, page navigation. |
| P3-D07 | `b590102` | Browser print and preview/DXF/print DrawingDocument parity. |
| P3-D08 | `eecf4e8` | Bridge layout and drawing settings round-trip through persistence. |
| P3-D09 | (this verification) | Quality gates, focused E2E, verification evidence, PR. |

GitHub checks were not configured on this branch; local validation is the recorded evidence.

## Acceptance matrix

| Area | Verdict | Evidence |
| --- | --- | --- |
| Bridge layout evaluation | PASS | `bridgeLayoutEvaluation.test.ts`, `pierLineGeometry.test.ts`, pipeline spans/piers integration. |
| Bridge layout UI | PASS | `BridgeLayoutEditor.test.tsx`, `BridgeLayoutDiagnosticsPanel.test.tsx`, review tab in `LinerEditPage`. |
| DrawingDocument / formal drawing | PASS | `formalBuilders.test.ts`, `bridgeLayoutDrawing.test.ts`, `formalDrawingFromDraft.test.ts`, `LinerFormalDrawingWorkspacePage.test.tsx`. |
| Japanese bands / coordinate tables | PASS | `phase5JapaneseRemediationDrawing.test.ts`, `planCoordinateTable.ts`, `alignmentSegmentDimensions.ts`. |
| Multi-page assembly | PASS | `multiPageDocument.test.ts`, `multiPageDxf.test.ts`, sheet frame/scale/navigation in formal workspace. |
| Preview / print / DXF parity | PASS | `previewDxfPrintParity.test.ts`, `printFormalDrawing.test.ts`, `p3-d07-print-dxf-parity.spec.ts`. |
| Persistence / RDD bridge | PARTIAL | `linerDomainDraftRoadDesignMapper.test.ts`, `migrationIntegration.test.ts`, `App.linerSaveLoad.test.tsx`; App production write-target remains `project.liner.domainDraft` with RDD as extensions projection (P2-D07 scope). |
| Fail-closed | PASS | Bridge layout diagnostics, fixed-z draft validation, RDD mapper stable-id checks block invalid geometry/payloads. |
| Stable ID | PASS | Mapper round-trip and bridge entity ID derivation tests preserve span/pier/alignment IDs. |
| Legacy compatibility | PASS | `legacyRoadAdapter.test.ts`, `migrationIntegration.test.ts`, no `schemaVersion` addition. |
| UI integration | PASS | Bridge layout editor, formal drawing workspace tabs (plan/profile/cross), print and DXF controls. |
| Save / load | PASS | `App.linerSaveLoad.test.tsx` (bridge layout spans/piers), `p1-d05-liner-ui-save-load.spec.ts`. |
| Viewer / mapping review | PASS | `linerViewerAdapter.test.ts`, `p2-d06-viewer-vertical-z.spec.ts` (1 active scenario). |
| Regression | PASS | `npm run test:regression` (6 tests). |
| Build | PASS | `npm run build`; Vite chunk-size and Maker.js eval warnings only. |
| Source hygiene | PASS | `npm run lint` (typecheck, hygiene scripts, Japanese string scan). |
| E2E | PASS (1 skip) | `p1-d05-liner-ui-save-load.spec.ts` pass; `p2-d06-viewer-vertical-z.spec.ts` pass + 1 explicit `test.skip` (save/reload merge); `p3-d07-print-dxf-parity.spec.ts` pass. |

## Final validation commands

| Command | Exit code | Result | Counts / notes |
| --- | --- | --- | --- |
| `git status --short && git diff --check` | 0 | PASS | Clean before verification commit; whitespace check clean. |
| `cd frontend && npm run typecheck` | 0 | PASS | `tsc -b --pretty false`. |
| `cd frontend && npm run lint` | 0 | PASS | Includes typecheck, source hygiene, and Japanese string scan. |
| `cd frontend && npm run test -- src/liner src/contracts/persistence src/contracts/legacy src/App.linerSaveLoad.test.tsx` | 0 | PASS | 105 files, 600 tests (after P3-D09 round-trip fix). |
| `cd frontend && npm run test:regression` | 0 | PASS | 1 file, 6 tests. |
| `cd frontend && npx playwright test tests/e2e/p1-d05-liner-ui-save-load.spec.ts tests/e2e/p2-d06-viewer-vertical-z.spec.ts tests/e2e/p3-d07-print-dxf-parity.spec.ts` | 0 | PASS | 3 passed, 1 skipped. Playwright `webServer` started backend + Vite on `127.0.0.1:4173`. |
| `cd frontend && npm run build` | 0 | PASS | 3,812 modules transformed; chunk-size warnings only. |

## P3-D09 verification fixes

Minimal adapter adjustment required after P3-D08 persistence added always-present empty `spans`/`piers` arrays on domain draft round-trip:

1. `frontend/src/liner/adapters/linerProjectDraft.ts` — omit empty `spans`/`piers` when projecting domain draft back to UI `BuildIntermediateInput`, matching existing source-revision serialization and preserving pre-Phase-3 draft equality.

No schema or migration version changes were made.

## Known PARTIAL items

- **RDD App write-target:** Production save path remains `project.liner.domainDraft`; `RoadDesignDocument` is projected via extensions bridge (P2-D07 PARTIAL scope, unchanged in Phase 3).
- **E2E skip:** `p2-d06-viewer-vertical-z.spec.ts` skips save/reload merged node Z; covered by unit/integration tests per inline comment.
- **Bridge layout E2E:** No dedicated bridge-layout save/load Playwright spec; covered by `App.linerSaveLoad.test.tsx` and mapper integration tests.

## Final notes

- Squash merge not performed; supervisor review required before merge.
- Phase 4+ scope (FEM, additional schema versions) not started.
