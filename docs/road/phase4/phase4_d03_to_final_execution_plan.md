# Phase 4 D03–Final Execution Plan — Road Advanced Calculation & Utilities

**Date:** 2026-07-21  
**Status:** Plan verdict APPROVED  
**Author:** Composer 2.5 (field worker)  
**Supervisor:** Cursor Grok 4.5  
**Repository HEAD at survey:** `2e2931f824987df4c79f810e1dfac0abb965adfc` (`main` = `origin/main`)

## Authority

| Document | Role |
| --- | --- |
| [phase4_planning_freeze.md](phase4_planning_freeze.md) | Scope, step order, persistence, out-of-scope |
| [phase4_design_document.md](phase4_design_document.md) | Feature design per D-step |
| [phase4_completion_gate.md](phase4_completion_gate.md) | Per-step and overall COMPLETE criteria |
| [p4_d02_scope.md](p4_d02_scope.md) | P4-D02 frozen decisions (N1–N3); D03+ boundary reference |
| [p4_d02_ldist_extraction_record.md](p4_d02_ldist_extraction_record.md) | LDIST extraction pattern for D03/D04 |

**Not authoritative for Phase 4 road product:** JIP-SPACER manual, `docs/history/road/phase4.5/`, `docs/bridge-modeler-v2/05_phase4_load_surface.md`, phase3.9 “Phase 4.0-x” labels.

## Repository preflight (2026-07-21)

| Check | Result |
| --- | --- |
| Branch | `main` |
| `git rev-parse main` | `2e2931f824987df4c79f810e1dfac0abb965adfc` |
| `git rev-parse origin/main` | `2e2931f824987df4c79f810e1dfac0abb965adfc` |
| Working tree | **clean** (`git status --short` empty) |
| Stash | **none** |
| Untracked | **none** |

**Preflight verdict:** PASS — execution plan authoring may proceed.

## Completed prerequisites

| Step | Status | Evidence |
| --- | --- | --- |
| **P4-D01** Multiple Alignment and Line Management | **COMPLETE** | `061ccfc` — PR #157; `p4-d01-multi-alignment.spec.ts` |
| **P4-D02** LDIST Equivalent | **COMPLETE** | `2e2931f` — `frontend/src/liner/core/ldist/**`, utilities tab, `p4_d02_ldist_extraction_record.md` APPROVED |

### Known baseline facts (carry forward)

1. **GitHub checks:** Not configured in this repository. Verification evidence must state **“local validation only”** — do not claim “CI PASS”.
2. **parityCli `.tmp` build artifacts:** `frontend/.tmp/parity-cli/` and `frontend/node_modules/.tmp/` are pre-existing bridge-definition parity tooling outputs. Failures here are **not** Phase 4 regressions unless a P4 PR modifies parity-cli paths. Record separately in final verification.
3. **P4-D02 Mode B:** Frozen as **alignment azimuth–based MVP** (`sin(θ_ref)` between section traverse and reference line direction per extraction record §4.3). **Do not** extend to stricter JIP-LINER compatibility unless a subsequent scope amendment explicitly authorizes it.
4. **P4-D02 persistence pattern:** `ldistJobs[]` in geometry extension v0.2.0; dedicated extension key deferred to P4-D07. D03/D04 should follow the same pattern unless D07 decides otherwise.

---

## 1. D-step inventory (P4-D03 → final)

| Order | ID | Formal name | Parallel group |
| --- | --- | --- | --- |
| 3 | **P4-D03** | HAUNCH Equivalent | Calculation track (parallel with D04, D05 after D01) |
| 4 | **P4-D04** | HOSO Equivalent | Calculation track (parallel with D03, D05 after D01) |
| 5 | **P4-D05** | Review Diagrams and Utilities UI | Diagram track (parallel with D03/D04 after D01) |
| 6 | **P4-D06** | Reports and CSV | Output track |
| 7 | **P4-D07** | Persistence / Legacy / Migration | Integration track |
| 8 | **P4-D08** | E2E and Final Verification | **Final D-step** |

**Final D-step:** **P4-D08 — E2E and Final Verification**

---

## 2. Per-step detail

### P4-D03 — HAUNCH Equivalent

#### Purpose

