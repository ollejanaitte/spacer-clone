# Rendering Strategy

## Purpose

Define how plan and profile views render alignment and grid geometry from intermediate results without recomputing core geometry in the viewer layer.

## Scope

- 2D canvas technology (SVG or Canvas2D).
- Data binding: intermediate result → drawable primitives.
- Zoom, pan, fit-to-extents.
- Highlighting selected entities and hover station readout.
- Resampling contract (fixed intermediate samples).

## Out of Scope

- Full Three.js 3D liner preview — **post-MVP** (glTF export not in near-term scope; see D-LINER-007 in [design_workflow.md](design_workflow.md)).
- CAD export rendering ([cad_output_spec.md](cad_output_spec.md)).

## Assumptions

- Renderer is a pure function of intermediate snapshot + UI view state.
- Performance adequate for ≤ 10k grid points ([performance_limits.md](performance_limits.md)).
- Uses `horizontal.sampledPoints` and `grid.points` only — **no ad-hoc re-sampling**.

## Design Topics

### 1. Data contract

| Layer | Source |
| --- | --- |
| Axis polyline | `horizontal.sampledPoints` |
| Grid markers | `grid.points` |
| Profile curve | `vertical.sampledPoints` |
| Station readout | `displayedStation`, `physicalDistance` from pick result |

Changing polyline density requires pipeline re-run ([intermediate_result_model.md](intermediate_result_model.md) §14).

### 2. Canvas layers

Draw order: axis polyline → segment boundaries → grid points → labels → profile curve.

### 3. Coordinate transform

World meters → screen pixels; Y flip for canvas coordinates.

### 4. Computing state

Low-detail or dimmed display while `computing`; show last good snapshot under stale overlay.

## Open Questions

- Reuse 2D patterns from [docs/09_3d_view_spec.md](../09_3d_view_spec.md)?
- Label collision avoidance for dense grids?

## Related Documents

- [intermediate_result_model.md](intermediate_result_model.md)
- [cad_output_spec.md](cad_output_spec.md)
- [ui_window_spec.md](ui_window_spec.md)
- [performance_architecture.md](performance_architecture.md)
- [recalculation_policy.md](recalculation_policy.md)

## Pre-Implementation Checklist

- [x] Renderer input contract: no domain access, no re-sampling.
- [ ] Zoom/pan behavior documented in UI spec.
- [ ] Performance smoke test with large grid planned.
