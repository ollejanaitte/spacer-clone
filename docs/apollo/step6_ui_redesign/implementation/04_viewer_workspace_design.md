# Viewer Workspace Design — UI-3

## Layout

### Desktop (≥1024px)

```
┌─────────────────────────────────────────────────────┐
│ Header                                               │
├────────────────────┬────────────────────────────────┤
│ Input Pane         │ 3D Viewer                       │
│ (30–40% width)     │ (60–70% width)                  │
│                    │                                  │
│ Form fields,       │ 3D canvas                        │
│ parameters,        │                                  │
│ selection controls │  Node count: 142                 │
│                    │  [View: Solid] [Wireframe]       │
│                    │  [STL Export]                     │
├────────────────────┴────────────────────────────────┤
│ Sticky Footer                                        │
└─────────────────────────────────────────────────────┘
```

- Viewer pane height: calc(100vh - header height - footer height)
- Input pane scrolls independently if content overflows
- Resize handle between panes (optional stretch goal, not required for UI-3)

### Viewer Chrome (Minimal)

- Node / element count displayed as supplementary info text
- View controls (rotate/pan/zoom) are viewer-native (unchanged)
- GPU / WebGL info: moved entirely to TechnicalDetails component (collapsed by default)
- Model update trigger: when input changes, viewer re-renders from canonical data (unchanged data path)

### Tablet (600–1023px)

```
┌─────────────────────┐
│ Header               │
├─────────────────────┤
│ Input Pane           │
│ (full width, top)    │
├─────────────────────┤
│ 3D Viewer            │
│ (full width, bottom) │
├─────────────────────┤
│ Sticky Footer        │
└─────────────────────┘
```

- Input and viewer stack vertically
- 50/50 height split recommended; user can scroll each section

### Mobile (<600px)

- Tab bar at bottom or top: 「入力」 | 「3D確認」
- Only active tab content visible
- Tab state preserved when switching between input and 3D

## Data Source Guarantee

- Viewer3D reads from canonical bridgeStructure model (same as STL export)
- No independent data path for viewer visualization
- STL and on-screen viewer render from identical geometry kernel output
- Canonical checksum and STALE status unchanged

### Implementation

- New: `frontend/src/apollo/components/WorkspaceLayout.tsx` — 2-pane container
- New: `frontend/src/apollo/components/ViewerPane.tsx` — viewer wrapper with chrome
- New: `frontend/src/apollo/components/InputPane.tsx` — input area wrapper
- Update: `frontend/src/apollo/ApolloPhase1Shell.tsx` — layout mode switch
- CSS: workspace-*, viewer-pane-*, input-pane-* rules in styles.css
- Viewer3D internal logic: NOT MODIFIED
- Visualization model, STL generation, quantity pipelines: NOT MODIFIED