# P6-D04 PRINT Design

**Date:** 2026-07-26
**Status:** IMPLEMENTED_PENDING_REVIEW
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

## PRINT / Export Catalog

The authoritative catalog is implemented by `if3PrintCatalog.ts` and the backend report adapter.

| IF3 result kind | Status | Authoritative outputs |
| --- | --- | --- |
| `nodeDisplacement` | supported | report, PRINT, `displacements.csv`, PDF |
| `supportReaction` | supported | report, PRINT, `reactions.csv`, PDF |
| `memberForce` | supported | report, PRINT, `member_section_forces.csv`, member-force CSV, PDF |
| `stress`, `modal`, `buckling`, `diagnostics`, `linearStatic`, `eigen`, `responseSpectrum`, `influenceLine`, `movingLoad`, `timeHistory` | unsupported in PR-40 catalog | diagnostic + authoritative PRINT/export block |

All three supported members are required for the current complete Frame PRINT catalog. A missing
required member produces `PRINT_CATALOG_REQUIRED_RESULT_MISSING`; a declared unsupported kind
produces `PRINT_CATALOG_RESULT_KIND_UNSUPPORTED`.

`result.json` is the validated IF3 resource, not a synthesized raw `AnalysisResult`.

Existing CSV/PDF table renderers receive an internal compatibility DTO derived from the gated IF3
resource. That DTO is not an authoritative input and is never accepted directly by the PR-40 entry
points.

## Gates

- IF3 semantic adapters: PASS via IF3-A through IF3-E evidence.
- PRINT catalog completeness: implemented for the three supported linear-static result kinds.
- OD8-04 resolved before final PDF visual release claim.
- CSV/PDF tests pass before PR completion.

```text
P6_D04_IMPLEMENTATION_STATUS: IMPLEMENTED_PENDING_REVIEW
PR40_READINESS: IMPLEMENTED_PENDING_REVIEW
REMAINING:
  - supervisory review and merge
  - unsupported result kinds require future explicitly scoped adapters
  - no final visual-release claim while OD8-04 is open
```
