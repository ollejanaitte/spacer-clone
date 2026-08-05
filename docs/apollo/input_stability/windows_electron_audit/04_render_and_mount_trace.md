# Render And Mount Trace

Target field:

- `frontend/src/apollo/components/BridgeStructureInputPanel.tsx`
- input test id: `apollo-bridge-input-spanLength`

Confirmed facts from temporary audit trace:

- `Enter` on the field commits canonical state once.
- After canonical commit, the drawer effect cleanup runs before the next stable focus state.
- The field receives `blur` because focus is moved to the drawer trigger.
- The drawer effect runs again and re-applies autofocus to the first focusable element in the drawer.
- The target field does not need to lose its local draft for the bug to occur.

Render and mount conclusions:

- Render count increases on commit because Apollo state updates.
- Mount/unmount noise was observed in dev trace and is likely amplified by React dev behavior.
- The primary user-visible breakage happens before mount churn matters: focus is explicitly stolen by drawer cleanup.

Key code paths:

- `frontend/src/apollo/ApolloPhase1Shell.tsx:2695`
  `GuidedDetailDrawer` stays open while parent re-renders.
- `frontend/src/apollo/ApolloPhase1Shell.tsx:2700`
  `onClose={() => setDrawerTarget(null)}` creates a new callback every render.
- `frontend/src/apollo/components/GuidedDetailDrawer.tsx`
  `useEffect(..., [open, onClose])` re-runs when `onClose` identity changes.
- `frontend/src/apollo/components/GuidedDetailDrawer.tsx`
  cleanup calls `triggerRef.current?.focus()`.
- `frontend/src/apollo/components/GuidedDetailDrawer.tsx`
  setup calls autofocus on the first focusable element in the drawer.

Draft synchronization check:

- `frontend/src/apollo/components/BridgeStructureInputPanel.tsx:76`
  `commitInRef` guards the post-commit sync path.
- `frontend/src/apollo/components/BridgeStructureInputPanel.tsx:83`
  local draft is synchronized from canonical value only on `value` change.
- No evidence was captured of draft overwrite to an older canonical value in the representative scenario.
