# IF3 Result Lifecycle And Staleness

**Date:** 2026-07-25
**Status:** DESIGN_DEFINED_REVIEW_READY

## Lifecycle

The authoritative IF3 lifecycle is:

```text
Model Ready
  -> Analysis Requested
  -> Running
  -> Raw Result Returned
  -> Normalized
  -> Validated
  -> Persisted/Registered
  -> Consumer Binding
  -> Model Mutation
  -> Stale
  -> Reanalysis
```

## Lifecycle States

| State | Owner | Entry condition | Exit condition |
| --- | --- | --- | --- |
| `MISSING` | Consumer adapter | No registered result resource selected or resolvable | User selects/runs valid result |
| `RUNNING` | Backend | Analysis request accepted and run has not completed | Raw result returned or run fails |
| `VALID` | Shared validator | Resource schema, binding, checksum, provenance, payload, and status are acceptable | Source/settings/load/schema changes or validation fails |
| `FAILED` | Backend normalizer | Solver or pre/post-process failure captured | New analysis run |
| `PARTIAL` | Backend normalizer and validator | Known incomplete result with diagnostics | New analysis run or consumer-specific diagnostic display |
| `STALE` | Shared staleness service | Bound source/settings/load no longer matches current source | New valid result for current source |
| `INVALID` | Shared validator | Resource shape, numeric result, binding, or checksum is invalid | Replacement by new valid resource |
| `UNSUPPORTED` | Shared validator | Schema/result kind/version unsupported by current build | Reader upgrade or migration |

`VALID` is a derived state for a selected resource relative to a selected source document. The stored
resource status may remain `SUCCEEDED` while the current consumer state is `STALE`.

## Staleness Inputs

Staleness is computed from exact comparisons:

| Input | Compared against | Mismatch result |
| --- | --- | --- |
| `sourceDocumentId` | Current `BridgeFrameAnalysisDocument.documentId` | `SOURCE_DOCUMENT_MISMATCH`, invalid for current source |
| `sourceDocumentVersion` | Current frame revision identity | `STALE_RESULT` |
| `sourceContentChecksum` | Current `BridgeFrameAnalysisDocument.contentChecksum` | `SOURCE_CHECKSUM_MISMATCH`, stale |
| `analysisSettingsChecksum` | Current analysis settings checksum | `STALE_RESULT` |
| `loadContext` IDs/checksums | Current load definitions/combinations/request data | `STALE_RESULT` |
| `schemaVersion` | Supported IF3 schema registry | `UNSUPPORTED_RESULT_VERSION` |
| `solverName`/`solverVersion` | Supported reader compatibility | `UNSUPPORTED_RESULT_VERSION` or diagnostic warning by policy |
| `resultChecksum` | Recomputed resource checksum | `INVALID` |

## Triggers

Staleness triggers:

- Structural model entity add/update/delete.
- Coordinate or unit/sign convention changes affecting result interpretation.
- Material, section, support, member release, spring, rigid offset, or load changes.
- Analysis settings, solver family, result kind, or analysis request changes.
- Road-to-Frame transfer apply that creates a new frame revision.
- Migration that changes canonical source checksum or invalidates compatibility.

Non-triggers:

- Viewer camera, selection, clipping, display preference, and transient UI state.
- PRINT pagination or visual layout settings that do not change engineering result content.
- Renaming a report/export file without changing source/result binding.
- Opening or closing panels.

## State Machine

```text
MISSING --analysis requested--> RUNNING
RUNNING --solver success + validation pass--> VALID
RUNNING --solver failure--> FAILED
RUNNING --known incomplete payload--> PARTIAL
RUNNING --normalization/validation failure--> INVALID
VALID --source/settings/load checksum mismatch--> STALE
VALID --unsupported reader/schema after reload--> UNSUPPORTED
PARTIAL --new valid rerun--> VALID
FAILED --new run requested--> RUNNING
STALE --new valid rerun for current source--> VALID
INVALID --replacement valid resource--> VALID
UNSUPPORTED --reader upgrade/migration--> VALID or INVALID
```

## Consumer Behavior

| State | Viewer | Report/CSV/PDF | DRAFT | PRINT |
| --- | --- | --- | --- | --- |
| `MISSING` | Show unavailable state | Block export | Block result sheet | Physical rendering not invoked |
| `RUNNING` | Show pending/running state | Block export | Block result sheet | Physical rendering not invoked |
| `VALID` | Render authoritative result | Allow | Allow supported result sheets | Render valid report/DRAFT only |
| `FAILED` | Show failure diagnostics | Block authoritative export | Block result sheet | Physical rendering not invoked |
| `PARTIAL` | Show explicit partial state | Allow only approved diagnostic output | Allow only approved partial sheet | Render only if upstream eligibility says printable |
| `STALE` | Show stale blocked state | Block authoritative export | Block result sheet | Physical rendering not invoked |
| `INVALID` | Show invalid diagnostics | Block export | Block result sheet | Physical rendering not invoked |
| `UNSUPPORTED` | Show unsupported state | Block export | Block result sheet | Physical rendering not invoked |

## Retention And Replacement

Result resources are immutable and retained unless an explicit retention policy deletes external
storage outside this design. A rerun does not overwrite previous results. It creates a new
`analysisRunId`, `resultId`, resource payload, diagnostics, and checksum.

`BridgeFrameAnalysisDocument.persistedResultRefs` may hold multiple result references. The current
result pointer, if implemented, must be explicit and validated against the current source. Multiple
valid resources for the same source and settings are allowed only if the consumer selection is
unambiguous.

Failed and partial resources are retained with diagnostics for audit and troubleshooting, but they do
not satisfy authoritative output gates unless a consumer explicitly supports non-authoritative
diagnostic display.

## Reload Behavior

On reload:

1. Read the frame document.
2. Resolve result references.
3. Validate schema/version/checksum/provenance.
4. Compare result binding to the loaded source document, settings, and load context.
5. Build an availability catalog with `MISSING`, `VALID`, `FAILED`, `PARTIAL`, `STALE`, `INVALID`,
   and `UNSUPPORTED` entries.
6. Require explicit user or validated current-pointer selection before authoritative consumption.

Reload must not choose the newest timestamp as authoritative without validating the current pointer.

