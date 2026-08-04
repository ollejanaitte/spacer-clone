# Edit Scope and Allowlist — F1 Follow-up

## UFX Scope

| UFX | Type | Fix Required | Effort | Dependencies |
|-----|------|-------------|--------|-------------|
| 01 | CSS/TSX | Compact header — compress description, shrink padding | Small | None |
| 02 | CSS/TSX | Compact provisional banner — move to inline/compact | Small | None |
| 03 | CSS | Compress save notice to toast-like display | Small | None |
| 04 | CSS | Reduce step bar height, padding, gap | Small | None |
| 05 | CSS/TSX | Compact topology summary, move GPU/WebGL to TechnicalDetails | Medium | None |
| 06 | TSX/CSS | Drawer panel for guided detail editing | Medium | F1-B2 |
| 07 | TSX | Separate "next" from "save" in GuidedModeShell | Medium | F1-B2 |
| 08 | TSX/CSS | Portal-based dialogs, stacking context fix, scroll lock | Medium | F1-C |
| 09 | Docs | No correction needed — member is correctly placed | None | F1-D |

## Allowlist

### F1-B1 (UI density)
- frontend/src/apollo/ApolloPhase1Shell.tsx (header, saveNotice, provisional banner)
- frontend/src/apollo/components/CompactAuthorizationBadge.tsx
- frontend/src/apollo/components/SaveStatusBadge.tsx
- frontend/src/apollo/components/ViewerPane.tsx
- frontend/src/styles.css

### F1-B2 (Guided drawer + save/next separation)
- frontend/src/apollo/guided/GuidedModeShell.tsx
- frontend/src/apollo/ApolloPhase1Shell.tsx (guided detail escape handler)
- frontend/src/styles.css (drawer styles)

### F1-C (Fullscreen overlay)
- frontend/src/apollo/components/SampleReapplyConfirmDialog.tsx
- frontend/src/apollo/components/UnsavedChangesGuardDialog.tsx
- frontend/src/styles.css (guard backdrop/dialog)
- (New) guard dialog portal utility

### F1-D (3D member)
- No code changes needed. Documentation only.

## Denylist
- schema files
- workflow evaluators/selectors/dependencies
- analysis engine
- generateBsdd.ts
- bridgeStructure/types.ts
- package.json / package-lock.json