# Apollo Phase 1-NN Unit 3 Architecture Delta

## Purpose

Describe the architecture changes required to move from the Unit 2 topology shell to the Unit 3 productivity shell without widening Phase 1-NN authority.

## Baseline

Unit 2 architecture is:

- `ApolloPhase1Shell` as the UI shell
- `App.tsx` as the app-level project owner
- `unit2Draft.ts` as the sidecar normalization / validation layer
- `workspace.ts` as local snapshot persistence
- Electron dialog bridge for JSON open/save only

## Delta Summary

Unit 3 adds four non-numeric sublayers on top of the Unit 2 shell:

1. Workspace lifecycle layer
2. History and transaction layer
3. Selection, clipboard, search, and bulk-action layer
4. Dirty guard and validation navigation layer

No new numeric layer is introduced.

## Layer Delta

| Layer | Unit 2 | Unit 3 Delta | Forbidden Expansion |
| --- | --- | --- | --- |
| Route / flags | Existing fail-closed route and guards | Reuse without semantic change | No flag that weakens numeric or publication guards |
| Project owner | `App.tsx` owns current `ProjectModel` and `dirty` boolean | Extend to track Apollo saved baseline identity and close-guard decisions | No backend session ownership |
| Apollo draft shell | Metadata + topology editors | Add productivity controls and guard prompts | No numeric authoring controls |
| Persistence shell | JSON save/reload and local snapshots | Formalize snapshot ordering, invalid snapshot handling, and import/export contract | No authoritative export |
| Validation shell | List-only issue rendering | Add navigator targeting and issue identity | No solver diagnostics |
| Viewer reuse | Single-selection sync | Keep single viewer projection; selection contract feeds viewer eligibility only | No numeric result overlay |

## Required New Contracts

### 1. Workspace Lifecycle Contract

- Distinguish `active Apollo project` from `workspace snapshot`.
- Keep a stable active project identity even when snapshot list ordering changes.
- Require delete confirmation before removing a snapshot.
- Reject malformed snapshot entries fail-closed before hydration.

### 2. History Contract

- Use bounded snapshot history of the Apollo draft sub-document, not command-object replay.
- Snapshot granularity is per committed user intent.
- Bulk edit, paste, import, and delete are atomic transactions.
- Project switch, successful import, and explicit new draft creation reset history.

Rationale:

- The current Apollo shell mutates a single nested draft inside `ProjectModel`.
- Snapshot history is simpler to validate, simpler to serialize for tests, and less invasive than a broad command framework in the current repo.

### 3. Selection Contract

- Maintain a typed Apollo selection model separate from viewer single-selection state.
- Viewer sync is derived from the primary focused entity or suppressed when no single viewer-compatible focus exists.
- Selection is not persisted.

### 4. Clipboard Contract

- Clipboard is internal to Apollo and versioned independently from browser / OS clipboard data.
- Paste applies deterministic ID remap and reference remap.
- Unsupported payloads fail before any mutation.

### 5. Search / Filter Contract

- Search / filter is a read-only projection over the active Apollo draft.
- Filter does not mutate source data or selection storage directly.
- Filter-hidden selection behavior is explicitly defined in the history/selection contract.

### 6. Dirty Guard Contract

- Dirty is derived from the normalized Apollo project payload relative to the last saved baseline accepted by file load, file save, or explicit discard.
- `beforeunload` may provide browser fallback only.
- Electron close / quit uses a dedicated guard path and may not rely solely on browser unload prompts.

## Planned Source Areas

- `frontend/src/App.tsx`
- `frontend/src/apollo/ApolloPhase1Shell.tsx`
- `frontend/src/apollo/workspace.ts`
- `frontend/src/apollo/unit2Draft.ts`
- new Apollo helper modules for history, selection/clipboard, and guard orchestration
- `desktop/electron/main.ts` for close / quit prompt integration only if needed by the document-approved contract

## Unit Boundaries

### Unit 2 Preserved

- sidecar schema version stays `2.0.0` unless a later dedicated migration plan says otherwise
- topology editors remain the authoring surfaces
- audit trail remains local and non-authoritative

### Unit 3 Added

- productivity orchestration around existing topology editing

### Unit 4 Reserved

- deeper adapter and platform extensions beyond the current JSON bridge

### Unit 5 Reserved

- authoritative publication and release-grade export/report behavior

## Numeric Scope Guard

Unit 3 architecture may not add:

- solver imports
- result rendering authority
- numeric evidence adapters
- publication or parity claims
