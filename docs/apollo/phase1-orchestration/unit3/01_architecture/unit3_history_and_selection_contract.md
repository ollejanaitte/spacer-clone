# Apollo Phase 1-NN Unit 3 History and Selection Contract

## 1. History Model

Unit 3 adopts a bounded snapshot history for the Apollo sidecar draft.

### Chosen Model

- Snapshot model: YES
- Command-object replay: NO

### Rationale

- Current Apollo mutations already operate by rewriting the normalized draft and then rebuilding `ProjectModel`.
- Snapshot history is deterministic and easier to test against save/load/import boundaries.
- Unit 3 does not require cross-route replay or partial command recovery.

## 2. History Scope

- Applies only to Apollo draft mutations
- Excludes numeric state, LINER state, and non-Apollo routes
- Excludes browser-native text-field undo from completion evidence

## 3. Transaction Boundaries

Each of the following creates exactly one history entry:

- single field commit that leaves edit mode
- add entity
- delete entity
- duplicate entity
- reorder action
- paste action
- bulk edit apply

The following do not create history entries:

- search query changes
- filter changes
- validation navigation
- blocked actions
- guard prompt cancellation

The following reset history without creating a new history entry:

- successful import
- explicit new draft creation
- successful workspace open

## 4. History Limit

- Limit: 50 Apollo transactions per active project
- When the limit is exceeded, discard the oldest transaction only
- The current saved checkpoint marker may move out of the retained history without corrupting dirty calculation

## 5. Undo / Redo Rules

- Undo reverses the most recent transaction
- Redo reapplies the most recently undone transaction
- A new successful mutation clears redo history immediately
- Redo is unavailable after project switch, import, or new draft creation

## 6. Save Boundary

- Save does not clear history
- Save marks the current history position as the saved checkpoint
- Undo back to the saved checkpoint clears dirty
- Undo past the saved checkpoint sets dirty back to `true`

## 7. Import Boundary

- Successful import replaces active draft, resets undo and redo, clears selection, clears clipboard, and sets a new saved checkpoint
- Failed import creates no history entry and changes nothing

## 8. Project Switch Boundary

- Successful workspace open resets undo and redo
- Canceled or blocked switch resets nothing
- Successful new draft creation resets undo and redo

## 9. Selection Model

### Primary Rules

- Selection stores ordered entity references, not row indexes
- Supported entity kinds: `node`, `member`, `support`, `material`
- Mixed-kind multi-selection is allowed for shared actions only when explicitly permitted by the bulk-edit contract

### Keyboard Rules

- `Ctrl` / `Meta`: additive toggle selection
- `Shift`: contiguous range selection within the current table only
- `Ctrl/Cmd+A`: select all visible rows in the current Apollo table only

### Reset Rules

- Project switch: clear selection
- Successful import: clear selection
- New draft: clear selection
- Delete of selected entity: remove deleted entity ids from selection

## 10. Filter Interaction

- Filtering does not mutate stored selection directly
- If a selected entity becomes hidden by a filter, its selection remains stored but is not counted as visible
- Bulk actions operate only on visible selected entities unless the specific action explicitly supports hidden selected entities
- Clearing filters restores visibility for still-valid selected entities

## 11. Viewer Synchronization

- Viewer remains a single-focus consumer
- When the Apollo selection contains exactly one viewer-compatible entity, viewer focus mirrors it
- When the Apollo selection contains zero or multiple viewer-compatible entities, viewer focus is cleared
- Viewer interaction may set the primary focus but may not create a multi-selection by itself

## 12. Clipboard Interaction

- Copy consumes the current eligible selection order
- Paste creates one history transaction
- Invalid paste creates no history transaction

## 13. Numeric Scope Guard

History entries, selection state, and clipboard payloads may not contain:

- solver outputs
- result publications
- numeric evidence artifacts
