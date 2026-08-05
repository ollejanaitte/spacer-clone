# WIF-1 Drawer Focus Lifecycle Fix — Design

## Problem Statement

**Root cause** (PR #413): `GuidedDetailDrawer`'s `useEffect` depended on `[open, onClose]`. Parent re-renders created a new `onClose` function reference, causing the effect to re-run cleanup (which focused the trigger, stealing focus from the active input) and then setup (which re-autofocused the first drawer element).

**Symptom**: After Enter commit inside the drawer, focus jumps to the drawer trigger button, preventing continued typing.

## Fix Design

### A. Callback Identity Separation

- `onCloseRef` stores the latest `onClose` without coupling the focus lifecycle effect to its identity.
- The focus lifecycle effect depends only on `[open]` (not `[open, onClose]`).
- Cleanup (focus restore + listener removal) only fires on actual close (`open` true→false) or unmount, never on parent re-render.

### B. Autofocus

- Autofocus to the first focusable element only happens on the `closed → open` transition.
- No autofocus re-runs on `open`-while-open rerenders (parent update, dirty state, etc.).

### C. Focus Restore

- Trigger focus restore only happens in the cleanup of the `[open]` effect, which fires on actual close or unmount.
- Not on parent re-render, not on `onClose` identity change, not on `isDirty` update.

### D. Escape Handler

- Uses `onCloseRef.current` to always call the latest `onClose`.
- Listener is registered once per open transition, cleaned up on close/unmount.

### E. StrictMode

- React dev StrictMode double-invoke (setup→cleanup→setup) happens on mount. The transient focus restore is quickly overwritten by the second setup's autofocus. Final state is correct (input focused).

## Implementation

| File | Change |
|------|--------|
| `GuidedDetailDrawer.tsx` | Added `onCloseRef`, changed effect deps from `[open, onClose]` to `[open]` |
| `GuidedDetailDrawer.test.tsx` | 5 new focused regression tests |