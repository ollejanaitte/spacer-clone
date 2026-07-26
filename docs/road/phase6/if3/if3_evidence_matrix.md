# IF3 Evidence Matrix

**Date:** 2026-07-26
**Status:** IMPLEMENTATION_EVIDENCE_RECORDED

## Authoritative Evidence

| Source | Evidence used |
| --- | --- |
| `docs/road/phase6/if3/*` design package | IF3 contract, lifecycle, consumer, and implementation plan |
| Merged IF3-A..D work on `origin/main` through `3f24b98` | Result schema, normalizer/staleness, persistence/reload, consumer adapters |
| IF3-E compatibility modules | `if3LegacyCompatibility.ts`, `if3_legacy_compatibility.py` |

## Implementation Evidence

| Source | Evidence used | IF3 implication |
| --- | --- | --- |
| `frontend/src/contracts/frameAnalysisResultResource.ts` | Stable identity, binding, provenance, payload catalog | IF3-A contract present |
| `backend/engine/if3_normalizer.py` | Raw solver wrap into IF3 resource | IF3-B normalizer present |
| `backend/engine/if3_staleness.py` / availability | Stale/missing/unsupported states | IF3-B/C availability present |
| `backend/engine/if3_persistence.py` | Immutable resource persistence and refs | IF3-C present |
| `frontend/src/results/if3ResultGate.ts` | Authoritative consumer gate | IF3-D present |
| `frontend/src/exports/if3ExportGate.ts` | CSV/PDF/member-force authoritative export gate | IF3-D Report/PRINT boundary present |
| `frontend/src/draft/if3DraftEligibility.ts` | DRAFT sheet eligibility + SP1 remaining blocker | IF3-D DRAFT adapter present; SP1 still blocks PR-41 |
| `frontend/src/results/if3LegacyCompatibility.ts` | READ_OLD_WRITE_TARGET classification and consumer capability matrix | IF3-E present |
| `backend/engine/if3_legacy_compatibility.py` | Backend parity for legacy quarantine / WRITE_TARGET eligibility | IF3-E present |

## Gap Matrix

| Requirement | Current evidence | Design resolution | Implementation status |
| --- | --- | --- | --- |
| Stable result identity | `resultId` generated/validated | Required | Implemented |
| Run identity | `analysisRunId` generated/validated | Required | Implemented |
| Model/result binding | source document ID/version/checksum binding | Required | Implemented |
| Result provenance | required provenance + missing-provenance blocks | Required | Implemented |
| Staleness | availability/staleness + consumer blocks | Required | Implemented |
| Persisted resource | hybrid persistence + refs | Required | Implemented |
| Consumer source contract | Report/Viewer/DRAFT/PRINT adapters | Required | Implemented for semantic gates |
| Raw result compatibility | READ_OLD_WRITE_TARGET classifier | Quarantine; never invent provenance | Implemented (IF3-E) |
| Schema/migration | result resource schema + WRITE_TARGET eligibility | No invented provenance migration | Implemented for IF3 semantic gates |
| PRINT catalog completeness | existing CSV/PDF adapters + IF3 gates | P6-D04 / PR-40 catalog work | Remaining for PR-40 body |
| SP1 Frame drawing path | DRAFT still reports SP1 blocker | Required for PR-41 | Remaining |
| OD8-04 visual baseline | still OPEN | Visual release blocker | Remaining |

## Evidence Verdict

```text
IF3_EVIDENCE_BASELINE_VERDICT: SUPERSEDED_BY_IMPLEMENTATION
IF3_DESIGN_EVIDENCE_VERDICT: DESIGN_DEFINED
IF3_IMPLEMENTATION_EVIDENCE_VERDICT: IF3_A_THROUGH_E_PASS_FOR_SEMANTIC_GATES
PR40_READINESS: CONDITIONAL_GO
PR41_READINESS: NOGO
PR42_READINESS: CONDITIONAL_GO
```
