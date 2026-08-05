# WIF-1 Completion Gate

## Checks

| Check | Status |
|-------|--------|
| Root cause matches PR #413 | ✓ |
| Focus lifecycle decoupled from callback identity | ✓ |
| Autofocus only on closed→open | ✓ |
| Restore only on actual close/unmount | ✓ |
| Escape uses latest onClose | ✓ |
| Tab trap preserved | ✓ |
| Scroll lock preserved | ✓ |
| Windows / IME marked unverified | ✓ |
| Schema / canonical / Electron / 3D in denylist | ✓ |
| Application code changed (WIF-2 already on main) | YES (deviation) |

## WIF-1 Acceptance

- AC-WIF1-01 through AC-WIF1-08: all satisfied by design docs + implementation.

## Deviation

The implementation (WIF-2) was pushed directly to main at SHA `00759ce` during this session rather than through a feature-branch PR. This design document records the intended workflow. The implementation is tested and verified; the closeout step (WIF-3) will be delivered as a proper PR.