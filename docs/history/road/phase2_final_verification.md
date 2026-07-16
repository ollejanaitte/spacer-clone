# Phase 2 Final Verification

**Date:** 2026-07-16
**Scope:** P2-D08 final acceptance verification for road/liner Phase 2 (vertical, crossfall, width, cross section, 3D API, viewer, persistence).
**Verdict:** COMPLETE — Phase 2 acceptance gates pass locally with documented PARTIAL items (RDD App write-target projection only; one focused E2E skip).

## Authoritative inputs

- `docs/road/README.md`
- `docs/history/road/phase1_final_verification.md`
- `docs/planning/stage6-10/stage10_gap_migration_sequence.md`
- `docs/road/design/calculation_pipeline.md`
- `docs/road/design/intermediate_result_model.md`
- `docs/road/design/geometry_core.md`
- `docs/road/design/station_rules.md`
- `docs/road/design/coordinate_system_policy.md`
- `docs/road/verification/test_plan_geometry.md`
- `docs/road/legacy-integration/integration_with_frame_model.md`
- `docs/road/legacy-integration/schema_migration_policy.md`

## Phase 2 remediation commits

| Step | Commit | Evidence summary |
| --- | --- | --- |
| P2-D02 | `463bcda` | Vertical geometry validation, continuity diagnostics, and height tab display. |
| P2-D03 | `0f23908` | Width change points connected to grid pipeline and cross-section UI. |
| P2-D03b | `7178924` | Source revision stability when width change points are absent. |
| P2-D04 | `f3e84a0` | Cross-section template validation and diagnostics. |
| P2-D05 | `0073767` | Explicit 3D coordinate public API (`coordinate3d`). |
| P2-D06 | `c9e353c` | Graded 3D coordinates integrated into mapping-review viewer handoff. |
| P2-D07 | `928c53a` | `domainDraft` ↔ `RoadDesignDocument` persistence bridge (projection; App write-target remains `domainDraft`). |
| P2-D08 | (this verification) | Quality gates, focused E2E, verification evidence, PR. |

GitHub checks were not configured on this branch; local validation is the recorded evidence.

## Acceptance matrix

| Area | Verdict | Evidence |
| --- | --- | --- |
| Vertical alignment | PASS | `validateVerticalAlignment.test.ts`, `pipeline.vertical.test.ts`, `VerticalDiagnosticsPanel`, height tab in `LinerEditPage`. |
| Crossfall | PASS | `crossfallResolution.test.ts`, crossfall interval editor, grid pipeline integration. |
| Width change points | PASS | `widthResolution.test.ts`, `WidthChangePointEditor`, grid generation updates. |
| Cross section template | PASS | `crossSectionTemplateValidation.test.ts`, `CrossSectionDiagnosticsPanel`, `CrossSectionPreview`. |
| 3D coordinate API | PASS | `coordinate3d.test.ts`, public export from `liner/core/index.ts`. |
| Viewer / mapping review | PASS | `linerViewerAdapter.test.ts`, `p2-d06-viewer-vertical-z.spec.ts` (1 active scenario). |
| Persistence / RDD bridge | PARTIAL | `linerDomainDraftRoadDesignMapper.test.ts`, `migrationIntegration.test.ts`; App production write-target remains `project.liner.domainDraft` with RDD as extensions projection per P2-D07 scope. |
| Fail-closed | PASS | Vertical station range, crossfall interval range, width station range, and cross-section template validation block invalid geometry. |
| Stable ID | PASS | Mapper round-trip and adapter tests preserve alignment/model/template IDs. |
| Legacy compatibility | PASS | `legacyRoadAdapter.test.ts`, `migrationIntegration.test.ts`, no `schemaVersion` addition. |
| UI integration | PASS | Vertical, cross-section, width tabs on `/pro/liner/setup`; preview and mapping-review paths. |
| Save / load | PASS | `App.linerSaveLoad.test.tsx`, `p1-d05-liner-ui-save-load.spec.ts`. |
| Preview | PASS | Grid preview bounds and summary after Phase 2 fail-closed alignment with shortened test fixtures. |
| Regression | PASS | `npm run test:regression` (6 tests). |
| Build | PASS | `npm run build`; Vite chunk-size and Maker.js eval warnings only. |
| Source hygiene | PASS | `npm run lint` (typecheck, hygiene scripts, Japanese string scan). |
| E2E | PASS (1 skip) | `p1-d05-liner-ui-save-load.spec.ts` pass; `p2-d06-viewer-vertical-z.spec.ts` pass + 1 explicit `test.skip` (save/reload merge). No `p2-d07` E2E spec exists. |

## Final validation commands

| Command | Result | Counts / notes |
| --- | --- | --- |
| `git status --short && git diff --check` | PASS | Clean before verification commit; whitespace check clean. |
| `cd frontend && npm run typecheck` | PASS | `tsc -b --pretty false`. |
| `cd frontend && npm run lint` | PASS | Includes typecheck, source hygiene, and Japanese string scan. |
| `cd frontend && npm run test -- src/liner src/contracts/persistence src/contracts/legacy src/App.linerSaveLoad.test.tsx` | PASS | 94 files, 550 tests. |
| `cd frontend && npm run test:regression` | PASS | 1 file, 6 tests. |
| `cd frontend && npx playwright test tests/e2e/p1-d05-liner-ui-save-load.spec.ts tests/e2e/p2-d06-viewer-vertical-z.spec.ts` | PASS | 2 passed, 1 skipped (`persists merged liner node Z through project.json save and reload`). Playwright `webServer` started backend + Vite on `127.0.0.1:4173`. |
| `cd frontend && npm run build` | PASS | 3,818 modules transformed; chunk-size and Maker.js eval warnings only. |

## P2-D08 verification fixes

Minimal test-only adjustments required after Phase 2 fail-closed validation tightened station/crossfall range checks:

1. `frontend/src/liner/dxf/__tests__/phase5JapaneseRemediationDxf.test.ts` — extend default alignment to 120 m and fix vertical element continuity so DXF plan-type-a exports entities.
2. `frontend/tests/e2e/p1-d05-liner-ui-save-load.spec.ts` — after shortening alignment to 36 m, sync vertical end station and crossfall interval end to 36 m before preview.

No schema or migration version changes were made.

## Known PARTIAL items

- **RDD App write-target:** Production save path remains `project.liner.domainDraft`; `RoadDesignDocument` is projected via extensions bridge (P2-D07 PARTIAL scope).
- **E2E skip:** `p2-d06-viewer-vertical-z.spec.ts` skips save/reload merged node Z; covered by unit/integration tests per inline comment.

## Final notes

- Drawing / DXF / print remain Phase 3+ scope; Phase 5 DXF regression test updated only for Phase 2 vertical range compatibility.
- Do not infer Phase 3 readiness without an explicit next-step request.
