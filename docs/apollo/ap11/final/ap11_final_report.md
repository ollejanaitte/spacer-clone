# Apollo AP-11 — Final Report

**Authority:** IMPLEMENTATION GOVERNANCE / AP-11  
**Date:** 2026-07-27  
**Supervisor:** Grok 4.5  
**Worker:** Composer 2.5  
**Checkpoint SHA:** `7f73c4c624c2c12dd972cb0291aa9d320f88028a`  
**Operation:** direct `main` checkpoint (no PR / no feature branch)

## Summary

AP-11 closes **LIM-P03-001** (client portion of BLK-S1-012):

1. Authoritative `if3` metadata is built from interim ProjectModel source binding and sent on `POST /api/analysis/run`.
2. Incomplete / mismatched / stale bindings are rejected fail-closed on the client before fetch.
3. App export path attaches live `sourceDocument` so PR-40 IF3 export gates deny CSV/PDF when binding drifts after analysis.
4. Legacy `openResultPdfReport` raw-PDF entry is blocked.

## Implemented

| Area | Location |
|------|----------|
| Source binding | `frontend/src/if3/projectModelSourceBinding.ts` |
| Metadata builder | `frontend/src/if3/buildRunAnalysisIf3Metadata.ts` |
| Binding guards | `frontend/src/if3/runAnalysisBindingGuard.ts` |
| Legacy PDF deny | `frontend/src/if3/legacyPdfBypassGuard.ts` |
| API wiring | `frontend/src/api/client.ts`, `buildBackendProject.ts` |
| App / compare | `App.tsx`, `ModelComparisonWorkspace.tsx` |
| Export sourceDocument | `frontend/src/exports/if3ExportGate.ts` |
| Tests | `frontend/src/if3/__tests__/`, `frontend/src/api/client.if3.test.ts` |
| Docs | `docs/apollo/ap11/` |

## Rejected / not implemented

- BSDD / AnalysisBinding persistence (AP-01 / AP-02)
- Apollo-extended `designDocumentRef` fields (no operational BSDD yet)
- `frameDocumentPath` persistence context (no Frame store in App path)
- Golden numerics / Target Standard adoption
- Analyzer physical I/O claims
- Feature-flag default ON
- Eigen / spectrum / influence binding expansion beyond static_linear

## Verification

```bash
cd frontend
npm test -- --run src/if3 src/api/client.if3.test.ts src/exports/if3ExportGate.test.ts src/results/if3ResultGate.test.ts src/apollo
npm run typecheck
npm run build
node ../scripts/check_apollo_source_hygiene.mjs
```

## Remaining blockers (unchanged)

- Target Standard NOT_SELECTED
- JIS SOURCE GAP (34)
- Analyzer physical I/O UNKNOWN
- Full BLK-S1-012 export package (AP-10) still downstream

## Verdict

See [ap11_verdicts.md](ap11_verdicts.md).
