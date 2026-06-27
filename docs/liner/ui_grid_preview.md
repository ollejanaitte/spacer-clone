# Liner Grid Preview

## Purpose

Define the Phase2 P2-5 read-only 2D preview for `/pro/liner/preview`.

## Scope

- Replace the preview placeholder with a read-only SVG preview page.
- Compute a `CanonicalLinerIntermediateResult` from the current setup draft through a preview adapter.
- Render axis samples, grid lines, grid points, summary counts, and diagnostics.
- Keep geometry and station computation out of React components.

## Out of Scope

- Canvas direct editing, point dragging, snapping, and selection edits.
- Pan/zoom persistence or advanced viewport controls.
- Mapping review, Viewer3D, ProjectModel merge, and headless validation.
- Changing Geometry Core, Intermediate Result, mapper, schema, or headless behavior.

## Route

| Route id | Path | Purpose |
| --- | --- | --- |
| `liner.preview` | `/pro/liner/preview` | Read-only 2D grid preview from the current local draft. |

The setup page may navigate to preview. Preview can navigate back to setup, list, or the main workspace.

## Data Boundary

| Data | P2-5 behavior |
| --- | --- |
| `BuildIntermediateInput` draft | Owned by the app shell while the liner workflow is open. |
| `buildIntermediateResult()` | Called only inside `frontend/src/liner/adapters/linerPreviewAdapter.ts`. |
| `CanonicalLinerIntermediateResult` | Adapter input for view-model projection; React components do not recompute geometry. |
| Preview view model | SVG-ready axis/grid/diagnostic data derived from the intermediate result. |
| Project model | Not mutated in P2-5. |

## Adapter Boundary

Allowed P2-5 adapter responsibilities:

- Call `buildIntermediateResult(draft)`.
- Project intermediate axis samples and grid data into a screen-space SVG view model.
- Convert diagnostics to display rows.
- Guard preview-only unsafe numeric inputs before calling the pipeline when an input would otherwise prevent preview rendering; emit a diagnostic such as `LINER_GRID_SPACING_INVALID` instead of changing Geometry Core.
- Preserve a read-only preview contract.

Disallowed P2-5 adapter responsibilities:

- Changing core geometry, station, grid, mapper, schema, or headless behavior.
- Mapping to frame model or attaching project extensions.
- Mutating the draft.
- Reading React state or DOM state.

## UI Behavior

- `LinerPreviewPage` renders route chrome, preview summary, diagnostics, and `LinerGridPreview`.
- `LinerGridPreview` is a read-only SVG component consuming the adapter view model only.
- The preview uses the current local draft from `App` state; if no user edits have occurred, it uses the default draft.
- Diagnostics are displayed as code/message rows; untranslated core codes may fall back to the code string.
- Feature-specific user-visible strings live under `ja.liner.*`; generic navigation strings may reuse existing liner/common keys.
- CSS selectors use global `liner-*` kebab-case classes in `frontend/src/styles.css`.

## Human Review Required

| Fact | Decision needed |
| --- | --- |
| P2-5 computes preview eagerly on route render. | Decide whether later UX should require an explicit compute action and stale state. |
| Preview is read-only SVG without pan/zoom controls. | Decide when rendering_strategy.md open pan/zoom items enter scope. |
| Diagnostics use best-effort labels. | Decide the complete diagnostic i18n map before production validation UX. |
