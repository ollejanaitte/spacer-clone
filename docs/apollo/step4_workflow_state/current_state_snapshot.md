# Current State Snapshot (derived, non-persisted)

Verified via `frontend/src/apollo/workflow/__tests__/workflowState.test.ts` and
E2E-S4A-001/002/003. All states are recomputed from current project data.

## Empty project (`createDefaultProject()`)

| Step | Status | Notes |
|------|--------|-------|
| WF-01 | BLOCKED | PLANNED stub (WF_CAPABILITY_PLANNED) |
| WF-02 | RECOMMENDED | first actionable; prerequisites satisfied (binding excluded) |
| WF-03 | BLOCKED | PLANNED stub |
| WF-04 | NOT_STARTED | prereq WF-02 not complete |
| WF-05 | BLOCKED | PLANNED stub |
| WF-06 | BLOCKED | PLANNED stub |
| WF-07 | NOT_STARTED | prereqs not satisfied |
| WF-08..WF-15 | NOT_STARTED | downstream |
| recommended | WF-02 | exactly one |

## Valid generated project (SIMPLE_SINGLE, `fillSimpleSingleBridgeStructureInput` + generate)

| Step | Status | Notes |
|------|--------|-------|
| WF-02, WF-04 | COMPLETE | NOT_AUTHORIZED + DEVELOPMENT_ONLY badge |
| WF-07 | COMPLETE | load confirmation (PARTIAL capability) |
| WF-08, WF-09 | READY/RECOMMENDED | PARTIAL — never false-COMPLETE |
| WF-10, WF-12 | COMPLETE | quantity/report current (checksum aligned) |
| WF-11 | COMPLETE | 3D model build ok |
| WF-13 | COMPLETE | GA sheets >= 7 (SIMPLE_SINGLE) |
| WF-14 | COMPLETE | integrated outputs consistency PASS |
| WF-15 | NOT_STARTED/READY | requires explicit human ack — never auto-COMPLETE |
| WF-01, WF-03, WF-05, WF-06 | BLOCKED | PLANNED stubs |

## CONTINUOUS generated project (5x40m)

- WF-13 → BLOCKED with `WF_UNSUPPORTED_SCOPE`: GA drawing set is
  SIMPLE_SINGLE-only (`drawingSetModel.ts` — "SIMPLE_SINGLE only"); continuous
  girders are out of the current drawing scope.
- WF-14 depends on WF-13, so it cannot reach COMPLETE for CONTINUOUS.

## STALE after input mutation (generated project, width 12 → 13/14)

WF-02, WF-04, WF-07, WF-10, WF-11, WF-12, WF-13, WF-14 → **STALE**
with `WF_RESULT_STALE`. Recommended step becomes the STALE producer (WF-02).

## Corruption / invalid input

- Corrupted `apolloBridgeStructureInput` → ERROR with `WF_EXECUTION_ERROR`
  (`corruptedEvidence` returns safe evidence with null checksums).
- Invalid field (e.g. width = -5) → BLOCKED with `WF_INPUT_INVALID`.
- Partial input (width = null) → INCOMPLETE (promoted to RECOMMENDED when it is
  the recommended step).
