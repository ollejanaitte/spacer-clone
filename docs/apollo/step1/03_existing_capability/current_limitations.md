# Current Limitations — P03

**Authority:** DESIGN PLANNING / STEP 1  
**Date:** 2026-07-27  
**Base commit:** `5102c918acbc4da5e8570c4606b723b73979ea91`

Explicit limitations observed during P03 read-only inventory. These are **current OSS facts**, not Step 1 acceptance verdicts.

---

## LIM-P03-001 — IF3 binding metadata not sent from `runAnalysis` (client)

**Severity:** HIGH (blocks authoritative IF3 export in default UI path)  
**Classification:** CURRENT LIMITATION

The backend analysis endpoints accept optional `if3` (or `sourceBinding`) metadata via `extract_if3_metadata()` in `backend/app/main.py`. Tests in `backend/tests/test_if3_api.py` supply full binding (`sourceDocumentId`, `sourceDocumentVersion`, `sourceContentChecksum`, `loadContext`, etc.).

The frontend `apiClient.runAnalysis()` in `frontend/src/api/client.ts` sends only:

```json
{ "project": "<ProjectModel>", "options": { "returnCsv": true|false } }
```

No `if3` block is attached. The normalizer (`backend/engine/if3_normalizer.py`) therefore emits `MISSING_SOURCE_BINDING` diagnostics and the IF3 resource fails authoritative consumer gates (`if3ResultGate`, `if3ExportGate`). `App.tsx` applies `if3Result` from the response but `canExportAuthoritative` remains false for typical interactive runs.

**Impact:** CSV/PDF/`result.json` authoritative export controls in the UI are fail-closed even immediately after a successful analysis, unless a separate code path supplies binding metadata (not present in default client).

**Evidence:** `frontend/src/api/client.ts` L187–191; `backend/app/main.py` L135–136, L462–466; `docs/road/phase6/if3/if3_consumer_contracts.md`.

**Apollo note:** Reuse of IF3 contract infrastructure requires wiring client→server binding (BFAD identity/checksum or interim bridge) before authoritative output claims.

---

## LIM-P03-002 — Target Standard NOT_SELECTED

**Severity:** BLOCKER for numeric freeze (not a code absence)  
**Classification:** GOVERNANCE LIMITATION (P02 carry-forward)

Target Standard remains **NOT_SELECTED** per P02 `target_standard_decision.md` and handoff `PACKAGE_INFO.md`. P03 does not re-decide.

**Impact:** No binding 道示 edition; READY 69 numeric requirements cannot be frozen; material property adoption prohibited except PLACEHOLDER.

**Register:** DEC-S1-0004; ISS-S1-008; BLK-S1-001.

---

## LIM-P03-003 — PRINT / OD8-04 visual release blocked

**Severity:** MEDIUM (semantic implementation allowed; visual claims blocked)  
**Classification:** CURRENT LIMITATION

OD8-04 (controlled visual baseline environments) remains **OPEN** in `docs/planning/stage6-10/open_decisions.md`. Phase 6 records status as `OPEN_NONBLOCKING_FOR_IMPLEMENTATION`: semantic tests and IF3 gates may proceed; **final visual release claims** for GDRAW/PRINT/DRAFT/Viewer are blocked.

**Impact:**

- PR-40 PRINT: `CONDITIONAL_GO` — catalog/DTO implemented; visual parity not claimable.
- PR-41 DRAFT: `NOGO` — additionally blocked by SP1 neutral Frame drawing path.
- PR-42 Viewer: `CONDITIONAL_GO` — adapter checklist + OD8-04 remain.

**Evidence:** `docs/road/phase6/phase6_dependency_status.md`; `if3/README.md` L49.

---

## LIM-P03-004 — Analyzer physical I/O format UNKNOWN

**Severity:** HIGH (external boundary)  
**Classification:** CURRENT LIMITATION

Handoff records Analyzer input and output physical formats as **UNKNOWN** (not confirmed from manuals). Register: ISS-S1-007; IO-CAND-0003, IO-CAND-0004; `features/feature_data_flow.md`.

**Impact:** Cannot map APOLLO SuperDesigner↔Analyzer file exchange to OSS interfaces; cannot claim parity with historical Analyzer workflow.

