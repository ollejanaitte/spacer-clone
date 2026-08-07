# R1_P00_SCOPE_AUDIT

- **Date**: 2026-08-07
- **Phase**: R1-P00

## Allowed changes

- R1-P00 types / schema / validation / comparison helpers under
  `frontend/src/liner/core/verification/**`
- R1-P00 focused tests under `frontend/src/liner/core/verification/__tests__/**`
- Additive re-export in `frontend/src/liner/core/index.ts`
- R1-P00 docs under `docs/liner/planning/r1-numeric-verification/r1-p00/**`
- `docs/liner/planning/r1-numeric-verification/BRANCH_STATUS.md` update

## Forbidden (must be absent)

- `frontend/src/apollo/**` — absent
- `docs/apollo/**` — absent (any test side-effect was reverted)
- upper-structure related — absent
- 3D related — absent
- 2D GUI related — absent
- curved-bridge new features — absent
- unrelated styling — absent
- package dependency addition — none
- lock file — none
- start scripts — none

## Verification commands

```
git status --short --untracked-files=all
git diff --check
git diff --stat
git diff --name-only
```

## Audit result

| Check | Result |
|---|---|
| tracked modification | only `frontend/src/liner/core/index.ts` (additive export) + `BRANCH_STATUS.md` |
| untracked source files | only `frontend/src/liner/core/verification/**` |
| untracked docs | only `docs/liner/planning/r1-numeric-verification/r1-p00/**` + BRANCH_STATUS |
| forbidden paths present | none |
| `git diff --check` | clean |
| environment symlinks (not staged) | `.venv`, `frontend/node_modules` (excluded via explicit staging) |
