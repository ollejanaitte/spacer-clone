# P6-D04 PRINT Design

**Date:** 2026-07-26
**Status:** DRAFT_UPDATED_AFTER_IF3_E
**Maps to:** PR-40 Frame PRINT completeness

## Purpose

Design report, CSV, and PDF/print outputs for valid Frame result resources.

## Source Boundary

Frame PRINT consumes:

- `BridgeFrameAnalysisDocument`
- valid IF3-bound result resources
- report/output DTOs derived from those sources

Frame PRINT must not recompute solver results and must not export stale results as authoritative.

Legacy / pre-IF3 raw `AnalysisResult` and legacy `analysisResults.timeHistory` are classified by
IF3-E as compatibility inputs only. They are not authoritative PRINT sources unless normalized and
registered through WRITE_TARGET with explicit complete metadata.

## Candidate Output Sections

| Section | Requirement |
| --- | --- |
| model summary | source document metadata and revision |
| load cases | valid load case definitions |
| reactions/results | valid bound solver output only |
| warnings/diagnostics | stale, missing, unsupported, legacy-quarantine states |
| CSV tables | deterministic column order and units |
| PDF/print | page layout, headers, footers, no clipping |

## Gates

- IF3 semantic adapters: PASS via IF3-A through IF3-E evidence.
- PRINT catalog completeness: still required for PR-40 body.
- OD8-04 resolved before final PDF visual release claim.
- CSV/PDF tests pass before PR completion.

```text
P6_D04_READY_FOR_IMPLEMENTATION: CONDITIONAL_GO_AFTER_IF3_E
PR40_READINESS: CONDITIONAL_GO
REMAINING_FOR_PR40_BODY:
  - finalize PRINT catalog sections against current IF3 payload kinds
  - implement catalog completeness beyond current CSV/PDF adapters
  - retain stale/legacy fail-closed behavior
  - no final visual-release claim while OD8-04 is open
```
