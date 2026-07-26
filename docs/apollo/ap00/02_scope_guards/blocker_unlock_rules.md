# Blocker Unlock Rules — AP-00 P02

**Authority:** AP-00 / P02  
**Date:** 2026-07-27  
**Decision:** DEC-AP00-0004

Rules for when scope and numeric guards transition from fail-closed to permitted paths. Guards implemented in P02 **enforce** current blockers; they do not clear them.

## Scope guards

| Condition | Guard behavior | Unblock requires |
|-----------|----------------|------------------|
| Any Phase 1外 archetype dimension | `OUT_OF_SCOPE` + `AP00_SCOPE_*` | New DEC-S1-* scope expansion + P04 disposition update (DEC-S1-0008 change control) |
| Unknown required scope field | `UNRESOLVED` + `AP00_SCOPE_*_UNKNOWN` | User or importer supplies explicit classification (no silent default) |

**No automatic unlock:** Catalog `Phase1_required` labels outside narrow archetype remain subordinate (CFL-003).

## Numeric authority guards

| Blocker | Guard | Unlock sequence |
|---------|-------|-----------------|
| BLK-S1-001 | `AP00_NUMERIC_ADOPTION_WITHOUT_STANDARD` | Supervisor records Target Standard → `TargetStandardStatus: SELECTED` via new DEC-S1-* |
| BLK-S1-006 | `AP00_NUMERIC_ADOPTED_MISSING_SOURCE` / `..._DECISION` | Per-quantity `PROPOSED` → supervisor `ADOPTED` with `source_locator` + `decision_id` |
| BLK-S1-004 | `AP00_NUMERIC_NULL_COERCION` | Do not auto-fill; user or governed adoption supplies value |
| DEC-S1-0011 | `AP00_NUMERIC_GOLDEN_EXPECTED_FORBIDDEN` | New supervisor decision authorizing golden harness (AP-17 `CONDITIONAL_NO_GOLDEN` only) |

## Implementation authorization matrix

| `ImplementationAuthorization` | Scope guard | Numeric guard |
|------------------------------|-------------|---------------|
| `NOT_AUTHORIZED` | All non-shell paths blocked upstream | All `ADOPTED` forbidden |
| `CONDITIONAL` | Narrow archetype only (`IN_SCOPE`) | `PLACEHOLDER` / `USER_PROVIDED_UNVERIFIED` in shells |
| `AUTHORIZED` | Same narrow archetype (scope not expanded by authorization alone) | `ADOPTED` when Target Standard + metadata satisfied |

P02 ships guards only. Authorization labels are consumed by downstream AP-* units; changing a label requires DEC-AP00-* and matrix update.

## AP-* consumption map

| Unit | Scope guard | Numeric guard |
|------|-------------|---------------|
| AP-01 | Embed scope enums in BSDD envelope | Embed `NumericAuthority` on numeric fields |
| AP-02 | Validation hook on document create/update | Validation hook on numeric records |
| AP-03 | Workspace create assertion | Shell fields remain `PLACEHOLDER` |
| AP-07..AP-08 | Preflight before material/load shells | `validateNumericRecordForAdoption` before binding |
| AP-17 | Semantic harness only | `validateGoldenExpectedRegistration` at fixture register |

## Fail-closed default

When unlock status is ambiguous, guards return `ok: false`. Supervisors must record explicit DEC-* entries; guards never infer unlock from environment, feature flags, or catalog phase labels alone.
