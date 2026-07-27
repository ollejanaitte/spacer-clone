# Apollo AP-11 — IF3 Client Binding

**Authority:** IMPLEMENTATION GOVERNANCE / AP-11  
**Date:** 2026-07-27  
**Base commit:** `7f73c4c624c2c12dd972cb0291aa9d320f88028a`

## Purpose

AP-11 closes **LIM-P03-001** by wiring authoritative `if3` metadata into `apiClient.runAnalysis`, enforcing fail-closed client binding guards, preserving PR-40 export gates, and blocking the legacy raw AnalysisResult PDF bypass.

## Scope

| In scope | Out of scope |
|----------|--------------|
| `frontend/src/if3/*` binding modules | Apollo Phase 1 workspace UI |
| `runAnalysis` IF3 POST body wiring | BSDD operational path |
| Export gate `sourceDocument` attachment | Adopted numerics / golden values |
| Legacy PDF bypass guard | `docs/apollo/step1/**` changes |
| Vitest coverage for binding + client | Migration / feature-flag default changes |

## Entry points

| Document | Purpose |
|----------|---------|
| [AP-11 charter](00_governance/ap11_charter.md) | Scope, goals, non-goals |
| [Final report](final/ap11_final_report.md) | Closure summary (draft) |
| [Verdicts](final/ap11_verdicts.md) | AP-11 verdict tokens |
| [Merge ledger](logs/merge_ledger.md) | Direct-main checkpoint note |

## Relation to AP-00

AP-00 authorized AP-11 under `CONDITIONAL_GO` (see [AP-00 dependency note](../ap00/final/ap11_dependency_note.md)).
