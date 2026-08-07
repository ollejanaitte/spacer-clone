# R1_P02_SCOPE_AUDIT

- **Date**: 2026-08-07
- **Phase**: R1-P02-05

## Allowed changes (R1-P02)

- `frontend/src/liner/core/verification/comparison/**` (engine, adapters, fixtures,
  reporting, tests)
- additive re-export `frontend/src/liner/core/verification/index.ts`
- `docs/liner/planning/r1-numeric-verification/r1-p02/**`
- `docs/liner/planning/r1-numeric-verification/BRANCH_STATUS.md` (final PR)

## Forbidden (must be absent)

- `frontend/src/apollo/**` — absent
- `docs/apollo/**` — absent (test side-effects reverted)
- upper-structure related — absent
- 3D / 2D GUI — absent
- curved-bridge new features — absent
- package dependency addition — none
- lock file — none
- `.github/workflows/**` — absent
- calculation logic changes — none

## Audit result

| Check | Result |
|---|---|
| tracked modifications | only comparison module + docs + BRANCH_STATUS |
| forbidden paths | none |
| `git diff --check` | clean |
| calculation modules touched | none (`geometry/*`, `pipeline/*`, `haunch/*`, `hoso/*`, `ldist/*`, `station/*`, `grid/*`, `width/*`, `zMerge.ts`, `crossSection*`, `vertical*`) |
| Apollo evidence side-effects | reverted (git restore) after full test run |

## Repair PR scope

No repair PR executed: P02-02/P02-03 produced 0 derived FAILs (0 derived comparisons
claimed honestly); the 6 NOT_COMPARABLE rows are data-coverage limitations (missing station
equations), not implementation bugs. No mismatch was hidden.
