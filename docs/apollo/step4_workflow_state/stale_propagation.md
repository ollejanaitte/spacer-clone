# STALE Propagation (OutputIntegration parity)

STALE is derived from the existing canonical guard:
`isBridgeStructureGenerationCurrent` (`generateBsdd.ts`), the same truth used by
`buildIntegratedOutputs` / OutputIntegrationPanel. The workflow layer adds no
second STALE source.

## Rule

```
isArtifactStale(project) = Boolean(project.apolloBsdd?.structuralDesignModel)
                            && !isBridgeStructureGenerationCurrent(project)
```

- **Not generated yet → NOT STALE.** Empty projects show `NOT_STARTED` /
  `READY`, never STALE (avoids false STALE on brand-new projects).
- **Generated then input mutated → STALE.** Every dependent artifact step
  (quantity, report, drawing, output integration, 3D, analysis evidence)
  surfaces STALE with `WF_RESULT_STALE` + `WF_CHECKSUM_MISMATCH`.

## Parity checks

| Source | WF-14 evidence |
|--------|----------------|
| `buildIntegratedOutputs(project).stale` | STALE |
| `buildIntegratedOutputs(project).statuses.bundle` | BLOCKED → `WF_RESULT_NOT_GENERATED` |
| `buildIntegratedOutputs(project).consistency.overall` | PASS → COMPLETE contribution |

## Regeneration

Regenerating the structure (`generateBridgeStructureFromInput`) restores the
current checksum and clears STALE for all downstream steps. Verified by unit
test "regeneration restores current state" and E2E-S4A-003 (mutation → STALE).

## WF-15 ack staleness

The only persisted workflow datum is the WF-15 acknowledgment, bound to the
input checksum:

```
ack.inputChecksum === buildInputChecksum(draft)   → acknowledgedCurrent (COMPLETE)
ack.inputChecksum !== currentChecksum             → acknowledgedStale (STALE)
```

Storage key: `apollo.workflow.wf15.ack.<projectId>` (localStorage).
