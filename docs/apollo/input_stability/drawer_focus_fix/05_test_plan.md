# Test Plan

## Focused Regression Tests (GuidedDetailDrawer)

| Test | Assertion |
|------|-----------|
| T-WIF2-01 | Renders nothing when closed |
| T-WIF2-02 | Autofocuses first input on open |
| T-WIF2-03 | Focus preserved when onClose identity changes while drawer stays open |
| T-WIF2-04 | Focus preserved when isDirty/title updates while drawer stays open |
| T-WIF2-05 | Focus preserved across repeated parent re-renders (Enter commit simulation) |
| T-WIF2-06 | Focus restored to trigger on actual close |
| T-WIF2-07 | Escape calls onClose once |
| T-WIF2-08 | Close/done/backdrop call onClose |
| T-WIF2-09 | Tab/Shift+Tab trap preserved |
| T-WIF2-10 | No duplicate event listeners |
| T-WIF2-11 | Body scroll lock active while open, released on close |
| T-WIF2-12 | Focus preserved under StrictMode-equivalent re-render |
| T-WIF2-13 | No exception when trigger removed from DOM on close |

## Verification Commands

- `git diff --check`
- `cd frontend && npm run typecheck`
- `cd frontend && npx vitest run src/apollo/components/__tests__/GuidedDetailDrawer.test.tsx`
- `cd frontend && npx vitest run src/apollo`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`

## Manual Smoke (ZorinOS browser + Electron)

Representative field: `apollo-bridge-input-spanLength`

1. Open Guided Detail Drawer
2. Focus the field
3. Type `123.45`
4. Enter
5. Verify active field retains focus
6. Verify continued typing works (`6` etc.)
7. Verify value retained
8. Verify dirty state updates
9. Verify save works
10. Close drawer, verify trigger focus restore