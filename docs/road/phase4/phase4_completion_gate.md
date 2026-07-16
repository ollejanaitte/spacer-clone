# Phase 4 Completion Gate — Road Advanced Calculation & Utilities

**Date:** 2026-07-16  
**Status:** AUTHORITATIVE  
**Approved by:** Cursor Grok 4.5 (supervisor)  
**Authoritative effective date:** 2026-07-16  
**Planning freeze:** [phase4_planning_freeze.md](phase4_planning_freeze.md)  
**Design document:** [phase4_design_document.md](phase4_design_document.md)

## Purpose

Define **COMPLETE** criteria for each Phase 4 step and for overall Phase 4 acceptance. A step is either **NOT STARTED**, **IN PROGRESS**, or **COMPLETE**. Partial completion is recorded as **IN PROGRESS**, not “COMPLETE (known PARTIAL)”.

This gate is **AUTHORITATIVE** as of 2026-07-16 (supervisor: Cursor Grok 4.5). Phase 4 **implementation** COMPLETE is still pending P4-D01..D08 evidence.

## Collision and naming

This gate applies only to **Road Advanced Calculation & Utilities** (`docs/road/phase4/`). It does not gate Phase 4.5 semantic parity, BMV2 load surface, or Phase 5 formal-drawing completion.

## Overall Phase 4 COMPLETE definition

Phase 4 is **COMPLETE** only when **all** rows below pass. Partial progress is **IN PROGRESS**, never “COMPLETE (known PARTIAL)”.

| ID | Acceptance criterion | Required evidence | Required test | Failure condition | N/A condition |
| --- | --- | --- | --- | --- | --- |
| **G-P4-01** | P4-D01 through P4-D08 each **COMPLETE** per step tables below | Per-step evidence columns satisfied | Per-step test columns satisfied | Any step incomplete or BLOCKER open | None |
| **G-P4-02** | No open **BLOCKER** in `docs/history/road/phase4_final_verification.md` | Final verification doc with BLOCKER section empty | Supervisor review of verification doc | Any BLOCKER listed | None |
| **G-P4-03** | Persisted JSON uses `roadDesignDocument` only | Saved `project.json` sample in verification; E2E JSON assert | `App.linerSaveLoad.test.tsx`, P4 E2E save shape | `domainDraft` or `drawingDocument` in saved output | None |
| **G-P4-04** | LDIST, HAUNCH, HOSO have approved extractions + O1 baselines | Extraction doc paths + Vitest fixture paths in verification | D02-C03, D03-C03, D04-C03 all pass | Missing extraction or failing O1 for any module | None |
| **G-P4-05** | `ROAD_DESIGN_DOCUMENT_SCHEMA_VERSION` remains `0.1.0` | `contractVersionRegistry` + saved RDD sample | Contract version test / save assert | Bump without linked approval artifact | Bump explicitly approved and documented |
| **G-P4-06** | Out-of-scope items not shipped as P4 | PR list + verification negative scope check | Manual review checklist in final verification | TOOL, widening slice, height tab, full Importer workflow, or branch/merge merged as P4 | None |

Until G-P4-01..G-P4-06 pass, Phase 4 status is **NOT COMPLETE**.

## Global quality commands (P4-D08)

Recorded in final verification with exit code 0:

| Command | Scope |
| --- | --- |
| `cd frontend && npm run typecheck` | Whole frontend |
| `cd frontend && npm run lint` | Includes hygiene scans |
| `cd frontend && npm run test -- src/liner src/contracts/persistence src/contracts/legacy src/contracts/migration` | Liner + contracts |
| `cd frontend && npm run test:regression` | Golden regression |
| `cd frontend && npm run build` | Production build |
| `npx playwright test` (P4 E2E subset) | Listed in P4-D08 |

## Per-step COMPLETE criteria

### P4-D01 — Multiple Alignment and Line Management

| ID | Acceptance criterion | Required evidence | Required test | Failure condition | N/A condition |
| --- | --- | --- | --- | --- | --- |
| D01-C01 | ≥2 alignments save/reload via RDD with distinct `entityId`s | Mapper test output; sample RDD JSON | `linerDomainDraftRoadDesignMapper.test.ts` | IDs collide or second alignment lost on reload | None |
| D01-C02 | Active alignment switch updates editors and pipeline default | UI test log or screenshot in verification | Unit test + component or E2E | Editors show wrong alignment data after switch | None |
| D01-C03 | No cross-alignment ID leakage (R8-09) | O1 fixture description in verification | Dedicated Vitest per alignment | Cross-alignment reference resolves | None |
| D01-C04 | `topologyCapability.state` reflects supported multi-alignment | RDD sample with capability block | RDD validation test | Wrong capability state for alignment count | None |
| D01-C05 | Legacy single-alignment projects migrate without data loss | Migration test output | `migrationIntegration.test.ts` or P4 migration test | Data dropped on migrate | None |
| D01-C06 | Branch/merge **not** present | Source scan note in verification | Negative grep / review checklist | Branch/merge UI or schema shipped | None |

