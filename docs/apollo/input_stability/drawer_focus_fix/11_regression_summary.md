# WIF-3 Regression Summary

## Changed Files

| File | Change | Status |
|------|--------|--------|
| `frontend/src/apollo/components/GuidedDetailDrawer.tsx` | Decouple focus lifecycle from onClose identity; use onCloseRef; effect deps `[open]` only | VERIFIED |
| `frontend/src/apollo/components/__tests__/GuidedDetailDrawer.test.tsx` | 5 new focused regression tests | VERIFIED |

## Test Results

| Suite | Result |
|-------|--------|
| GuidedDetailDrawer unit tests | 13/13 PASS |
| Apollo Vitest | 510/510 PASS (75 files) |
| Typecheck | PASS |
| Lint | PASS |
| Build | PASS |

## Regression Scope

| Feature | Regressed? |
|---------|-----------|
| Drawer open/close | NO |
| Autofocus on open | NO |
| Focus restore on close | NO |
| Escape close | NO |
| Tab focus trap | NO |
| Body scroll lock | NO |
| Portal cleanup | NO |
| Save button | NO |
| Dirty state indicator | NO |
| ARIA attributes | NO |

## Guard Verdicts

| Guard | Status |
|-------|--------|
| Schema | UNCHANGED |
| Checksum | UNCHANGED |
| Canonical format | UNCHANGED |
| Formal authorization | UNCHANGED (NOT_GRANTED) |
| Electron source | UNCHANGED |
| Package/lockfile | UNCHANGED |