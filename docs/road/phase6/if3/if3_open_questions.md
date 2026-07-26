# IF3 Open Questions

**Date:** 2026-07-26
**Status:** PARTIALLY_RESOLVED_BY_IF3_E

These questions do not block IF3-A through IF3-E semantic completion. Remaining open items are
explicitly marked.

| Question | Target slice | Status | Position |
| --- | --- | --- | --- |
| Exact `schemaId` string for `FrameAnalysisResultResource` | IF3-A | RESOLVED | `spacer.contracts.frame-analysis-result-resource` in code |
| Exact storage location for persisted result payloads | IF3-C | RESOLVED | Hybrid persistence / sidecar + refs as implemented in IF3-C |
| Whether `sourceDocumentVersion` remains numeric `revisionId` or becomes explicit immutable revision ref | IF3-A/IF3-C | RESOLVED_FOR_NOW | Current `revisionId` numeric path is used |
| Current-result pointer shape | IF3-C | RESOLVED_FOR_NOW | Explicit validated refs/availability; no timestamp-derived latest |
| Whether backend and frontend share one generated schema or maintain parallel validators | IF3-A/IF3-B | ACCEPTED_AS_PARALLEL | Shared semantics; parallel validators maintained |
| Result payload granularity for moving-load plus influence snapshots | IF3-A/IF3-B | OPEN | Kind-keyed catalog exists; broader catalog completion is PR-40+ scope |
| Solver compatibility policy across `solverVersion` changes | IF3-B/IF3-E | RESOLVED_DEFAULT | Unsupported incompatible reader fails closed; WRITE_TARGET never invents solver metadata |
| Retention/deletion policy for old immutable result resources | IF3-C | OPEN | Retain by default; deletion policy out of scope |
| Partial-result export allowance by result kind | IF3-D | RESOLVED_DEFAULT | Authoritative output blocked except approved diagnostic surfaces |
| Legacy time-history `analysisResults.timeHistory` transition | IF3-E | RESOLVED_DEFAULT | Readable as compatibility/display input; authoritative Frame PRINT/CSV blocked until explicit WRITE_TARGET metadata exists and normalizer registration succeeds |

## Non-Questions

These decisions remain fixed:

- Raw `AnalysisResult` is not authoritative output input.
- Missing identity, binding mismatch, stale state, unsupported version, missing provenance, invalid
  payload, ambiguous selection, and duplicate result ID fail closed.
- Migration / WRITE_TARGET never invents missing stable result identity, binding, checksum,
  provenance, or payload.
- SP1 is not the IF3 result contract. SP1 continues to block PR-41.
- OD8-04 remains a visual-release blocker.
