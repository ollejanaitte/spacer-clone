# Phase 1 Scope Guard Contract — AP-00 P02

**Authority:** AP-00 / P02  
**Date:** 2026-07-27  
**Decision:** DEC-AP00-0004

## Purpose

Pure TypeScript scope preflight for the **frozen narrow Phase 1 bridge archetype** (DEC-S1-0008). Guards are fail-closed: any violation or unresolved required field blocks progression before analysis or numeric adoption.

## Module

| File | Export |
|------|--------|
| `frontend/src/apollo/phase1ScopeGuard.ts` | `validatePhase1Scope`, `classifyPhase1Scope`, `isPhase1ScopeAccepted` |
| `frontend/src/apollo/types.ts` | `Phase1BridgeScopeInput`, `Phase1ScopeStatus`, dimension enums |

## Input contract (`Phase1BridgeScopeInput`)

| Field | Accepted (IN_SCOPE) | Rejected / unresolved |
|-------|---------------------|------------------------|
| `alignment` | `STRAIGHT` | `CURVED` → OUT; `UNKNOWN` → UNRESOLVED |
| `girderDepth` | `EQUAL` | `VARIABLE` → OUT; `UNKNOWN` → UNRESOLVED |
| `deckType` | `NON_COMPOSITE_RC_SLAB` | `COMPOSITE`, `STEEL_DECK`, `PC_SLAB` → OUT; `UNKNOWN` → UNRESOLVED |
| `girderSection` | `PLATE_GIRDER` | `BOX_GIRDER` → OUT; `UNKNOWN` → UNRESOLVED |
| `spanSystem` | `SIMPLE_SINGLE` | `CONTINUOUS`, `MULTI_SPAN` → OUT; `UNKNOWN` → UNRESOLVED |
| `skewDegrees` | exactly `90` | any other value → OUT; `null` → UNRESOLVED |
| `analysisType` | `STATIC_LINEAR` | `NONLINEAR` → OUT; eigen/RS/TH → OUT; `UNKNOWN` → UNRESOLVED |
| `girderCount` | integer `4`–`6` inclusive | outside range → OUT; `null` → UNRESOLVED |

## Result contract

```typescript
validatePhase1Scope(input) → {
  ok: boolean;              // true only when IN_SCOPE
  scopeStatus: Phase1ScopeStatus;
  issues: ApolloGuardIssue[];
}
```

| `scopeStatus` | Meaning |
|---------------|---------|
| `IN_SCOPE` | Narrow archetype satisfied; may proceed to downstream guards |
| `OUT_OF_SCOPE` | Explicit Phase 1外 intent; reject |
| `UNRESOLVED` | Required field unknown; fail-closed (do not default) |

## Stable error codes

See [fail_closed_error_catalog.md](fail_closed_error_catalog.md) — prefix `AP00_SCOPE_*`.

## Consumers

- **AP-01** — BSDD property assertions may embed scope fields; call guard before schema promotion.
- **AP-02** — Validation pipeline hooks call `validatePhase1Scope` on workspace create.
- **AP-03** — Workspace shell scope assertion on project entry.

## Non-goals (P02)

- Full BSDD schema for scope fields (AP-01/AP-02).
- Geometry parsing or automatic classification from CAD imports.
- Golden numeric fixtures or Reference Bridge production binding.

## Source precedence

1. [phase1_scope_freeze.md](../../step1/05_scope_boundary/phase1_scope_freeze.md) (DEC-S1-0008)
2. [forbidden_scope.md](../00_governance/forbidden_scope.md)
3. This contract
