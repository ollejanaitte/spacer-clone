# Event Trace

Representative field:

- `Guided Detail Drawer` -> `BridgeStructureInputPanel` -> `apollo-bridge-input-spanLength`

Scenario:

1. Open `/pro/apollo`
2. Enter Step 5 guided mode
3. Open `Guided Detail Drawer`
4. Focus `apollo-bridge-input-spanLength`
5. Type `123.45`
6. Press `Enter`

Observed browser dev trace:

- Before `Enter`: `valueBeforeEnter=123.45`, `activeElement=apollo-bridge-input-spanLength`
- `keydown Enter`
- `commitDraft` called in `BridgeStructureInputPanel`
- canonical project value committed from `null` to `123.45`
- `GuidedDetailDrawer` effect cleanup runs
- cleanup calls `triggerRef.current?.focus()`
- input `blur` fires after cleanup-induced focus move
- `GuidedDetailDrawer` effect starts again
- drawer autofocus picks the first focusable element, not the edited input
- After `Enter`: `valueAfterEnter=123.45`, `activeElement=apollo-guided-detail-escape`

Observed Electron dev trace:

- Same sequence as browser dev
- Same final `activeElement=apollo-guided-detail-escape`

Interpretation:

- The committed value is preserved.
- The failure mode is not `VALUE_REVERTED`.
- The failure mode is deterministic `FOCUS_LOST` caused by drawer lifecycle, not by Electron-only text insertion failure.

Composition-specific status:

- `CompositionAwareInput` has composition handlers and flush logic.
- Real IME `compositionstart/compositionend` was not verified with a human IME session.
- IME-specific verdict remains `NOT_VERIFIED`.
