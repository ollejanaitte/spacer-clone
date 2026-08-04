# Component and File Change Plan

## New Files

### UI-1 (Header / Auth)
- `frontend/src/apollo/components/HeaderGroup.tsx`
- `frontend/src/apollo/components/SaveStatusBadge.tsx`
- `frontend/src/apollo/components/CompactAuthorizationBadge.tsx`

### UI-2 (Guided Progress / Footer)
- `frontend/src/apollo/guided/GuidedProgressBar.tsx`
- `frontend/src/apollo/guided/GuidedProgressPhase.tsx`
- `frontend/src/apollo/guided/GuidedStepBadge.tsx`
- `frontend/src/apollo/components/StickyFooter.tsx`
- `frontend/src/apollo/components/ValidationErrorBanner.tsx`

### UI-3 (Viewer Workspace)
- `frontend/src/apollo/components/WorkspaceLayout.tsx`
- `frontend/src/apollo/components/ViewerPane.tsx`
- `frontend/src/apollo/components/InputPane.tsx`

### UI-4 (Workflow Master-Detail)
- `frontend/src/apollo/workflow/WorkflowNavigator.tsx`
- `frontend/src/apollo/workflow/WorkflowDetailCard.tsx`
- `frontend/src/apollo/workflow/WorkflowStepBadge.tsx`
- `frontend/src/apollo/workflow/WorkflowDiagnosticsSection.tsx`
- `frontend/src/apollo/workflow/WorkflowRecommendedSelector.ts`

### UI-5 (Responsive / A11y)
- (Refinements to above components; no major new components expected)

## Modified Files (by Step)

### UI-1
- `frontend/src/apollo/ApolloPhase1Shell.tsx` — header section restructured
- `frontend/src/apollo/components/AuthorizationBanner.tsx` — compact mode path added
- `frontend/src/apollo/i18n/catalog.ts` — labels for new badges
- `frontend/src/styles.css` — header-*, auth-*, badge-* rules

### UI-2
- `frontend/src/apollo/GuidedModeShell.tsx` — progress bar + footer integration
- `frontend/src/apollo/guided/chrome.ts` — minor wiring (if needed)
- `frontend/src/styles.css` — guided-progress-*, sticky-footer-* rules

### UI-3
- `frontend/src/apollo/ApolloPhase1Shell.tsx` — workspace layout wiring
- `frontend/src/styles.css` — workspace-*, viewer-pane-*, input-pane-* rules

### UI-4
- `frontend/src/apollo/workflow/WorkflowControlScreen.tsx` — master-detail refactor
- `frontend/src/styles.css` — workflow-* rules

### UI-5
- All above components — responsive behavior
- `frontend/src/styles.css` — responsive breakpoints, media queries

### UI-6
- (tiny fixes only)

## Files NEVER Modified (Denylist)

- Any file under `frontend/src/apollo/bridgeDefinition/`
- `frontend/src/apollo/workflow/evaluators.ts`
- `frontend/src/apollo/workflow/capabilityRegistry.ts`
- `frontend/src/apollo/workflow/dependencyRegistry.ts`
- `frontend/src/apollo/workflow/WorkflowStateModel.ts`
- `frontend/src/apollo/workflow/WorkflowSelectors.ts` (unless adding recommended selector, which reads existing state only)
- `frontend/src/apollo/visualization/` — visualization logic
- `frontend/src/apollo/stl/` — STL generation
- `frontend/src/apollo/quantity/` — quantity takeoff
- `frontend/src/apollo/output/` — output integration
- `frontend/src/apollo/loads/` — load model
- `frontend/src/apollo/analysis/` — analysis adapter
- `frontend/src/apollo/schema/` — schema definitions
- `frontend/src/apollo/workspace/` — workspace / checksum / STALE
- `frontend/src/apollo/i18n/types.ts` — i18n type definitions (catalog.ts may add entries)
- `frontend/src/contracts/` — contract schema
- Any `*.json` schema file
- `package.json`, `package-lock.json`
- `tsconfig.json`, `vite.config.ts`

## Test Files

### New tests alongside each new component
- `frontend/src/apollo/components/__tests__/HeaderGroup.test.tsx`
- `frontend/src/apollo/components/__tests__/SaveStatusBadge.test.tsx`
- `frontend/src/apollo/components/__tests__/CompactAuthorizationBadge.test.tsx`
- `frontend/src/apollo/guided/__tests__/GuidedProgressBar.test.tsx`
- `frontend/src/apollo/guided/__tests__/StickyFooter.test.tsx`
- `frontend/src/apollo/components/__tests__/WorkspaceLayout.test.tsx`
- `frontend/src/apollo/workflow/__tests__/WorkflowNavigator.test.tsx`
- `frontend/src/apollo/workflow/__tests__/WorkflowDetailCard.test.tsx`

### Updated E2E
- `frontend/tests/e2e/apollo-step4a-workflow.spec.ts` — workflow list/detail navigation
- `frontend/tests/e2e/apollo-step5-final-gui.spec.ts` — full GUI regression
- `frontend/tests/e2e/apollo-step5-jp3c-full-gui-e2e.spec.ts` — Japanese UI + English residual