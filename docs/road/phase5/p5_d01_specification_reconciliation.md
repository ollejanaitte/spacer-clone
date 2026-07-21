# P5-D01 Specification Reconciliation

**Date:** 2026-07-22
**Status:** AUTHORITATIVE STEP RECORD
**Phase:** Road Formal Drawing Completion and JIP-LINER Parity
**D-step:** P5-D01 Formal Drawing Specification Reconciliation and Fixture Gate

## Scope

P5-D01 converts the Phase 5 freeze into executable fixture gates. It does not add new drawing semantics, UI behavior, schema versions, payload versions, or persisted `DrawingDocument` data.

## Existing Implementation Map

| Target | P5-D01 classification | Code / test evidence | Handoff |
| --- | --- | --- | --- |
| Formal Drawing runtime | IMPLEMENTED_VERIFIED | `drawing/model/document.ts`, `formalDrawingWorkspaceDocuments.ts`, `validateDrawingDocument.ts` | Guarded by P5-D01 manifest. |
| Plan Type A | IMPLEMENTED_VERIFIED | `formalBuilders.ts`, `phase5JapaneseRemediationDrawing.test.ts`, `phase5JapaneseRemediationDxf.test.ts` | P5-D03 expands CAD evidence. |
| Plan Type B | IMPLEMENTED_VERIFIED | `planCenterlineOnlyBuilder.ts`, `planCenterlineOnlyBuilder.test.ts` | P5-D03 expands CAD evidence. |
| Profile drawing | IMPLEMENTED_PARTIAL | `formalBuilders.ts`, profile/band tests | P5-D02/D03 cover remaining JIP band evidence. |
| Crossfall bands | IMPLEMENTED_PARTIAL | `crossfallResolution.ts`, band drawing tests | P5-D04 proves reload/fail-closed persistence behavior. |
| Station / No. notation | IMPLEMENTED_VERIFIED | `stationFormat.ts`, drawing tests | Manifest requires `jip-no-notation`. |
| Coordinate table | IMPLEMENTED_PARTIAL | `planCoordinateTable.ts`, DXF remediation tests | P5-D02 freezes supported columns/precision. |
| Line drawing | IMPLEMENTED_PARTIAL | plan builders and polyline layers | P5-D02 covers supported hide/style/extension subset. |
| Section drawing | IMPLEMENTED_PARTIAL | cross-section builder and workspace route | P5-D02 covers supported section semantics. |
| Skew angle drawing | NOT_IMPLEMENTED | no current dedicated primitive found | P5-D02 must implement or formally defer. |
| Line dimension | IMPLEMENTED_PARTIAL | `alignmentSegmentDimensions.ts`, DXF dimension decomposition | P5-D02 covers JIP §8.8 rules. |
| Section dimension | IMPLEMENTED_PARTIAL | cross-section dimension primitives | P5-D02 covers JIP §8.9 rules. |
| DXF export | IMPLEMENTED_VERIFIED | `exportFormalDrawingDxf.ts`, `previewDxfPrintParity.test.ts` | P5-D03 locks CAD preset and visual evidence. |
| DrawingDocument persistence | OUT_OF_SCOPE | persistence tests prove runtime regeneration | Remains prohibited. |

## JIP-LINER Reconciliation

| JIP section | P5-D01 executable treatment | Later step |
| --- | --- | --- |
| §8.1 Drawing list | Fixed plan/profile/cross representative fixtures only. | Future extension. |
| §8.2 Basic data | Manifest fixes paper/scale/version/preset expectations through current builders. | P5-D03 CAD evidence. |
| §8.3 Span composition | Existing bridge/span data remains source; no lane editor. | P5-D02/P5-D03 evidence. |
| §8.4 Line drawing | Existing plan polyline/text/dimension layers are fixture-gated. | P5-D02 supported semantics. |
| §8.5 Section drawing | Existing cross-section route is fixture-gated. | P5-D02 supported semantics. |
| §8.6 Skew angle drawing | Recorded missing; not implemented in P5-D01. | P5-D02. |
| §8.7 Coordinate table | Plan Type A/B fixture requires coordinate-table text and DXF text. | P5-D02 precision/columns. |
| §8.8 Line dimension | Existing plan segment dimensions are fixture-gated. | P5-D02 auto/manual rules. |
| §8.9 Section dimension | Existing cross-section dimensions are fixture-gated. | P5-D02 auto/manual rules. |

## AC-RD / OD Resolution

AC-RD-01..20 remain adopted through `phase5_open_decision_resolution.md`. P5-D01 maps them to the fixture gate where executable today:

- AC-RD-07..15: covered by manifest preview/DXF route, layer, text, and primitive expectations.
- AC-RD-16..20: not asserted visually in P5-D01; P5-D05 owns screenshot/manual visual evidence.
- OD-03/05/06/16/17/19: executable through `AC1021`, coordinate convention, and shared DrawingDocument route checks.
- OD-13/18: recorded as profile/band and crossfall handoff to P5-D02/P5-D04.

## P5-D02 Handoff

P5-D02 must consume the P5-D01 manifest as a required gate and may extend expected primitives only with explicit fixture/golden review. It must not reimplement targets already classified as IMPLEMENTED_VERIFIED.
