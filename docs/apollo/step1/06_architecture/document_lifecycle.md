# Document Lifecycle — Apollo Step 1

**Authority:** DESIGN PLANNING / STEP 1  
**Date:** 2026-07-27  
**Decision:** DEC-S1-0009  
**Base commit:** `849fef17a62a63994394cfddd11b71c1f76c1350`

## Purpose

Define lifecycle states for Apollo planning documents — primarily `BridgeSuperstructureDesignDocument` (BSDD) and cross-referenced contract artifacts. Align with existing repo semantics where evidence exists; mark planning-only extensions explicitly.

## Scope

| In scope | Out of scope |
|----------|--------------|
| BSDD revision lifecycle | Production UI workflow implementation |
| EngineeringProject manifest refs | Handoff package metadata rewrite |
| Cross-ref to IF3 result `STALE` | Solver run queue orchestration |
| TransferRecord apply statuses | |

## State vocabulary

### Document revision lifecycle (`lifecycleStatus`)

Used on BSDD, RDD refs, BFAD refs, and EngineeringProject manifest entries.

| State | Meaning | Mutable content? | Repo alignment |
|-------|---------|------------------|----------------|
| **DRAFT** | Work in progress; not engineering-approved | Yes (new revision on save) | Handoff `PACKAGE_INFO.md` uses DRAFT as packaging label; Step 1 interprets independently per `terminology_and_status_rules.md` |
| **VALIDATED** | Schema, scope preflight, and reference integrity checks passed | Yes (returns to DRAFT on edit, or new revision) | Planning extension; analogous to contract validation gates in transfer preflight |
| **APPROVED** | Engineering sign-off for the frozen archetype inputs covered by this revision | No — edits require new revision | Planning extension; no production enum in v0.1 schemas yet |
| **SUPERSEDED** | A newer revision exists; this revision is retained for audit | No | Aligns with `supersedes` on `TransferRecord`; IF3 evidence matrix uses SUPERSEDED_BY_IMPLEMENTATION wording |
| **STALE** | Referenced upstream/downstream artifact changed; binding invalid until refresh | No (refresh creates new revision or binding) | **Repo-aligned:** `FrameAnalysisResultResource.status`, `if3ResultGate`, `transfer-record.schema.json` (`stale`) |
| **ARCHIVED** | Retained for history; excluded from active workflows | No | Planning extension; no automatic deletion |

### Distinct: IF3 result availability status

IF3 uses `status` / `availabilityStatus` on `FrameAnalysisResultResource` with values including `STALE`, `FAILED`, `PARTIAL`, `completed`. These govern **result consumption**, not BSDD document authoring. See `frontend/src/contracts/frameAnalysisResultResource.ts`.

**Rule:** BSDD `lifecycleStatus: STALE` means the superstructure document's bindings are outdated; IF3 `STALE` means the result no longer matches its BFAD/load binding. Both may co-occur but are independent fields.

### Distinct: TransferRecord apply status

`TransferRecord.status` enum (`previewed`, `rejected`, `partially-accepted`, `accepted`, `conflicted`, `stale`, `rolled-back`) governs **import apply outcomes**, not BSDD authoring. A transfer record may be `accepted` while the resulting BSDD revision remains `DRAFT`.

## State transition diagram

```text
                    ┌──────────┐
         create     │  DRAFT   │◄────────────────┐
        ──────────► │          │                 │ edit (new revision)
                    └────┬─────┘                 │
                         │ validate              │
                         ▼                       │
                    ┌──────────┐                 │
                    │VALIDATED │─────────────────┘
                    └────┬─────┘
                         │ approve
                         ▼
                    ┌──────────┐     new revision    ┌─────────────┐
                    │ APPROVED │ ─────────────────► │ SUPERSEDED  │
                    └────┬─────┘                    └─────────────┘
                         │ upstream/downstream       ▲
                         │ binding break             │ prior rev
                         ▼                           │
                    ┌──────────┐                     │
                    │  STALE   │ ─── refresh ──────┘
                    └────┬─────┘
                         │ archive policy
                         ▼
                    ┌──────────┐
                    │ ARCHIVED │
                    └──────────┘
```

## Transition rules

| From | To | Trigger | Actor |
|------|-----|---------|-------|
| — | DRAFT | Document create | Apollo Superstructure |
| DRAFT | VALIDATED | Schema + scope preflight pass | Validation service |
| VALIDATED | DRAFT | Content edit (same revision abandoned) or failed re-validation | Apollo Superstructure |
| VALIDATED | APPROVED | Explicit approval action | Accountable engineer / workflow |
| APPROVED | SUPERSEDED | New APPROVED revision published | Apollo Superstructure |
| * | STALE | Referenced RDD/BFAD/result checksum mismatch; scope assumption change | System detection |
| STALE | DRAFT | User initiates refresh from current upstream refs | Apollo Superstructure |
| SUPERSEDED / STALE | ARCHIVED | Retention policy or project close | Admin / policy |
| APPROVED | ARCHIVED | Project archival without newer revision | Admin / policy |

## Fail-closed rules

1. **Export to Frame** — BSDD must be `VALIDATED` or `APPROVED`; `DRAFT` export blocked unless explicit preview/dry-run flag (non-authoritative).
2. **Authoritative IF3 export** — Requires valid `AnalysisBinding` and non-`STALE` result resource (DEC-S1-0006, BLK-S1-012).
3. **Numeric adoption** — Transition to `APPROVED` with ADOPTED numerics blocked while Target Standard is `NOT_SELECTED` (BLK-S1-001).
4. **STALE consumption** — Viewer may display STALE results as diagnostics only; CSV/PDF/authoritative export blocked per `if3ExportGate`.
5. **No in-place downgrade** — `APPROVED` → `DRAFT` on same revision forbidden; create new revision instead.

## Alignment matrix (repo evidence)

| Concept | Repo location | Apollo planning use |
|---------|---------------|---------------------|
| Result STALE | `schemas/contracts/v0.1/frame-analysis-result-resource.schema.json`, `backend/engine/if3_staleness.py` | Same semantics for result binding |
| Transfer stale | `transfer-record.schema.json` `status: stale` | Import package no longer matches target |
| DRAFT (package) | Handoff `PACKAGE_INFO.md` | Packaging label only; not BSDD state |
| Revision immutability | `target_data_model.md`, BFAD `revisionId` | BSDD follows same pattern |
| SUPERSEDED | `transfer-record.schema.json` `supersedes` | Prior revision retention |

## Phase 1 defaults

| Artifact | Initial state on create | Notes |
|----------|----------------------|-------|
| BSDD | DRAFT | All new superstructure work |
| AnalysisBinding | pending (binding sub-state) | See `apollo_data_model.md` |
| EngineeringProject ref | DRAFT | Manifest tracks active BSDD ref |
| Imported from transfer | DRAFT + roadImportProvenance | Auto-VALIDATE schema only; scope preflight separate |

## Related artifacts

- `architecture_decisions.md` — ADR-APO-004
- `id_and_versioning_rules.md` — revision vs lifecycle
- `../00_governance/terminology_and_status_rules.md` — DRAFT disambiguation
- `../03_existing_capability/current_document_and_interface_map.md` — IF3 consumer map
