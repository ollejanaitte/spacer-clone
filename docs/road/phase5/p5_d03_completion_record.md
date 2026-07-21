# P5-D03 Completion Record

**Date:** 2026-07-22
**Status:** COMPLETE CANDIDATE
**Phase:** Road Formal Drawing Completion and JIP-LINER Parity
**D-step:** P5-D03 Preview / Print / DXF Parity and CAD Gate

## Official Scope

P5-D03 verifies the formal drawing DXF path for the supported Phase 5 drawing routes:

- Plan Type A road-shape DXF
- Plan Type B centerline/coordinate-table DXF
- profile/band DXF
- cross-section DXF
- shared preview, print, and DXF `DrawingDocument` source
- `AC1021` DXF version
- current `common` CAD preset evidence

## Implemented

- Added the P5-D03 executable CAD gate test for all supported workspace DXF routes.
- Verified that preview, print, and DXF use the same runtime `DrawingDocument` object for every tested route.
- Verified deterministic DXF serialization for the same workspace document and timestamp.
- Verified parsed DXF layer presence for Plan Type A, Plan Type B, profile/band, and cross-section.
- Verified current `common` sheet/CAD preset layer membership and `AC1021` header.

## Existing Implementation Map

| Area | P5-D03 Result |
| --- | --- |
| Preview/print/DXF shared document | IMPLEMENTED_VERIFIED |
| Plan Type A DXF | IMPLEMENTED_VERIFIED |
| Plan Type B DXF | IMPLEMENTED_VERIFIED |
| Profile/band DXF | IMPLEMENTED_VERIFIED |
| Cross-section DXF | IMPLEMENTED_VERIFIED |
| `AC1021` header | IMPLEMENTED_VERIFIED |
| `common` CAD preset | IMPLEMENTED_VERIFIED |
| Regional CAD compliance | OUT_OF_SCOPE; no NEXCO/MLIT compliance claim |
| CP932 compatibility | DEFERRED_WITH_REASON; current UTF-8 exporter path remains the approved release target |

## Non-Scope

- No drawing semantics beyond P5-D02.
- No persistence, reload, or migration hardening.
- No visual screenshot/E2E evidence; P5-D05 owns final visual evidence.
- No CAD standard compliance claim.
- No schemaVersion or payloadVersion change.

## Changed Files

- `frontend/src/liner/dxf/__tests__/phase5DxfParityCadGate.test.ts`
- `docs/road/phase5/p5_d03_completion_record.md`

## Validation

| Command | Result |
| --- | --- |
| `cd frontend && npm run typecheck` | PASS |
| `cd frontend && npm run test -- src/liner/dxf/__tests__/phase5DxfParityCadGate.test.ts` | PASS, 1 file / 5 tests |
| `cd frontend && npm run test -- src/liner/dxf/__tests__/previewDxfPrintParity.test.ts src/liner/dxf/__tests__/formalExport.test.ts src/liner/dxf/__tests__/phase5JapaneseRemediationDxf.test.ts frontend/src/liner/drawing/__tests__/phase5Jip8DrawingSemantics.test.ts frontend/src/liner/drawing/phase5/formalDrawingFixtureManifest.test.ts` | PASS |
| `cd frontend && npm run parity:cli:build` | PASS |
| `cd frontend && npm run test -- src/bridgeDefinition/__tests__/parityCli.test.ts` | PASS |
| `cd frontend && PYTHON=/home/masaharu/Projects/spacer-clone/.venv/bin/python npm run test` | PASS |
| `cd frontend && PYTHON=/home/masaharu/Projects/spacer-clone/.venv/bin/python npm run test:regression` | PASS |
| `cd frontend && npm run lint` | PASS |
| `cd frontend && npm run build` | PASS, chunk-size warning only |
| `git diff --check` | PASS |

## E2E

No browser E2E was added in P5-D03 because the step validates the runtime `DrawingDocument` to DXF path directly, including parser smoke coverage. P5-D05 owns final visual E2E screenshot evidence at the required viewport sizes.

## Schema / Payload

- `ROAD_DESIGN_DOCUMENT_SCHEMA_VERSION`: unchanged (`0.1.0`)
- geometry payload version: unchanged (`0.2.0`)
- no migration required

## P5-D04 Handoff

P5-D04 must preserve the shared runtime `DrawingDocument` route and focus on persistence, reload, migration, and fail-closed hardening. It must not persist generated `DrawingDocument` artifacts.

## Verdict

```
P5_D03_VERDICT: COMPLETE_CANDIDATE
```
