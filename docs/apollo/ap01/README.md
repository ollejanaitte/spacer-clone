# Apollo AP-01 — BSDD Production Contract v0.1.0

**Authority:** IMPLEMENTATION GOVERNANCE / AP-01  
**Date:** 2026-07-27  
**Base commit:** `b4658e275b47d304b35af133bb25ef2226738f3b` (AP-11 complete)

## Purpose

AP-01 promotes `BridgeSuperstructureDesignDocument` as a **structural / non-numeric-first** production contract (`schemaVersion` **0.1.0**), aligned with the existing zod → JSON Schema pipeline and hand-written semantic validators.

## Scope

| In scope | Out of scope |
|----------|--------------|
| `GovernedQuantity` fail-closed adoption guards (AP-00) | Migration (AP-02) |
| BSDD zod + semantic validator + JSON Schema | Workspace UI (AP-03) |
| `BsddAnalysisBinding` + IF3 metadata validation (AP-11 reuse) | Adopted numerics as defaults |
| `docs/apollo/ap01/*` governance artifacts | `docs/apollo/step1/**` changes |
| Contract registry + drift tests | Golden displacement/force fixtures |

## Entry points

| Document | Purpose |
|----------|---------|
| [AP-01 charter](00_governance/ap01_charter.md) | Scope, goals, non-goals |
| [Final report](final/ap01_final_report.md) | Closure summary (provisional) |
| [Verdicts](final/ap01_verdicts.md) | AP-01 verdict tokens |
| [Merge ledger](logs/merge_ledger.md) | Direct-main checkpoint note |

## Relation to AP-00 / AP-11

- AP-00 `numericAuthorityGuard` enforces fail-closed `ADOPTED` rejection under `TargetStandardStatus.NOT_SELECTED`.
- AP-11 `validateRunAnalysisIf3Metadata` validates `analysisBindings[].if3Metadata` when present.
