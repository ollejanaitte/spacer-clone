# Source Hygiene Gate — AP-00 P03

**Authority:** AP-00 / P03  
**Date:** 2026-07-27  
**Decision:** DEC-AP00-0005

## Purpose

Automated and review-time checks that Apollo implementation sources do not introduce forbidden parity claims or unsafe ADOPTED fixture patterns.

## Script

| Item | Value |
|------|-------|
| Path | `scripts/check_apollo_source_hygiene.mjs` |
| Target | `frontend/src/apollo/` (default) |
| Exit code | `0` pass; `1` violations |

```bash
# From repository root
node scripts/check_apollo_source_hygiene.mjs frontend/src/apollo

# From frontend/ (relative path)
node ../scripts/check_apollo_source_hygiene.mjs src/apollo
```

## Rule catalog

### R-HYG-001 — Forbidden Analyzer parity claims

Scans all `.ts` / `.tsx` files under the Apollo tree.

| Violation | Example |
|-----------|---------|
| Positive Analyzer parity claim | `achieves Analyzer parity` |
| Analyzer compatibility claim | `compatible with Analyzer` |
| Legacy round-trip claim | `.mdb round-trip` |
| SuperDesigner wire parity | `SuperDesigner wire format parity` |

**Allowed:** Negated documentation such as `no Analyzer parity`, `without Analyzer parity` (matches [forbidden_scope.md](../00_governance/forbidden_scope.md) §5).

### R-HYG-002 — ADOPTED fixtures without governance metadata

Scans `frontend/src/apollo/testing/` and `frontend/src/apollo/__tests__/`.

| Condition | Response |
|-----------|----------|
| File references `NumericAuthority.ADOPTED` or `authority: "ADOPTED"` | Must also define non-empty `decisionId` (or `decision_id`) in the same file |
| Missing `decisionId` | Fail — use `PLACEHOLDER` or add governance metadata |

Negative tests that intentionally exercise ADOPTED guards must include explicit `decisionId` and `sourceLocator` per P02 numeric authority model.

## CI recommendation

Not wired into `npm run lint` by default (minimal P03 scope). Recommended manual pre-merge step for Apollo-touching PRs:

```bash
node scripts/check_apollo_source_hygiene.mjs frontend/src/apollo
```

Vitest coverage: `frontend/src/apollo/__tests__/apolloSourceHygiene.test.ts` shells the script against the current tree.

## Reviewer checklist

- [ ] No new Analyzer / `.mdb` / `.alg` parity claims in `frontend/src/apollo/`
- [ ] Test fixtures use `PLACEHOLDER` unless testing adoption guards
- [ ] ADOPTED negative fixtures include `decisionId` + `sourceLocator`
- [ ] No `GOLDEN_EXPECTED` registration in committed fixtures

## Cross-references

- [forbidden_scope.md](../00_governance/forbidden_scope.md)
- [numeric_authority_model.md](../02_scope_guards/numeric_authority_model.md)
- [validation_strategy.md](validation_strategy.md)
