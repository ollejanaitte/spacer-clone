# R1_P01_SCOPE_AUDIT

- **Date**: 2026-08-07
- **Phase**: R1-P01

## Allowed changes (R1-P01)

- `frontend/src/liner/core/verification/reference-data/**` (types, validation, manifest,
  field-mapping, provenance-index, loader, datasets, tests)
- additive re-export `frontend/src/liner/core/verification/index.ts`
- `docs/liner/planning/r1-numeric-verification/r1-p01/**`
- `docs/liner/planning/r1-numeric-verification/BRANCH_STATUS.md` (final PR)

## Forbidden (must be absent)

- `frontend/src/apollo/**` — absent
- `docs/apollo/**` — absent
- upper-structure related — absent
- 3D / 2D GUI — absent
- curved-bridge new features — absent
- package dependency addition — none
- lock file — none
- start scripts — none
- calculation logic changes — none

## Audit result

| Check | Result |
|---|---|
| tracked modifications | only verification module + docs + BRANCH_STATUS |
| forbidden paths | none |
| `git diff --check` | clean |
| calculation modules touched | none (`geometry/*`, `pipeline/*`, `haunch/*`, `hoso/*`, `ldist/*`, `station/*`, `grid/*`, `width/*`, `zMerge.ts`, `crossSection*`, `vertical*`) |
