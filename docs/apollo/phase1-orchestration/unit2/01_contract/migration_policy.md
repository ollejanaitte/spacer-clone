# Apollo Phase 1-NN Unit 2 Migration Policy

## Read-Old / Write-Current

- If `apolloPhase1Unit2` is absent, Unit 2 derives a sidecar draft from the legacy top-level project state.
- If `apolloPhase1Unit2` exists and matches schema `2.0.0`, it is normalized and loaded.
- If `apolloPhase1Unit2` exists with an unknown schema, loading fails closed.

## Write Policy

- All writes persist `schemaVersion: 2.0.0`.
- Metadata written through Unit 2 updates both the sidecar metadata and the top-level `project` metadata.
- Serialization preserves ordering and stable IDs as edited in the shell.
