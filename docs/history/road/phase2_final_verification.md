# Phase 2 Final Verification

**Date:** 2026-07-16
**Scope:** P2-F03 final re-verification for road/liner Phase 2 (vertical, crossfall, width, cross section, 3D API, viewer, persistence).
**Verdict:** COMPLETE — Phase 2 acceptance gates pass locally; prior PARTIAL items (RDD App write-target, E2E skip) are resolved.

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
| P2-D07 | `928c53a` | `domainDraft` ↔ `RoadDesignDocument` persistence bridge (projection). |
| P2-F01/F02 | `9f78738` | RDD App write-target cutover; browser SHA digest fix; P2-D06 save/reload E2E (0 skip). |
| P2-F03 | (this verification) | P1-D05 E2E updated to RDD write-target assertions; full quality gates; PR. |

GitHub checks were not configured on this branch; local validation is the recorded evidence.

## Acceptance matrix

| Area | Verdict | Evidence |
| --- | --- | --- |
| Vertical alignment | PASS | `validateVerticalAlignment.test.ts`, `pipeline.vertical.test.ts`, `VerticalDiagnosticsPanel`, height tab in `LinerEditPage`. |
| Crossfall | PASS | `crossfallResolution.test.ts`, crossfall interval editor, grid pipeline integration. |
| Width change points | PASS | `widthResolution.test.ts`, `WidthChangePointEditor`, grid generation updates. |
| Cross section template | PASS | `crossSectionTemplateValidation.test.ts`, `CrossSectionDiagnosticsPanel`, `CrossSectionPreview`. |
| 3D coordinate API | PASS | `coordinate3d.test.ts`, public export from `liner/core/index.ts`. |
| Viewer / mapping review | PASS | `linerViewerAdapter.test.ts`, `p2-d06-viewer-vertical-z.spec.ts` (2 active scenarios, 0 skip). |
| Persistence / RDD write-target | PASS | `linerDomainDraftRoadDesignMapper.test.ts`, `linerProjectDraft.test.ts`, `App.linerSaveLoad.test.tsx`, `migrationIntegration.test.ts`; App production write-target is `project.liner.roadDesignDocument`; `domainDraft` is in-memory only (read-old for legacy persisted projects). |
| Fail-closed | PASS | Vertical station range, crossfall interval range, width station range, and cross-section template validation block invalid geometry. |
| Stable ID | PASS | Mapper round-trip and adapter tests preserve alignment/model/template IDs. |
| Legacy compatibility | PASS | `legacyRoadAdapter.test.ts`, `migrationIntegration.test.ts`, `linerProjectDraft.test.ts` read-old path; no `schemaVersion` addition. |
| UI integration | PASS | Vertical, cross-section, width tabs on `/pro/liner/setup`; preview and mapping-review paths. |
| Save / load | PASS | `App.linerSaveLoad.test.tsx`, `p1-d05-liner-ui-save-load.spec.ts` (RDD assertions). |
| Preview | PASS | Grid preview bounds and summary after Phase 2 fail-closed alignment with shortened test fixtures. |
| Regression | PASS | `npm run test:regression` (6 tests). |
| Build | PASS | `npm run build`; Vite chunk-size warning only. |
| Source hygiene | PASS | `npm run lint` (typecheck, hygiene scripts, Japanese string scan). |
| E2E | PASS (0 skip) | `p1-d05-liner-ui-save-load.spec.ts` pass; `p2-d06-viewer-vertical-z.spec.ts` pass (2 scenarios). |

## Write-target cutover (P2-F01/F02/F03)

| Path | Behavior |
| --- | --- |
| **Write (save)** | `serializeProjectForPersistence` embeds `project.liner.roadDesignDocument`; `domainDraft` and legacy `draft` are omitted from persisted JSON. |
| **Read (load)** | `hydrateProjectLinerFromPersistence` prefers `roadDesignDocument` → in-memory `domainDraft`; legacy `domainDraft` / `draft` read-old paths retained. |
| **Dual-write** | None — single write-target only. |

## Final validation commands (P2-F03)

| Command | Result | Counts / notes |
| --- | --- | --- |
| `git status --short && git diff --check` | PASS | Clean before verification commit; whitespace check clean. |
| `cd frontend && npm run typecheck` | PASS | `tsc -b --pretty false`. |
| `cd frontend && npm run lint` | PASS | Includes typecheck, source hygiene, and Japanese string scan. |
| `cd frontend && npm run test -- src/liner src/contracts/persistence src/contracts/legacy src/App.linerSaveLoad.test.tsx src/liner/adapters/linerProjectDraft.test.ts src/liner/adapters/linerDomainDraftRoadDesignMapper.test.ts` | PASS | 105 files, 603 tests. |
| `cd frontend && npm run test:regression` | PASS | 1 file, 6 tests. |
| `cd frontend && npx playwright test tests/e2e/p1-d05-liner-ui-save-load.spec.ts tests/e2e/p2-d06-viewer-vertical-z.spec.ts` | PASS | 3 passed, 0 skipped. Playwright `webServer` started backend + Vite on `127.0.0.1:4173`. |
| `cd frontend && npm run build` | PASS | 3,812 modules transformed; chunk-size warning only. |

## P2-F03 verification fixes

1. `frontend/tests/e2e/p1-d05-liner-ui-save-load.spec.ts` — assertions updated from `domainDraft` to `roadDesignDocument` write-target (geometry via `spacer.liner/domain-draft-vnext-geometry` extension); `domainDraft` must be absent on save.

No schema or migration version changes were made.

## Resolved items (formerly PARTIAL)

- **RDD App write-target:** Resolved in P2-F01/F02 — production save path writes `project.liner.roadDesignDocument` only.
- **E2E skip:** Resolved in P2-F02 — `p2-d06-viewer-vertical-z.spec.ts` save/reload scenario active; P2-F03 aligns `p1-d05` with the same write-target contract.

## Final notes

- Drawing / DXF / print remain Phase 3+ scope.
- Do not infer Phase 3 readiness without an explicit next-step request.
