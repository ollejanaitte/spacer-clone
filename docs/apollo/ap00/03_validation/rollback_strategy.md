# Rollback Strategy — AP-00 P03

**Authority:** AP-00 / P03  
**Date:** 2026-07-27  
**Decision:** DEC-AP00-0005

## Purpose

Define how to revert or contain Apollo AP-* changes when validation gates fail after merge, without force-pushing `main` or mutating Step 1 / handoff artifacts.

## Principles

1. **No force push to `main`** — supervisor-only revert PRs
2. **Forward fix preferred** — guard tightening via new PR when issue is additive
3. **Step 1 / handoffs immutable** — rollback never edits frozen planning paths
4. **Fail-closed default** — when uncertain, disable feature flag and block progression

## Severity classes

| Class | Example | Response |
|-------|---------|----------|
| S1 — Governance violation | ADOPTED numerics merged; golden fixture committed | Immediate revert PR + decision log note |
| S2 — Guard regression | Scope guard accepts OUT_OF_SCOPE archetype | Forward-fix guard + expand table tests |
| S3 — Test gap | Missing negative case; production path unaffected | Forward-fix tests; optional hotfix if exposed |
| S4 — Docs-only error | Incorrect cross-link | Docs correction PR |

## Revert procedure (S1 / critical S2)

```text
1. Supervisor opens revert PR (git revert <merge-sha> or targeted fix)
2. Confirm VITE_APOLLO_PHASE1_ENABLED remains default OFF
3. Run merge gate verification on revert branch
4. Squash merge revert PR
5. Update merge_ledger with REVERTED note
6. File DEC-AP00-* if process change required
```

Worker agents **do not** execute revert without explicit supervisor instruction.

## Containment without revert

| Control | Action |
|---------|--------|
| Feature flag | Keep `VITE_APOLLO_PHASE1_ENABLED` OFF in all environments |
| Entry guard | `entryGuard` continues to block `/pro/apollo` body |
| Numeric authority | `validateNumericRecordForAdoption` on consumption paths |
| CI | Add failing hygiene or apollo suite to required checks |

## Validation after rollback

```bash
cd frontend
npm run typecheck
npm test -- --run src/apollo
npm run lint
npm run build
node ../scripts/check_apollo_source_hygiene.mjs src/apollo
```

## Communication

| Audience | Action |
|----------|--------|
| Supervisor | Merge ledger + delegation log entry |
| Downstream AP-* | Block dependent branches until `main` green |
| Decision log | DEC-AP00-* if rollback changes governance |

## Cross-references

- [merge_gate.md](merge_gate.md)
- [branch_pr_merge_rules.md](../00_governance/branch_pr_merge_rules.md)
- [forbidden_scope.md](../00_governance/forbidden_scope.md)
