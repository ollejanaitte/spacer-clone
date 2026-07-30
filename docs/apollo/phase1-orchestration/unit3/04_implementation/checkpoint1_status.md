# Apollo Unit 3 Checkpoint 1

Implemented scope:

- U3-A project CRUD foundations (`projectId`, duplicate naming, malformed workspace warnings)
- U3-I unsaved-changes guard with saved-baseline fingerprint
- Apollo-local composition-aware and numeric inputs
- Electron close/quit guard IPC contract

Audit record:

- `grok` read-only audit retry sequence exhausted without a usable response.
- Attempted models accepted by Cursor CLI:
  - `cursor-grok-4.5-medium-fast` x2
  - `cursor-grok-4.5-high-fast` x2
  - `cursor-grok-4.5-low-fast` x2
- Each bounded retry returned no review payload before timeout.
- Codex completed the fallback Checkpoint 1 audit against the same scope checklist:
  - `projectId` remains generated centrally and read-only in Apollo UI.
  - dirty state is derived from canonical saved-baseline fingerprints.
  - malformed workspace snapshots are preserved and surfaced non-destructively.
  - unsaved-changes transitions use a shared `Save / Discard / Cancel` contract.
  - composition-aware Apollo inputs defer authoritative commits until composition end.
  - numeric Apollo inputs normalize fullwidth ASCII numeric characters only on commit and fail closed on invalid input.
  - Electron close/quit protection routes through preload/main IPC instead of renderer filesystem access.
  - no frozen Unit 3 docs, LINER files, package manifests, startup scripts, or solver/numeric authority surfaces were changed.

Checkpoint 1 validation:

- `npm run typecheck` PASS
- `npm run lint` PASS
- `npm run build` PASS
- targeted Apollo and Electron tests PASS
- `git diff --check` PASS

Deferred to later checkpoints:

- Undo/redo history integration with dirty baseline
- Import/export envelope (U3-B)
- Multi-select, clipboard, bulk edit, search/filter, validation navigator
