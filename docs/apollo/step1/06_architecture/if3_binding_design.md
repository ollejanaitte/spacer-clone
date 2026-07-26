# IF3 Binding Design — Apollo ↔ Frame (P07)

**Authority:** DESIGN PLANNING / STEP 1  
**Date:** 2026-07-27  
**Decision:** DEC-S1-0010  
**Base commit:** `a559871e3eb09e3c4e35b810d0a903be091dc4f2`

## Purpose

Specify how Apollo Superstructure design artifacts bind to Frame analysis documents and IF3 result resources. Covers `AnalysisBinding` (BSDD-side planning entity), runtime `if3` metadata on `POST /api/analysis/run`, and the authoritative flag semantics used by consumer gates.

**Planning only** — client wiring remains an implementation task (BLK-S1-012, LIM-P03-001).

---

## Binding layers

```text
Layer 1 — Document provenance (persisted)
  AnalysisBinding on BSDD
    sourceBsdDocumentRef  → BSDD triple
    targetBfadDocumentRef → BFAD triple (post-export)
    resultResourceRef     → IF3 result triple (post-analysis)

Layer 2 — Run-time IF3 metadata (transient request)
  POST /api/analysis/run { if3: { … } }
    Mirrors BFAD identity for normalizer binding

Layer 3 — Normalized resource (persisted artifact)
  FrameAnalysisResultResource
    sourceDocumentId / Version / Checksum
    analysisRunId, resultId, status, payload

Layer 4 — Consumer gate (derived)
  if3ResultGate / if3ExportGate
    authoritativeOutputAllowed (boolean)
```

Layers 1 and 2 must agree at run time. Layer 3 is immutable once normalized. Layer 4 is derived and fail-closed.

---

## AnalysisBinding fields (BSDD / planning)

Defined in `schema_draft.json` and `apollo_data_model.md` (ADR-APO-006).

| Field | Required | Rule |
|-------|----------|------|
| `bindingId` | Yes | Stable UUID |
| `analysisType` | Yes | `static_linear` only (Phase 1) |
| `bindingStatus` | Yes | `pending` → `exported` → `analyzed` → `stale` |
| `sourceBsdDocumentRef` | Yes | Full document reference: `schemaId`, `documentId`, `revisionId`, `contentChecksum` |
| `targetBfadDocumentRef` | Post-export | Null until export succeeds; then exact BFAD triple |
| `resultResourceRef` | Post-analysis | Null until run succeeds; then `resultId` + checksum ref |
| `if3Metadata` | At run | Snapshot of fields sent to server (see below) |

### Binding status transitions

| Status | Meaning |
|--------|---------|
| `pending` | BSDD exists; no BFAD export yet |
| `exported` | BFAD revision created; ready for analysis |
| `analyzed` | Valid result resource bound |
| `stale` | Any triple mismatch; refresh or reanalysis required |

---

## IF3 metadata fields (run-time `if3` block)

Minimum required by server normalizer (`backend/engine/if3_normalizer.py`, `backend/tests/test_if3_api.py`):

| Field | Maps to | Required | Rule |
|-------|---------|----------|------|
| `sourceDocumentId` | BFAD `documentId` | Yes | UUID; `MISSING_SOURCE_BINDING` if absent |
| `sourceDocumentVersion` | BFAD `revisionId` | Yes | Positive integer |
| `sourceContentChecksum` | BFAD `contentChecksum` | Yes | SHA-256 content checksum object |
| `analysisSettings` | BFAD analysis settings block | Yes | Canonical object for `analysisSettingsChecksum` |
| `loadContext` | Active load cases / combinations | Yes | IDs + checksums for cases in run |
| `solverName` | Engine family | Yes | e.g. `scipy_sparse` |
| `solverVersion` | Engine SemVer | Yes | Invalid SemVer → diagnostic |

### Apollo-extended binding fields (planning — wire when BFAD path operational)