**Step BLOCKER:** D01-C01 or D01-C05 fails; or multi-alignment still rejected at migration without forward path.

---

### P4-D02 — LDIST Equivalent

| ID | Acceptance criterion | Required evidence | Required test | Failure condition | N/A condition |
| --- | --- | --- | --- | --- | --- |
| D02-C01 | §5.8 formula extraction record committed (supervisor-approved) | Path to extraction doc in verification | Supervisor sign-off link in final verification | Implementation without approved extraction | None |
| D02-C02 | LDIST calculator pure module with `algorithmVersion` | Source path in PR | Unit test invoking calculator | Missing version or side effects in UI layer | None |
| D02-C03 | O1 baseline ≥2 scenarios (straight + skew) pass R8-12 | Fixture JSON paths | Vitest LDIST baseline file | Oracle mismatch beyond tolerance | None |
| D02-C04 | Inputs persist; `ldistCapability.state: "supported"` | RDD round-trip JSON | Mapper round-trip test | Capability absent or inputs lost | None |
| D02-C05 | Invalid refs fail-closed with stable diagnostic codes | Diagnostic code list in verification | Unit tests for invalid refs | Silent skip or generic error only | None |
| D02-C06 | UI editor and results visible | Screenshot or E2E trace | Component test or E2E | No user path to define/view LDIST | None |
| D02-C07 | `ldist_results.csv` + report `ldistResults` | Export sample files | CSV/report Vitest | Missing columns or wrong row count | None |

**Step BLOCKER:** D02-C01 or D02-C03 missing — numeric COMPLETE forbidden.

---

### P4-D03 — HAUNCH Equivalent

| ID | Acceptance criterion | Required evidence | Required test | Failure condition | N/A condition |
| --- | --- | --- | --- | --- | --- |
| D03-C01 | §6 formula extraction record committed | Extraction doc path | Supervisor approval | No extraction | None |
| D03-C02 | Four type families implemented (2-point, 3-point, plane, range) | Source + test file list | Per-family unit tests | Any family missing | None |
| D03-C03 | O1 baseline per family (≥4) pass R8-13 | Fixture paths per family | Vitest per family | Any family oracle fails | None |
| D03-C04 | RDD round-trip for `haunchDefinitions` | Mapper test output | `linerDomainDraftRoadDesignMapper.test.ts` | Definitions lost | None |
| D03-C05 | `haunchCapability.state: "supported"` when definitions exist | RDD sample | Validation test | Wrong state | None |
| D03-C06 | UI + `haunch_results.csv` / report section | Export samples | Export Vitest | Missing UI or export | None |

**Step BLOCKER:** D03-C01 or D03-C03 missing for any released family.

---

### P4-D04 — HOSO Equivalent

| ID | Acceptance criterion | Required evidence | Required test | Failure condition | N/A condition |
| --- | --- | --- | --- | --- | --- |
| D04-C01 | §7 formula extraction record committed | Extraction doc path | Supervisor approval | No extraction | None |
| D04-C02 | Five type families implemented | Source + test list | Per-family tests | Any family missing | None |
| D04-C03 | O1 baseline per family pass R8-14 | Fixture paths | Vitest per family | Oracle failure | None |
| D04-C04 | Negative thickness rejection | Test name in verification | Unit test | Negative thickness accepted | None |
| D04-C05 | RDD round-trip; `hosoCapability.state` | Mapper output | Mapper + validation tests | Data or state wrong | None |
| D04-C06 | UI + `hoso_results.csv` / report section | Export samples | Export Vitest | Missing export path | None |

**Step BLOCKER:** D04-C01 or D04-C03 missing for any released family.

---

### P4-D05 — Review Diagrams and Utilities UI

| ID | Acceptance criterion | Required evidence | Required test | Failure condition | N/A condition |
| --- | --- | --- | --- | --- | --- |
| D05-C01 | Review tab = **Bridge Layout only** | Test name in verification | `LinerEditPage` test + P4-E2E-05 | Confirmation canvas on review tab | None |
| D05-C02 | Confirmation via **Formal Drawing** (primary) | E2E trace `/pro/liner/drawings/*` | Builder tests + E2E | No plan/profile/cross route | None |
| D05-C03 | `DrawingDocument` not persisted; reload regenerates same signature | Test output | `drawingSettingsPersistence.test.ts` pattern | `drawingDocument` in save JSON | None |
| D05-C04 | Ground profile explicit unavailable | Screenshot/DXF snippet | Profile band assertion | Fabricated ground data | None |
| D05-C05 | Widening band row unavailable | Builder test name | `formalBuilders` test | Widening shows numeric values | None |
| D05-C06 | Preview secondary link to Formal Drawing documented | UX note in verification | E2E or manual smoke | Preview claimed as primary-only surface | None |
| D05-C07 | LDIST/HAUNCH/HOSO diagram overlays | Annotation screenshots | Diagram tests | — | **N/A** unless supervisor requires in P4-D08 amendment |

**Not required for D05 COMPLETE:** D05-C07 when N/A.

---

### P4-D06 — Reports and CSV

