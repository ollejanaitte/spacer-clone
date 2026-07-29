# Apollo Phase 1-NN Unit 3 Persistence and Guard Contract

## 1. Persistence Surfaces

Unit 3 uses exactly two persistence surfaces:

1. File-backed Apollo draft JSON through the existing Electron dialog bridge
2. Local workspace snapshots through `localStorage`

No other persistence surface is introduced.

## 2. Project vs Workspace Snapshot

| Concept | Definition | Owner | Persistence |
| --- | --- | --- | --- |
| Active project | The current `ProjectModel` being edited on `/pro/apollo` | `App.tsx` | File-backed only when explicitly saved |
| Workspace snapshot | A local convenience copy of a project draft for quick reopen/duplicate/delete flows | Apollo workspace helper | `localStorage` only |

Rules:

- A workspace snapshot is not automatically authoritative.
- Opening a workspace snapshot replaces the active project only after guard approval.
- Saving a workspace snapshot does not replace the file-backed saved baseline unless a file save also succeeds.

## 3. File Import / Export Contract

- Supported format: repository JSON project payload carrying the Apollo sidecar draft
- Required schema handling:
  - Apollo sidecar schema version must match the accepted version or pass the explicit migration guard
  - Missing required fields fail closed
  - Duplicate ids fail closed
  - Broken references fail closed
- Unknown field policy:
  - Unknown top-level or Apollo-sidecar fields do not automatically imply success
  - If the current hydrator cannot prove compatibility, import fails closed

## 4. Save Destination and Overwrite Policy

- File save uses the existing native save dialog
- User chooses the destination path
- Overwrite behavior is delegated to the OS dialog confirmation
- Unit 3 adds no custom overwrite bypass

## 5. Dirty Source of Truth

- Dirty is derived from a saved baseline fingerprint of the normalized project payload
- Baseline updates only after:
  - successful file save
  - successful file load/import
  - explicit discard accepted by a guard path

Workspace snapshot save does not clear dirty by itself unless the final UI contract explicitly says it updates the saved baseline. Unit 3 freezes the default behavior as:

- workspace snapshot save: does not clear file-backed dirty state

## 6. Guarded Actions

The following actions must invoke the unsaved-changes guard when dirty:

- create new draft
- open workspace snapshot
- file import/open
- route leave from `/pro/apollo`
- Electron window close
- app quit

The guard presents exactly three branches:

- `Save`
- `Discard`
- `Cancel`

## 7. Guard Branch Rules

### Save

- Attempt file save
- If save succeeds, continue the requested action
- If save fails or is canceled, remain on current draft and keep dirty

### Discard

- Do not save
- Replace or close state according to the requested action
- Update saved baseline to the newly active state if a new project becomes active

### Cancel

- Abort the requested action
- Keep current draft, selection, history, and route unchanged

## 8. Route Guard vs Electron Guard

### Browser / Route Layer

- Handles in-app route changes and Apollo workspace actions
- May use `beforeunload` only as browser fallback

### Electron Layer

- Handles `close` and `before-quit` style window/application exits
- Must delegate decision to the Apollo dirty/guard contract
- Must not bypass the Apollo `Save / Discard / Cancel` decision model

## 9. Restart Recovery

- Workspace snapshots must remain available after Electron restart
- File-backed saved projects reopen through explicit user open/import only
- Dirty unsaved in-memory state is not promised to survive restart in Unit 3

## 10. Validation Boundary

- Persistence guards depend on shell-level draft validity only when the chosen action is `Save`
- `Discard` and `Cancel` do not require validation success
- Failed validation on `Save` keeps the user in place with dirty state intact

## 11. Unit Boundaries

- Unit 2 owns the serializer/hydrator baseline
- Unit 3 owns workflow and guard semantics around those serializers
- Unit 5 or later owns authoritative publication or report persistence

## 12. Numeric Scope Guard

Persistence and guard flows may not:

- save authoritative numeric result claims
- open publication dialogs for blocked outputs
- downgrade numeric or publication guards
