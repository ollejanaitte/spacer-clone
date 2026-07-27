# AP-11 Charter — IF3 Client Binding

**Authority:** IMPLEMENTATION GOVERNANCE / AP-11  
**Date:** 2026-07-27  
**Decision:** DEC-AP11-0001  
**Base commit:** TBD (direct-main checkpoint)

## Purpose

AP-11 closes **LIM-P03-001**: the App must send authoritative IF3 source-binding metadata with static analysis requests and must fail closed when binding is missing, stale, or mismatched relative to the current `ProjectModel`.

## Goals

| # | Goal |
|---|------|
| G-01 | Resolve interim `ProjectModel` source document identity (documentId, revisionId, contentChecksum) |
| G-02 | Build `RunAnalysisIf3Metadata` aligned with backend `if3_metadata()` |
| G-03 | Validate and assert binding before `apiClient.runAnalysis` POST |
| G-04 | Attach `sourceDocument` in `buildAppIf3ExportGateInput` for PR-40 export fail-closed |
| G-05 | Block legacy `openResultPdfReport` raw AnalysisResult PDF bypass |

## Non-goals

| Non-goal | Rationale |
|----------|-----------|
| Frame document persistence path | No Frame store in App path |
| Apollo-extended BSDD fields | No BSDD operational path in AP-11 |
| Adopted numerics / golden values | Forbidden under AP-00 governance |
| Phase 1 workspace expansion | Out of AP-11 scope |
| Changing `VITE_APOLLO_PHASE1_ENABLED` default | Must remain OFF unless explicitly `"true"` |

## Deliverables

- `frontend/src/if3/*` modules and Vitest coverage
- `apiClient.runAnalysis(project, returnCsv, if3?)` wiring
- App + comparison workspace authoritative IF3 metadata on analysis run
- `docs/apollo/ap11/*` governance artifacts (this tree)

## Success criteria

1. App path calls `buildRunAnalysisIf3Metadata(project, { authoritative: true })` before `runAnalysis`
2. Client rejects unbound / mismatched / stale metadata before network I/O
3. Export gate uses current project `sourceDocument` binding
4. Legacy PDF bypass throws; IF3-gated PDF path remains available
5. Required Vitest suites pass; no numerics/golden fixtures added
