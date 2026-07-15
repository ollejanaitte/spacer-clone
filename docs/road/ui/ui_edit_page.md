# Liner Edit Page

<!-- DOC-AUTHORITY:START -->
> **Authority:** ACTIVE REFERENCE
> Current implementation facts are governed by [`../../scoping/stage4_road_design_scope.md`](../../scoping/stage4_road_design_scope.md). Target ownership and contracts are governed by [`../../planning/stage6-10/README.md`](../../planning/stage6-10/README.md); `RoadDesignDocument` is the target road source of truth.
<!-- DOC-AUTHORITY:END -->

## Purpose

Define the Phase2 P2-3 form-centered edit surface for `/pro/liner/setup`.

## Scope

- Replace the setup placeholder with an embedded pro-route editor.
- Edit an in-memory `BuildIntermediateInput` draft for alignment metadata, station settings, sample settings, offsets, and straight alignment elements.
- Keep React components separated from liner geometry and mapping modules through `frontend/src/liner/adapters/linerUiAdapter.ts`.
- Provide draft summary and draft-level local editing only.

## Out of Scope

- Persisting editable liner domain data into `project.liner`.
- Running `buildIntermediateResult()`, `mapToFrameModel()`, or `createHeadlessLinerFrameProject()`.
- Arc/clothoid-specific editing beyond preserving existing draft data.
- Canvas direct manipulation, station/profile advanced tables, 2D preview, and Viewer3D connection.
- JIP-LINER screen, wording, icon, report, or file format imitation.

## Route

| Route id | Path | Purpose |
| --- | --- | --- |
| `liner.setup` | `/pro/liner/setup` | Form editor for a local liner draft. |

The page remains inside the existing pro workspace shell. Closing returns to `/pro`; returning to the list navigates to `/pro/liner`.

## Data Boundary

P2-3 edits a local draft only. The current `project.liner` schema field is integration metadata, not a complete editable domain registry.

| Data | P2-3 behavior |
| --- | --- |
| `BuildIntermediateInput` | Draft source for form fields. |
| `LinearAlignment` | Metadata and alignment elements are edited through adapter helpers. |
| `StationDefinition` | Origin station and interval are edited through adapter helpers. |
| `offsets`, `sampleInterval`, `z` | Edited as numeric draft settings. |
| Intermediate result | Not computed in P2-3. |
| Project model | Not mutated in P2-3. |

## Adapter Boundary

React components must not import geometry primitives or call liner core functions directly.

Allowed P2-3 adapter responsibilities:

- Create a conservative default draft.
- Normalize numeric input into immutable draft updates.
- Add and remove straight alignment elements.
- Summarize raw draft counts and declared lengths.

Disallowed P2-3 adapter responsibilities:

- Calling `validateAlignment()`, `totalAlignmentLength()`, `evaluateAlignmentAtDistance()`, or other geometry helpers.
- Creating `CanonicalLinerIntermediateResult`.
- Mapping to frame model or attaching project extensions.

## UI Behavior

- The setup route renders a form page instead of the P2-2 reserved route placeholder.
- Metadata fields edit `alignment.id`, `alignment.linerModelId`, and `alignment.coordinatePolicyId`.
- Station/profile fields are delegated to `LinerStationProfilePanel` in P2-4.
- Station fields edit `originDisplayedStation`, `interval`, explicit station distances, station equations, `sampleInterval`, and flat `z`.
- Offset fields edit a numeric list in draft state.
- The alignment table supports straight element rows in the MVP.
- Unsupported arc/clothoid rows, if supplied by a future draft source, are preserved and shown as non-editable for type-specific fields.
- The page shows a draft summary based only on raw draft values.
- Feature-specific user-visible strings live under `ja.liner.*`; generic row add/remove actions reuse `ja.common.addRow` and `ja.common.removeRow`.
- CSS selectors use global `liner-*` kebab-case classes in `frontend/src/styles.css`.

## Human Review Required

| Fact | Decision needed |
| --- | --- |
| Editable domain persistence is not implemented. | Decide the durable storage model for LINER drafts before save/load behavior is added. |
| P2-3 supports straight element form editing only. | Decide when arc and clothoid specific form controls enter the UI scope. |
| Station/profile inputs are implemented as a setup-page panel in P2-4. | Decide when computed station table preview and multi-segment vertical profile input are added. |
