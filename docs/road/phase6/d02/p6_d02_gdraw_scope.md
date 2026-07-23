# P6-D02 GDRAW Scope

**Date:** 2026-07-23
**Status:** DRAFT_UPDATED_BY_MIMO_AUDIT
**Source:** `../P6_D02_GDRAW_Scope_Confirmation.md` (PARTIAL_SOURCE)

## Purpose

Convert the existing GDRAW scope confirmation into implementation-ready PR-39 planning.

The source document is not a duplicate and must remain. It is a temporal snapshot from before the current Phase6 docs existed, so statements in that source saying Phase6 docs were absent are historical context, not current repository state.

## PR-39 Scope

In scope:

- Road line/section drawing completion
- curve and vertical-curve annotations from available geometry
- coordinate table improvements
- line and section dimensions
- crossfall slope display
- bridge/structure markers where Road source IDs exist
- DXF adapter parity for new primitives
- drawing diagnostics

Out of scope:

- Frame PRINT
- Frame DRAFT
- Viewer target adapters
- persisted `DrawingDocument`
- final visual release claim while OD8-04 is open

## Candidate Files

| Area | Candidate |
| --- | --- |
| Road builders | `frontend/src/liner/drawing/builders/formalDrawingBuilders.ts` |
| Bridge drawing | `frontend/src/liner/drawing/builders/bridgeLayoutDrawing.ts` |
| Dimensions | `frontend/src/liner/drawing/dimensions/alignmentSegmentDimensions.ts` |
| Primitives | `frontend/src/liner/drawing/model/primitives.ts` |
| Tables | `frontend/src/liner/drawing/tables/planCoordinateTable.ts` |
| SVG rendering | `frontend/src/liner/drawing/rendering/DrawingDocumentSvg.tsx` |
| DXF mapping | `frontend/src/liner/dxf/mapper/mapDrawingDocumentToDxf.ts` |
| Validation | `frontend/src/liner/drawing/validation/validateDrawingDocument.ts` |

## Required Follow-up

P6-D03 must reconcile the source D02 inventory with current repository evidence before implementation because at least one candidate dimension module exists in the current tree.

```text
P6_D02_VERDICT: DRAFT_READY_WITH_PARTIAL_SOURCE_CAVEAT
```
