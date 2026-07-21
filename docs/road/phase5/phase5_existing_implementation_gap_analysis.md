# Phase 5 Existing Implementation Gap Analysis

**Date:** 2026-07-22
**Status:** SUPPORTING / APPROVED GAP BASELINE
**Phase:** Road Phase 5
**Official name:** Road Formal Drawing Completion and JIP-LINER Parity
**Scope:** Existing implementation versus formal drawing parity targets only.

## Classification

| Status | Meaning |
| --- | --- |
| IMPLEMENTED_VERIFIED | Code path, UI/reload/export path, and tests were found. |
| IMPLEMENTED_PARTIAL | Some code and tests exist, but one or more required axes are missing or unresolved. |
| IMPLEMENTED_UNVERIFIED | Code path exists, but verification evidence is insufficient. |
| NOT_IMPLEMENTED | No current implementation path was found. |
| SUPERSEDED | Historical target replaced by current Phase 5 boundary. |
| OUT_OF_SCOPE | Not part of this Phase 5 freeze. |
| CONFLICTING | Documents or implementation claims conflict and require adjudication. |

Axes: domain, UI, persistence, reload, migration, preview, DXF, report, unit, regression, E2E, fail-closed.

## Gap Matrix

| Item | Status | Evidence | Missing / Phase 5 Action |
| --- | --- | --- | --- |
| Formal Drawing runtime | IMPLEMENTED_VERIFIED | `frontend/src/liner/drawing/model/document.ts`, `frontend/src/liner/drawing/builders/formalBuilders.ts`, `frontend/src/liner/pages/LinerFormalDrawingWorkspacePage.tsx` | Reconcile against JIP §8 and add official fixtures/gates. |
| Plan Type A | IMPLEMENTED_VERIFIED | `phase5-japanese-drawing-remediation.spec.ts`, `phase5JapaneseRemediationDxf.test.ts` | Freeze official name and acceptance semantics. |
| Plan Type B | IMPLEMENTED_VERIFIED | Same E2E/DXF tests; centerline-only document path in workspace page | Freeze as Phase 5 plan coordinate/table view, not a copied JIP UI mode. |
| Profile drawing | IMPLEMENTED_PARTIAL | `formalBuilders.ts`, profile sheet in multi-page document | Full JIP band rows and ground behavior need official gate; ground remains unavailable, not fabricated. |
| Crossfall bands | IMPLEMENTED_PARTIAL | `crossfallResolution.ts`, `CrossfallIntervalEditor.tsx`, redline AC-RD docs | OD-13 measured precedence must be frozen; P5-D01 fixture gate required. |
| Station / No. notation | IMPLEMENTED_VERIFIED | `stationFormat.ts`, `stationFormat.test.ts` | Add Phase 5 formal drawing fixture coverage where labels appear on plan/profile/bands. |
| Coordinate table | IMPLEMENTED_PARTIAL | `drawing/tables/planCoordinateTable.ts`, Japanese remediation DXF tests | JIP §8.7 item count/precision policy must be frozen for supported rows. |
| Line drawing | IMPLEMENTED_PARTIAL | Plan builder and DrawingPolyline output | JIP §8.4 hide/style/extension options not fully implemented; freeze supported subset. |
| Section drawing | IMPLEMENTED_PARTIAL | Cross-section builder and workspace route | JIP §8.5 hide/style/extension options not fully implemented; freeze supported subset. |
| Skew angle drawing | NOT_IMPLEMENTED | JIP §8.6 target identified; no dedicated implementation found | P5-D02 must implement/verify basic skew angle drawing or formally defer. |
| Line dimension | IMPLEMENTED_PARTIAL | Generic dimension primitives and DXF mapping exist | JIP §8.8 auto/manual rules not proven; P5-D02 required. |
| Section dimension | IMPLEMENTED_PARTIAL | Generic dimension primitives and parity tests exist | JIP §8.9 auto/manual rules not proven; P5-D02 required. |
| DXF export | IMPLEMENTED_VERIFIED | `frontend/src/liner/dxf/**`, `phase5-step3-dxf-export.spec.ts` | CAD preset/encoding/layer decisions must be frozen; external CAD visual gate remains manual evidence. |
| DrawingDocument | IMPLEMENTED_VERIFIED | Runtime document type and validation tests | Persistence remains explicitly OUT_OF_SCOPE. |
| Preview / DXF parity | IMPLEMENTED_VERIFIED | `previewDxfPrintParity.test.ts`, workspace exports | P5-D03 must lock parity gate for plan/profile/cross and Plan A/B. |
| Persistence | IMPLEMENTED_VERIFIED | `drawingSettingsPersistence.test.ts`, `linerProjectDraft.ts` | Confirm no saved `DrawingDocument`; no schemaVersion bump. |
| Report / CSV | IMPLEMENTED_VERIFIED | P4-D06 report/CSV files and E2E | Out of P5 unless formal drawing references need read-only reuse. |
| Multi-alignment | IMPLEMENTED_VERIFIED | P4-D01 E2E, mapper and UI adapter | Formal drawing support limited to active alignment in P5; broader simultaneous output deferred. |
| Multi-line | IMPLEMENTED_PARTIAL | `activeLineId`, line manager and bundle mappings | Branch/merge and complex line topology excluded from P5 drawing parity. |
| `activeAlignmentId` / `activeLineId` | IMPLEMENTED_VERIFIED | `types.ts`, `linerUiAdapter.ts`, P4-D01 tests | P5 must preserve stable IDs and avoid index references. |
| Branch / merge geometry | OUT_OF_SCOPE | Phase 4 completion record defers it | Do not implement in P5. Diagnostic/exclusion only. |
| Widening | IMPLEMENTED_PARTIAL | `widthChangePoints`, `widthResolution.ts` | Quartic/transition widening remains deferred. Existing linear width may be drawn if already in CI. |
| Height tab | OUT_OF_SCOPE | Phase 4 completion record defers per-line height tab | Do not implement in P5. |
| Full importer | OUT_OF_SCOPE | Importer exists; Phase 4 deferred target workflow | Do not implement in P5. |
| Overlay | OUT_OF_SCOPE | P4 D05-C07 N/A unless amended | Do not implement in P5. |
| Ground fabrication | OUT_OF_SCOPE | Profile builder displays unavailable text | Continue fail-closed/no-fabrication policy. |
| Japanese formal drawing conventions | IMPLEMENTED_PARTIAL | Japanese remediation tests and redline docs | P5-D01/D02/D03 must convert current partial evidence into official gates. |

## Supervisor Findings

```
PHASE5_GAP_ANALYSIS_VERDICT: APPROVED
```

The existing codebase already contains substantial Phase 5-era implementation. The remaining official work is not a rewrite; it is reconciliation, targeted formal drawing gaps, and verification gates.
