# UI Specification

## Purpose

The MVP UI is a minimal React application for editing `project.json`, running analysis, viewing results, and coordinating with the Three.js model view.

## Layout

The final UI uses five persistent regions:

- Top toolbar.
- Left model tree.
- Center 3D view.
- Right property panel.
- Bottom result, error, and log panel.

## Top Toolbar

Required actions:

- New project.
- Open project.
- Save project.
- Validate.
- Run analysis.
- Export JSON.
- Export CSV.
- Load example.

Toolbar must show:

- Project name.
- Validation status.
- Analysis status.
- Unsaved changes indicator.

## Left Model Tree

Tree sections:

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

Behavior:

- Selecting a tree item opens the relevant table or property panel.
- Selecting an entity highlights it in the 3D view where applicable.
- Errors link to tree items when possible.

## Center 3D View

The center region hosts the Three.js viewer defined in `docs/09_3d_view_spec.md`.

Required behavior:

- Display current model.
- Display selected load case.
- Display deformed shape when result data exists.
- Click selection updates right property panel.

## Right Property Panel

Responsibilities:

- Show selected entity fields.
- Allow editing scalar properties.
- Show validation errors for selected entity.
- Show read-only computed details where useful, such as member length.

MVP may use table row editing as the primary editor and property panel as a detail editor.

## Bottom Result, Error, and Log Panel

Tabs:

- Results.
- Errors.
- Warnings.
- Logs.

Behavior:

- Validation and analysis errors appear in Errors tab.
- Warnings appear separately and do not block result viewing.
- Logs show validation and analysis lifecycle events.
- Clicking an error navigates to the entity or field when possible.

## Data Tables

All tables must support:

- Add row.
- Delete row.
- Edit cell.
- Copy/paste basic tabular values.
- Row validation state.
- Entity ID uniqueness feedback.

### Node Table

Columns:

- `id`
- `x`
- `y`
- `z`
- `label`

### Member Table

Columns:

- `id`
- `nodeI`
- `nodeJ`
- `materialId`
- `sectionId`
- `orientationNode`
- `orientationVector`
- `label`

### Material Table

Columns:

- `id`
- `name`
- `elasticModulus`
- `shearModulus`
- `poissonRatio`
- `density`

### Section Table

Columns:

- `id`
- `name`
- `area`
- `iy`
- `iz`
- `j`

### Support Table

Columns:

- `nodeId`
- `ux`
- `uy`
- `uz`
- `rx`
- `ry`
- `rz`

### Load Table

MVP can split load editing into three tables:

- Load cases.
- Nodal loads.
- Member loads.

Load case columns:

- `id`
- `name`
- `type`

Nodal load columns:

- `id`
- `loadCaseId`
- `nodeId`
- `fx`
- `fy`
- `fz`
- `mx`
- `my`
- `mz`

Member load columns:

- `id`
- `loadCaseId`
- `memberId`
- `coordinateSystem`
- `type`
- `wx`
- `wy`
- `wz`

## Analysis Run Screen

The analysis run screen must show:

- Current validation status.
- Load cases to be analyzed.
- Run button.
- Solver name.
- Analysis progress state.
- Summary after completion.
- Warnings and errors.

Analysis must be blocked when validation has hard errors.

## Result Display Screen

Required result tables:

- Displacements.
- Reactions.
- Member end forces.
- Analysis summary.

Filtering:

- Load case.
- Node.
- Member.
- Component.

Sorting:

- By entity ID.
- By absolute component value.

## State Management

MVP state source of truth:

- Editable project state in React.
- Last validation result.
- Last analysis result.
- UI selection state.

Do not duplicate model logic in multiple stores.

## Accessibility and Usability

- Numeric inputs must clearly show units.
- Destructive actions require confirmation.
- Validation messages must be visible without opening browser console.
- Keyboard navigation in tables is preferred but not mandatory for MVP.

## Out of Scope

- Full CAD-like editing.
- Drag-to-create members.
- Multi-window layout.
- Report template designer.
- Authentication.
