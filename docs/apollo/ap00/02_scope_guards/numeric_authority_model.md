# Numeric Authority Model — AP-00 P02

**Authority:** AP-00 / P02  
**Date:** 2026-07-27  
**Decision:** DEC-AP00-0004

## Purpose

Fail-closed numeric authority guards reusable by AP-01 (BSDD contracts) and AP-02 (validation foundation). Aligns with Step 1 [numeric_value_governance.md](../../step1/02_standards_baseline/numeric_value_governance.md) and DEC-S1-0004 / DEC-S1-0011.

## Authority ladder

| `NumericAuthority` | Meaning | May bind computation? |
|--------------------|---------|------------------------|
| `PLACEHOLDER` | Explicit TBD; schema-valid only | **No** |
| `USER_PROVIDED_UNVERIFIED` | User-entered; not governance-approved | Shell / preview only |
| `SOURCE_TRACED` | Locator recorded; not yet adopted | Traceability only |
| `ADOPTED` | Supervisor-approved binding numeric | **Yes** (when Target Standard permits) |

`isTreatableAsAdopted(authority)` returns `true` **only** for `ADOPTED`.

## Target Standard gate

| `TargetStandardStatus` | `ADOPTED` numerics |
|------------------------|-------------------|
| `NOT_SELECTED` | **Forbidden** (`AP00_NUMERIC_ADOPTION_WITHOUT_STANDARD`) |
| `SELECTED` | Permitted when metadata complete |
| `FROZEN` | Permitted when metadata complete |

## ADOPTED mandatory metadata

| Field | Requirement |
|-------|-------------|
| `source_locator` | Non-empty string (page + table/clause/figure) |
| `decision_id` | Non-empty supervisor decision reference |

Missing either → fail-closed (`AP00_NUMERIC_ADOPTED_MISSING_*`).

## Null / coercion policy

- `resolveNumericValue(null | undefined)` → `null` (never `0`).
- `assertNoNullCoercion` rejects null/undefined for non-`PLACEHOLDER` records used in computation paths.
- **Forbidden:** `value ?? 0`, implicit `Number(x)` on unknown inputs.

## PLACEHOLDER vs ADOPTED

- `PLACEHOLDER` records are valid in planning shells.
- `rejectPlaceholderAsAdopted` / `validateNumericRecordForAdoption` guard consumption paths that require authoritative numerics.
- **Forbidden:** treating `PLACEHOLDER` as `ADOPTED` for loads, factors, or code limits.

## Golden expected values

`validateGoldenExpectedRegistration` rejects `registrationKind: GOLDEN_EXPECTED` per DEC-S1-0011 (`AP00_NUMERIC_GOLDEN_EXPECTED_FORBIDDEN`).

Allowed: `SEMANTIC_ONLY`, `PLANNING_PLACEHOLDER`.

## Modules

| File | Key exports |
|------|-------------|
| `numericAuthorityGuard.ts` | `validateNumericAuthority`, `validateNumericRecord`, `validateNumericRecordForAdoption`, `validateGoldenExpectedRegistration` |
| `types.ts` | `NumericValueRecord`, `NumericAuthority`, `TargetStandardStatus` |

## Implementation authorization cross-reference

| Label | Numeric guard behavior |
|-------|------------------------|
| `NOT_AUTHORIZED` | All `ADOPTED` paths blocked |
| `CONDITIONAL` | Shell + `PLACEHOLDER` / user unverified only |
| `AUTHORIZED` | `ADOPTED` permitted when Target Standard + metadata satisfied |

See [blocker_unlock_rules.md](blocker_unlock_rules.md).
