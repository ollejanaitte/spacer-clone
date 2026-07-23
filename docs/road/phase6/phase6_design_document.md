# Phase 6 Design Document

**Date:** 2026-07-23
**Status:** DRAFT_UPDATED_BY_MIMO_AUDIT
**Phase:** P6 - Reports, Drawings, and Viewer Completion

## Design Goal

Phase6 completes output surfaces after authoritative Road/Frame data and results exist. The core design rule is one-way derivation:

```text
source document/result -> runtime output model -> preview/print/DXF/PDF/Viewer adapter
```

Outputs are never an editable or persisted engineering source of truth.

## Runtime Boundaries

| Runtime object | Role | Persistence rule |
| --- | --- | --- |
| `DrawingDocument` | Neutral drawing intermediate for preview, print, DXF, and formal sheets | Runtime-only |
| DXF document/model | CAD export adapter target | Artifact-only |
| PDF/print document | Report/print adapter target | Artifact-only |
| Viewer session/adapters | Presentation of valid frame result state | Session/runtime-only unless a separate session contract exists |
| Report row/table DTOs | Structured output projection | Regenerate from source/result |

## Source-of-Truth and Adapter Flow

Road GDRAW:

```text
RoadDesignDocument
  -> CanonicalLinerIntermediateResult
  -> DrawingSettings
  -> runtime DrawingDocument
  -> SVG preview / print / DXF
```

Frame PRINT/DRAFT/Viewer:

```text
BridgeFrameAnalysisDocument
  -> valid bound Frame result resource
  -> report/drawing/viewer DTO
  -> CSV / PDF / DrawingDocument / Viewer adapter
```

Rules:

- Builders are pure or deterministic over explicit inputs.
- Adapters do not recompute geometry or solver results.
- Error-level diagnostics block the affected output completion.
- Stale Frame results cannot be exported as authoritative output.
- Visual output may be checked manually, but final visual release claim waits for OD8-04.

## PR-39 Road GDRAW Design Scope

Implement or finalize Road formal drawing behavior for:

- line and section drawing style/label/extension semantics
- curve and vertical-curve annotations where source geometry supports them
- plan coordinate table formatting and deterministic IDs
- line-to-line and section-to-section dimensions
- crossfall slope display where values exist
- bridge/structure markers on Road drawings, if source bridge layout can provide stable IDs
- DXF mapping and validation for any new drawing primitive

Candidate files/symbols:

| Area | Candidate files/symbols |
| --- | --- |
| Builders | `frontend/src/liner/drawing/builders/formalDrawingBuilders.ts`, `planPrimitives`, `profilePrimitives`, `crossSectionPrimitives`, `bandPrimitives` |
| Settings | `frontend/src/liner/drawing/builders/types.ts`, `DrawingSettings` |
| Primitives | `frontend/src/liner/drawing/model/primitives.ts`, `DrawingPrimitive` |
| Dimensions | `frontend/src/liner/drawing/dimensions/alignmentSegmentDimensions.ts`; possible new line/section dimension helpers |
| Tables | `frontend/src/liner/drawing/tables/planCoordinateTable.ts` |
| Rendering | `frontend/src/liner/drawing/rendering/DrawingDocumentSvg.tsx`, `frontend/src/liner/drawing/renderers/FormalDrawingSvg.tsx` |
| DXF | `frontend/src/liner/dxf/mapper/mapDrawingDocumentToDxf.ts`, `mapDrawingPrimitive.ts`, `cadLayerPresets.ts` |
| Validation | `frontend/src/liner/drawing/validation/validateDrawingDocument.ts`, `frontend/src/liner/dxf/validation/validateDxfDocument.ts` |
| Workspace | `frontend/src/liner/drawing/formalDrawingWorkspaceDocuments.ts`, `LinerFormalDrawingWorkspacePage` route usage |

## PR-40 PRINT Design Scope

Frame PRINT must consume valid Frame input/results through IF3-bound APIs. It should complete:

- report section catalog
- CSV export for structured result tables
- PDF/print layout with deterministic page breaks
- diagnostics for stale, missing, or unsupported result resources
- no visual release claim until OD8-04 closes

Road report/CSV reuse is allowed only through shared output helpers or clearly road-owned adapters.

## PR-41 Frame DRAFT Design Scope

Formal Frame DRAFT must build drawings from Frame source/result DTOs:

- structure layout sheets
- load and load-case sheets
- result/influence sheets where results are valid
- runtime `DrawingDocument` output using SP1-compatible primitives
- hidden or unavailable UI for unsupported result families

Do not couple Frame DRAFT builders to Road/LINER builders except through shared neutral drawing/DXF contracts.

## PR-42 Viewer Design Scope

Viewer output adapters must:

- read target Frame document and bound result resources
- surface staleness and invalidation states
- prevent stale authoritative exports
- keep old Viewer adapter as rollback while new adapter is incomplete
- separate render session state from persisted engineering state

## Diagnostics

P6 uses fail-closed diagnostics:

- missing source data: error when required, unavailable state when optional
- stale result: error for authoritative output
- unsupported feature: explicit diagnostic, not silent omission
- visual environment missing: `OPEN_NONBLOCKING_FOR_IMPLEMENTATION` for semantic work and controlled visual test prep, release blocker for final visual claim

## MiMo Audit Constraints

- SP1 is `SP1_PARTIAL_ACCEPTABLE_FOR_PR39`: PR-39 can proceed with explicit Road adapter boundary; PR-41 needs neutral/shared Frame drawing path or explicit acceptance.
- IF3 is `IF3_PARTIAL_BLOCKING_PR40_PR41_PR42`: `BridgeFrameAnalysisDocument` and schema exist, but result binding, staleness, provenance, and Frame PRINT/DRAFT/Viewer source contracts were not found.
- `.venv` failure is `ENVIRONMENT_SETUP_MISSING` and unrelated to docs changes; it blocks broader full-test validation until approved environment setup exists.

```text
PHASE6_DESIGN_VERDICT: DRAFT_READY_WITH_MIMO_FINDINGS
```
