# Performance Architecture

## Purpose

Describe architectural strategies to keep liner editing responsive: worker offload, memoization, incremental compute, and render throttling.

**Status: Draft** — not implementation-ready until MVP main-thread baseline is profiled.

## Scope

- Thread/worker boundaries.
- Caching and memoization policies.
- Debouncing integration with [recalculation_policy.md](recalculation_policy.md).
- Render throttling for canvas views.

## Out of Scope

- Specific numeric limits ([performance_limits.md](performance_limits.md)).
- Backend scaling.

## Assumptions

- **MVP:** Main-thread TypeScript pipeline with debounce; no backend geometry ([calculation_pipeline.md](calculation_pipeline.md)).
- Immutable intermediate snapshots simplify React memoization.
- Web Worker added only if profiling exceeds [performance_limits.md](performance_limits.md) soft targets.

## Design Topics

### 1. MVP threading

| Component | MVP location |
| --- | --- |
| `runPipeline()` | Main thread, debounced |
| `mapToFrameModel()` | Main thread, on user action |
| FastAPI | Schema validation only |

### 2. Post-MVP worker wrapper

- `runPipeline()` in Web Worker with transferable arrays for large grids.
- Memoize `sampledPoints` by segment hash + spacing.

### 3. Render throttling

- RequestAnimationFrame batching for canvas redraw.
- Avoid deep clone of domain on every keystroke.

### 4. Backend

- No Python geometry port in MVP.
- Future export service may consume serialized intermediate JSON without re-running geometry.

## Open Questions

- SharedArrayBuffer availability in Electron context?

## Related Documents

- [performance_limits.md](performance_limits.md)
- [recalculation_policy.md](recalculation_policy.md)
- [calculation_pipeline.md](calculation_pipeline.md)
- [integration_with_frame_model.md](integration_with_frame_model.md)
- [rendering_strategy.md](rendering_strategy.md)

## Pre-Implementation Checklist

- [x] MVP threading strategy: main thread documented.
- [ ] Profiling hooks in pipeline stages.
- [ ] Performance regression test optional in CI.
