# F2-A Component Reuse Plan

## Core Principle
Reuse existing panel components verbatim. Do NOT copy input logic into drawer-specific variants.

## Reused Components (by target)

| Panel ID | Component | Reused As-Is | Props Required |
|----------|-----------|-------------|----------------|
| wf-panel-bridge-structure | `BridgeStructureInputPanel` | Yes | project, onProjectChange, plus audit/validation props |
| wf-panel-pavement | `PavementMarkingInputPanel` | Yes | project, onProjectChange |
| wf-panel-appurtenance | `DeckAppurtenanceInputPanel` | Yes | project, onProjectChange |
| wf-panel-haunch | `RcDeckHaunchInputPanel` | Yes | project, onProjectChange |
| wf-panel-load-confirmation | `LoadConfirmationDevelopmentPanel` | Yes | project |
| wf-panel-quantity | `QuantityModelDevelopmentPanel` | Yes | project |
| wf-panel-analysis | `AnalysisDevelopmentProbePanel` | Yes | project |
| wf-panel-output | `OutputIntegrationPanel` | Yes | project |

## Nodes/Members/Supports/Materials
These are rendered via `renderEditor()` conditioned on `editorPane`. They are NOT workflow panels. A drawer variant for the node/member/support/material editors is NOT in scope for F2-A/F2-C (they remain on the editor screen). If needed later, they would require the same single-active-host pattern.

## Drawer Content Renderer

New `GuidedDetailDrawerContent` (in F2-C) maps a `GuidedDetailEscape` to a React node:
- `kind === "panel"` → renders the mapped component
- `kind === "route"` → renders a message + "この機能は別画面で開きます" + link (no drawer content)
- `kind === "viewer"` → no drawer; keep existing scroll-to-viewer

## Single Active Host

To prevent double-mount of the same component (BridgeStructureInputPanel is always inlined in basics screen), the drawer must render the panel AND the inline copy must be hidden while the drawer is open.

Implementation: when `drawerTarget` is set, add class `apollo-drawer-active` to the shell root. CSS hides the inline panel wrappers that correspond to the active target. This keeps exactly one mounted instance of each panel type.

Alternative for safety: conditionally render inline panels based on `drawerTarget === null`. When a drawer is open, the inline `BridgeStructureInputPanel` etc. are unmounted and the drawer instance mounts. This guarantees no double-mount. (Preferred.)