| Field | Purpose |
|-------|---------|
| `designDocumentRef` | BSDD `documentId` + `revisionId` + `contentChecksum` |
| `designDocumentSchemaId` | `spacer.contracts.bridge-superstructure-design-document` |
| `transferPackageId` | When frame model originated from road transfer |
| `transferRecordId` | Append-only transfer audit ref |
| `packageIds` | Ordered list of immutable package checksum refs (road transfer, export bundle) |
| `authoritative` | Request flag: consumer must treat result as engineering-authoritative only when binding complete |

**Rule:** `authoritative: true` without complete binding → normalizer emits diagnostics; gates remain fail-closed.

---

## Authoritative flag semantics

| Context | Field | When true | When false / absent |
|---------|-------|-----------|---------------------|
| Run request | `if3.authoritative` | Client intends authoritative run | Preview / diagnostic run |
| Consumer gate | `authoritativeOutputAllowed` | CSV/PDF/JSON/PRINT may export | All authoritative exports blocked |
| Result resource | Implicit via binding completeness | `SUCCEEDED` + complete binding + `VALID` availability | `MISSING_SOURCE_BINDING` → unbound |

**Fail-closed rule:** `UNBOUND` (missing `sourceDocumentId` / version / checksum) → `authoritativeOutputAllowed = false` regardless of solver success. Raw `AnalysisResult` may exist but must not pass IF3 export gates.

---

## Client binding gap (implementation prerequisite)

**LIM-P03-001** documents the current OSS state:

- Backend accepts `if3` via `extract_if3_metadata()` in `backend/app/main.py`.
- Tests supply full binding in `backend/tests/test_if3_api.py`.
- Frontend `apiClient.runAnalysis()` sends only `{ project, options }` — **no `if3` block**.

**Impact:** Normalizer emits `MISSING_SOURCE_BINDING`; `canExportAuthoritative` stays false after successful interactive runs (`frontend/src/App.tsx`).

**P07 planning closure:** Data model and binding field spec are defined here and in `AnalysisBinding`. **Runtime wiring** is explicitly deferred to Frame implementation (BLK-S1-012). Apollo Step 1 does not authorize production edits.

### Required client wiring (implementation checklist — not executed in P07)

1. Resolve BFAD `documentId`, `revisionId`, `contentChecksum` from Frame store or export adapter.
2. Attach BSDD `designDocumentRef` when Apollo export path exists.
3. Build `loadContext` from active `ProjectModel.loadCases` with checksums.
4. Pass `if3` object on every `runAnalysis` call intended for authoritative export.
5. On response, update `AnalysisBinding.resultResourceRef` and `bindingStatus`.

---

## Binding validation flow

```text
Client runAnalysis(project, if3)
        │
        ▼
extract_if3_metadata() ──► missing fields? ──► MISSING_SOURCE_BINDING diagnostic
        │
        ▼
normalize_linear_static_result_resource()
        │
        ▼
FrameAnalysisResultResource (immutable)
        │
        ▼
evaluateIf3ResultGate() ──► state: VALID | STALE | MISSING | INVALID | …
        │
        ▼
evaluateIf3ExportGate() ──► authoritativeOutputAllowed
```

---

## Cross-reference to physical Analyzer I/O

Historical Analyzer file exchange (IO-CAND-0003/0004) is **UNKNOWN**. IF3 binding design applies **only** to the spacer-clone logical path. No mapping from Analyzer physical fields to IF3 metadata is defined until BLK-S1-011 is resolved.

---

## Related artifacts

| Artifact | Path |
|----------|------|
| Interface contract | `interface_contract_draft.md` |
| Export authority matrix | `export_authority_rules.md` |
| Stale rules | `stale_and_reanalysis_rules.md` |
| ID / versioning | `id_and_versioning_rules.md` |
| IF3 output contract | `../../../road/phase6/if3/if3_result_output_contract_design.md` |
| Blocker register | `../04_gap_analysis/blocker_register.csv` (BLK-S1-012) |
