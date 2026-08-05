# Edit Scope Recommendation

direct edit candidates:

- `frontend/src/apollo/components/GuidedDetailDrawer.tsx`
- `frontend/src/apollo/ApolloPhase1Shell.tsx`

conditional candidates:

- `frontend/src/apollo/components/BridgeStructureInputPanel.tsx`
- `frontend/src/apollo/components/CompositionAwareInput.tsx`

protected files:

- `desktop/electron/main.ts`
- geometry / visualization builders
- schema / persistence files
- package manifests and lockfiles

expected test files:

- `frontend/src/apollo/components/__tests__/GuidedDetailDrawer.test.tsx`
- add a focused Apollo drawer input stability test near drawer or Apollo route tests

estimated implementation size:

- small to medium
- likely 1-3 files for the first corrective change

whether Codex is still needed:

- yes, if the fix should remain narrowly scoped and regression-tested