Implement JIP-LINER §6–equivalent haunch region calculations (2-point, 3-point, plane, range families) on `RoadDesignDocument`, with UI, export hooks, R8-13 O1 baselines, and fail-closed diagnostics.

#### Dependencies

| Upstream | Reason |
| --- | --- |
| P4-D01 | Stable alignment/line IDs, active alignment, per-alignment namespace |
| P4-D02 (pattern only) | LDIST module establishes calculator + extension + export-hook pattern; **not** a hard numeric dependency |

**Downstream consumers:** P4-D06 (report/CSV `haunchResults`), P4-D07 (persistence), P4-D08 (E2E-03, final gate).

#### In scope

- Four haunch type families: 2-point, 3-point, plane, range
- `haunchDefinitions[]` in geometry extension; `haunchCapability.state: "supported"`
- Pure calculator with `algorithmVersion`; recompute-on-load (no result cache)
- UI: definition editor + results table
- Export hooks: `haunchResults` section, `haunch_results.csv` (pure builder + unit test; download UI deferred to D06)
- R8-13 + O1 baseline **per family** (≥4 fixtures)
- Fail-closed: overlapping incompatible ranges, negative thickness where forbidden, missing profile

#### Out of scope

- HOSO (D04), confirmation diagrams (D05), CSV/HTML download UI (D06), legacy migration consolidation (D07), Playwright final gate (D08)
- BridgeDefinition rewrite
- JIP-SPACER haunch semantics

#### Official spec sources

| Source | Section | Use |
| --- | --- | --- |
| JIP-LINER manual | **§6** (print p.125+) | Semantic authority — haunch regions, types, elevations |
| [stage8_verification_plan.md](../../planning/stage6-10/stage8_verification_plan.md) | **R8-13** | 2/3-point/plane/range families; COMBINED elevation register |
| [phase4_design_document.md](phase4_design_document.md) | P4-D03 | Inputs/outputs, UI, reports |
| [phase4_completion_gate.md](phase4_completion_gate.md) | D03-C01..C06 | COMPLETE criteria |

**BLOCKER:** D03-C01 requires committed §6 extraction record (supervisor-approved) before numeric COMPLETE — same pattern as [p4_d02_ldist_extraction_record.md](p4_d02_ldist_extraction_record.md).

#### Estimated implementation areas

| Area | Path (estimated) | Rationale |
| --- | --- | --- |
| Types / contracts | `frontend/src/liner/schema/types.ts` | `HaunchDefinitionDraft`, enums |
| Pure calculator | `frontend/src/liner/core/haunch/` (new) | Mirror `core/ldist/` layout |
| Pipeline hook | `frontend/src/liner/core/pipeline/pipeline.ts` | Optional passthrough |
| Mapper | `frontend/src/liner/adapters/linerDomainDraftRoadDesignMapper.ts` | `haunchCapability`, extension round-trip |
| UI adapter | `frontend/src/liner/adapters/linerUiAdapter.ts` | CRUD for definitions |
| UI components | `frontend/src/liner/components/Haunch*.tsx` (new) | Extend utilities tab or sub-panel |
| Export builder | `frontend/src/liner/exports/haunchReportExport.ts` (new) | D03-C06 pure builder |
| Extraction doc | `docs/road/phase4/p4_d03_haunch_extraction_record.md` (new) | D03-C01 |
| Scope doc | `docs/road/phase4/p4_d03_scope.md` (new) | Supervisor scope freeze (recommended) |

#### Planned tests

| Layer | Content | Gate |
| --- | --- | --- |
| Extraction approval | §6 PDF → structured record | D03-C01 |
| Unit calculator | Per-family computation | D03-C02 |
| O1 baselines | ≥1 fixture per family (4+) | D03-C03 |
| Mapper round-trip | `haunchDefinitions` persist | D03-C04 |
| Capability state | `supported` when definitions exist | D03-C05 |
| Export builder | Column keys, row counts | D03-C06 |
| UI smoke | Editor + results visible | D03-C06 |

#### PR plan

| Item | Value |
| --- | --- |
| Branch | `feat/phase4-p4-d03-haunch-equivalent` |
| PR title | `feat(liner): implement P4-D03 HAUNCH equivalent` |
| Scope | 1 D-step = 1 feature branch = 1 PR |

