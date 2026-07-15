# 08 UI Specification

<!-- DOC-AUTHORITY:START -->
> **Authority:** LEGACY / CURRENT IMPLEMENTATION REFERENCE
> This describes an MVP/current wire, engine, UI, or result design. It is not the target `BridgeFrameAnalysisDocument` or conceptual persisted result contract. Current capability is governed by [`../../scoping/stage5_frame_analysis_scope.md`](../../scoping/stage5_frame_analysis_scope.md), and target data and gaps by [`../../planning/stage6-10/target_data_model.md`](../../planning/stage6-10/target_data_model.md) and [`../../planning/stage6-10/stage10_gap_migration_sequence.md`](../../planning/stage6-10/stage10_gap_migration_sequence.md).
<!-- DOC-AUTHORITY:END -->

## 1. Purpose

This document defines the MVP screen composition and operation specification of the React UI. It follows the JIP-SPACER idea of separating input, rendering, execution, and report viewing, but is limited to the minimum Web UI required by the MVP.

## 2. Scope

- Top toolbar.
- Left model tree.
- Center 3D view.
- 2D fallback view.
- Right property panel.
- Bottom result / error / log panel.
- Tables for nodes, members, materials, sections, supports, and loads.
- Analysis execution screen.
- Result display screen.
- JSON / CSV export operations.

## 3. Out of Scope

- CAD-like drawing editing.
- Drag-and-drop member creation.
- Multi-window UI.
- Report template editing.
- DXF export operations.
- Screens for features outside the MVP such as influence lines, moving loads, eigenvalue, and response spectrum.
- License management screens.

## 4. Screen Specification

### Overall Layout

```text
+----------------------- Top Toolbar --------------------------+
| Left model tree | Center 3D view | Right property panel    |
+-----------------+----------------+--------------------------+
| Bottom: Results / Errors / Warnings / Logs panel            |
+--------------------------------------------------------------+
```

### Top Toolbar

Operations:

- New.
- Open.
- Save.
- Validate.
- Run analysis.
- Export JSON.
- Export CSV.
- Load sample.

Display:

- Project name.
- Unsaved state.
- Validation state.
- Analysis state.

### Left Model Tree

Items:

- Project.
- Nodes.
- Members.
- Materials.
- Sections.
- Supports.
- Load cases.
- Nodal loads.
- Member loads.
- Analysis settings.
- Results.

Selection behavior:

- The corresponding table or details are shown in the center or right side.
- Selecting an entity highlights it in the 3D view.

### Center 3D View

Follows `docs/frame/viewer/09_3d_view_spec.md`.

Display modes:

- `3D View`: the normal Three.js / WebGL view.
- `2D Fallback View`: a minimal 2D view used when Three.js initialization fails or when the user selects it.

Minimum scope of the 2D fallback:

- Nodes.
- Members.
- Rough representation of supports.
- Rough representation of nodal loads.
- Selection highlight.
- Fit to model.

The 2D fallback does not need to support:

- Advanced 3D camera controls.
- Detailed deformed shape.
- Full 3D load arrows.
- Member force diagrams.
- CAD editing.

### Display Compatibility Settings

- The current display mode is shown.
- The Electron build shows the current GPU compatibility mode.
- GPU compatibility modes are treated as app settings or desktop settings and are not stored in `project.json`.
- When WebGL initialization fails, the error is reported in the bottom Errors or Logs panel, and the center view switches to the 2D fallback.
- The error message includes the guidance "Please restart in compatibility rendering mode."
- `legacy-desktop-gl` is the last-resort compatibility mode and must not be advertised as the standard option.

### Right Property Panel

- Shows the details of the selected entity.
- Allows editing of fields that are awkward to edit in the table.
- Shows validation errors per field.
- Computed values such as member length may be shown read-only.

### Bottom Panel

Tabs:

- Results.
- Errors.
- Warnings.
- Logs.

Errors:

- Structured errors from the API, validation, and the engine.
- Clicking an error jumps to the relevant table row.

Results:

- Displacement table.
- Reaction table.
- Member end force table.
- Analysis summary.

### Input Tables

Common features:

- Add row.
- Delete row.
- Cell editing.
- Duplicate ID indicator.
- Reference picker.
- Unit display.

Node table:

- `id`, `x`, `y`, `z`, `label`

Member table:

- `id`, `nodeI`, `nodeJ`, `materialId`, `sectionId`, `orientationVector`, `orientationNode`, `label`

Material table:

- `id`, `name`, `elasticModulus`, `shearModulus`, `poissonRatio`, `density`

Section table:

- `id`, `name`, `area`, `iy`, `iz`, `j`

Support table:

- `nodeId`, `ux`, `uy`, `uz`, `rx`, `ry`, `rz`

Load tables:

- Load cases.
- Nodal loads.
- Member loads.

### Analysis Execution Screen

- Shows the validation state.
- Blocks execution when errors exist.
- Shows the target load case.
- Shows the running state.
- After completion, navigates to the result summary.

### Result Display Screen

- Filterable by load case.
- Filterable by node ID and member ID.
- Toggleable deformed shape.
- JSON / CSV export.

## 5. Error Handling

- Minor missing inputs may show a warning but still allow saving.
- Validation errors block analysis execution.
- API communication failures are shown in the bottom Logs and Errors panels.
- Errors must not be reported only in the browser console.
- WebGL initialization failures must not be reported only in the console; they must be reflected in the bottom panel and in the center view state.
- WebGL initialization failure must not crash the UI or show a blank screen.
- `NaN` and empty strings must not be sent to the API as numeric values.

## 6. Test Viewpoints

- The UI build succeeds.
- Each input table is displayed.
- Rows can be added, edited, and deleted.
- Invalid references are surfaced in the UI.
- The analysis run button is disabled or shows a failure when validation has errors.
- The displacement, reaction, and member end force tables are shown for a successful result.
- 3D view selection is coupled with the property panel.
- Three.js initialization failure switches to the 2D fallback.
- The displayed GPU compatibility mode matches the app or desktop setting.

## 7. Definition of Done

- Every MVP input item can be created and edited from the UI.
- The UI can connect to API validation and analysis execution.
- Result tables are displayed.
- No live entry point exists for features outside the MVP.
- The UI build standards in `docs/development/quality-gates.md` are satisfied.
