# IF3 Open Questions

**Date:** 2026-07-25
**Status:** OPEN_FOR_IMPLEMENTATION_PLANNING

These questions do not block design review, but they should be resolved before or during the named
implementation slice.

| Question | Target slice | Default design position |
| --- | --- | --- |
| Exact `schemaId` string for `FrameAnalysisResultResource` | IF3-A | Use `frame-analysis-result-resource` unless registry naming requires another value |
| Exact storage location for persisted result payloads | IF3-C | Hybrid persistence: metadata/ref always, payload where reload/export/viewer requires it |
| Whether `sourceDocumentVersion` remains numeric `revisionId` or becomes explicit immutable revision ref | IF3-A/IF3-C | Use current `revisionId` initially; allow optional `modelRevision` if introduced |
| Current-result pointer shape | IF3-C | Explicit validated pointer only; never timestamp-derived latest |
| Whether backend and frontend share one generated schema or maintain parallel validators | IF3-A/IF3-B | Prefer shared contract semantics; implementation may choose repo-consistent mechanics |
| Result payload granularity for moving-load plus influence snapshots | IF3-A/IF3-B | Result-kind keyed catalog with declared `resultKinds` |
| Solver compatibility policy across `solverVersion` changes | IF3-B/IF3-E | Unsupported incompatible reader fails closed; compatible patch/minor may warn by registry rule |
| Retention/deletion policy for old immutable result resources | IF3-C | Retain by default; deletion policy out of scope unless explicitly added |
| Partial-result export allowance by result kind | IF3-D | Block authoritative output except explicitly approved diagnostic surfaces |
| Legacy time-history `analysisResults.timeHistory` transition | IF3-E | Read as compatibility input; write target IF3 resource when enough binding/provenance exists |

## Non-Questions

These decisions are already fixed by the design:

- IF3 must not claim current implementation exists.
- Raw `AnalysisResult` is not authoritative output input.
- Missing identity, binding mismatch, stale state, unsupported version, missing provenance, invalid
  payload, ambiguous selection, and duplicate result ID fail closed.
- SP1 is not the IF3 result contract. SP1 affects DRAFT drawing adapter mechanics only.
- OD8-04 remains a visual-release blocker and is not resolved by IF3 design.

