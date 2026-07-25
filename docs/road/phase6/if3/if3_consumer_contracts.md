# IF3 Consumer Contracts

**Date:** 2026-07-25
**Status:** DESIGN_DEFINED_REVIEW_READY

## Rule

Report, Viewer, and DRAFT consume the same validated `FrameAnalysisResultResource` contract. They
must not consume raw solver `AnalysisResult` directly as the authoritative path.

Current code paths that accept `AnalysisResult` directly are compatibility candidates only. They must
move behind IF3 adapters or be restricted to non-authoritative diagnostic/legacy behavior.

## Shared Consumer Input

Every IF3 consumer receives:

- `BridgeFrameAnalysisDocument` identity, revision, checksum, unit context, and frame entity IDs.
- Selected `FrameAnalysisResultResource.resultId`.
- Result binding validation output.
- Result staleness state.
- Result diagnostics.
- Consumer-specific eligibility flags.

Implicit latest-result selection is prohibited. A selected result is valid only if it is explicitly
named by `resultId` or resolved from a validated current-result pointer.

## Shared Consumer Output

Every consumer returns:

- `state`: `MISSING`, `RUNNING`, `VALID`, `FAILED`, `PARTIAL`, `STALE`, `INVALID`, or `UNSUPPORTED`.
- `diagnostics`: IF3 diagnostics with code, severity, producer, path/entity reference, and message.
- `authoritativeOutputAllowed`: boolean.
- `resultRef`: selected result identity/checksum when present.
- Consumer-specific DTO, omitted when blocked.

## Report Contract

Report consumes only valid IF3-bound result DTOs derived from `FrameAnalysisResultResource`.

Allowed:

- Project/model summary from `BridgeFrameAnalysisDocument` or an explicit report DTO derived from it.
- Result sections from validated `payload` result kinds.
- Diagnostics section for stale/missing/failed/partial/unsupported states.
- CSV and PDF export when `authoritativeOutputAllowed` is true.

Prohibited:

- Recomputing solver results.
- Inferring current result from `projectId`.
- Exporting stale, invalid, missing, ambiguous, or unsupported results as authoritative.
- Treating old raw `AnalysisResult` as a report source without IF3 normalization.

Implementation impact: existing frontend `resultCsvExport.ts`, `resultPdfReport.ts`, and
`memberForceReport.ts`, plus backend `reports.py`, are adapter candidates. They currently consume raw
result shapes and must be guarded by IF3 validation before PR-40 can claim authoritative output.

## Viewer Contract

Viewer consumes a validated result-resource view model.

Allowed:

- Render frame geometry from the current frame source document.
- Render result overlays only when result binding is valid for that frame source.
- Show unavailable/stale/failed/partial/unsupported states.
- Disable export controls when result state blocks authoritative output.

Prohibited:

- Persisting Viewer camera/session state into source or result resources.
- Recomputing solver results in the adapter.
- Rendering stale results without an explicit stale/non-authoritative state.
- Resolving "latest" by timestamp without current-pointer validation.

Implementation impact: existing `resultViewModel.ts` derives IDs from `projectId` and load case. That
derived ID is not stable IF3 identity and must be replaced or wrapped by `resultId`.

## DRAFT Contract

Frame DRAFT consumes frame source geometry plus valid result resources for result-bound sheets.

Allowed:

- Structure sheets from `BridgeFrameAnalysisDocument`.
- Support/load sheets from frame load definitions.
- Result diagrams from valid result payloads.
- Influence/moving-load sheets from supported valid result kinds.
- Explicit unavailable/stale/unsupported diagnostics in sheet eligibility.

Prohibited:

- Importing Road/LINER builders directly as engineering truth.
- Using raw solver rows as authoritative DRAFT source.
- Generating authoritative result diagrams from stale, invalid, missing, ambiguous, or unsupported
  results.

SP1 boundary: SP1 is the shared drawing platform. IF3 is Frame-owned/shared result contract design.
IF3 must not depend on SP1 except at the DRAFT adapter boundary, where a valid result DTO may be
translated into neutral `DrawingDocument` primitives.

## PRINT Boundary

PRINT owns physical rendering only: page layout, table pagination, headers/footers, clipping, and
printer/PDF behavior. PRINT does not own result validity, staleness, solver calculation, or source
truth.

PRINT consumes report or DRAFT eligibility produced by IF3-aware adapters. If upstream eligibility is
blocked, PRINT must not independently bypass the block.

OD8-04 remains a visual-release blocker. It does not block semantic IF3 design or controlled
implementation prep, but final visual release claims remain blocked.

## Diagnostics Catalog

| Code | Severity | Producer | Consumer behavior |
| --- | --- | --- | --- |
| `MISSING_RESULT_ID` | error | Consumer selector / validator | Block authoritative output |
| `SOURCE_DOCUMENT_MISMATCH` | error | Binding validator | Block current-source consumption |
| `SOURCE_CHECKSUM_MISMATCH` | error | Staleness validator | Mark stale and block authoritative output |
| `UNSUPPORTED_RESULT_VERSION` | error | Schema/version validator | Block output, show unsupported |
| `STALE_RESULT` | error | Staleness validator | Block authoritative output |
| `PARTIAL_RESULT` | warning or error by consumer policy | Normalizer / validator | Allow only explicitly approved partial diagnostic output |
| `INVALID_NUMERIC_RESULT` | error | Normalizer / export validator | Block output |
| `DUPLICATE_RESULT_ID` | error | Registry / persistence validator | Block registration and consumption |
| `AMBIGUOUS_RESULT_SELECTION` | error | Consumer selector | Block until explicit result chosen |
| `MISSING_PROVENANCE` | error | Validator | Block authoritative output |
| `SOLVER_FAILURE` | error | Backend solver / normalizer | Block authoritative output, retain diagnostics |
| `UNSUPPORTED_RESULT_KIND` | error | Result-kind adapter | Block that result kind and dependent output |

## Fail-Closed Matrix

| Condition | Report | Viewer | DRAFT | PRINT |
| --- | --- | --- | --- | --- |
| Identity missing | Block | Unavailable | Block sheet | Block |
| Binding mismatch | Block | Stale/error state | Block sheet | Block |
| Version mismatch | Block | Unsupported state | Block sheet | Block |
| Stale | Block | Stale state, no authoritative export | Block sheet | Block |
| Missing provenance | Block | Invalid state | Block sheet | Block |
| Unsupported schema/kind | Block | Unsupported state | Block sheet | Block |
| Invalid/partial payload | Block except approved diagnostics | Invalid/partial state | Block except approved partial sheet | Follow upstream eligibility |
| Ambiguous selection | Block | Selection required | Block sheet | Block |
| Duplicate result ID | Block | Invalid state | Block sheet | Block |

