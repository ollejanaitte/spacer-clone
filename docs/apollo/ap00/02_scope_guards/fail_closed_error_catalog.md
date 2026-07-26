# Fail-Closed Error Catalog — AP-00 P02

**Authority:** AP-00 / P02  
**Date:** 2026-07-27  
**Decision:** DEC-AP00-0004  
**Source of truth (code):** `frontend/src/apollo/errors.ts`

All Apollo Phase 1 guard failures MUST emit a stable `code` from this catalog. Messages are user-facing defaults; codes are the integration contract for AP-01/AP-02.

## Scope guard codes (`AP00_SCOPE_*`)

| Code | Trigger | `scopeStatus` |
|------|---------|---------------|
| `AP00_SCOPE_MULTI_SPAN` | `spanSystem = MULTI_SPAN` | OUT_OF_SCOPE |
| `AP00_SCOPE_CONTINUOUS` | `spanSystem = CONTINUOUS` | OUT_OF_SCOPE |
| `AP00_SCOPE_SKEW_NOT_90` | `skewDegrees ≠ 90` | OUT_OF_SCOPE |
| `AP00_SCOPE_SKEW_UNKNOWN` | `skewDegrees = null` | UNRESOLVED |
| `AP00_SCOPE_COMPOSITE_DECK` | composite deck intent | OUT_OF_SCOPE |
| `AP00_SCOPE_STEEL_DECK` | steel deck intent | OUT_OF_SCOPE |
| `AP00_SCOPE_PC_SLAB` | PC slab intent | OUT_OF_SCOPE |
| `AP00_SCOPE_BOX_GIRDER` | box girder section | OUT_OF_SCOPE |
| `AP00_SCOPE_CURVED_ALIGNMENT` | curved alignment as design target | OUT_OF_SCOPE |
| `AP00_SCOPE_NONLINEAR_ANALYSIS` | nonlinear analysis | OUT_OF_SCOPE |
| `AP00_SCOPE_DYNAMIC_ANALYSIS` | eigen / RS / time history | OUT_OF_SCOPE |
| `AP00_SCOPE_VARIABLE_DEPTH` | variable girder depth | OUT_OF_SCOPE |
| `AP00_SCOPE_GIRDER_COUNT_OUT_OF_RANGE` | girder count ∉ [4, 6] | OUT_OF_SCOPE |
| `AP00_SCOPE_GIRDER_COUNT_UNKNOWN` | `girderCount = null` | UNRESOLVED |
| `AP00_SCOPE_ALIGNMENT_UNKNOWN` | `alignment = UNKNOWN` | UNRESOLVED |
| `AP00_SCOPE_DECK_UNKNOWN` | `deckType = UNKNOWN` | UNRESOLVED |
| `AP00_SCOPE_SECTION_UNKNOWN` | `girderSection = UNKNOWN` | UNRESOLVED |
| `AP00_SCOPE_SPAN_UNKNOWN` | `spanSystem = UNKNOWN` | UNRESOLVED |
| `AP00_SCOPE_ANALYSIS_UNKNOWN` | `analysisType = UNKNOWN` | UNRESOLVED |
| `AP00_SCOPE_DEPTH_UNKNOWN` | `girderDepth = UNKNOWN` | UNRESOLVED |
| `AP00_SCOPE_NOT_PLATE_GIRDER` | reserved for non-plate promotion paths | OUT_OF_SCOPE |

## Numeric authority codes (`AP00_NUMERIC_*`)

| Code | Trigger |
|------|---------|
| `AP00_NUMERIC_ADOPTION_WITHOUT_STANDARD` | `ADOPTED` while `TargetStandardStatus = NOT_SELECTED` |
| `AP00_NUMERIC_ADOPTED_MISSING_SOURCE` | `ADOPTED` without `source_locator` |
| `AP00_NUMERIC_ADOPTED_MISSING_DECISION` | `ADOPTED` without `decision_id` |
| `AP00_NUMERIC_PLACEHOLDER_AS_ADOPTED` | `PLACEHOLDER` consumed on adoption path |
| `AP00_NUMERIC_NULL_COERCION` | null/undefined numeric used where value required |
| `AP00_NUMERIC_GOLDEN_EXPECTED_FORBIDDEN` | golden expected registration attempted |

## Issue shape

```typescript
type ApolloGuardIssue = {
  code: ApolloGuardErrorCode;
  message: string;
  path?: string;
};
```

## Versioning

New codes require DEC-AP00-* entry and catalog update. **Do not rename** shipped codes; add successor codes if semantics change.

## Blocker linkage

| Code family | Step 1 blocker |
|-------------|----------------|
| `AP00_NUMERIC_ADOPTION_WITHOUT_STANDARD` | BLK-S1-001 |
| `AP00_NUMERIC_ADOPTED_MISSING_*` | BLK-S1-006 |
| `AP00_NUMERIC_NULL_COERCION` | BLK-S1-004 |
| `AP00_NUMERIC_GOLDEN_EXPECTED_FORBIDDEN` | DEC-S1-0011 |
| `AP00_SCOPE_*` | DEC-S1-0008 narrow archetype |
