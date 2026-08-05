# 03 — H-02 Architect Decision: generateBsdd.ts migration vs AP-02 Rejected

> **Authority:** Phase 2.5-C (architect decision)
> **Carried from:** Phase 1 `08_gap_analysis.md` G-13 → `03_report_chapter_structure.md` §5; Phase 2 `01_phase1_input_review.md` §10.
> **Judge:** Apollo architecture (recorded).

## 1. Item

**H-02**: `generateBsdd.ts` implements a `1.0.0 → 1.1.0-development` migration in `getBridgeStructureInputDraft`, yet `ap01_final_report.md` §4 (Rejected) and `ap11_final_report.md` §4 (Rejected) list "Document lifecycle persistence / migration (AP-02)" as rejected — apparent conflict.

## 2. Evidence

| # | Source | Statement |
|---|--------|-----------|
| E-01 | `generateBsdd.ts:548-556` | `getBridgeStructureInputDraft(project)` → `parseBridgeStructureInputDraft(raw) ?? createEmptyBridgeStructureInputDraft()`. |
| E-02 | `generateBsdd.ts:553` (inline comment) | "Migrate legacy 1.0.0 / partial persisted shapes to 1.1.0-development." — narrow default-fill for the `apolloBridgeStructureInput` **sidecar** only. |
| E-03 | `generateBsdd.ts:467` | `spanSystem` populated from `input.bridgeSystem` — production BSDD emission; not a migration framework. |
| E-04 | `ap01_final_report.md` §4 | Rejected: "Document lifecycle persistence / migration (AP-02)". |
| E-05 | `ap11_final_report.md` §4 | Rejected: "BSDD / AnalysisBinding persistence (AP-02)". |
| E-06 | `ap00_final_report.md` §5/§7 | AP-00 P00–P03 = governance/feature-flag/entry-guard/scope-guards/validation gates; scope-guards PASS. AP-02 is the **document-lifecycle persistence/migration** framework, separate from AP-00. |
| E-07 | `final_report.txt` Step 4-B | `INPUT_SCHEMA_BEFORE: 1.0.0` → `INPUT_SCHEMA_AFTER: 1.1.0-development`; `MIGRATION_VERDICT: PASS`. |
| E-08 | Phase 2 `03_report_chapter_structure.md` §5 | CP-06 basis `generateBsdd.ts:467`; Report Model sources `draft.bridgeSystem` (reportModel.ts:175). |

## 3. Analysis

**AP-02 scope (rejected):** the full document-lifecycle persistence/migration framework — versioned BSDD schema evolution, import of arbitrary external documents, conflict resolution, workspace save/load versioning of BSDD documents. This was explicitly deferred and is **not implemented** (per AP-01/AP-11 "Rejected/Not implemented").

**Implemented migration (sidecar default-fill):** `parseBridgeStructureInputDraft` is a **minimal backward-compatibility shim** for the in-memory `ProjectModel.apolloBridgeStructureInput` field (not a persisted BSDD document file). It forward-fills missing fields from legacy 1.0.0/partial shapes into the 1.1.0-development default draft. It does **not** implement: versioned BSDD document persistence, external-document import, schema-conflict resolution, or workspace migration orchestration.

Therefore the two statements are **not contradictory** — they operate at different scopes:
- AP-02 rejected = the broad lifecycle framework.
- Sidecar default-fill implemented = narrow compatibility shim inside the production data path, well within AP-00 governance + Phase 4-B schema evolution.

The shim is a *prerequisite data transform* for the Report Model (CP-06/CP-07/CP-13), not the rejected AP-02 framework.

## 4. Decision

**VERDICT: RESOLVED — ADOPTED**

- AP-02 (document-lifecycle persistence/migration framework) remains **Rejected** (unchanged).
- The `apolloBridgeStructureInput` sidecar default-fill in `generateBsdd.ts:548-556` is **retained** as a minimal compatibility shim; it is out of AP-02's scope.
- No code change required. No Phase 3 impact — Report Model consumes the migrated draft via `getBridgeStructureInputDraft`.
- **Clarification recorded** in `06_prohibited_output_reconfirmation.md` §3 context: numeric authorization unchanged; schemaVersion forward-fill does not constitute `ADOPTED` numerics.

## 5. Phase 3 impact

- Satisfies Phase 3 GO condition "H-01/H-02/H-03 architect 解決済み" for H-02.
- Does **not** change `schemaVersion` semantics or numeric authorization (`NOT_AUTHORIZED`/`NOT_GRANTED`/`PROHIBITED` unchanged).
- `DEC-PHA-0002` (future unification of sidecar default-fill with BSDD schema evolution) tracked in `decision_register.csv`.

## 6. Status

- H-02: RESOLVED/ADOPTED.
- HEAD: 2802795 (no code change).
