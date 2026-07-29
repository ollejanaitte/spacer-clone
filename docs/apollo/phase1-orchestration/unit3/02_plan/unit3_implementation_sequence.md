# Apollo Phase 1-NN Unit 3 Implementation Sequence

## Sequence Verdict

The recommended order remains the same as the post-audit initial proposal.

## Order

1. `U3-A` Project CRUD
2. `U3-I` 未保存変更ガード
3. `U3-C` Undo / Redo
4. `U3-D` Multi Select
5. `U3-E` Copy / Paste
6. `U3-F` Bulk Edit
7. `U3-G` Search / Filter
8. `U3-H` Validation Navigator
9. `U3-B` Import / Export

## Rationale

### `U3-A` before all others

- Establishes the active project / snapshot distinction
- Defines the persistence boundary used by guard, history, and import/export

### `U3-I` before history-heavy features

- Dirty and close semantics must be frozen before adding more mutation paths
- Every later feature mutates Apollo state and must obey the same guard contract

### `U3-C` before selection-driven productivity

- Undo/redo transaction boundaries constrain paste, bulk edit, and import semantics

### `U3-D` before clipboard and bulk edit

- Copy/paste and bulk edit require a formal multi-selection model

### `U3-E` before `U3-F`

- Clipboard remap defines one of the largest multi-entity transactions and should stabilize before batch editing

### `U3-F` before `U3-G` and `U3-H`

- Bulk edit relies on selection and history, but not on search/filter or navigator

### `U3-G` before `U3-H`

- Validation Navigator must define behavior when issues are filtered or the target row is hidden

### `U3-B` last

- Import/export touches persistence, history reset, validation, selection reset, and dirty guards
- Deferring it reduces rework while upstream contracts stabilize

## Sequence Guardrails

- No package may weaken the existing numeric execution or publication guards
- Each package must leave `./start` and `./start-windows.ps1` green
- Each package must pass Unit 2 regression tests before the next package starts

## Milestones

- Milestone 1: `U3-A` + `U3-I`
  Draft lifecycle and loss-prevention baseline frozen
- Milestone 2: `U3-C` + `U3-D` + `U3-E`
  Core productivity primitives frozen
- Milestone 3: `U3-F` + `U3-G` + `U3-H`
  High-efficiency editing and issue navigation frozen
- Milestone 4: `U3-B`
  Deterministic interchange and final completion gate
