# Recalculation Policy

<!-- DOC-AUTHORITY:START -->
> **Authority:** ACTIVE REFERENCE
> Current implementation facts are governed by [`../../scoping/stage4_road_design_scope.md`](../../scoping/stage4_road_design_scope.md). Target ownership and contracts are governed by [`../../planning/stage6-10/README.md`](../../planning/stage6-10/README.md); `RoadDesignDocument` is the target road source of truth.
<!-- DOC-AUTHORITY:END -->

## Purpose

Define when and how computed intermediate results are invalidated and recomputed after domain edits, import, or settings changes. Behavior complements [line_dependency_graph.md](line_dependency_graph.md).

## Scope

- Full recompute vs. partial subtree recompute.
- Debouncing for rapid UI edits.
- Stale result handling in UI and export.
- Comparison of `sourceRevision` for cache hits.
- Undo/redo interaction examples.

## Out of Scope

- Undo/redo stack mechanics ([undo_redo_spec.md](../ui/undo_redo_spec.md)).
- Background worker implementation ([performance_architecture.md](performance_architecture.md)).

## Assumptions

- User expects near-real-time plan view updates for typical project sizes.
- **MVP:** Full pipeline recompute on any geometry-affecting edit; partial optimization deferred.
- Exports blocked while results are stale or computing.
- MVP pipeline runs on main thread with debounce; Web Worker optional later.

## Design Topics

### 1. Edit classification → invalidation

Uses [line_dependency_graph.md](line_dependency_graph.md). Material-only edits skip geometry stages and re-run mapper only.

### 2. Debounce rules

| Edit type | Debounce | Recompute |
| --- | --- | --- |
| Text field (numeric) | 300 ms | Full or partial per graph |
| Segment add/delete | Immediate | Full |
| Station equation | Immediate | stations + downstream |
| Undo/redo | Immediate | Full from restored domain |
| Import | Immediate | Full |

### 3. State flags

| State | Meaning | Export | Frame generate |
| --- | --- | --- | --- |
| `computing` | Pipeline in flight | Blocked | Blocked |
| `ready` | Matches current domain | Allowed | Allowed |
| `stale` | Domain changed since last compute | Blocked | Blocked |
| `error` | Last compute failed | Blocked | Blocked |

### 4. Failed recompute

Retain **last good** intermediate snapshot; show error diagnostics. UI marks views stale/error overlay.

### 5. Undo/redo examples

| Action | Snapshot behavior |
| --- | --- |
| Numeric edit undone | Restore domain from undo stack → recompute → new intermediate (may match previous if same values) |
| Line deletion undone | Full recompute; no intermediate cache reuse unless `sourceRevision` matches |
| Station equation edit undone | Recompute stations + grid; verify displayed stations match pre-edit golden |
| Generation setting edit undone | If geometry unchanged, mapper-only regen from cached intermediate |

Cached intermediate reuse allowed only when `sourceRevision` hash matches restored domain exactly.

### 6. Coalesced recompute

Multiple edits in one animation frame → single pipeline run with union of invalidations.

## Open Questions

- Cancel in-flight computation when new edit arrives?
- Web Worker for pipeline in browser?

## Related Documents

- [line_dependency_graph.md](line_dependency_graph.md)
- [calculation_pipeline.md](calculation_pipeline.md)
- [intermediate_result_model.md](intermediate_result_model.md)
- [state_management.md](../ui/state_management.md)
- [undo_redo_spec.md](../ui/undo_redo_spec.md)
- [input_ui_behavior.md](../ui/input_ui_behavior.md)
- [performance_architecture.md](performance_architecture.md)

## Pre-Implementation Checklist

- [x] MVP policy: full recompute on geometry edits documented.
- [x] Debounce rules per edit type documented.
- [x] Stale UI indicators specified.
- [x] Undo/redo examples added.
- [ ] Export gating on `ready` state confirmed in UI spec.
