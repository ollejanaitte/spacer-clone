# State Management

<!-- DOC-AUTHORITY:START -->
> **Authority:** ACTIVE REFERENCE
> Current implementation facts are governed by [`../../scoping/stage4_road_design_scope.md`](../../scoping/stage4_road_design_scope.md). Target ownership and contracts are governed by [`../../planning/stage6-10/README.md`](../../planning/stage6-10/README.md); `RoadDesignDocument` is the target road source of truth.
<!-- DOC-AUTHORITY:END -->

## Purpose

Define how liner session state is organized: domain input, computed caches, UI view state, and persistence boundaries.

## Scope

- State partitions and ownership.
- Read/write rules per layer.
- Synchronization with main application project state.
- Serialization boundaries on save/load.

## Out of Scope

- Specific state library choice (Zustand, Redux, etc.) — implementation detail.
- Global app auth or settings.

## Assumptions

- Domain state is user-mutable; intermediate results are system-computed.
- UI view state is not persisted in liner project file by default.
- Single liner editor instance per app project unless multi-doc explicitly scoped.

## Design Topics

- State slices: `domain`, `intermediate`, `ui`, `async` (computing, errors).
- Selectors for derived UI data (never duplicate geometry math in selectors).
- Load flow: domain from file → trigger pipeline → populate intermediate.
- Integration with existing project store / API client patterns in frontend.

## Open Questions

- Centralized store module path: `frontend/src/liner/state/`?
- Optimistic UI for domain edits before validation completes?
- Share undo stack with main frame editor or isolated?

## Related Documents

- [domain_model.md](../design/domain_model.md)
- [intermediate_result_model.md](../design/intermediate_result_model.md)
- [recalculation_policy.md](../design/recalculation_policy.md)
- [undo_redo_spec.md](undo_redo_spec.md)
- [project_file_format.md](../legacy-integration/project_file_format.md)

## Pre-Implementation Checklist

- [ ] State slice diagram drawn.
- [ ] Persist vs. ephemeral fields listed.
- [ ] Store API sketch (actions: editDomain, runPipeline, setSelection).
- [ ] No geometry computation in UI components confirmed as rule.