| ID | Acceptance criterion | Required evidence | Required test | Failure condition | N/A condition |
| --- | --- | --- | --- | --- | --- |
| D06-C01 | HTML report includes extended sections | Report HTML sample | Vitest DOM/section keys | Missing P4 sections | None |
| D06-C02 | `grid_points.csv` English keys | CSV sample | CSV Vitest | Wrong headers | None |
| D06-C03 | P4 CSV files when data present | `ldist`/`haunch`/`hoso` samples | CSV Vitest per file | Empty export when data exists | **N/A** when no P4 data in fixture (must still test when data present) |
| D06-C04 | Export fail-closed on error-level diagnostics | Test description | Unit test | Export succeeds with blocking errors | None |
| D06-C05 | Export control on Preview and/or Formal Drawing | E2E trace | E2E click export | No user-visible export | None |

---

### P4-D07 — Persistence / Legacy / Migration

| ID | Acceptance criterion | Required evidence | Required test | Failure condition | N/A condition |
| --- | --- | --- | --- | --- | --- |
| D07-C01 | Save = `roadDesignDocument` only | Saved JSON in verification | App + E2E assert | Extra canonical liner fields | None |
| D07-C02 | P4 fields round-trip | Mapper test log | `linerDomainDraftRoadDesignMapper.test.ts` | Field loss | None |
| D07-C03 | Migration step(s) idempotent | Migration report sample | `migrationFramework.test.ts` + integration | Non-idempotent migrate | None |
| D07-C04 | Legacy read-old for pre-P4 projects | Test output | `legacyRoadAdapter.test.ts` | Legacy load breaks | None |
| D07-C05 | No dual write; legacy unchanged | Integration test log | `migrationIntegration.test.ts` | Dual write detected | None |
| D07-C06 | No schema bump without approval | Contract test + verification link | Version assert test | Unapproved `0.2.0` etc. | Approved bump with artifact |

---

### P4-D08 — E2E and Final Verification

| ID | Acceptance criterion | Required evidence | Required test | Failure condition | N/A condition |
| --- | --- | --- | --- | --- | --- |
| D08-C01 | P4-E2E-01..05 pass, 0 skip | Playwright HTML/report | `npx playwright test` subset | Any skip or fail | None |
| D08-C02 | Global quality commands exit 0 | Command log in final verification | typecheck, lint, test, regression, build | Any non-zero exit | None |
| D08-C03 | `phase4_final_verification.md` verdict **COMPLETE** | History doc path | Supervisor review | Verdict missing or PARTIAL | None |
| D08-C04 | Regression includes P4 golden cases | Config path in verification | `test:regression` or P4 config | No P4 cases | None |
| D08-C05 | Supervisor sign-off on extractions | Links in final verification | Documentary | Missing sign-off | None |

## Numeric basis gate (cross-cutting)

| Module | Prerequisite for step COMPLETE |
| --- | --- |
| LDIST (P4-D02) | §5.8 extraction + O1 baselines (D02-C01, D02-C03) |
| HAUNCH (P4-D03) | §6 extraction + O1 per family (D03-C01, D03-C03) |
| HOSO (P4-D04) | §7 extraction + O1 per family (D04-C01, D04-C03) |

**Extraction Required** state in design doc is **not** sufficient for COMPLETE — extraction must be **done and approved**.

Tolerance registration: each benchmark row documents ABS or COMBINED mode per [`stage8_verification_plan.md`](../../planning/stage6-10/stage8_verification_plan.md) R8-12/13/14.

## Explicit non-completion (out of scope)

The following do **not** block Phase 4 COMPLETE if absent:

| Item | Status |
| --- | --- |
| TOOL / station calculator | Deferred — not counted |
| Widening quartic/transition (PR-24) | Deferred — `widthChangePoints` Phase 2 behavior only |
| Per-line height tab editing | Deferred |
| Full Importer target workflow (PR-26) | Deferred |
| Branch / merge (PR-23) | Deferred |
| `DrawingDocument` persistence | Must remain absent |
| Fabricated ground profile | Must remain absent |
| Phase 4.5 / BMV2 Phase 4 deliverables | Different programs |

## Failure and rollback

| Situation | Action |
| --- | --- |
| P4 calculation regression | Disable capability flag; prior RDD revision readable |
| Migration failure | Fail-closed; do not write target; legacy unchanged |
| Export with stale `sourceRevision` | Fail-closed or warn per D06-C04 |

## Approval record

| Field | Value |
| --- | --- |
| Document status | **AUTHORITATIVE** |
| Prepared by | Phase 4 documentation worker (Composer 2.5) |
| Prepared on | 2026-07-16 |
| Supervisor | Cursor Grok 4.5 |
| Supervisor review date | 2026-07-16 |
| Phase 4 COMPLETE verdict | **Not issued** — pending implementation and P4-D08 |
| Document approval | **Approved** — AUTHORITATIVE |
| Authoritative effective date | 2026-07-16 |
| Supervisor signature / record | Gate document approved; implementation COMPLETE requires G-P4-01..06 |
