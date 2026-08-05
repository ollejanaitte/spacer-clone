# F3-A Edit Scope and Allowlist

## F3-B (IME-safe input foundation)
- frontend/src/apollo/numericInput.ts (normalize/commit fixes)
- frontend/src/apollo/components/CompositionAwareInput.tsx (IME event handling)
- frontend/src/apollo/__tests__/numericInput.test.ts (test updates)

## F3-C (Deck input fixes)
- frontend/src/apollo/components/BridgeStructureInputPanel.tsx (NullableBridgeStructureFieldInput fixes)
- frontend/src/apollo/components/DeckAppurtenanceInputPanel.tsx (NullableNumberInput fixes)
- frontend/src/apollo/components/RcDeckHaunchInputPanel.tsx (NullableNumberInput fixes)
- frontend/src/apollo/__tests__/BridgeStructureInputPanel.test.tsx (test updates)

## Denylist
- schema files
- workflow evaluators/selectors/dependencies
- analysis engine
- generateBsdd.ts
- bridgeStructure/types.ts
- package.json / package-lock.json
- Viewer3D internal logic
- STL/quantity/export logic