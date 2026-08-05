# F3-A Root Cause Analysis

## Issue: Deck Input Not Working

### Suspected Root Causes

1. **Drawer focus trap**: The `GuidedDetailDrawer` focus trap sets focus to the close button on open. If the user clicks on the input field, focus should transfer. But if the focus trap is too aggressive, it might steal focus back during IME composition.

2. **useEffect draft sync**: `NullableBridgeStructureFieldInput` at line 77-80 uses `useEffect` to sync `draft` from `value`. If the parent re-renders during typing (e.g., from `drawerTarget` state changes), the `draft` can be reset to `String(value)` which overwrites the user's text.

3. **CompositionAwareInput value prop**: The `CompositionAwareInput` receives `value={draft}` where `draft` is the local state. During composition, `handleChange` updates `pendingCommitRef` but does NOT call `onValueChange`. The `setDraft` is called in `onValueChange` which is only called on compositionEnd. So during composition, the input's value is controlled by `displayValue` which is set by `handleChange`. This should work correctly.

4. **commitDraft on Enter**: The `onKeyDown` handler at line 118-122 calls `commitDraft` on Enter. If the IME composition is active, the Enter key would both commit the composition AND commit the draft. This is handled by `CompositionAwareInput` which checks `composingRef.current` in `commitValue`.

### Most Likely Issue
The most likely issue is #1 - the drawer focus trap. When the drawer opens, focus goes to the close button. If the user clicks on the input field, focus should go there. But if the `panelRef.current?.querySelectorAll` in the focus trap code doesn't find the input fields (because they're inside the `BridgeStructureInputPanel` which renders inside the drawer body), the focus trap might not work correctly.

Actually, looking at the focus trap code in `GuidedDetailDrawer.tsx`, it queries `'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'` which should find `<input>` elements. The focus trap should cycle through them.

### Fix Plan
1. Remove the `useEffect` draft sync from `NullableBridgeStructureFieldInput` (or make it only sync when the value actually changes from an external source)
2. Ensure the drawer focus trap properly handles inputs
3. Add `inputMode="decimal"` support for all numeric inputs
4. Ensure `compositionend` properly flushes the value