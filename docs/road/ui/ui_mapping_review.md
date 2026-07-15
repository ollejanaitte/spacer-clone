# Liner Mapping Review

<!-- DOC-AUTHORITY:START -->
> **Authority:** ACTIVE REFERENCE
> Current implementation facts are governed by [`../../scoping/stage4_road_design_scope.md`](../../scoping/stage4_road_design_scope.md). Target ownership and contracts are governed by [`../../planning/stage6-10/README.md`](../../planning/stage6-10/README.md); `RoadDesignDocument` is the target road source of truth.
<!-- DOC-AUTHORITY:END -->

## Purpose

Define the Phase2 P2-6 mapping review and Viewer3D confirmation route for `/pro/liner/mapping-review`.

## Scope

- Replace the mapping review placeholder with a workspace-embedded review page.
- Build a Viewer3D-ready `ProjectModel` from the current liner draft through a viewer adapter.
- Show mapping/headless summary counts and diagnostics before any project mutation.
- Commit the generated project only through an explicit user action.
- Reuse existing `frontend/src/viewer/Viewer3D.tsx`; do not create a new viewer.

## Out of Scope

- Editing mapping rows in-place.
- Viewer3D feature changes or a liner-specific 3D renderer.
- Import/export formats.
- Analysis execution after merge.
- Changing Geometry Core, Intermediate Result schema, FrameModelMapping schema, or project schema.

## Route

| Route id | Path | Purpose |
| --- | --- | --- |
| `liner.mappingReview` | `/pro/liner/mapping-review` | Review generated frame mapping and preview it in Viewer3D before explicit project merge. |

The setup and preview pages may navigate to mapping review. Mapping review can navigate back to preview, setup/list, or the main workspace.

## Data Boundary

| Data | P2-6 behavior |
| --- | --- |
| `BuildIntermediateInput` draft | Owned by `App` while the liner workflow is open. |
| `buildIntermediateResult()` | Called only inside `frontend/src/liner/adapters/linerViewerAdapter.ts`. |
| `createHeadlessLinerFrameProject()` | Called only inside `frontend/src/liner/adapters/linerViewerAdapter.ts`. |
| `FrameMappingResult` | Adapter-owned review data; React renders counts and trace samples only. |
| Viewer project | Adapter output `ProjectModel`; passed to existing `Viewer3D` for confirmation. |
| Project model mutation | Happens only when `App` receives an explicit confirm/open-in-viewer action and calls its existing project commit path. |

## Adapter Boundary

Allowed P2-6 adapter responsibilities:

- Build a canonical intermediate result from the draft.
- Apply the existing P1-5 headless fixture member rules and material/section allowlist before headless generation so Viewer3D receives a schema-valid project.
- Run headless frame project generation with the current project as `baseProject`.
- Create a generated-project copy of `baseProject` with schema-required headless analysis defaults filled when legacy project state omits them.
- Convert diagnostics to UI display rows.
- Summarize node/member/support/trace counts for review.
- Guard preview-only unsafe numeric inputs before calling the pipeline when an input would otherwise prevent review rendering; emit a diagnostic instead of changing Geometry Core.

Disallowed P2-6 adapter responsibilities:

- Mutating React state or committing the project.
- Reading DOM or Viewer3D state.
- Calling Viewer3D or Three.js APIs.
- Changing Geometry Core, mapper, schema, or headless behavior.

## UI Behavior

- `LinerMappingReviewPage` renders route chrome, Viewer3D, mapping summary, and diagnostics.
- The page uses `LinerViewerAdapterResult.viewerProject` as a read-only preview model until the user confirms.
- If validation is not ready or no project is available, the page shows diagnostics and disables merge/open-in-viewer actions.
- `Viewer3D` receives `result={null}` and the adapter-produced `ProjectModel` only.
- Feature-specific user-visible strings live under `ja.liner.mappingReview.*` and existing `ja.liner.actions.*`.
- CSS selectors use global `liner-*` kebab-case classes in `frontend/src/styles.css`.

## Human Review Required

| Fact | Decision needed |
| --- | --- |
| P2-6 commits the adapter-produced project as a whole via existing `commitProject`. | Decide in a later phase whether mapping review needs row-level include/exclude controls before merge. |
| Diagnostics still fall back to raw `LINER_*` codes when core diagnostics do not provide `messageKey`. | Decide the complete diagnostic i18n map before production validation UX. |
