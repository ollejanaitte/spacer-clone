# P6-D04 PRINT Design

**Date:** 2026-07-23
**Status:** DRAFT
**Maps to:** PR-40 Frame PRINT completeness

## Purpose

Design report, CSV, and PDF/print outputs for valid Frame result resources.

## Source Boundary

Frame PRINT consumes:

- `BridgeFrameAnalysisDocument`
- valid IF3-bound result resources
- report/output DTOs derived from those sources

Frame PRINT must not recompute solver results and must not export stale results as authoritative.

## Candidate Output Sections

| Section | Requirement |
| --- | --- |
| model summary | source document metadata and revision |
| load cases | valid load case definitions |
| reactions/results | valid bound solver output only |
| warnings/diagnostics | stale, missing, unsupported result states |
| CSV tables | deterministic column order and units |
| PDF/print | page layout, headers, footers, no clipping |

## Gates

- IF3 verified before authoritative output claim.
- OD8-04 resolved before final PDF visual release claim.
- CSV/PDF tests pass before PR completion.

```text
P6_D04_READY_FOR_IMPLEMENTATION: NOGO_UNTIL_IF3_VERIFIED
```
