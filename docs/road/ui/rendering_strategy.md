# Rendering Strategy

<!-- DOC-AUTHORITY:START -->
> **Authority:** ACTIVE REFERENCE
> Current implementation facts are governed by [`../../scoping/stage4_road_design_scope.md`](../../scoping/stage4_road_design_scope.md). Target ownership and contracts are governed by [`../../planning/stage6-10/README.md`](../../planning/stage6-10/README.md); `RoadDesignDocument` is the target road source of truth.
<!-- DOC-AUTHORITY:END -->

## Purpose

Define how plan and profile views render alignment and grid geometry from intermediate results without recomputing core geometry in the viewer layer.

## Scope

- 2D canvas technology (SVG or Canvas2D).
- Data binding: intermediate result → drawable primitives.
- Zoom, pan, fit-to-extents.
- Highlighting selected entities and hover station readout.
- Resampling contract (fixed intermediate samples).

## Out of Scope

- New Three.js liner renderer — **post-MVP** (glTF export not in near-term scope; see D-LINER-007 in [design_workflow.md](../design/design_workflow.md)). P2-6 reuses existing `Viewer3D` with a generated `ProjectModel`.
- CAD export rendering ([cad_output_spec.md](../output/cad_output_spec.md)).

## Assumptions

- Renderer is a pure function of intermediate snapshot + UI view state.
- Performance adequate for ≤ 10k grid points ([performance_limits.md](../design/performance_limits.md)).
- Uses `horizontal.sampledPoints` and `grid.points` only — **no ad-hoc re-sampling**.

## Design Topics

### 1. Data contract

| Layer | Source |
| --- | --- |
| Axis polyline | `horizontal.sampledPoints` |
| Grid markers | `grid.points` |
| Profile curve | `vertical.sampledPoints` |
| Station readout | `displayedStation`, `physicalDistance` from pick result |

Changing polyline density requires pipeline re-run ([intermediate_result_model.md](../design/intermediate_result_model.md) §14).

### 2. Canvas layers

Draw order: axis polyline → segment boundaries → grid points → labels → profile curve.

### 3. Coordinate transform

World meters → screen pixels; Y flip for canvas coordinates.

### 4. Computing state

Low-detail or dimmed display while `computing`; show last good snapshot under stale overlay.

### 5. P1-6 UI state vs renderer input (preparation)

| State | Owner | Renderer may read? |
| --- | --- | --- |
| Zoom, pan, selection, panel visibility | UI (`draft` / view state) | Yes — view transform only |
| `LinerIntermediateResult` | linerCore (computed) | Yes — geometry source |
| Domain input | project | **No** — pipeline only |
| Mapper / headless output | linerMapper / headless | **No** — not for 2D canvas |

Grid preview panel (`gridPreview`) binds to `intermediate` + UI view state via adapter types in `frontend/src/liner/uiPreparation.ts`. See [ui_preparation.md](ui_preparation.md).

Mapping review uses mapper/headless output only after the adapter has converted it into a standard `ProjectModel` for existing `Viewer3D`; React components do not pass liner intermediate/grid objects to the viewer.

## Open Questions

- Reuse 2D patterns from [docs/frame/viewer/09_3d_view_spec.md](../../frame/viewer/09_3d_view_spec.md)?
- Label collision avoidance for dense grids?

## Related Documents

- [intermediate_result_model.md](../design/intermediate_result_model.md)
- [cad_output_spec.md](../output/cad_output_spec.md)
- [ui_window_spec.md](ui_window_spec.md)
- [ui_grid_preview.md](ui_grid_preview.md)
- [ui_mapping_review.md](ui_mapping_review.md)
- [performance_architecture.md](../design/performance_architecture.md)
- [recalculation_policy.md](../design/recalculation_policy.md)

## Pre-Implementation Checklist

- [x] Renderer input contract: no domain access, no re-sampling.
- [x] UI vs computed state boundary documented (P1-6).
- [ ] Zoom/pan behavior documented in UI spec.
- [ ] Performance smoke test with large grid planned.
