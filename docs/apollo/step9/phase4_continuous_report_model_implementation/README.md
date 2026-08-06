# STEP 9 / Phase 4 — Continuous Girder Report Model Implementation

> **Authority:** Phase 4-A (preflight)
> **Spec master:** `../phase3_continuous_report_model_spec/` (frozen, COMPLETE at 52f1f53)
> **Phase 4 name:** `STEP 9 / Phase 4 — 連続橋 Report Model 型・変換器・validator実装`

## 1. Purpose

Implement the continuous-girder (CONTINUOUS) confirmation Report Model **type / read-only transformer / validator / projection** strictly to the Phase 3 spec frozen in `phase3_continuous_report_model_spec/`. Spec-first: types → transformer → validator → projection → tests.

## 2. What Phase 4 DOES

- Report Model **TypeScript types** (`ReportModel`, `ReportChapter`, `ReportRow`, `BridgeSummary`, `SpanSummary[]`, `SupportSummary[]`, `GirderSummary`, `CrossMemberSummary`, `GeometrySummary`, `ValidationSummary`, `AuthorizationSummary`, `WarningSummary`, `EvidenceSummary`, `LegacyCompatibilitySummary`, …).
- Read-only **transformer** `buildReportModel(project, options): ReportModel` (CP-* chapter emission; CH-* deprecated alias map internal only; CONTINUOUS path).
- **Validator** `validateReportModel(model)` enforcing VR-01..26 (fail-closed, non-mutating).
- **summary/detail projection** `projectReportSummary` / `projectReportDetail` (`11_summary_detail_projection_contract.md`).
- **Automatic tests + regression** (CONTINUOUS contract, PROHIBITED regression, validator VR coverage, projection parity, simple-span + continuous save/reload).

## 3. What Phase 4 DOES NOT touch (out of scope)

HTML / CSS / PDF / print layout / UI components · formal PDF (`assertFormalReportRejected` retained) · continuous design drawings (PROHIBITED) · numeric analysis results / CP-30..34 / O-19..O-30 (PROHIBITED/NOT_AVAILABLE) · STL / 3D solid generation · `ProjectModel` / `apolloBridgeStructureInput` / `apolloBsdd` mutation · scope-guards / numeric-authority / feature-flag · lockfile / dependencies · backend.

## 4. Scope entry gate (reaffirmed)

`GO_WITH_NON_NUMERIC_RESTRICTIONS` — numeric evidence stays PROHIBITED; only non-numeric geometry/STL **manifest/summary** is emitted.

## 5. Implementation order (one commit per step, immediate push)

| # | commit | target |
|---|--------|--------|
| A | docs(apollo-step9): start phase 4 report model implementation | preflight + inventory + matrix |
| B | refactor(apollo): add report model entity types (types only) | `reportModel.ts` types |
| C | feat(apollo): report model transformer (continuous + CP-*) | `buildReportModel` continuous path |
| D | feat(apollo): report model validator (VR-01..26) | `validateReportModel` |
| E | feat(apollo): report model summary/detail projection | `projectReportSummary/Detail` |
| F | test(apollo): report model contracts — CONTINUOUS + PROHIBITED + projection + regression | `__tests__/` |
| G | docs(apollo-step9): audit phase 4 report model scope | denylist/scope audit |
| H | docs(apollo-step9): complete phase 4 report model implementation | closeout |

## 6. Baseline

Phase 4 BASE = Phase 3 closeout seal `52f1f53` (local == origin/main == 52f1f53, clean).

## 7. Stop conditions

Unexpected staged file · typecheck/test failure · dependency change · local != origin · worktree dirty · prohibited-zone change required → stop, report, do not revert.
