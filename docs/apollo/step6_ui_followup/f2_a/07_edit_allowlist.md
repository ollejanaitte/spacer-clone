# F2-A Edit Allowlist

## F2-B (Drawer Shell)
- frontend/src/apollo/components/GuidedDetailDrawer.tsx (NEW)
- frontend/src/apollo/components/GuidedDetailDrawer.test.tsx (NEW)
- frontend/src/styles.css (drawer CSS)

## F2-C1 (Core Editors)
- frontend/src/apollo/ApolloPhase1Shell.tsx (drawer state, handleGuidedDetailEscape, conditional inline panel rendering)
- frontend/src/apollo/guided/GuidedModeShell.tsx (pass openDetail to parent, optional drawer integration)
- frontend/src/styles.css (drawer content area, transition)

## F2-C2 (Bridge Structure Editors)
- frontend/src/apollo/ApolloPhase1Shell.tsx (drawer content mapping for BridgeStructureInputPanel et al.)
- frontend/src/styles.css (editor-specific adjustments)

## F2-D (UX)
- frontend/src/apollo/components/GuidedDetailDrawer.tsx (header, close button, save status)
- frontend/src/styles.css (responsive, mobile)

## Denylist (NEVER MODIFY)
- schema files
- workflow evaluators/selectors/dependencies
- analysis engine
- generateBsdd.ts
- bridgeStructure/types.ts
- package.json / package-lock.json
- i18n/types.ts (add catalog entries if needed)
- Viewer3D internal logic
- STL/quantity/export logic