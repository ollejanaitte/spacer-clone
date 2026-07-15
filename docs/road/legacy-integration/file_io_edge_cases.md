# File I/O Edge Cases

<!-- DOC-AUTHORITY:START -->
> **Authority:** LEGACY REFERENCE
> This document is retained as current/compatibility evidence. Direct `project.json` generation, frame numbering, and `BridgeDefinition` write-authority claims are superseded for the target design by `RoadDesignDocument` and the versioned `RoadToFrameTransferPackage`; see [`../../planning/stage6-10/road_to_frame_contract.md`](../../planning/stage6-10/road_to_frame_contract.md).
<!-- DOC-AUTHORITY:END -->

## Purpose

Document edge cases and expected behavior for liner project save, load, import, and export operations.

## Scope

- Missing files, permission errors, disk full.
- Truncated or malformed JSON.
- Schema version mismatch and forward-incompatible versions.
- Interrupted writes, autosave recovery, invalid embedded liner section.
- Very large files and memory limits.
- Concurrent save and autosave conflicts.

## Out of Scope

- Network file systems and cloud sync specifics.
- Encryption at rest.

## Assumptions

- UTF-8 JSON files.
- Electron file APIs used for desktop save/open dialogs.
- Autosave follows main application policy if integrated.

## Design Topics

### 1. Atomic write policy

1. Serialize to temp file in same directory (`{name}.tmp.{pid}`).
2. `fsync` temp file.
3. Rename temp → target (atomic on POSIX).
4. On failure, delete temp; original file unchanged.

### 2. Corruption and partial writes

| Scenario | Behavior | Code |
| --- | --- | --- |
| Empty file | Error; no partial domain | `LINER_IO_CORRUPT_FILE` |
| Truncated JSON | Error; offer autosave recovery if backup exists | `LINER_IO_CORRUPT_FILE` |
| Invalid embedded `liner` section | Skip liner load; warn; frame model still loads if valid | `LINER_IO_CORRUPT_FILE` |
| Unknown fields | Ignore with info diagnostic (forward compat) | — |
| `schemaVersion` newer than app | Block; prompt to upgrade app | `LINER_IO_VERSION_MISMATCH` |
| `schemaVersion` older | Auto-migrate per [schema_migration_policy.md](schema_migration_policy.md) | — |

### 3. Autosave recovery

- Autosave writes to `{project}.liner-autosave.json` using atomic policy.
- On corrupt main file load failure, prompt to restore autosave (i18n).
- User decline → empty liner domain or abort open.

### 4. Concurrent access

- Load while pipeline running: cancel in-flight compute; load domain; queue recompute.
- Import replaces project: confirm dialog (i18n).

### 5. Forward-incompatible versions

- Intermediate result `schemaVersion` mismatch on cached debug snapshot: discard cache, recompute.

## Open Questions

- Maximum file size before warning?

## Related Documents

- [project_file_format.md](project_file_format.md)
- [schema_migration_policy.md](schema_migration_policy.md)
- [import_export_policy.md](import_export_policy.md)
- [error_handling.md](../design/error_handling.md)

## Pre-Implementation Checklist

- [x] Atomic save pattern documented.
- [x] Corrupt file and autosave recovery documented.
- [x] Invalid embedded liner section behavior defined.
- [ ] Concurrent access policy implemented.
