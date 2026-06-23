# 09 3D View Specification

## 1. Purpose

This document defines the MVP 3D line-model display specification based on Three.js. Its purpose is to allow the analysis input and the result to be inspected visually. CAD editing features are not included.

## 2. Scope

- Node display.
- Member line display.
- Support symbols.
- Load arrows.
- Member ID and node ID labels.
- Deformed shape.
- 2D fallback display when Three.js / WebGL initialization fails.
- Display scale factors.
- Camera controls.
- Selection highlight.

## 3. Out of Scope

- 3D solid display of cross-section shapes.
- CAD editing, snapping, drag-and-drop creation.
- DXF display and output.
- Influence line diagrams, mode shape diagrams, response spectrum result diagrams.
- Specialized display for temperature loads or prestress.
- Advanced report drawing generation.

## 4. Display Specification

### Input Data

- A model compatible with `project.json`.
- The currently selected load case ID.
- An optional analysis result JSON.
- The UI selection state.
- Display settings.

### Base Three.js Renderer Settings

To improve initialization chances on older GPUs, the MVP `WebGLRenderer` is created with the following base settings:

```ts
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: false,
  alpha: false,
  powerPreference: "default",
  preserveDrawingBuffer: false,
  failIfMajorPerformanceCaveat: false,
});
```

Constraints:

- Catch the failure of `new THREE.WebGLRenderer(...)`.
- WebGL initialization failure must not crash the viewer or the whole UI.
- Errors must not be reported only to the browser console; they must be forwarded to the bottom panel.
- The user is guided to restart in a compatibility rendering mode.
- The Electron `legacy-desktop-gl` mode is the last-resort compatibility mode and is not recommended as standard.

### Node Display

- Each node is drawn as a point or a small sphere.
- The selected node is highlighted.
- Nodes with supports show the support symbol on top of them.

### Member Line Display

- Draw a straight line from `nodeI` to `nodeJ`.
- The selected member changes color and line width.
- Member ID labels can be toggled.

### Support Symbols

- A simple symbol is drawn at restrained nodes.
- A fully fixed support may be a block or a triangle.
- Partial-restrained DOFs are checked in the property panel.

### Load Arrows

- Concentrated loads of the selected load case are drawn as arrows at the corresponding nodes.
- Member uniform distributed loads are drawn as multiple arrows or a band.
- Loads are auto-scaled so that the relative magnitude is visible.
- The force direction always matches the actual vector.

### Labels

- Toggle node ID labels.
- Toggle member ID labels.
- Labels always face the camera.
- Labels can be hidden on dense models.

### Deformed Shape

- When an analysis result is available, the deformed shape is shown using the displacement of the selected load case.
- In the MVP, each member may be drawn as a straight line between deformed node positions.
- The undeformed shape is kept in a faded color.
- Deformation scale can be manual or automatic.

### Display Scale

Settings:

- `deformationScale`
- `loadScale`
- `nodeSize`
- `labelSize`

Automatic deformation scale:

1. Compute the diagonal of the model bounding box.
2. Compute the maximum translational displacement.
3. Pick a scale so that the maximum displacement is a fixed fraction of the diagonal.
4. When the maximum displacement is 0, the deformed shape is not shown.

### Camera Controls

- Orbit.
- Pan.
- Zoom.
- Fit to model.
- XY, XZ, YZ, Isometric.

### Selection Highlight

- Clicking a node selects the node.
- Clicking a member selects the member.
- The selection state is reported to React.
- Selection changes on the React side are also reflected in the 3D view.


### Workspace Layout

The 3D view sits in the center of the pro-mode workspace. The workspace is a three-column grid:

- Left: project tree (always visible).
- Center: 3D view (3D viewport, header, and right-side control panel inside the viewer body).
- Right: property / data panel (table editor for nodes, members, supports, loads, etc.).

To maximize the 3D drawing area, the right-side View controls and the right-side property panel are placed in collapsible drawers:

- Both drawers are **collapsed by default** when the pro page is opened. The center 3D view occupies the full width of the remaining area.
- Each drawer has a thin vertical toggle button pinned to the right edge of the workspace. Clicking the button slides the drawer in or out.
- The View control drawer contains the comparison toggle, animation controls, visibility, display scale, force color map, coordinate, eigen mode / load case selectors, and the result panel toggles. It is the same set of controls that was previously always shown on the right of the 3D viewport.
- The property panel drawer contains the table editor (nodes / members / materials / sections / supports / load cases / nodal loads / member loads / mass cases / analysis settings). It is the same table that was previously always shown on the right of the workspace.
- Toggling either drawer does not change the analysis engine, the project model, the API contract, the JSON schema, or any persisted data.
- The existing input, selection, and validation behavior of the property panel and the View controls is preserved exactly. Only their visibility / occupancy is changed.

Initial camera fit:

- On first paint of the 3D viewport and whenever the viewport size changes (window resize, drawer open / close), the camera fits to the model bounding box using the existing fitCameraToBox helper.
- The fit is the same as the manual Fit button: the camera is repositioned so the model bounding box is centered and the bounding sphere fits the current FOV, and the OrbitControls target is moved to the model centroid.
- Existing OrbitControls, manual orbit, pan, zoom, and the per-mode scale factors are unchanged.

Accessibility:

- Each toggle button has an aria-label and a title resolved through frontend/src/i18n/ja.ts so the user-facing Japanese text stays in one place.
- aria-expanded reflects the open / closed state of the drawer.
- The toggle is keyboard-focusable (tabIndex=0) and activates on Enter or Space.
- The label switches between the open variant and the close variant so screen readers announce the next action.

### 2D Fallback Display

In environments where Three.js / WebGL is not available, the MVP shows a minimal 2D fallback view.

Scope:

- Nodes.
- Members.
- Rough representation of supports.
- Rough representation of nodal loads.
- Selection highlight.
- Fit to model.

Not required for the 2D fallback:

- Advanced 3D camera controls.
- Detailed deformed shape.
- Full 3D load arrows.
- Member force diagrams.
- CAD editing.

The 2D fallback exists only for display compatibility. It does not extend the analysis engine, the API, `project.json`, or the result JSON specification.

## 5. Error Handling

- A bad reference to a member must not crash the whole view.
- Entities that cannot be drawn are returned to the UI as warnings.
- When the result JSON is not available, the deformed shape is hidden.
- When the displacement contains non-finite values, the deformed shape is hidden and an error is shown.
- Catch the failure of `new WebGLRenderer()` and switch to the 2D fallback.
- The WebGL initialization failure is shown in the bottom panel.
- The user is guided to restart in a compatibility rendering mode.

## 6. Test Viewpoints

- An empty model does not crash.
- Nodes and members are displayed.
- Support symbols, load arrows, and label toggles work.
- Selection highlight is synchronized with React state.
- The deformed shape is drawn from the result JSON.
- When `WebGLRenderer` construction is mocked to fail, the view switches to the 2D fallback.
- Three.js initialization failure does not crash the whole UI.
- In the 2D fallback, nodes, members, rough supports, rough nodal loads, selection, and fit to model are visible.
- Performance is reasonable for roughly 1,500 nodes and 2,500 members.

## 7. Definition of Done

- MVP models can be displayed as line views.
- Supports and loads can be checked approximately.
- The deformed shape from the analysis result can be displayed.
- Even when WebGL is not available, the 2D fallback allows rough model inspection.
- The UI owner can integrate the viewer as a component.
- No advanced drawing features outside the MVP are included.
