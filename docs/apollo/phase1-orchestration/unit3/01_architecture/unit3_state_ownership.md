# Apollo Phase 1-NN Unit 3 State Ownership

## Ownership Rules

| State | Owner | Read Consumers | Write Trigger | Persisted | Notes |
| --- | --- | --- | --- | --- | --- |
| Active `ProjectModel` | `App.tsx` | Apollo shell, viewer, validation, save/load bridge | Apollo-approved draft commits | Yes via file save only | App remains the canonical project owner |
| Apollo sidecar draft | `ApolloPhase1Shell` via `ProjectModel` and `unit2Draft.ts` helpers | Apollo editors, validation, viewer projection | Apollo edit intents | Yes through parent `ProjectModel` save | No separate Apollo store file |
| Workspace snapshot list | `workspace.ts` | Apollo workspace panel | Snapshot save/rename/duplicate/delete | Yes via `localStorage` | Snapshot list is not the active project |
| Saved baseline fingerprint | `App.tsx` Apollo route owner | Dirty guard, save/reload, undo boundary checks | Successful save/load/import/discard | No | Replaces boolean-only dirty semantics as the source of truth |
| Dirty state view | `App.tsx` derived state | Toolbar, Apollo shell, guards | Derived from baseline comparison | No | Boolean is a projection, not the source of truth |
| History stack | Apollo history helper | Undo/redo controls and guard logic | Committed Apollo transactions | No | Reset on project switch/import/new draft |
| Redo stack | Apollo history helper | Undo/redo controls | Undo operation and new transaction invalidation | No | Never persisted |
| Apollo multi-selection | Apollo selection helper | Bulk edit, copy/paste, search/filter, viewer sync | Table and keyboard interactions | No | Clears on project switch |
| Apollo internal clipboard | Apollo clipboard helper | Paste flow only | Copy/cut-equivalent action | No | Internal only, versioned payload |
| Search query and filters | Apollo search/filter helper | List renderers, validation navigator | User search/filter inputs | No | Session-local only |
| Validation issue list | `unit2Draft.ts` validation helpers | Validation navigator and shell list | Draft changes and explicit revalidation | No | Derived from current draft |
| Validation navigator cursor | Apollo validation navigator helper | Validation navigator UI | Issue selection / next / previous | No | Clears when issue set changes materially |
| Close / quit guard intent | Apollo guard helper + Electron bridge | App route leave, workspace actions, Electron close | Dirty exit attempt | No | Separate from generic dirty boolean |

## Source of Truth Decisions

### Project Identity

- Canonical owner: `App.tsx`
- Reason: existing save/load and route integration already flow through `App.tsx`

### Dirty Source of Truth

- Canonical owner: app-level saved baseline fingerprint
- Reason: Unit 3 requires undo-to-saved-state semantics, route guard consistency, and Electron close interception that a write-only boolean cannot represent reliably

### History Source of Truth

- Canonical owner: Apollo route-local history helper
- Reason: history must reset on Apollo-specific boundaries and must not leak into LINER or numeric flows

### Selection Source of Truth

- Canonical owner: Apollo route-local selection helper
- Reason: Unit 2 single selection is insufficient for Unit 3 multi-action flows

### Validation Source of Truth

- Canonical owner: current normalized Apollo draft
- Reason: navigation must reflect the current shell state only

## State Transitions

### Save

1. App serializes the current project.
2. Save succeeds through the dialog bridge.
3. Saved baseline fingerprint updates.
4. Dirty becomes `false`.
5. History remains available but marks the current position as the saved checkpoint.

### Reload / Import

1. File opens through the dialog bridge.
2. Apollo draft hydrator validates fail-closed.
3. Active project is replaced only on success.
4. Saved baseline fingerprint updates to the imported payload.
5. History, selection, clipboard, and navigator state reset.

### New Draft

1. Guard checks dirty state.
2. On `Save`, complete save then create draft.
3. On `Discard`, create draft without save.
4. On `Cancel`, keep current state unchanged.
5. Successful new draft creation resets history, selection, clipboard, and navigator state.

### Project Switch / Workspace Open

- Same guard semantics as `New Draft`
- History, selection, and navigator reset on successful switch

## Electron Ownership Boundary

- File dialogs remain owned by the existing desktop bridge.
- Window close and app quit interception remain owned by Electron main-process lifecycle hooks.
- Apollo route logic decides whether close may proceed.

## Numeric Scope Guard

No Unit 3 state owner may cache or derive:

- solver intermediate state
- authoritative result state
- numeric publication state
