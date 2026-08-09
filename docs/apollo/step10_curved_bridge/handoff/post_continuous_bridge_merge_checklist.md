# Post-Continuous Bridge Merge Checklist

This checklist must be completed after the continuous bridge implementation (step9) is merged into `spacer-clone` main and before integrating `Scope_of_Work` survey results.

## Prerequisites

- [ ] `spacer-clone` continuous bridge implementation (step9) is complete
- [ ] `spacer-clone` main branch is clean
- [ ] `origin/main == local main`
- [ ] No pending commits on main
- [ ] Working tree is clean

## Integration

- [ ] Verify `spacer-clone` main branch status
- [ ] Create SHA256 checksums of `Scope_of_Work` files
- [ ] Check if `docs/apollo/step10/` exists in `spacer-clone`
- [ ] If exists, verify no conflict; if conflict, create new directory `docs/apollo/step10_curved_bridge/`
- [ ] Copy `Scope_of_Work/step10_curved_bridge/` → `docs/apollo/step10_curved_bridge/`
- [ ] Copy `Scope_of_Work/handoff/` → `docs/apollo/step10_curved_bridge/handoff/`
- [ ] Copy `Scope_of_Work/evidence/` → `docs/apollo/step10_curved_bridge/evidence/`
- [ ] Append STEP 10 summary block to `spacer-clone/final_report.txt`
- [ ] Run `git diff --check` to verify no problematic changes
- [ ] `git add docs/apollo/step10_curved_bridge/`
- [ ] `git commit -m "docs(apollo-step10): curved bridge pre-survey from Scope_of_Work"`
- [ ] `git push origin main`
- [ ] Verify on GitHub

## Post-Integration Verification

- [ ] Files are in correct location
- [ ] `git status` is clean
- [ ] `git log` shows the commit
- [ ] GitHub reflects the files

## Rollback (if needed)

- [ ] `git reset HEAD~1`
- [ ] `git checkout -- docs/apollo/step10_curved_bridge/`
- [ ] Verify `git status` is clean