#### Risks

| Risk | Mitigation |
| --- | --- |
| §6 formulas not yet extracted | Create extraction record **before** numeric implementation; stop at S2 per planning freeze |
| Elevation datum ambiguity vs profile pipeline | Document O1 geometry in extraction record; reuse `buildIntermediateResult` vertical samples |
| Four families scope creep | Ship all four per D03-C02; defer edge cases to extraction gaps list |
| Extension key split undecided | Default: geometry extension v0.2.0 sibling fields (D02 pattern); revisit in D07 |

---

### P4-D04 — HOSO Equivalent

#### Purpose

Implement JIP-LINER §7–equivalent pavement thickness calculations (auto, longitudinal, transverse, 2-point, 3-point families) with UI, export hooks, R8-14 O1 baselines, and negative-thickness rejection.

#### Dependencies

| Upstream | Reason |
| --- | --- |
| P4-D01 | Stable alignment/line IDs |
| P4-D02 (pattern only) | Calculator + extension pattern |

**Downstream consumers:** P4-D06 (`hosoResults`), P4-D07, P4-D08.

**Parallel with:** P4-D03, P4-D05 (after D01 interface freeze).

#### In scope

- Five type families: auto, longitudinal, transverse, 2-point, 3-point
- `hosoDefinitions[]` in extension; `hosoCapability.state: "supported"`
- Outputs: `pavementThicknessM`, `pavementElevationM`, station/offset
- Negative thickness rejection (R8-14)
- UI editor + results preview
- Export hooks: `hosoResults`, `hoso_results.csv`
- O1 baseline per family

#### Out of scope

- HAUNCH (D03), diagrams (D05), download UI (D06), migration (D07), E2E final (D08)
- Widening / quartic transitions (deferred PR-24)

#### Official spec sources

| Source | Section | Use |
| --- | --- | --- |
| JIP-LINER manual | **§7** (print p.137+) | Semantic authority — pavement thickness |
| [stage8_verification_plan.md](../../planning/stage6-10/stage8_verification_plan.md) | **R8-14** | Type families; COMBINED thickness register; negative rejection |
| [phase4_design_document.md](phase4_design_document.md) | P4-D04 | Data shapes, abnormal conditions |
| [phase4_completion_gate.md](phase4_completion_gate.md) | D04-C01..C06 | COMPLETE criteria |

**BLOCKER:** D04-C01 requires §7 extraction record before numeric COMPLETE.

#### Estimated implementation areas

| Area | Path (estimated) | Rationale |
| --- | --- | --- |
| Pure calculator | `frontend/src/liner/core/hoso/` (new) | Mirror `core/ldist/` |
| Crossfall integration | `frontend/src/liner/core/grid/crossfallResolution.ts` | Profile + crossfall required per design doc |
| Types / mapper / UI | Same pattern as D03 | `hosoDefinitions`, `hosoCapability` |
| Export builder | `frontend/src/liner/exports/hosoReportExport.ts` (new) | D04-C06 |
| Extraction doc | `docs/road/phase4/p4_d04_hoso_extraction_record.md` (new) | D04-C01 |

#### Planned tests

| Layer | Content | Gate |
| --- | --- | --- |
| Extraction approval | §7 PDF record | D04-C01 |
| Per-family unit tests | All five families | D04-C02 |
| O1 baselines | Per family | D04-C03 |
| Negative thickness | Rejection test | D04-C04 |
| Mapper + capability | Round-trip | D04-C05 |
| Export + UI | Builder + editor | D04-C06 |

#### PR plan

| Item | Value |
| --- | --- |
| Branch | `feat/phase4-p4-d04-hoso-equivalent` |
| PR title | `feat(liner): implement P4-D04 HOSO equivalent` |

#### Risks

| Risk | Mitigation |
| --- | --- |
| Crossfall/profile coupling complexity | Sample at pipeline resolution only; no re-sampling in export |
| “Auto thickness” rule ambiguity | Freeze rule in extraction record before implementation |
| Five families = large PR | Keep single PR per gate policy; use incremental commits within branch |

---

### P4-D05 — Review Diagrams and Utilities UI

#### Purpose

