# Apollo Phase 1-NN Unit 3 User Journeys

## Journey 1: Manage Apollo workspace drafts safely

Preconditions:

1. User launches the repository through the formal runtime path.
2. User enters `/pro/apollo`.

Steps:

1. Create a new Apollo draft.
2. Rename the draft.
3. Save a workspace snapshot.
4. Duplicate the snapshot.
5. Delete the duplicate after a confirmation prompt.

Expected outcomes:

- The active draft identity is explicit at each step.
- Snapshot ordering updates deterministically.
- Delete does not proceed without explicit confirmation.

## Journey 2: Import and export an Apollo JSON draft

1. Export the active Apollo draft through the JSON file bridge.
2. Edit the draft locally inside the Apollo UI.
3. Re-import the exported file.
4. Confirm that saved values return exactly.

Expected outcomes:

- Schema version is validated on import.
- Unknown, missing, duplicate, or broken-reference data is rejected fail-closed.
- Round-trip does not introduce new IDs or mutate unaffected values.

## Journey 3: Undo and redo a productivity session

1. Add or edit multiple Apollo entities.
2. Undo the last single-step edit.
3. Undo a multi-entity transaction such as paste or bulk edit.
4. Redo the same actions.
5. Perform a new edit after undo.

Expected outcomes:

- Undo and redo operate on transaction boundaries.
- A new edit clears redo history.
- History does not cross project switch or import boundaries.

## Journey 4: Multi-select and bulk action flow

1. Select one Apollo entity.
2. Add another selection with `Ctrl` / `Meta`.
3. Extend a contiguous table range with `Shift`.
4. Trigger a bulk action.

Expected outcomes:

- Selection state is visible and deterministic.
- Ineligible mixed selections block unsupported actions.
- Project switch clears selection state.

## Journey 5: Copy, paste, and remap references

1. Copy a supported Apollo selection.
2. Paste into the same active project.
3. Undo the paste.
4. Redo the paste.

Expected outcomes:

- Copied payload stays inside the Apollo internal clipboard.
- New entities receive remapped IDs.
- Internal references remap consistently.
- Invalid paste is rejected without partial mutation.

## Journey 6: Search and filter while preserving context

1. Search by entity ID.
2. Search by name.
3. Filter by entity type.
4. Clear all filters.

Expected outcomes:

- Counts update correctly.
- No-result state is explicit.
- Selected entities hidden by filter remain tracked according to the contract.

## Journey 7: Resolve validation issues through navigation

1. Create an invalid Apollo draft state.
2. Open the Validation Navigator.
3. Move to the first error.
4. Move to the next issue.
5. Fix the problem.
6. Re-run validation.

Expected outcomes:

- Each issue has a stable identity and target.
- Navigation transfers focus to the owning editor field.
- Stale issues disappear after successful revalidation.

## Journey 8: Guard unsaved changes

1. Dirty the Apollo draft.
2. Attempt to create a new draft.
3. Attempt to open a saved draft.
4. Attempt to leave `/pro/apollo`.
5. Attempt to close the Electron window.

Expected outcomes:

- The guard offers `Save`, `Discard`, and `Cancel`.
- Failed save keeps the user on the current draft.
- Returning to a saved state through undo clears dirty state.
