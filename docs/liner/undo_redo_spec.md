# Undo and Redo Specification

## Purpose

Define undo/redo behavior for liner domain edits, scope of reversibility, and interaction with recalculation and export.

## Scope

- Undo stack for domain model mutations.
- Coalescing rapid edits into single undo steps.
- Redo stack invalidation on new edits.
- Boundaries: what is not undoable (export, compute cache).

## Out of Scope

- Global application undo across frame editor and liner unless explicitly unified.
- Undo for analysis runs.

## Assumptions

- Undo restores domain state; pipeline re-runs automatically after undo ([recalculation_policy.md](recalculation_policy.md)).
- Stack depth limit (e.g., 100 steps) acceptable for MVP.

## Design Topics

- Command pattern: `{ type, payload, inverse }` per edit.
- Coalesce: consecutive numeric field changes within 1 s → one undo step.
- Undo/redo keyboard shortcuts consistent with app (i18n labels in menu).
- Clear redo on new edit after undo.
- Not undoable: file save path change, export file written.
- Optional: undo for delete with restore by id.

### Recalculation interaction (examples)

See [recalculation_policy.md](recalculation_policy.md) §5 for full table. Summary:

| User action | Domain | Intermediate result |
| --- | --- | --- |
| Undo numeric radius edit | Restored | Recomputed; may match pre-edit if values equal |
| Undo segment deletion | Segment restored | Full pipeline recompute |
| Undo station equation | Equation removed | Stations + grid recomputed |
| Undo material rule change | Settings restored | Mapper-only if `sourceRevision` unchanged |

Redo invalidates when new edit occurs after undo.

## Open Questions

- Shared undo history with main project editor when liner embedded?
- Persist undo stack across session (likely no)?

## Related Documents

- [state_management.md](state_management.md)
- [input_ui_behavior.md](input_ui_behavior.md)
- [recalculation_policy.md](recalculation_policy.md)

## Pre-Implementation Checklist

- [ ] Undoable action list complete.
- [ ] Coalescing rules documented.
- [ ] Post-undo pipeline trigger confirmed.
- [ ] Stack limit and memory impact noted.