Enhance confirmation diagrams (plan, profile, cross-section, band sheet) via **Formal Drawing workspace** as primary entry; keep setup **review tab = Bridge Layout only**. Optional Preview secondary link.

#### Dependencies

| Upstream | Reason |
| --- | --- |
| P4-D01 | Active alignment drives cross-section and diagram scope |

**Does not require:** D02/D03/D04 numeric COMPLETE (may parallelize).  
**Downstream:** D06 (export controls may live on Formal Drawing header), D08 (P4-E2E-04, P4-E2E-05).

#### In scope

| Diagram | Enhancement (required) |
| --- | --- |
| Plan | IP/BC/EC markers, segment dimensions, coordinate tables |
| Profile | Grade, VCL, vertical curve indicators; explicit unavailable ground band |
| Cross-section | Station-driven section with crossfall; active alignment |
| Band sheet | Crossfall values; widening row **unavailable** |
| Preview (secondary) | Link/banner to Formal Drawing workspace |

- `drawingSettings` RDD round-trip (Phase 3 pattern)
- `DrawingDocument` runtime regeneration only
- Replace stale i18n promising “Phase 4.0-2” on review placeholder

#### Out of scope

- LDIST/HAUNCH/HOSO diagram overlays — **optional** for D05 COMPLETE (D05-C07 N/A unless supervisor amendment)
- Moving confirmation canvas to review tab
- Ground profile fabrication
- Widening band numeric values
- `DrawingDocument` persistence

#### Official spec sources

| Source | Section | Use |
| --- | --- | --- |
| JIP-LINER manual | **§8**, **§8.8** (print p.143+, p.151) | Dimension/confirmation semantics (reference; not full §8 parity) |
| [phase4_design_document.md](phase4_design_document.md) | P4-D05 | Primary/secondary entry, enhancement table |
| [formal_drawing_ui_design.md](../output/formal_drawing_ui_design.md) | — | Formal drawing UI patterns |
| [phase4_completion_gate.md](phase4_completion_gate.md) | D05-C01..C07 | COMPLETE criteria |

#### Estimated implementation areas

| Area | Path (estimated) | Rationale |
| --- | --- | --- |
| Formal builders | `frontend/src/liner/drawing/builders/formalBuilders.ts`, `formalDrawingBuilders.ts` | Plan/profile/cross enhancements |
| Dimensions | `frontend/src/liner/drawing/dimensions/alignmentSegmentDimensions.ts` | Segment dimensions |
| Coordinate tables | `frontend/src/liner/drawing/tables/planCoordinateTable.ts` | Plan tables |
| Workspace pages | `frontend/src/liner/pages/LinerFormalDrawingWorkspacePage.tsx` | Route `/pro/liner/drawings/*` |
| Preview link | `frontend/src/liner/pages/LinerPreviewPage.tsx` | Secondary entry |
| Review tab guard | `frontend/src/liner/pages/LinerEditPage.tsx`, `BridgeLayoutEditor.tsx` | D05-C01 regression |
| i18n | `frontend/src/i18n/**` | Stale placeholder cleanup |
| Tests | `frontend/src/liner/drawing/__tests__/formalBuilders.test.ts` | D05-C02, C04, C05 |

#### Planned tests

| Test | Gate |
| --- | --- |
| Review tab = Bridge Layout only | D05-C01, P4-E2E-05 |
| Formal Drawing routes render plan/profile/cross | D05-C02 |
| No `drawingDocument` in saved JSON | D05-C03 |
| Ground band unavailable | D05-C04 |
| Widening row unavailable | D05-C05 |
| Preview link documented | D05-C06 |

#### PR plan

| Item | Value |
| --- | --- |
| Branch | `feat/phase4-p4-d05-review-diagrams` |
| PR title | `feat(liner): implement P4-D05 review diagrams and utilities UI` |

#### Risks

| Risk | Mitigation |
| --- | --- |
| Scope overlap with Phase 5 drawing docs | Extend behavior only where P4-D05 lists; do not redefine Phase 5 |
| Large drawing diff | Focus on listed enhancements only |
| D05-C07 overlay demand at D08 | Track as optional; supervisor amendment if required |

---

### P4-D06 — Reports and CSV

#### Purpose

