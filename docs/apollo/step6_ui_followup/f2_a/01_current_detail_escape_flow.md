# F2-A Current Detail Escape Flow

## Current Mechanism

`handleGuidedDetailEscape` in `ApolloPhase1Shell.tsx:1580` receives a `GuidedDetailEscape` and delegates to `scrollWorkflowTargetIntoView` which scrolls the page to the target panel DOM element. No drawer, no state change.

## Three Escape Kinds

| Kind | Count | Behavior |
|------|-------|----------|
| `panel` | 12 | Scroll to `data-testid` via PANEL_SELECTORS map |
| `route` | 1 (G02) | `window.location.assign(path)` — navigates away |
| `viewer` | 1 (G12) | Scroll to `[data-testid="apollo-model-view-panel"]` |

## Panel Rendering

All 15 workflow panels are unconditionally rendered (stacked vertically) in `guidedStep === "basics"` screen. They are always mounted in the DOM. The `EditorPane` state (`project|nodes|members|supports|materials`) controls tab visibility within `renderEditor()`.

## Drawer Implication

Since all panels are always mounted, the drawer cannot simply "move" an existing DOM node. It must render the panel component itself. The inline version must be hidden when the drawer is open to prevent double-mount of the same component type (which would cause duplicate IDs, effects, and state).