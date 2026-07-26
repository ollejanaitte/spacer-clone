# Feature Flag Contract — Apollo Phase 1

**Authority:** AP-00 / P01  
**Date:** 2026-07-27  
**Decision:** DEC-AP00-0003

## Flag

| Property | Value |
|----------|-------|
| **Name** | `VITE_APOLLO_PHASE1_ENABLED` |
| **Module** | `frontend/src/apollo/featureFlag.ts` |
| **Default** | **OFF** (unset, empty, or any value other than literal `true`) |
| **Explicit ON** | `VITE_APOLLO_PHASE1_ENABLED=true` in environment or Vitest `vi.stubEnv` |

## Semantics

- **Fail-closed:** Only the string `true` enables Phase 1 entry. `TRUE`, `1`, `yes`, `false`, empty, and unset all resolve to OFF.
- **Scope:** Gates user-visible Apollo Phase 1 entry (toolbar control) and `/pro/apollo` route access.
- **Not in scope:** Step 1 planning artifacts, handoff package, Target Standard numerics, golden fixtures, or production Apollo workspace body.

## Consumers

| Consumer | OFF | ON |
|----------|-----|-----|
| `shouldShowApolloPhase1Entry()` | `false` | `true` |
| `resolveApolloEntryAccess(pathname)` | `deny` on Apollo paths | `shell` on Apollo paths |
| `redirectDeniedApolloRoute()` | redirects `/pro/apollo*` → `/pro` | no redirect |

## Non-goals (P01)

- No Apollo project state on `ProjectModel`
- No BSDD forms, design numerics UI, bridge-type pickers, or analysis launch
- No change to 学習 / 入門 / 実務 lobby flows

## Verification

Vitest: `frontend/src/apollo/__tests__/featureFlag.test.ts`, `entryGuard.test.ts`