Deliver integrated road **HTML report** and **CSV download** from intermediate results + P4 calculation arrays, per extended [report_output_spec.md](../output/report_output_spec.md).

#### Dependencies

| Upstream | Reason |
| --- | --- |
| P4-D02 | `ldistResults` / `ldist_results.csv` |
| P4-D03 | `haunchResults` / `haunch_results.csv` |
| P4-D04 | `hosoResults` / `hoso_results.csv` |
| P4-D05 (soft) | Export control placement on Formal Drawing and/or Preview header |

**Downstream:** P4-D07 (export must respect persistence shape), P4-D08 (CSV download E2E).

#### In scope

- HTML report sections: existing + `ldistResults`, `haunchResults`, `hosoResults`, merged diagnostics
- CSV files: `grid_points.csv`, `ldist_results.csv`, `haunch_results.csv`, `hoso_results.csv`
- User-visible export actions (at least one path: Preview and/or Formal Drawing)
- Fail-closed on error-level diagnostics (D06-C04)
- English column keys; i18n labels at render
- Integrate D02 pure builders into unified report pipeline

#### Out of scope

- PDF generation (post-MVP per report spec)
- Re-sampling beyond intermediate arrays
- Frame/structural reports

#### Official spec sources

| Source | Use |
| --- | --- |
| [report_output_spec.md](../output/report_output_spec.md) | Section keys, column schemas (extend for P4) |
| [phase4_design_document.md](phase4_design_document.md) | P4-D06 |
| [unit_and_precision_policy.md](../design/unit_and_precision_policy.md) | Formatting |
| [test_plan_cad_report.md](../verification/test_plan_cad_report.md) | CSV/report checklist |
| [phase4_completion_gate.md](phase4_completion_gate.md) | D06-C01..C05 |

#### Estimated implementation areas

| Area | Path (estimated) | Rationale |
| --- | --- | --- |
| Report assembler | `frontend/src/liner/exports/roadReport.ts` (new) | Unified HTML report |
| CSV bundler | `frontend/src/liner/exports/roadCsvExport.ts` (new) | Multi-file export |
| Wire existing builders | `ldistReportExport.ts`, `haunchReportExport.ts`, `hosoReportExport.ts` | D02–D04 hooks |
| UI export buttons | `LinerFormalDrawingWorkspacePage.tsx`, `LinerPreviewPage.tsx` | D06-C05 |
| Spec update | `docs/road/output/report_output_spec.md` | Add P4 sections (doc-only PR acceptable within D06) |

#### Planned tests

| Test | Gate |
| --- | --- |
| HTML section keys present | D06-C01 |
| `grid_points.csv` headers | D06-C02 |
| P4 CSV files when data present | D06-C03 |
| Export blocked on errors | D06-C04 |
| E2E export click | D06-C05, P4-E2E-02 |

#### PR plan

| Item | Value |
| --- | --- |
| Branch | `feat/phase4-p4-d06-reports-csv` |
| PR title | `feat(liner): implement P4-D06 reports and CSV export` |

#### Risks

| Risk | Mitigation |
| --- | --- |
| D02–D04 export builders incomplete | Verify D03/D04 ship builders before D06 merge |
| Stale `sourceRevision` | Fail-closed per D06-C04 |
| Report spec drift | Update spec in same PR as implementation |

---

### P4-D07 — Persistence / Legacy / Migration

#### Purpose

Consolidate P4 field round-trip, legacy read-old, and pure migration steps for all P4 inputs (multi-alignment, LDIST, HAUNCH, HOSO) without dual write or unapproved schema bump.

#### Dependencies

| Upstream | Reason |
| --- | --- |
| P4-D01..D06 | Feature shapes and capability blocks must be stable |

**Downstream:** P4-D08 (save/load E2E, migration regression).

#### In scope

