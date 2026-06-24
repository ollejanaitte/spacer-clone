# Input UI Behavior

## Purpose

Specify interactive behavior for liner data entry: selection, editing, validation feedback, snap, and compute triggers.

## Scope

- Entity creation, edit, delete flows.
- Field-level validation and error display.
- Canvas interaction: pick segment, insert PI, drag vertex (if supported).
- Focus and tab order in property forms.
- Disabled states when computing or read-only.

## Out of Scope

- Low-level rendering ([rendering_strategy.md](rendering_strategy.md)).
- Geometry algorithms triggered outside pipeline.

## Assumptions

- Edits mutate domain state only; views refresh from intermediate results after pipeline.
- Validation messages use i18n keys with interpolated values.
- Destructive actions confirm via dialog (i18n strings).

## Design Topics

- Add horizontal segment: type picker → parameter form → append to chain.
- Station equation editor: table with add/remove rows.
- Grid definition wizard: spacing preview from current alignment length.
- Live validation on blur; blocking errors prevent export.
- Selection sync: tree ↔ canvas ↔ property panel.
- Snap to grid points, segment endpoints, station increments (TBD).

### Validation and compute gating

Per [validation_rules.md](validation_rules.md) and [error_handling.md](error_handling.md):

| Condition | Save | Compute | Export | Frame generate |
| --- | --- | --- | --- | --- |
| Field validation error on blur | Allowed | Blocked until fixed | Blocked | Blocked |
| Domain error on save | Blocked | Blocked | Blocked | Blocked |
| Compute in progress | Allowed | — | Blocked | Blocked |
| Stale intermediate (`stale`) | Allowed | Auto-trigger | Blocked | Blocked |
| Warning-only diagnostics | Allowed | Allowed | Allowed with badge | Allowed with confirm |

After edit introduces error: show **last good** intermediate with stale/error overlay; views remain navigable but export buttons disabled.

## Open Questions

- Direct canvas manipulation in MVP or form-only input?
- Multi-select for bulk delete?
- Autosave interval aligned with main app?

## Related Documents

- [ui_window_spec.md](ui_window_spec.md)
- [validation_rules.md](validation_rules.md)
- [recalculation_policy.md](recalculation_policy.md)
- [state_management.md](state_management.md)
- [undo_redo_spec.md](undo_redo_spec.md)

## Pre-Implementation Checklist

- [ ] Edit flows documented per entity type.
- [ ] Validation message i18n keys listed.
- [ ] Selection model defined.
- [ ] Export/generate buttons gated on validation + ready state.
