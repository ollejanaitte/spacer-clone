# Phase 4 Planning Freeze — Road Advanced Calculation & Utilities

**Date:** 2026-07-16  
**Status:** AUTHORITATIVE  
**Repository HEAD at survey:** `b36aaa6` (reference only; this document does not change code)  
**Approved by:** Cursor Grok 4.5 (supervisor)  
**Authoritative effective date:** 2026-07-16

## Authority and lifecycle

This document is the **planning freeze** for Phase 4 of the Road Design Tool. It records supervisor-frozen scope, boundaries, persistence rules, implementation steps, and collision notes. It does not authorize implementation by itself.

| Document | Role |
| --- | --- |
| [phase4_planning_freeze.md](phase4_planning_freeze.md) (this file) | Scope, steps, persistence, out-of-scope, gates at planning level |
| [phase4_design_document.md](phase4_design_document.md) | Feature-level design: inputs, outputs, UI, persistence, verification |
| [phase4_completion_gate.md](phase4_completion_gate.md) | Per-step COMPLETE criteria and final Phase 4 acceptance |

These three documents are the **AUTHORITATIVE** Phase 4 reference under `docs/road/phase4/` as of 2026-07-16.

## Formal name

**Road Advanced Calculation & Utilities**

Use this name in UI copy, PR titles, and verification evidence. Retire informal labels such as “Phase 4.0-2 confirmation drawing” from new work (see [Collision and naming](#collision-and-naming)).

## Executive summary

Phase 4 completes target road **calculation and utility** capabilities on `RoadDesignDocument` without frame mechanics, without `DrawingDocument` persistence, and without reviving `domainDraft` as the canonical write target. Work is delivered in eight reviewable steps (P4-D01 through P4-D08). Numerical behavior for LDIST, HAUNCH, and HOSO follows JIP-LINER manual sections as **semantic authority** only; concrete formulas are **Extraction Required** from the PDF before implementation claims numeric parity.

Current repository facts (Phase 0–3): geometry core, RDD save/load, formal drawing workspace (runtime `DrawingDocument`), bridge layout on the setup **review** tab, and capability-block stubs (`ldistCapability`, `haunchCapability`, `hosoCapability`, `topologyCapability` all `absent`) are in place. LDIST, HAUNCH, HOSO, multi-alignment product behavior, road reports, and road CSV export are **not implemented**.

## Collision and naming

| Label | Relationship to this Phase 4 |
| --- | --- |
| **Stage 10 “Phase P4 — Road Design Feature Slices”** | Content-aligned target sequence ([`stage10_gap_migration_sequence.md`](../../planning/stage6-10/stage10_gap_migration_sequence.md) §P4, PR-21..29). This `docs/road/phase4/` set is the **canonical freeze** for the road product; Stage 10 remains the cross-product program index. |
| **`docs/history/road/phase4.5/`** | **Different series** — BridgeDefinition semantic parity. Not in scope. |
| **`docs/bridge-modeler-v2/05_phase4_load_surface.md`** | **Different product** — BMV2 load surface / deck zones. Not in scope. |
| **`docs/history/road/phase3.9/` “Phase 4.0” sub-labels** | Superseded terminology for confirmation drawings. Use **Road Advanced Calculation & Utilities** and P4-D05 instead. |

## In scope (MUST)

| # | Capability | MVP boundary |
| --- | --- | --- |
| 1 | **Multiple alignment and line management** | Multiple `alignments[]` entries, **active alignment** selection, stable line/offset references per alignment. **Branch/merge deferred.** |
| 2 | **LDIST equivalent** | Grid-point distance and overhang (cantilever) calculations at stations, with diagnostics and export hooks. |
| 3 | **HAUNCH equivalent** | Typed haunch definitions/regions and derived elevations/thicknesses per manual type families. |
| 4 | **HOSO equivalent** | Pavement thickness definitions/regions (auto, longitudinal, transverse, 2/3-point families). |
| 5 | **Review diagram enhancement** | Strengthen plan/profile/cross-section confirmation views via **Formal Drawing workspace (primary)** and Preview link (secondary). **Setup review tab stays Bridge Layout.** **Do not move confirmation diagrams into the review tab.** |
| 6 | **Calculation report output** | Structured road reports from intermediate results per [`report_output_spec.md`](../output/report_output_spec.md), extended for P4 sections. |
| 7 | **CSV output** | Road grid and P4 calculation tables as CSV with stable English column keys. |
| 8 | **RoadDesignDocument save/load** | Continue write-target `project.liner.roadDesignDocument`; P4 inputs persisted via capability blocks + extensions. |
| 9 | **Legacy read and Migration Framework** | Read-old/write-target; pure migration steps for new P4 fields without dual write. **Full Importer target workflow deferred** — extend existing legacy adapter + migration registry only. |
| 10 | **UI integration** | Wire P4 editors, exports, and diagram entry points into existing liner routes. |
| 11 | **Numerical verification** | **O1 independent hand-calculation baseline required** for each released P4 calculation module (Stage 8 R8-12/13/14). |
| 12 | **E2E** | Browser scenarios for save/load, P4 calculation visibility, and export paths. |
| 13 | **Regression tests** | Deterministic unit/regression coverage for P4 calculations and RDD round-trip. |

## Out of scope (MUST NOT)

| Item | Rule |
| --- | --- |
| FEM / load analysis / bridge structural skeleton / SPACER-equivalent mechanics | Road remains geometry and road-domain calculations only. |
| BridgeDefinition re-implementation | Deferred to Phase 4.5 history series; not reopened here. |
| Phase 5 formal-drawing series re-definition | Phase 5 docs remain reference for existing builders; P4 extends behavior only where listed in P4-D05/D06. |
| `DrawingDocument` canonical persistence | Runtime regeneration only; same as Phase 3. |
| `domainDraft` canonical write revival | `domainDraft` is read-old / in-memory UI compatibility only. |
| Dual write / direct frame mutation from P4 | All writes go through RDD (and existing headless mapping contracts). |
| Fabricated ground profile | Display `unavailable` explicitly; no synthetic ground line. |
| Ungrounded `schemaVersion` / migration version bump | **Principle: no bump in Phase 4 implementation without separate approval.** Design allows optional capability + extensions payload growth on `0.1.0`. |
| **TOOL** (station calculator, etc.) | Stage 10 PR-30 — **deferred / out of scope** for this freeze. |
| **Widening completion slice** (Stage 10 PR-24) | **deferred.** Existing `widthChangePoints` (Phase 2) remain as-is; no quartic/transition widening work in P4. |
| **Per-line height tab editing** | **deferred** (phase3.9 follow-up). |
| **Full Importer target workflow** (Stage 10 PR-26) | **deferred.** P4-D07 covers legacy adapter + migration for P4 fields only. |
| Branch / merge topology | **deferred** beyond multi-alignment entries. |

## Persistence policy (frozen)

| Surface | Policy |
| --- | --- |
| **Write target** | `project.liner.roadDesignDocument` only for persisted road state. |
| **`domainDraft`** | Hydrated in memory from RDD or migrated legacy; **not** written back as canonical JSON. |
| **`DrawingDocument`** | Built at runtime from domain + `drawingSettings`; **not** persisted in `project.json`. |
| **P4 authoritative inputs** | Prefer existing optional RDD fields: `topologyCapability`, `ldistCapability`, `haunchCapability`, `hosoCapability`, plus **`extensions` payload** expansion (`spacer.liner/domain-draft-vnext-geometry` and/or dedicated extension keys). Avoid large first-class schema additions on `RoadDesignDocument`. |
| **P4 derived results** | **Recompute by default** after load (deterministic pipeline). If cached in extensions, reload must reproduce identical values from inputs + algorithm version. |
| **`ROAD_DESIGN_DOCUMENT_SCHEMA_VERSION`** | Stays `0.1.0` for Phase 4 unless a separate approval record proves a bump is required. Design doc lists bump as **candidate only**. |

Evidence: [`linerProjectDraft.ts`](../../../frontend/src/liner/adapters/linerProjectDraft.ts), [`phase3_final_verification.md`](../../history/road/phase3_final_verification.md), [`contractVersionRegistry.ts`](../../../frontend/src/contracts/contractVersionRegistry.ts).

## Numerical basis policy (no fabrication)

| Source | Use |
| --- | --- |
| JIP-LINER manual §5.8 | LDIST semantic authority ([`docs/manual/README.md`](../../manual/README.md), PDF at `マニュアル/JIP-LINER_マニュアル.pdf`) |
| JIP-LINER manual §6 | HAUNCH semantic authority |
| JIP-LINER manual §7 | HOSO semantic authority |
| [`stage8_verification_plan.md`](../../planning/stage6-10/stage8_verification_plan.md) R8-12, R8-13, R8-14 | Acceptance row definitions (oracle O1, tolerances) |
| [`numerical_accuracy.md`](../design/numerical_accuracy.md), [`unit_and_precision_policy.md`](../design/unit_and_precision_policy.md) | Shared length/angle/station tolerances |
| Stage 8 ABS/COMBINED register | Per-quantity tolerance mode for benchmarks |

**Rule:** Design and implementation documents must **not** invent formulas not extracted from the PDF. Until extraction, mark **Extraction Required** in the design document and block numeric COMPLETE in the completion gate.

## Implementation steps (frozen)

| Step | Name | Primary deliverables |
| --- | --- | --- |
| **P4-D01** | Multiple Alignment and Line Management | Multi-entry `alignments[]`, active alignment, line reference model, UI selector, R8-09 tests |
| **P4-D02** | LDIST Equivalent | Distance/overhang calculation, inputs in RDD extensions, UI, report/CSV sections, R8-12 + O1 baselines |
| **P4-D03** | HAUNCH Equivalent | Haunch type families, calculation, UI, report/CSV, R8-13 + O1 baselines |
| **P4-D04** | HOSO Equivalent | Pavement thickness type families, calculation, UI, report/CSV, R8-14 + O1 baselines |
| **P4-D05** | Review Diagrams and Utilities UI | Confirmation diagram enhancements (Formal Drawing +/or Preview); **review tab = Bridge Layout unchanged** |
| **P4-D06** | Reports and CSV | Road HTML report + CSV export per extended `report_output_spec` |
| **P4-D07** | Persistence / Legacy / Migration | RDD round-trip for P4 fields; migration steps; legacy read-old |
| **P4-D08** | E2E and Final Verification | Playwright E2E, regression suite, `phase4_final_verification.md` in history (post-implementation) |

### Dependency order

```text
P4-D01 → P4-D02, P4-D03, P4-D04 (calculations assume stable alignment/line IDs)
P4-D01 → P4-D05 (diagrams may show active alignment; may run in parallel with D02..D04 after D01 interface freeze)
P4-D02..D04 → P4-D06 (report/CSV sections)
P4-D01..D06 → P4-D07 (persistence after feature shapes stable)
P4-D01..D07 → P4-D08 (final gate)
```

P4-D05 may proceed in parallel with P4-D02..D04 once P4-D01 interface freeze is recorded.

## UI policy (frozen)

| Area | Decision |
| --- | --- |
| Setup tab `review` | **Bridge Layout** editor and diagnostics (**maintain**). Label may remain 「確認図」 in i18n until a separate copy pass; behavior is bridge layout, not LDIST/confirmation drawing. |
| Confirmation diagrams | **Primary:** Formal Drawing workspace (`/pro/liner/drawings/*`). **Secondary:** Preview link into Formal Drawing. New route allowed if it does not replace Bridge Layout review. |
| Ground profile in profile drawings | **Unavailable** — show explicit message; no fabrication. |
| Formal drawing | Continue runtime `DrawingDocument`; preview/print/DXF parity pattern from Phase 3. |

Routes: [`stage4_road_design_scope.md`](../../scoping/stage4_road_design_scope.md) B1, [`uiPreparation.ts`](../../../frontend/src/liner/uiPreparation.ts).

**Confirmation diagram primary entry (frozen):** **Formal Drawing workspace** (`/pro/liner/drawings/*`) is the primary user path. Preview may provide a secondary link into Formal Drawing; it does not replace the primary workspace.

## Phase 0–3 dependency

Phase 4 **reuses** Phase 0–3 assets and **must not break** the contracts they established.

| Asset / contract | Reuse in P4 | Do not break |
| --- | --- | --- |
| Geometry core (`liner/core/**`) | Pipeline input for LDIST/HAUNCH/HOSO samples | Phase 1 golden fixtures GC-01..GC-07; tolerances in [`numerical_accuracy.md`](../design/numerical_accuracy.md) |
| `buildIntermediateResult` / pipeline | Source for reports, CSV, diagrams | Deterministic `sourceRevision`; diagnostic code stability |
| RDD mapper + `linerProjectDraft` | P4 field persistence | Write-target `project.liner.roadDesignDocument`; no canonical `domainDraft` write |
| Formal drawing builders + `DrawingDocument` | P4-D05 confirmation diagrams | Runtime-only `DrawingDocument`; preview/print/DXF parity (Phase 3) |
| Bridge Layout on review tab | Unchanged in P4 | Span/pier evaluation and RDD round-trip (Phase 3) |
| Migration framework + legacy adapter | P4-D07 field migration | Read-old/write-target; no dual write |
| Capability block stubs on RDD | Flip `state` to `supported` when features ship | `ROAD_DESIGN_DOCUMENT_SCHEMA_VERSION` `0.1.0` unless separately approved |
| E2E / regression harness | Extend with P4 scenarios | Existing P1–P3 E2E must keep passing |

Evidence: [`phase1_final_verification.md`](../../history/road/phase1_final_verification.md), [`phase2_final_verification.md`](../../history/road/phase2_final_verification.md), [`phase3_final_verification.md`](../../history/road/phase3_final_verification.md).

## Stable ID policy

| Rule | Requirement |
| --- | --- |
| Existing IDs | Alignment, profile, cross-section, bridge, span, pier, offset line, and grid IDs from Phase 0–3 **must round-trip unchanged** through P4 save/load. |
| New P4 entities | LDIST jobs, haunch definitions, hoso definitions, and additional alignments **must** use stable string or UUID IDs registered in `stableIdRegistry` or domain extension with deterministic derivation (same pattern as [`linerDomainDraftRoadDesignMapper.ts`](../../../frontend/src/liner/adapters/linerDomainDraftRoadDesignMapper.ts)). |
| Cross-alignment isolation | Entity IDs are unique per alignment namespace; no collision across `alignments[]` entries. |
| References | Calculators and exports reference IDs only; no array-index-only coupling in persisted JSON. |
| Migration | Legacy IDs map through migration registry with explicit `MigrationIdMapping`; no silent regeneration on reload. |

## Fail-closed policy

| Situation | Behavior |
| --- | --- |
| Invalid geometry or out-of-range station | Block save or block hydrate with validation diagnostics (Phase 3 pattern). |
| Missing line/grid/definition reference in P4 calculators | Error diagnostic; **no** silent omission of result rows. |
| Unextracted LDIST/HAUNCH/HOSO formulas | **Extraction Required** — do not ship numeric COMPLETE or user-facing “verified” labels. |
| Error-level diagnostics present | Default: block report/CSV export (override only if explicitly designed and documented). |
| Ambiguous legacy input on migration | Fail-closed; quarantine unknown fields; do not guess. |
| Stale `sourceRevision` on export | Fail-closed or explicit non-authoritative warning per completion gate D06-C04. |
| Ground profile absent | Show unavailable; **never** fabricate elevation. |

## Git policy for Phase 4 implementation

Applies when implementation starts (not this design-documentation pass).

| Rule | Requirement |
| --- | --- |
| Branch | Work on a **dedicated Phase 4 branch** (name recorded in PR); do not commit P4 implementation directly to `main` without review. |
| Staging | `git add` with **explicit paths only** (no `git add .` / `git add -A`). |
| Commits | One logical step per PR where possible (P4-D01..D08 mapping). **This design freeze pass does not create implementation commits.** |
| Merge | **Squash merge** only after supervisor review and completion gate evidence for the step. |
| CI / checks | Record **local** command results in verification docs. If GitHub checks are **not configured**, state “local validation only” — **do not** claim “CI PASS” or equivalent. |
| Destructive git | No `git clean`, hard reset, force push, or branch deletion per repository agent rules. |
| Push | Remote push only on explicit user/supervisor instruction. |

## Stop conditions (implementation)

Stop implementation work and report to supervisor when any of the following occurs:

| # | Condition |
| --- | --- |
| S1 | **`ROAD_DESIGN_DOCUMENT_SCHEMA_VERSION` bump required** and no separate approval artifact exists. |
| S2 | **Numeric basis missing** — LDIST/HAUNCH/HOSO implementation attempted without approved §5.8/§6/§7 extraction record. |
| S3 | **Phase 0–3 regression** — golden fixtures, P1–P3 E2E, or RDD round-trip tests fail without an approved scope change. |
| S4 | **Persistence boundary violation** — canonical `domainDraft` or `drawingDocument` write detected in save path. |
| S5 | **Dual write or direct frame mutation** introduced from P4 code paths. |
| S6 | **Unexpected staged files** or git state outside the declared P4 paths. |
| S7 | **Typecheck / lint / test failure** on the declared quality command set after a change. |

On stop: preserve working tree changes; do not run destructive recovery; document status in PR or verification note.

## Planning freeze lift conditions

This freeze **changes** only when **both** user and supervisor approve a written amendment that:

1. Identifies the section(s) in `phase4_planning_freeze.md`, `phase4_design_document.md`, and `phase4_completion_gate.md` to update.
2. States the reason (e.g. schema bump proven necessary, scope add/remove).
3. Records the approval date and approver names in the amendment header.

Until then, implementation **must** follow this freeze. Bug fixes that do not alter scope or contracts are not freeze lifts but still require review.

## Authoritative declaration

As of 2026-07-16 supervisor approval:

1. **`phase4_planning_freeze.md`**, **`phase4_design_document.md`**, and **`phase4_completion_gate.md`** are the **sole authoritative Phase 4 specification** for Road Advanced Calculation & Utilities.
2. Document status is **AUTHORITATIVE**.
3. Stage 10 P4 / PR-21..29 remain the program index; where they conflict with these three documents, **these documents govern** the road product until a freeze lift.
4. Informal chat decisions, phase3.9 “Phase 4.0-x” labels, and superseded i18n placeholders **do not** override the authoritative set.

## Verification gates (planning level)

| Gate | Applies when |
| --- | --- |
| **G1 Road (released module)** | Each P4-D02/D03/D04 calculation module: R8-12/13/14 row + O1 baseline committed before module is “released” in verification docs. |
| **G2 Migration** | P4-D07: idempotent migration, source unchanged, no dual write. |
| **G6 Outputs (partial)** | P4-D05/D06: semantic equality of report/CSV/diagram sources before export claims. |

Full COMPLETE definitions: [phase4_completion_gate.md](phase4_completion_gate.md).

## Key references

| Topic | Path |
| --- | --- |
| Current capability facts | [`stage4_road_design_scope.md`](../../scoping/stage4_road_design_scope.md) |
| Target data model | [`target_data_model.md`](../../planning/stage6-10/target_data_model.md) |
| Stage 10 P4 sequence | [`stage10_gap_migration_sequence.md`](../../planning/stage6-10/stage10_gap_migration_sequence.md) |
| Verification plan | [`stage8_verification_plan.md`](../../planning/stage6-10/stage8_verification_plan.md) |
| Phase 3 acceptance | [`phase3_final_verification.md`](../../history/road/phase3_final_verification.md) |
| Report spec | [`report_output_spec.md`](../output/report_output_spec.md) |
| Schema migration policy | [`schema_migration_policy.md`](../legacy-integration/schema_migration_policy.md) |

## Open items (planning — not blockers for document approval)

1. **Formula extraction** — LDIST/HAUNCH/HOSO PDF → structured formula sheets (owner: design + supervisor before P4-D02/D03/D04 implementation).
2. **Extension key split** — Whether P4 inputs live only in geometry extension vNext or additional named extension keys (decide in P4-D07 design section; default: extend geometry payload version minor).

## Approval record

| Field | Value |
| --- | --- |
| Document status | **AUTHORITATIVE** |
| Prepared by | Phase 4 documentation worker (Composer 2.5) |
| Prepared on | 2026-07-16 |
| Supervisor | Cursor Grok 4.5 |
| Supervisor review date | 2026-07-16 |
| Approval status | **Approved** — AUTHORITATIVE |
| Authoritative effective date | 2026-07-16 |
| Supervisor signature / record | Approved after survey + consistency review; numeric formulas remain Extraction Required before P4-D02/D03/D04 COMPLETE |
| Amendment log | _(none)_ |
