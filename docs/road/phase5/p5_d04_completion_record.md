# P5-D04 Completion Record

**Date:** 2026-07-22
**Status:** COMPLETE CANDIDATE
**Phase:** Road Formal Drawing Completion and JIP-LINER Parity
**D-step:** P5-D04 Persistence, Reload, Migration, and Fail-Closed Hardening

## Official Scope

P5-D04 hardens the formal drawing persistence boundary and fail-closed export behavior:

- persist drawing settings only through the RoadDesignDocument/domain draft path
- keep generated `DrawingDocument` runtime-only
- regenerate deterministic preview/print/DXF documents after reload
- include formal drawing-affecting settings in `sourceRevision`
- block export availability when error-level drawing diagnostics exist
- preserve schemaVersion and payloadVersion policy

## Implemented

- Added `drawingSettings` to the liner `sourceRevision` input so formal drawing setting changes cannot reuse stale revision identity.
- Updated DXF export availability to reject `DrawingDocument` instances with error-level diagnostics.
- Added P5-D04 focused tests for recursive no-`DrawingDocument` persistence, reload regeneration, drawingSettings-driven source revision changes, and error diagnostic export blocking.

## Existing Implementation Map

| Area | P5-D04 Result |
| --- | --- |
| DrawingSettings persistence | IMPLEMENTED_VERIFIED |
| Runtime DrawingDocument regeneration | IMPLEMENTED_VERIFIED |
| DrawingDocument persistence prohibition | IMPLEMENTED_VERIFIED |
| Legacy RDD/domain draft read path | IMPLEMENTED_VERIFIED by existing persistence tests |
| sourceRevision drawing setting sensitivity | IMPLEMENTED_VERIFIED |
| Error-level drawing diagnostic export block | IMPLEMENTED_VERIFIED |
| DXF error diagnostics | IMPLEMENTED_VERIFIED through existing mapper/export diagnostics |
| Schema/payload migration | IMPLEMENTED_VERIFIED; no version bump required |

## Non-Scope

- No UI changes.
- No DXF CAD preset expansion.
- No new drawing semantics.
- No visual E2E; P5-D05 owns final visual evidence.
- No schemaVersion or payloadVersion change.
- No persisted `DrawingDocument` or generated artifact.

## Changed Files

- `frontend/src/liner/adapters/linerProjectDraft.ts`
- `frontend/src/liner/dxf/export/exportFormalDrawingDxf.ts`
- `frontend/src/liner/drawing/__tests__/phase5PersistenceFailClosed.test.ts`
- `docs/road/phase5/p5_d04_completion_record.md`

## Validation

| Command | Result |
| --- | --- |
| `cd frontend && npm run typecheck` | PASS |
| `cd frontend && npm run test -- src/liner/drawing/__tests__/phase5PersistenceFailClosed.test.ts src/liner/drawing/__tests__/drawingSettingsPersistence.test.ts src/liner/dxf/__tests__/formalExport.test.ts` | PASS, 3 files / 14 tests |
| `cd frontend && npm run parity:cli:build` | PASS |
| `cd frontend && npm run test -- src/bridgeDefinition/__tests__/parityCli.test.ts` | PASS |
| `cd frontend && PYTHON=/home/masaharu/Projects/spacer-clone/.venv/bin/python npm run test` | PASS |
| `cd frontend && PYTHON=/home/masaharu/Projects/spacer-clone/.venv/bin/python npm run test:regression` | PASS |
| `cd frontend && npm run lint` | PASS |
| `cd frontend && npm run build` | PASS, chunk-size warning only |
| `git diff --check` | PASS |

## E2E

No E2E was added in P5-D04 because the change is persistence/export gate logic covered by unit and integration tests. P5-D05 owns final visual E2E evidence.

## Schema / Payload

- `ROAD_DESIGN_DOCUMENT_SCHEMA_VERSION`: unchanged (`0.1.0`)
- geometry payload version: unchanged (`0.2.0`)
- no migration required

## P5-D05 Handoff

P5-D05 must use this persistence/fail-closed baseline for final visual verification and Phase 5 completion records. P5-D05 must not introduce additional feature scope.

## Verdict

```
P5_D04_VERDICT: COMPLETE_CANDIDATE
```