**OSS state:** Internal JSON `ProjectModel`/`AnalysisResult` exists; it is **not** evidence of APOLLO Analyzer wire format.

---

## LIM-P03-005 — Dual system-of-record (ProjectModel vs target documents)

**Severity:** MEDIUM (architectural)  
**Classification:** CURRENT LIMITATION

Operational Frame editing and analysis use legacy `ProjectModel`. Target `BridgeFrameAnalysisDocument`, `RoadDesignDocument`, and transfer artifacts exist as validated infrastructure but are not the primary mutable SoR in `App.tsx`.

**Impact:** Contract conformance ≠ product behavior; migration/apply work remains (Stage 10).

**Evidence:** `docs/frame/README.md`; `docs/transfer/contract-index.md`; DEC-S1-0005.

---

## LIM-P03-006 — Road-to-Frame apply not operational

**Severity:** HIGH for integrated Road→Frame workflow  
**Classification:** CURRENT LIMITATION

Schemas, validators, and planning contracts exist. No main-app import/preview/apply lifecycle. Open decisions OD6-01 (coordinate authority), OD6-02 (stable IDs), OD9-01 (legacy field semantics) block apply.

---

## LIM-P03-007 — IF3 persistence requires server-side frame document path

**Severity:** MEDIUM  
**Classification:** CURRENT LIMITATION

`maybe_persist_linear_static_if3_result()` requires `if3.frameDocumentPath` and `if3.frameDocumentChecksum`. Default client does not send these; `persistedResultRef` is omitted in normal UI runs.

---

## LIM-P03-008 — Legacy raw result export fallback

**Severity:** LOW  
**Classification:** CURRENT LIMITATION

`App.tsx` can download `result.json` from raw `resultExports` or `result` when IF3 export is blocked (diagnostic path). IF3 policy prohibits treating this as authoritative; UI disables authoritative buttons when gate fails.

---

## LIM-P03-009 — JIS source gaps (34)

**Severity:** HIGH for material numeric authority  
**Classification:** CURRENT LIMITATION

34 JIS primary gaps in handoff `jis_source_gaps.csv`. Blocks steel/bolt/rebar product property adoption. Related to LIM-P03-002.

**Register:** ISS-S1-009; BLK-S1-002.

---

## LIM-P03-010 — Time history scope and limitations

**Severity:** MEDIUM  
**Classification:** CURRENT LIMITATION

Time history is implemented with documented constraints (SDOF verification path, known limitations doc). Not equivalent to full APOLLO time-history scope. IF3 timeHistory kind may lack WRITE_TARGET provenance for legacy wraps.

**Evidence:** `docs/frame/verification/time-history-known-limitations.md`; `if3LegacyCompatibility.ts` binding warnings.

---

## LIM-P03-011 — PR-41 Frame DRAFT NOGO

**Severity:** MEDIUM  
**Classification:** CURRENT LIMITATION

`if3DraftEligibility.ts` exists but SP1 neutral/shared Frame drawing path is unverified. Formal Frame DRAFT/DXF authoritative output cannot be claimed.

---

## Limitations explicitly N/A in P03

| Topic | P03 disposition |
|-------|-----------------|
| Target Standard selection | Recorded in P02 only; not re-litigated |
| Handoff READY 69 implementation authorization | Out of scope — inventory describes OSS repo state |
| Production deployment readiness | Out of scope — Step 1 planning |

---

## Cross-reference

| ID | Matrix rows | Issue register |
|----|-------------|----------------|
| LIM-P03-001 | CAP-IF3-005, CAP-IF3-003 | — (new observation) |
| LIM-P03-002 | CAP-EXT-002 | ISS-S1-008 |
| LIM-P03-003 | CAP-OUT-005, CAP-OUT-007, CAP-VER-003 | — |
| LIM-P03-004 | CAP-EXT-001 | ISS-S1-007 |
| LIM-P03-005 | CAP-XFR-004, CAP-FRM-007 | — |
| LIM-P03-006 | CAP-XFR-005 | OD6-01, OD6-02 |
| LIM-P03-009 | CAP-EXT-003 | ISS-S1-009 |
