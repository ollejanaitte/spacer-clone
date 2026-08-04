# Guided Detail Display Options Investigation

## Requirement (UFX-06)
Allow Guided mode detail editing without cluttering the already-crowded slide view.

## Investigation Results

### Current State
- Guided mode slides (G01-G15) are rendered inside `GuidedModeShell`
- Each slide shows: theme, decision description, primary fields (labels), WF anchor, impact hints, diagnostics
- The "詳細を開く" button calls `onOpenDetail(escape)` which triggers `scrollWorkflowTargetIntoView(target)`
- This scrolls the page to the relevant workflow panel within the same page

### Constraints
- **No React portals used anywhere** — all render inline
- **No window management** — no Electron BrowserWindow management for sub-windows
- **Single canonical data** — all state is derived from `project: ProjectModel`
- **No schema changes allowed**
- **No localStorage or IPC-based sync**

### Options Evaluated

#### Option A: Drawer/Slide-over Panel (RECOMMENDED)
- Render a fixed-position side panel that overlays the viewer pane
- Contains the relevant detail form (BridgeStructureInputPanel, etc.)
- Closes to return to Guided slide
- Same `project` prop, same canonical data
- Pros: No state duplication, no window management, works in browser and Electron
- Cons: Needs fixed-position CSS, responsive handling

#### Option B: Large Modal
- Render a full-screen modal with the detail form
- Same data binding as Option A
- Pros: Simple, works everywhere
- Cons: Similar to drawer but blocks all background interaction

#### Option C: Browser window.open (REJECTED)
- Would create separate browsing context
- Cannot share React state
- Would require localStorage or BroadcastChannel for sync
- Risk of save conflicts and stale data

#### Option D: Electron BrowserWindow (REJECTED for now)
- Would require IPC bridge, window management service
- State duplication risk
- Over-engineered for current needs

### Decision
**Adopt Option A (Drawer panel)** for F1-B2. The drawer:
- Slides in from the right, overlaying the 3D viewer
- Uses `position: fixed; right: 0; top: 0; height: 100vh; width: min(500px, 100%)`
- Contains the detail panel identified by `GuidedDetailEscape.panelId`
- Same `project` prop passed through
- Close button + Escape to dismiss
- z-index: 500 (below auth panel at 100, above sticky footer at 50)