- Save path: `roadDesignDocument` only; strip `domainDraft` / `drawingDocument` from persisted JSON
- Read path: `roadDesignDocumentToDomainDraft` + `migrateLinerDraftToVNext`
- Migration registry steps for P4 extension payload growth
- Legacy adapter: map known fields; quarantine unknowns
- Idempotent migration (D07-C03)
- Extension key decision: dedicated keys vs geometry payload v0.2.0+ (planning freeze open item #2)
- `ROAD_DESIGN_DOCUMENT_SCHEMA_VERSION` remains `0.1.0` unless separate approval

#### Out of scope

- Full Importer target workflow (PR-26)
- Branch/merge topology migration
- Result cache persistence
- Dual write to `domainDraft`

#### Official spec sources

| Source | Use |
| --- | --- |
| [phase4_planning_freeze.md](phase4_planning_freeze.md) | Persistence policy |
| [schema_migration_policy.md](../legacy-integration/schema_migration_policy.md) | Migration rules |
| [phase4_design_document.md](phase4_design_document.md) | P4-D07 |
| [phase4_completion_gate.md](phase4_completion_gate.md) | D07-C01..C06 |

#### Estimated implementation areas

| Area | Path (estimated) | Rationale |
| --- | --- | --- |
| Migration registry | `frontend/src/contracts/migration/registry.ts` | Pure P4 steps |
| Legacy adapter | `frontend/src/contracts/legacy/road/adapter.ts` | Read-old |
| Mapper tests | `frontend/src/liner/adapters/linerDomainDraftRoadDesignMapper.test.ts` | Round-trip all P4 groups |
| Project migration | `frontend/src/liner/schema/projectLinerMigration.ts` | Hydrate paths |
| Persistence | `frontend/src/liner/adapters/linerProjectDraft.ts` | Save/load strip |
| Integration tests | `migrationIntegration.test.ts`, `migrationFramework.test.ts`, `legacyRoadAdapter.test.ts` | D07-C03..C05 |
| App tests | `frontend/src/App.linerSaveLoad.test.tsx` | D07-C01 |

#### Planned tests

| Test | Gate |
| --- | --- |
| Saved JSON shape | D07-C01 |
| P4 fields round-trip | D07-C02 |
| Idempotent migration | D07-C03 |
| Legacy pre-P4 projects load | D07-C04 |
| No dual write | D07-C05 |
| Schema version 0.1.0 | D07-C06 |

#### PR plan

| Item | Value |
| --- | --- |
| Branch | `feat/phase4-p4-d07-persistence-migration` |
| PR title | `feat(liner): implement P4-D07 persistence and migration` |

#### Risks

| Risk | Mitigation |
| --- | --- |
| Extension key split decision | Document supervisor decision in PR; default geometry extension unless amended |
| S1 stop: schema bump required | Halt and seek approval artifact |
| D02 deferred migration steps | Consolidate any skipped D02 legacy work here |

---

### P4-D08 — E2E and Final Verification (FINAL D-step)

#### Purpose

Integrate Playwright E2E, regression golden cases, global quality commands, and `docs/history/road/phase4_final_verification.md` with supervisor sign-off — closing Phase 4.

#### Dependencies

| Upstream | Reason |
| --- | --- |
| P4-D01..D07 | All features and persistence complete |

#### In scope

**E2E scenarios (minimum):**

| ID | Scenario |
| --- | --- |
| P4-E2E-01 | Multi-alignment create/save/reload/active switch |
| P4-E2E-02 | LDIST job → results → **CSV download** |
| P4-E2E-03 | HAUNCH/HOSO save/reload round-trip |
| P4-E2E-04 | Formal drawing confirmation after reload |
| P4-E2E-05 | Review tab = Bridge Layout only (regression) |

**Global quality commands** (exit code 0, recorded in final verification):

```bash
cd frontend && npm run typecheck
cd frontend && npm run lint
cd frontend && npm run test -- src/liner src/contracts/persistence src/contracts/legacy src/contracts/migration
cd frontend && npm run test:regression
cd frontend && npm run build
npx playwright test   # P4 subset + existing P1–P3 E2E
```

**Artifacts:**

- `docs/history/road/phase4_final_verification.md` — verdict **COMPLETE**, empty BLOCKER section
- P4 golden cases in `examples/liner/` or regression config
- Extraction sign-off links (D08-C05)

#### Out of scope

- New feature work
- Phase 4.5 / BMV2 deliverables

#### Official spec sources

| Source | Use |
| --- | --- |
| [phase4_completion_gate.md](phase4_completion_gate.md) | D08-C01..C05, G-P4-01..06 |
| [phase4_design_document.md](phase4_design_document.md) | P4-D08 |
| [stage8_verification_plan.md](../../planning/stage6-10/stage8_verification_plan.md) | R8-09..14 evidence |

#### Estimated implementation areas

| Area | Path (estimated) |
| --- | --- |
| E2E specs | `frontend/tests/e2e/p4-d03-*.spec.ts`, `p4-d04-*.spec.ts`, extend `p4-d02-ldist.spec.ts` |
| Regression config | `frontend/vitest.regression.config.ts` |
| Golden fixtures | `examples/liner/`, `frontend/src/liner/core/**/__tests__/fixtures/` |
| Final verification doc | `docs/history/road/phase4_final_verification.md` (new) |

#### PR plan

| Item | Value |
| --- | --- |
| Branch | `feat/phase4-p4-d08-e2e-final-verification` |
| PR title | `feat(liner): complete P4-D08 E2E and Phase 4 final verification` |

#### Risks

| Risk | Mitigation |
| --- | --- |
| E2E flakiness | Reuse Phase 3 patterns; deterministic fixtures |
| parityCli / `.tmp` noise in test runs | Exclude from P4 gate; note in verification doc |
| GitHub checks absent | Local validation only statement |
| D05-C07 overlay requirement emerges | Supervisor amendment before D08 COMPLETE |

---

## 3. Dependency graph (summary)

```text
P4-D01 (COMPLETE)
    ├── P4-D02 (COMPLETE)
    ├── P4-D03 ──┐
    ├── P4-D04 ──┼──► P4-D06 ──► P4-D07 ──► P4-D08 (FINAL)
    └── P4-D05 ──┘         ▲
         (parallel)         │
              D02 hooks ────┘ (D06 also consumes D03/D04 export builders)

Parallelism after D01 freeze:
  • D03, D04, D05 may proceed concurrently (separate PRs)
  • D06 waits for D02, D03, D04 calculation + export hooks
  • D07 waits for D01–D06 feature shapes stable
  • D08 waits for D01–D07
```

### Recommended execution order (serial fallback)

If parallel capacity is limited:

1. P4-D03 → P4-D04 (calculation modules; extraction records first)
2. P4-D05 (can overlap with D03/D04)
3. P4-D06
4. P4-D07
5. P4-D08

---

## 4. PR split policy

| Rule | Detail |
| --- | --- |
| Granularity | **1 D-step = 1 feature branch = 1 squash-merge PR** |
| Staging | Explicit `git add <paths>` only (no `git add .`) |
| Pre-PR docs | D03/D04: extraction record + scope doc before implementation PR |
| Quality | typecheck + lint + targeted tests per PR; full gate at D08 |
| CI claim | **Local validation only** until GitHub checks configured |

### Branch naming convention

```text
feat/phase4-p4-d03-haunch-equivalent
feat/phase4-p4-d04-hoso-equivalent
feat/phase4-p4-d05-review-diagrams
feat/phase4-p4-d06-reports-csv
feat/phase4-p4-d07-persistence-migration
feat/phase4-p4-d08-e2e-final-verification
```

---

## 5. Cross-cutting risks

| ID | Risk | Severity | Owner step |
| --- | --- | --- | --- |
| R1 | Missing §6/§7 extraction → numeric COMPLETE blocked | **HIGH** | D03, D04 |
| R2 | Phase 0–3 regression (S3 stop) | **HIGH** | All |
| R3 | Unapproved `schemaVersion` bump (S1 stop) | **HIGH** | D07 |
| R4 | Persistence boundary violation (S4/S5) | **HIGH** | D07 |
| R5 | GitHub checks not configured — false “CI PASS” claims | **MED** | D08 |
| R6 | parityCli `.tmp` artifacts confuse validation | **LOW** | D08 (document only) |
| R7 | P4-D02 Mode B scope creep to strict JIP compatibility | **MED** | D03+ (do not extend) |
| R8 | Extension key split undecided | **MED** | D07 (supervisor decision) |
| R9 | D05-C07 diagram overlays required at D08 | **LOW** | D08 (amendment if needed) |

---

## 6. Phase 4 completion gate (summary)

Phase 4 is **COMPLETE** only when **G-P4-01 through G-P4-06** pass ([phase4_completion_gate.md](phase4_completion_gate.md)):

| Gate | Criterion |
| --- | --- |
| **G-P4-01** | P4-D01..D08 each COMPLETE per step tables |
| **G-P4-02** | No BLOCKER in `phase4_final_verification.md` |
| **G-P4-03** | Persisted JSON uses `roadDesignDocument` only |
| **G-P4-04** | LDIST, HAUNCH, HOSO extractions + O1 baselines approved |
| **G-P4-05** | `ROAD_DESIGN_DOCUMENT_SCHEMA_VERSION` = `0.1.0` (or approved bump) |
| **G-P4-06** | Out-of-scope items not shipped as P4 |

### Per-step BLOCKER summary (D03–D08)

| Step | BLOCKER condition |
| --- | --- |
| D03 | D03-C01 (extraction) or D03-C03 (any family O1) missing |
| D04 | D04-C01 or D04-C03 missing; negative thickness accepted |
| D05 | Confirmation canvas on review tab; `drawingDocument` persisted |
| D06 | Export succeeds with blocking errors |
| D07 | Dual write; non-idempotent migration; unapproved schema bump |
| D08 | Any P4-E2E fail/skip; quality command non-zero; verification doc not COMPLETE |

---

## 7. Final completion judgment method

1. **Per-step:** Each D03–D08 PR provides evidence mapping to completion gate rows (D0x-C0y).
2. **Integration:** D07 proves end-to-end RDD round-trip for all P4 fields.
3. **E2E:** D08 runs P4-E2E-01..05 with 0 failures, 0 skips.
4. **Quality:** D08 records global command exit codes (local only).
5. **Documentation:** `docs/history/road/phase4_final_verification.md` published with:
   - G-P4-01..06 checklist
   - Extraction doc paths + supervisor sign-off
   - Sample saved `project.json`
   - PR list for D01–D08
   - Explicit “GitHub checks: not configured — local validation only”
   - parityCli `.tmp` note if relevant
6. **Supervisor verdict:** Grok 4.5 issues Phase 4 COMPLETE verdict in verification doc.

**Current Phase 4 status:** **IN PROGRESS** (D01–D02 COMPLETE; D03–D08 NOT STARTED).

---

## 8. Open items / supervisor decisions

| # | Item | Status | Impact |
| --- | --- | --- | --- |
| O1 | §6 HAUNCH formula extraction record | **Not started** | D03 BLOCKER |
| O2 | §7 HOSO formula extraction record | **Not started** | D04 BLOCKER |
| O3 | Extension key split (geometry-only vs dedicated keys) | Open in planning freeze §Open items #2 | D07 |
| O4 | D05-C07 LDIST/HAUNCH/HOSO diagram overlays at D08 | N/A unless amended | D08 |
| O5 | `report_output_spec.md` P4 section formal add | Pending D06 | D06 |
| O6 | JIP §6/§7 exact PDF page ranges for extraction | Not recorded (D02 pattern: record at extraction time) | D03, D04 |

### Not unknown (resolved by prior work)

- LDIST §5.8 extraction: **APPROVED** (`p4_d02_ldist_extraction_record.md`)
- Multi-alignment: **COMPLETE** (D01)
- Review tab policy: Bridge Layout only (frozen)
- Mode B MVP: alignment azimuth–based `sin(θ_ref)` (D02 N1 — no extension without amendment)

---

## 9. Pre-implementation checklist (D03 first PR)

- [ ] Supervisor approves this execution plan (`PHASE4_D03_TO_FINAL_PLAN_VERDICT`)
- [ ] Create `p4_d03_scope.md` + `p4_d03_haunch_extraction_record.md`
- [ ] Supervisor extraction approval for §6 (D03-C01)
- [ ] Dedicated feature branch from `main` at clean HEAD
- [ ] Record local typecheck/lint/test results in PR (not “CI PASS”)

---

## Approval record

| Field | Value |
| --- | --- |
| Document status | **PROPOSED** |
| Prepared by | Composer 2.5 |
| Prepared on | 2026-07-21 |
| Supervisor | Cursor Grok 4.5 |
| Plan verdict | **Pending** — `PHASE4_D03_TO_FINAL_PLAN_VERDICT` |
| Amendment log | _(none)_ |
