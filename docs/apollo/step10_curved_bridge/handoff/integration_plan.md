# Integration Plan: Scope_of_Work into spacer-clone

This document defines how `Scope_of_Work` results will be integrated into `spacer-clone` after continuous bridge implementation is complete.

## 1. Integration Prerequisites

- [ ] `spacer-clone` continuous bridge implementation (step9) is complete
- [ ] `spacer-clone` main branch is clean
- [ ] `origin/main == local main`
- [ ] No pending commits on main
- [ ] Working tree is clean

## 2. Integration Procedure

1. Verify `spacer-clone` main branch status
2. Create SHA256 checksums of `Scope_of_Work` files
3. Check if `docs/apollo/step10/` exists in `spacer-clone`
4. If exists, verify no conflict; if conflict, create new directory `docs/apollo/step10_curved_bridge/`
5. Copy `Scope_of_Work/step10_curved_bridge/` → `docs/apollo/step10_curved_bridge/`
6. Copy `Scope_of_Work/handoff/` → `docs/apollo/step10_curved_bridge/handoff/`
7. Copy `Scope_of_Work/evidence/` → `docs/apollo/step10_curved_bridge/evidence/`
8. Do **NOT** copy `Scope_of_Work/final_report.txt` into `spacer-clone` final_report.txt directly
9. Instead, append a STEP 10 summary block to `spacer-clone/final_report.txt`
10. Run `git diff --check` to verify no problematic changes
11. `git add docs/apollo/step10_curved_bridge/`
12. `git commit -m "docs(apollo-step10): curved bridge pre-survey from Scope_of_Work"`
13. `git push origin main`
14. Verify on GitHub

## 3. Post-Integration Verification

- [ ] Files are in correct location
- [ ] `git status` is clean
- [ ] `git log` shows the commit
- [ ] GitHub reflects the files

## 4. Rollback Procedure

If integration fails:

1. `git reset HEAD~1`
2. `git checkout -- docs/apollo/step10_curved_bridge/`
3. Verify `git status` is clean