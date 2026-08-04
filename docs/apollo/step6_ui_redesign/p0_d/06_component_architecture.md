# 06 — Component Architecture

**BASE_MAIN_SHA:** `7023cb61e7e2f7189e45b46dcb7edb0395320767`

Names are **proposals** (not frozen). Prefer extract-from-shell over parallel dead components.

## Proposed components vs existing

| Proposed | Maps from / overlaps | Responsibility | Intro PR |
|----------|----------------------|----------------|----------|
| `ApolloAppHeader` | shell header JSX | Groups mode/file/help/return/auth | UI-1 |
| `ApolloModeSwitcher` | two mode buttons (+ workflow) | Active mode styling + a11y | UI-1 |
| `ApolloFileActions` | open/save buttons | Dirty/persisting presentation | UI-1 |
| `ApolloAuthorizationStatus` | provisional banner + AuthorizationBanner compact | Global compact auth | UI-1 |
| `ApolloProgressNavigator` | Guided progress list + residual chapter label | Integrated G progress | UI-2 |
| `ApolloStickyActionBar` | `apollo-guided-nav` | Sticky back/next/save | UI-2 |
| `ApolloWorkspaceLayout` | `apollo-unit2-layout` | Inspector + viewer panes | UI-3 |
| `ApolloInspectorPane` | `apollo-unit2-editor` region | Input/progress content host | UI-3 |
| `ApolloViewerPane` | `apollo-unit2-visual-panel` | Host Viewer3D + summary | UI-3 |
| `ApolloMobileWorkspaceTabs` | new | Input / 3D tabs | UI-5 |
| `ApolloWorkflowNavigator` | part of WorkflowControlScreen list | Compact 15 rows | UI-4 |
| `ApolloWorkflowDetail` | WorkflowStepCard body | Selected step detail | UI-4 |

## Keep as-is (SoR / work surfaces)

- All `*InputPanel` / analysis / quantity / report / drawing / output panels
- `Viewer3D` (internals)
- `buildWorkflowStateModel` consumers only

## Extraction rules

1. First PR may inline structure in shell with CSS; extract components when duplication appears.
2. Do not duplicate state owners — mode/slide/selection stay in shell or existing local state.
3. New files under `frontend/src/apollo/components/` unless guided-specific (`guided/`).

## Avoid

- A second Guided shell with its own ProjectModel
- A Workflow evaluator wrapper that recomputes status differently
- Card-heavy hero chrome
