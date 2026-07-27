# Apollo AP-11 — Final Verdicts

**Authority:** IMPLEMENTATION GOVERNANCE / AP-11  
**Date:** 2026-07-27  
**Checkpoint SHA:** TBD (filled at direct-main push)

## Governance verdicts

```text
AP11_IMPLEMENTATION_VERDICT: PASS
AP11_BINDING_METADATA_VERDICT: PASS
AP11_FAIL_CLOSED_VERDICT: PASS
AP11_STALE_UNBOUND_MISMATCH_VERDICT: PASS
AP11_EXPORT_AUTHORITY_VERDICT: PASS
AP11_PR40_BOUNDARY_VERDICT: PASS
AP11_LEGACY_BYPASS_VERDICT: PASS
AP11_NUMERIC_GOVERNANCE_VERDICT: PASS
AP11_VALIDATION_VERDICT: PASS
AP11_COMPLETION_VERDICT: COMPLETE
```

### Notes

- **BINDING_METADATA** — `buildRunAnalysisIf3Metadata` mirrors backend `if3_metadata` minimum fields; interim ProjectModel SoR via `resolveProjectModelSourceDocument`.
- **FAIL_CLOSED / STALE_UNBOUND_MISMATCH** — client guards reject unbound/mismatch/version/checksum-stale before POST; export gate attaches live `sourceDocument`.
- **EXPORT_AUTHORITY / PR40** — CSV/PDF remain on `if3ExportGate` + print catalog; no gate bypass.
- **LEGACY_BYPASS** — `openResultPdfReport` throws via `denyLegacyOpenResultPdfReport`.
- **NUMERIC** — no adopted numerics, no golden expecteds; solverVersion is engine SemVer identity only.
- **VALIDATION** — targeted Vitest + typecheck + build + Apollo hygiene PASS prior to checkpoint.
