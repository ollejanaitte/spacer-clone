# IF3 Evidence Matrix

**Date:** 2026-07-25
**Status:** DESIGN_EVIDENCE_RECORDED

## Authoritative Evidence

| Source | Evidence used |
| --- | --- |
| `docs/road/phase6/phase6_dependency_status.md` | IF3 is partial and blocks PR-40/41/42; missing binding, staleness, provenance, source contracts |
| `docs/road/phase6/phase6_sp1_if3_evidence_matrix.md` | `BridgeFrameAnalysisDocument` exists; versioning partial; IF3 result binding/staleness/provenance/source contracts not found |
| `docs/planning/stage6-10/target_data_model.md` | Conceptual Persisted Result Resource fields and fail-closed binding rules |
| `docs/road/phase6/d04/p6_d04_print_design.md` | PRINT consumes valid IF3-bound result resources and must not export stale results |
| `docs/road/phase6/d05/p6_d05_frame_draft_design.md` | DRAFT result sheets require valid bound result resources |
| `docs/road/phase6/d06/p6_d06_viewer_design.md` | Viewer adapters require result resource ID/checksum binding and staleness diagnostics |
| `docs/road/phase6/phase6_pr_readiness_matrix.md` | PR-40/41/42 are NOGO until IF3 is verified |
| `docs/road/phase6/phase6_scope_matrix.md` | PR scopes and non-scope guardrails prohibit source-of-truth mutation and PR-40/41/42 GO before IF3 |
| `docs/road/phase6/phase6_implementation_sequence.md` | PR-40/41/42 may prepare only without bypassing IF3 contracts |
| `docs/road/phase6/phase6_implementation_readiness_gate.md` | Authoritative Frame outputs remain NOGO until IF3 evidence exists |

## Implementation Evidence

| Source | Evidence used | IF3 implication |
| --- | --- | --- |
| `frontend/src/types.ts` | `AnalysisResult` has `projectId`, `schemaVersion`, summary, rows, warnings, errors | Raw result shape lacks stable `resultId`, source checksum, binding, provenance |
| `frontend/src/types.ts` | `ProjectModel.analysisResults` persists only MVP time-history block | Existing persistence is narrow and not IF3 resource persistence |
| `frontend/src/contracts/bridgeFrameAnalysisDocument.ts` | Document envelope, provenance, checksum, revision, validation exist | Source document can support binding inputs |
| `frontend/src/contracts/bridgeFrameAnalysisDocument.ts` | `persistedResultRefs?: DocumentReference[]` exists and validates kind `persisted-result` | Reference field exists but is optional and not populated as authoritative IF3 registry |
| `frontend/src/contracts/provenance.ts` | Shared `Provenance` type and validator exist | Reusable for result provenance, but result provenance is absent today |
| `frontend/src/contracts/contentChecksum.ts` | SHA-256 checksum type and validator exist | Reusable for source/result/settings checksums |
| `frontend/src/results/resultViewModel.ts` | View model consumes `AnalysisResult` and derives IDs from `projectId` and load case | Viewer path needs IF3 adapter and stable `resultId` |
| `frontend/src/exports/resultCsvExport.ts` | CSV export consumes `AnalysisResult` directly | PRINT/export path needs IF3 validation gate |
| `frontend/src/exports/resultPdfReport.ts` | PDF report consumes `ProjectModel` and `AnalysisResult` directly | Report source contract not IF3-authoritative yet |
| `frontend/src/exports/memberForceReport.ts` | Member force CSV consumes `AnalysisResult` directly | Report sub-path needs IF3 adapter |
| `backend/engine/solver.py` | Solver returns raw dict from `build_success_result` or `error_result` | Normalizer/resource layer missing |
| `backend/engine/results.py` | Success result builds raw `projectId`/summary/result rows | No result ID, provenance, source checksum, or resource checksum |
| `backend/app/main.py` | Analysis endpoints return `{ result }` raw payloads; optional CSV generated from raw result | API boundary currently exposes raw solver result as authoritative-looking payload |
| `backend/app/reports.py` | Backend CSV export builds directly from raw result dict | Backend export path needs IF3 validation gate |

## Gap Matrix

| Requirement | Current evidence | Design resolution | Implementation status |
| --- | --- | --- | --- |
| Stable result identity | Not found | `resultId` required | Missing |
| Run identity | Not found | `analysisRunId` required | Missing |
| Model/result binding | `projectId` only in raw result | Source document ID/version/checksum/settings/load binding | Missing |
| Result provenance | Document provenance only | Result provenance required | Missing |
| Staleness | Not found | State machine and checksum comparison | Missing |
| Persisted resource | Conceptual docs only | Hybrid persistence with `persistedResultRefs` | Missing |
| Consumer source contract | D04/D05/D06 draft gates only | Unified Report/Viewer/DRAFT contract | Missing |
| Raw result compatibility | Existing implementation uses raw result | Read-old/write-target, non-authoritative | Missing |
| Schema/migration | Partial contract registry for source docs | IF3 schema change required | Missing |

## Evidence Verdict

```text
IF3_EVIDENCE_BASELINE_VERDICT: NOGO_BEFORE_DESIGN
IF3_DESIGN_EVIDENCE_VERDICT: DESIGN_DEFINED_IMPLEMENTATION_MISSING
```

