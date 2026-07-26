# Stale and Reanalysis Rules — Apollo ↔ Frame (P07)

**Authority:** DESIGN PLANNING / STEP 1  
**Date:** 2026-07-27  
**Decision:** DEC-S1-0010  
**Base commit:** `a559871e3eb09e3c4e35b810d0a903be091dc4f2`

## Purpose

Define when bindings and results become **STALE**, what triggers **reanalysis**, and how stale state affects consumption vs export. Aligns BSDD document lifecycle, `AnalysisBinding`, IF3 result status, and transfer-record semantics.

**Planning only** — staleness detection implementation remains Frame/Apollo implementation work.

---

## STALE vocabulary (three distinct uses)

| Layer | Field | Meaning |
|-------|-------|---------|
| BSDD document | `lifecycleStatus: STALE` | Superstructure document bindings outdated (upstream/downstream checksum mismatch) |
| AnalysisBinding | `bindingStatus: stale` | Cross-SoR triple no longer consistent |
| IF3 result | `status: STALE` or consumer `STALE` | Result no longer matches bound BFAD/settings/load context |

These may co-occur but are **independent fields**. A transfer record may be `accepted` while BSDD remains `DRAFT` (`document_lifecycle.md`).

---

## Stale triggers

Any change below invalidates the binding triple at the affected hop. Detection compares pinned ID + revision + checksum (and settings/load checksums where applicable).

### Design document changes

| Trigger | Affected binding | Action |
|---------|------------------|--------|
| BSDD new revision (content edit) | `sourceBsdDocumentRef` ↔ `targetBfadDocumentRef` | Mark binding `stale`; BFAD export required |
| BSDD `lifecycleStatus` → SUPERSEDED | All bindings to prior revision | Historical audit only; active binding stale |
| EngineeringProject manifest pointer change | Manifest refs | Refresh active BSDD/BFAD pointers |

### Geometry changes

| Trigger | Affected binding | Action |
|---------|------------------|--------|
| Span length / girder spacing edit | BSDD → BFAD structural model | Re-export BFAD; stale result |
| GirderLine add/remove/reorder | BFAD nodes/members | Re-export; reanalysis |
| Deck extent or thickness intent change | BFAD deck loading regions | Re-export; reanalysis |
| Support location or fixity change | BFAD boundary conditions | Re-export; reanalysis |
| CoordinateContext change (including confidence → unknown) | Export gate | Block until resolved; then re-export |

### Material changes

| Trigger | Affected binding | Action |
|---------|------------------|--------|
| MaterialDefinition property ADOPTED value change | BFAD materials | Re-export; reanalysis |
| Material ID remap without stable lineage | Traceability break | Fail-closed; manual binding repair |
| `adoptionStatus` PENDING → ADOPTED | Load/magnitude eligibility | New revision event; may enable export |

### Section changes (Frame-owned)

| Trigger | Affected binding | Action |
|---------|------------------|--------|
| Section property edit in BFAD | `sourceContentChecksum` | Stale IF3 result |
| Section ID remap | Member mapping | Reanalysis with validation |

### Support changes

| Trigger | Affected binding | Action |
|---------|------------------|--------|
| Fixity or support node reassignment | BFAD supports | Stale result |
| Bearing type detail (deferred entity) | — | Out of Phase 1 scope |

### Load changes

| Trigger | Affected binding | Action |
|---------|------------------|--------|
| LoadCase add/remove | `loadContext` checksum | Stale result |
| Load magnitude change (when ADOPTED) | `loadContext` + magnitudes | Reanalysis |
| Load pattern or targetRef change | Load application | Re-export if geometry mapping changes |
| Slab/live load table update (when numerics ADOPTED) | BSDD loads → BFAD | Re-export; reanalysis |

### Combination / rule changes

| Trigger | Affected binding | Action |
|---------|------------------|--------|
| LoadCombination rules (ENT-CAND-0010) | `loadContext` | Deferred Phase 1; when introduced, stale on rule change |
| Analysis combination policy change in BFAD | `analysisSettingsChecksum` | Stale result |

### Engine / settings changes

| Trigger | Affected binding | Action |
|---------|------------------|--------|
| Solver version bump (`solverVersion`) | Result compatibility | Reanalysis recommended; may mark UNSUPPORTED |
| Analysis settings change (tolerances, options) | `analysisSettingsChecksum` | Stale result |
| Normalizer / IF3 schema major bump | Consumer gates | UNSUPPORTED until adapter updated |

### Transfer / road upstream changes

| Trigger | Affected binding | Action |
|---------|------------------|--------|
| RDD revision change (referenced by BSDD) | BSDD may → STALE | Refresh BSDD from road or accept drift |
| Transfer package checksum mismatch | `TransferRecord.status: stale` | Re-import; do not mutate package bytes |

---

## Reanalysis rules

### When reanalysis is required

Reanalysis (new `analysisRunId` + new `resultId`) is required when:

1. BFAD `contentChecksum` changed after a prior successful run.
2. `analysisSettingsChecksum` changed.
3. `loadContext` checksum changed for cases included in the run.
4. User requests explicit refresh after `bindingStatus: stale`.
5. Prior run `FAILED` / `INVALID` and blocking issue is resolved.

### When re-export only (no reanalysis yet)

1. BSDD changed but export adapter not yet run — binding `stale`, no valid BFAD to analyze.
2. Preview/dry-run export — non-authoritative ProjectModel; no IF3 binding expected.

### Immutable result rule

STALE does **not** mutate historical `FrameAnalysisResultResource` payloads. Staleness is:

- Consumer-derived (`if3ResultGate`, `if3_staleness.py`), or
- New registry pointer marking prior result non-current.

Rerun always creates new `analysisRunId`, `resultId`, and resource.

### Reanalysis workflow (planning)

```text
Detect stale (binding or consumer)
        │
        ▼
Block authoritative export (fail-closed)
        │
        ▼
User: refresh export OR edit source
        │
        ├── BSDD change ──► re-export BFAD ──► new BFAD revision/checksum
        │
        ▼
runAnalysis with complete if3 metadata (LIM-P03-001 prerequisite)
        │
        ▼
New FrameAnalysisResultResource
        │
        ▼
Update AnalysisBinding.resultResourceRef; bindingStatus → analyzed
```

---

## Consumption while STALE

| Consumer | STALE behavior |
|----------|----------------|
| Apollo superstructure UI | Show diagnostics; read-only stale overlay |
| Viewer | Display with explicit stale/non-authoritative state |
| CSV / PDF / JSON export | **Blocked** (`authoritativeOutputAllowed = false`) |
| PRINT | Blocked upstream — no bypass |
| DRAFT result sheets | Blocked for authoritative diagrams |
| Diagnostics-only views | Allowed |

See `export_authority_rules.md` for full matrix.

---

## Fail-closed summary

| Condition | Response |
|-----------|----------|
| STALE result + authoritative export request | Block; emit stale diagnostics |
| STALE binding + run without refresh | New run may succeed but consumer STALE if checksum mismatch |
| Unknown stale cause | Treat as INVALID until validated |
| Concurrent edit during run | Optimistic conflict → fail; no silent merge |

---

## Related artifacts

| Artifact | Path |
|----------|------|
| Document lifecycle | `document_lifecycle.md` |
| IF3 lifecycle design | `../../../road/phase6/if3/if3_result_lifecycle_and_staleness.md` |
| Export authority | `export_authority_rules.md` |
| Backend staleness | `backend/engine/if3_staleness.py` |
