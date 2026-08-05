# F2-A Fullscreen and Portal Compatibility

## Existing Portal Pattern
F1-C introduced `GuardDialogPortal` which renders at `document.body` level with `.apollo-guard-backdrop` (z-index 2000), body scroll lock, and guaranteed cleanup.

## Drawer Approach
The drawer should use a portal for overlay/stacking consistency, but it is NOT a modal dialog (it is a side sheet). Two options:

### Option 1: Shared portal root (Recommended)
Create a `DrawerPortal` similar to `GuardDialogPortal` but with a side-sheet backdrop style:
- container: `position: fixed; inset: 0; z-index: 2000;` (same layer as guard backdrop)
- background: `rgba(15,23,42,0.45)` (dim backdrop)
- Drawer panel: `position: absolute; right: 0; top: 0; height: 100%; width: min(560px, 92vw)`
- Body scroll lock on open, restore on close
- Cleanup on unmount (no leftover overlay/pointer-events)

### Option 2: GuardDialogPortal reuse
Would require modifying GuardDialogPortal to support a drawer layout. Keep GuardDialogPortal focused on centered dialogs. Prefer a separate `DrawerPortal`.

## Z-index Consistency
- Both use z-index 2000 (the established top layer). No arbitrary new values.
- Drawer must appear above the sticky footer (z-index 50) and auth panel (z-index 100).
- Fullscreen: portal-rooted drawer naturally covers fullscreen since it's at body level.

## No Conflict
- Guard dialogs (centered) and drawer (side sheet) never open simultaneously in Guided flow.
- If a guard dialog opens while drawer is open (e.g., unsaved changes), guard z-index must be at or above drawer. Both at 2000; guard dialog panel is a child so it wins. Verify in tests.