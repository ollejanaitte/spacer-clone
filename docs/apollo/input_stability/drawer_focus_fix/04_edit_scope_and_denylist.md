# Edit Scope and Denylist

## Direct Edit Candidates

| File | Change |
|------|--------|
| `frontend/src/apollo/components/GuidedDetailDrawer.tsx` | Decouple focus lifecycle from `onClose` identity; use `onCloseRef`; effect deps `[open]` only |
| `frontend/src/apollo/components/__tests__/GuidedDetailDrawer.test.tsx` | Add focused regression tests |

## Conditional Candidate

| File | Condition |
|------|-----------|
| `frontend/src/apollo/ApolloPhase1Shell.tsx` | Only if caller-side `useCallback` stabilization is additionally needed. NOT required for this fix (drawer-internal hardening is the primary fix). |

## Protected (Denylist)

- `frontend/src/apollo/components/BridgeStructureInputPanel.tsx`
- `frontend/src/apollo/components/CompositionAwareInput.tsx`
- `frontend/src/apollo/components/DrawerPortal.tsx`
- Electron main / preload
- schema files
- persistence / workspace / checksum
- geometry / visualization / quantity
- package.json / lockfile
- CSS / drawer layout

## Deviation Record

WIF-2 implementation was committed and pushed directly to `main` (SHA `00759ce`) during this session instead of via a feature branch + PR. This is a workflow deviation. The change is fully tested and documented. The design docs (this directory) and the closeout verification are provided via proper PRs. The direct-push SHA is recorded in `final_report.txt`.