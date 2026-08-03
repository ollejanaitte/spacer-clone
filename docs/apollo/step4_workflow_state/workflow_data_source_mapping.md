# Workflow Data Source Mapping

Every step derives evidence from **current project data + existing canonical
models**. No fabricated results; no second source of truth for artifact state.
Implementation: `frontend/src/apollo/workflow/selectors.ts`.

## Step → canonical source

| Step | Input source | Result / STALE source | Complete when |
|------|--------------|----------------------|---------------|
| WF-01 | alignment-binding (PLANNED) | n/a | Step 4-E |
| WF-02 | `apolloBridgeStructureInput` (validate + classify) | `isBridgeStructureGenerationCurrent` | input VALID + generated current |
| WF-03 | same bridge input (PLANNED) | n/a | Step 4-B |
| WF-04 | same bridge input (girderDepth/flange/web) | `isBridgeStructureGenerationCurrent` | input VALID + generated current |
| WF-05 | same bridge input (PLANNED) | n/a | Step 4-B |
| WF-06 | same bridge input (PLANNED) | n/a | Step 4-D |
| WF-07 | same bridge input + drawing-set warnings | `isBridgeStructureGenerationCurrent` | PARTIAL (loads derived only) |
| WF-08 | AnalysisDevelopmentProbe (PARTIAL) | `isArtifactStale` | PARTIAL → never false-COMPLETE |
| WF-09 | DemandCheckDevelopment (PARTIAL) | `isArtifactStale` | PARTIAL |
| WF-10 | `buildQuantityModel` | `isArtifactStale` + checksum | model current (revision/checksum aligned) |
| WF-11 | `buildApolloVisualizationModel` | `isArtifactStale` | build ok |
| WF-12 | `buildReportModel` | `isArtifactStale` + checksum | model current |
| WF-13 | `buildGeneralArrangementDrawingSet` | `isArtifactStale` | sheets >= 7 + current; SIMPLE_SINGLE scope |
| WF-14 | `buildIntegratedOutputs` | `outputs.stale` (OutputIntegration truth) | consistency PASS + not stale |
| WF-15 | user ack (localStorage, checksum-bound) | ack inputChecksum vs current | human ack recorded for current checksum |

## STALE truth

```
isArtifactStale(project) = Boolean(project.apolloBsdd?.structuralDesignModel)
                            && !isBridgeStructureGenerationCurrent(project)
```

Un-generated artifacts are **NOT** STALE (empty project → WF-10 is
`NOT_STARTED`, not STALE). STALE appears only after a generation exists and the
input checksum moved. Verified by unit tests
(`workflowState.test.ts` — "does not mark un-generated steps as STALE") and
E2E-S4A-003.

## Checksums / revisions

- Input: `buildInputChecksum` / `buildInputRevision` (quantityModel canonical).
- WF-15 ack is bound to the input checksum:
  `readWorkflowAck(projectId)` → `WF15_ACK_STORAGE_PREFIX + projectId`
  in localStorage. Any input mutation changes the checksum → ack is STALE.
- Nothing else is persisted (reload reproduces the exact derived model).
