# Branch, PR, and Merge Rules — AP-00 Implementation

**Authority:** IMPLEMENTATION GOVERNANCE / AP-00  
**Date:** 2026-07-27  
**Decision:** DEC-AP00-0001  
**Sources:** [AGENTS.md](../../../../AGENTS.md), [CONTRIBUTING.md](../../../../CONTRIBUTING.md), [step1_charter.md](../../step1/00_governance/step1_charter.md)

## Principles

1. **One PR, one responsibility** — each PR addresses a single AP-* unit or sub-unit (e.g. AP00-P00)
2. **No stacked PRs** — branch from current `main`; do not branch on unmerged feature branches
3. **Docs-before-code** for AP-00 P00; production PRs include tests in same unit
4. **Explicit staging** — never `git add -A` or `git add .`
5. **Squash merge** to `main` — one commit per merged PR on main
6. **Fast-forward sync** — update local `main` from `origin/main` before starting next branch

## Branch naming

Follow [CONTRIBUTING.md](../../../../CONTRIBUTING.md) conventions:

```text
docs/apollo-ap00-p00-governance
docs/apollo-ap01-bsdd-schema
feature/apollo-if3-client-binding
fix/apollo-scope-preflight
```

Pattern for Apollo implementation docs:

```text
docs/apollo-ap<NN>-p<NN>-<short-topic>
```

## PR sequence rules

| Rule | Detail |
|------|--------|
| Dependency order | AP-01 requires AP-00 merge; see [implementation_authorization_matrix.md](implementation_authorization_matrix.md) |
| Parallel allowed | AP-00 and AP-11 may proceed in parallel after supervisor authorization (different touchpoints) |
| Step 1 immutability | No PR may modify `docs/apollo/step1/**` or `docs/apollo/handoffs/**` |
| Sub-units | AP-00 P00..P03 + final are sequential sub-PRs within AP-00 |

## PR content requirements

Per CONTRIBUTING, each PR includes:

- Purpose and AP-* ID
- Main changes and impact scope
- Tests run (when code is touched)
- Blocker / authorization checklist reference
- Link to relevant governance docs

AP-* PRs MUST reference:

- Authorization matrix row for the AP-* unit
- Any BLK-S1-* blockers acknowledged or explicitly out of scope
- Feature flag state (default off until AP-00 closure)

## Merge policy

| Item | Policy |
|------|--------|
| Merge method | **Squash merge** only |
| Merge authority | Supervisor (Grok) |
| Pre-merge checks | Staged path audit; CI green when applicable |
| Post-merge | Record SHA in [merge_ledger.md](../logs/merge_ledger.md) |

## Main sync (ff-only)

Before starting a new AP-* branch:

```bash
git checkout main
git fetch origin
git merge --ff-only origin/main
```

**Forbidden:** `git pull --rebase` with conflict resolution by worker without supervisor; force push to `main`; merge commits on `main` for AP-* PRs (use squash).

## Git safety (inherited from AGENTS.md)

| Forbidden | Notes |
|-----------|-------|
| `git clean` (including `-n`) | Destructive |
| `git checkout --` / `git restore` / `git reset --hard` | Destructive |
| `git reset` / `git revert` without instruction | Supervisor only |
| `git push -f` | Never on `main` |
| `git add -A` / `git add .` | Use explicit paths |
| Branch deletion | Supervisor only |

## Staging examples

```bash
# Correct
git add docs/apollo/ap00/README.md
git add docs/apollo/ap00/00_governance/ap00_charter.md

# Incorrect — NEVER
git add .
git add -A
git add docs/apollo/
```

## PR review gates

Reviewer checklist:

- [ ] Single AP-* responsibility
- [ ] No step1/handoff diffs
- [ ] No forbidden scope (see [forbidden_scope.md](forbidden_scope.md))
- [ ] Authorization matrix readiness respected
- [ ] Merge ledger update planned for supervisor post-merge

## Worker stop point

Composer worker **stops after staging** unless task brief explicitly authorizes commit. Supervisor owns commit → push → PR → merge.
