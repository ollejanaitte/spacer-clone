# Merge Gate — Apollo AP-* PR Checklist

**Authority:** AP-00 / P03  
**Date:** 2026-07-27  
**Decision:** DEC-AP00-0005

## Purpose

Mandatory checklist for **every** Apollo AP-* implementation PR before supervisor squash-merge. Complements [branch_pr_merge_rules.md](../00_governance/branch_pr_merge_rules.md).

## Pre-branch

- [ ] Local `main` synced: `git fetch` → `git checkout main` → `git pull --ff-only`
- [ ] Authorization matrix row for target AP-* is **READY** or **CONDITIONAL** as documented
- [ ] Blockers (BLK-S1-*) acknowledged or explicitly out of scope in PR body
- [ ] Branch name follows CONTRIBUTING / AP-00 conventions

## Scope and governance

- [ ] Single AP-* responsibility (one PR, one unit)
- [ ] No diffs under `docs/apollo/step1/**`
- [ ] No diffs under `docs/apollo/handoffs/**`
- [ ] No forbidden scope per [forbidden_scope.md](../00_governance/forbidden_scope.md)
- [ ] Feature flag default OFF unless PR explicitly documents supervisor-approved enablement
- [ ] New DEC-AP00-* entry if governance decision changed

## Code and tests (when `frontend/src/apollo/` touched)

- [ ] `npm run typecheck` passes (`frontend/`)
- [ ] `npm test -- --run src/apollo` passes
- [ ] `npm run lint` passes
- [ ] `npm run build` passes
- [ ] Source hygiene: `node scripts/check_apollo_source_hygiene.mjs frontend/src/apollo`
- [ ] No golden expected numerics (DEC-S1-0011)
- [ ] No ADOPTED numerics while Target Standard NOT_SELECTED (DEC-S1-0004)
- [ ] Stable `AP00_*` error codes unchanged or catalog/docs updated together

## Docs (when `docs/apollo/ap00/` touched)

- [ ] Cross-links valid; decision log updated if new DEC-AP00-*
- [ ] Merge ledger update planned for supervisor post-merge (worker does not merge)

## Staging discipline

- [ ] Explicit-path `git add` only — **never** `git add -A` or `git add .`
- [ ] No secrets, credentials, or absolute local paths in staged files
- [ ] Worker stops after staging unless brief authorizes commit

## PR body minimum

| Field | Required content |
|-------|------------------|
| AP-* ID | e.g. `AP00-P03` |
| Purpose | One paragraph |
| Authorization | Matrix row + blocker notes |
| Tests run | Commands and results |
| Governance links | Relevant `docs/apollo/ap00/` paths |

## Post-merge (supervisor)

- [ ] Squash merge to `main`
- [ ] Record PR number, branch, merge SHA in [merge_ledger.md](../logs/merge_ledger.md)
- [ ] Verify CI green on `main`

## Rollback

If merge introduces guard regression or forbidden scope, follow [rollback_strategy.md](rollback_strategy.md).

## Cross-references

- [validation_strategy.md](validation_strategy.md)
- [test_responsibility_matrix.md](test_responsibility_matrix.md)
- [implementation_authorization_matrix.md](../00_governance/implementation_authorization_matrix.md)
