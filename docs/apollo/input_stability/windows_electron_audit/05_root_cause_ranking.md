# Root Cause Ranking

## Primary cause

- `CONFIRMED_PRIMARY_CAUSE`
- RC-04 Drawer focus trap / focus lifecycle
- More precise statement:
  `GuidedDetailDrawer` couples autofocus and trigger-focus restore to a `useEffect` that depends on unstable `onClose`. Any parent re-render while the drawer remains open re-runs cleanup/setup, which steals focus from the active input and moves it first to the drawer trigger and then to the first focusable element.

## Secondary causes

- `CONFIRMED_SECONDARY_CAUSE`
- RC-05 Enter handling contributes to immediate reproduction because `Enter` commits canonical state in `BridgeStructureInputPanel`, which triggers the parent render that re-runs the drawer effect.

- `PLAUSIBLE`
- RC-01 input remount
- Dev trace showed mount/unmount noise after the focus-loss sequence. This is an amplifier candidate, but it was not required to explain the reproduced defect.

## Excluded causes

- `EXCLUDED`
- RC-02 useEffectによるdraft上書き
- In the representative field, local draft remained `123.45`; no rollback to the old canonical value was observed.

- `EXCLUDED`
- RC-06 validationによるvalue rollback
- Canonical value committed successfully and stayed `123.45`.

- `EXCLUDED`
- RC-09 Electron renderer固有
- The same defect reproduced in browser dev with the same event order and activeElement transition.

## Unverified causes

- `NOT_VERIFIED`
- RC-10 Windows IME固有
- No real IME operator session was performed.

- `NOT_VERIFIED`
- RC-11 input type=numberと全角入力
- Representative field uses `CompositionAwareInput` with `inputMode=\"decimal\"`, not native `type=number`, and full-width/IME input was not executed in this audit.

- `NOT_VERIFIED`
- RC-08 Viewer / geometry synchronous block
- Not needed to explain the reproduced defect; no 200ms block evidence collected in the scoped scenario.

## Evidence

- Browser dev and Electron dev both reproduced:
  `activeElement: apollo-bridge-input-spanLength -> apollo-guided-detail-escape`
- The value was retained:
  `valueBeforeEnter=123.45`, `valueAfterEnter=123.45`
- Relevant code path:
  `ApolloPhase1Shell.tsx:2700` passes unstable `onClose={() => setDrawerTarget(null)}`
- Relevant code path:
  `GuidedDetailDrawer.tsx` effect depends on `[open, onClose]`, restores trigger focus in cleanup, then autofocuses drawer content in setup
- Relevant code path:
  `BridgeStructureInputPanel.tsx:122-124` commits on `blur` and `Enter`

## Confidence

- High for the representative defect (`FOCUS_LOST` on commit inside drawer)
- Medium for broader IME-related symptom coverage because real IME interaction was not verified

## Minimal next investigation

- Run one human-operated Windows IME session on the same field and confirm whether composition is interrupted by the same cleanup-driven blur.

## Recommended fix scope

- Keep the fix inside drawer focus lifecycle and callback stability.
- Do not start with numeric draft refactors or Electron-specific hacks.

## Do not change list

- No schema changes
- No canonical project format changes
- No package or lockfile changes
- No geometry or Viewer refactor as first response
