# Liner Station and Profile Input

<!-- DOC-AUTHORITY:START -->
> **Authority:** ACTIVE REFERENCE
> Current implementation facts are governed by [`../../scoping/stage4_road_design_scope.md`](../../scoping/stage4_road_design_scope.md). Target ownership and contracts are governed by [`../../planning/stage6-10/README.md`](../../planning/stage6-10/README.md); `RoadDesignDocument` is the target road source of truth.
<!-- DOC-AUTHORITY:END -->

## Purpose

Define the Phase2 P2-4 station and profile input panel used by `/pro/liner/setup`.

## Scope

- Add a setup-page panel for station origin, interval, explicit station distances, station equations, sample interval, offsets, and computation-backed flat profile elevation `z`.
- Keep station/profile input as local draft state until a later compute/review task.
- Route all draft mutations through `frontend/src/liner/adapters/linerUiAdapter.ts`.

## Out of Scope

- Computing or previewing the generated station table.
- Calling `generateStations()`, `buildIntermediateResult()`, vertical geometry helpers, mapper, schema, or headless APIs from React.
- Multi-segment vertical profile editing. Current pipeline input supports only scalar `z`.
- Persisting station/profile drafts into `project.liner`.

## Data Boundary

| Draft field | P2-4 behavior |
| --- | --- |
| `stationDefinition.originDisplayedStation` | Scalar numeric form field. |
| `stationDefinition.interval` | Scalar numeric form field. |
| `stationDefinition.explicitStations` | Editable numeric list of physical distances. |
| `stationDefinition.equations` | Editable row table for id, physical distance, type, value, and sort index. |
| `sampleInterval` | Scalar numeric form field. |
| `offsets` | Editable numeric list. |
| `z` | Flat profile elevation; only computation-backed vertical input in P2-4. |

Computed `StationTableResult` remains a later preview/compute concern and must not be confused with input rows.

## Adapter Boundary

Allowed P2-4 adapter responsibilities:

- Add, update, and remove explicit station distances.
- Add, update, and remove station equation rows.
- Add, update, and remove offset values.
- Preserve immutable `BuildIntermediateInput` draft updates.
- Assign stable local row ids and sort indexes.

Disallowed P2-4 adapter responsibilities:

- Calling station generation, geometry, pipeline, mapper, schema, or headless functions.
- Validating station equation semantics beyond keeping editable draft shape.
- Creating intermediate station output.

## UI Behavior

- `LinerEditPage` owns draft state and renders `LinerStationProfilePanel`.
- The panel edits station/profile inputs and calls `onDraftChange(nextDraft)`.
- Equation `type` uses the existing domain values: `add_constant` and `reset_to_value`.
- Flat `z` is labeled as the profile value supported by the current pipeline.
- Feature-specific user-visible strings live under `ja.liner.*`; generic row add/remove actions reuse `ja.common.addRow` and `ja.common.removeRow`.
- CSS selectors use global `liner-*` kebab-case classes in `frontend/src/styles.css`.

## Human Review Required

| Fact | Decision needed |
| --- | --- |
| Vertical input is limited to flat `z`. | Decide when the documented grade/parabolic vertical alignment model becomes pipeline input. |
| P2-4 does not compute station table output. | Decide whether P2-5 preview or P2-6 review should first surface computed station diagnostics. |
| Numeric validation remains light. | Decide UX rules for invalid/empty station equation values before production use. |
