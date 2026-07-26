# ID and Versioning Rules — Apollo Step 1

**Authority:** DESIGN PLANNING / STEP 1  
**Date:** 2026-07-27  
**Decision:** DEC-S1-0009  
**Base commit:** `849fef17a62a63994394cfddd11b71c1f76c1350`

## Purpose

Define stable identity, revision, schema versioning, content hashing, transfer audit, and migration rules for Apollo Superstructure planning artifacts. Aligns with `target_data_model.md`, Stage 6–10 compatibility policy (read-old/write-target, no dual-write), and existing v0.1 contract schemas.

**Planning only** — production migration registries are not modified in P06.

## Identity rules

### Stable IDs

| Entity | ID field | Format | Stability rule |
|--------|----------|--------|----------------|
| BSDD document | `documentId` | UUID v4 (contract pattern) | Never changes across revisions |
| BSDD child entities | `{entity}Id` (e.g. `girderLineId`, `loadCaseId`) | UUID | Stable within document lineage; preserved across revision when entity persists |
| BFAD document | `documentId` | UUID | Frame-owned; independent namespace |
| EngineeringProject | `documentId` | UUID | Manifest identity |
| AnalysisBinding | `bindingId` | UUID | Stable; status field mutable |
| TransferRecord | `recordId` | UUID | Append-only; never reused |
| ProjectModel file | `projectInfo.id` or file name | Legacy | Operational interim; migrate to BFAD |

**Prohibited:** Inferring identity from display name, array index, station order, or timestamp alone.

### Namespaced references

Every cross-artifact reference MUST include:

```text
schemaId + documentId (or artifactId) + revisionId + contentChecksum
```

Floating "latest" references are **prohibited** in persisted engineering data (`target_data_model.md`).

Example reference shape (conceptual):

```json
{
  "schemaId": "spacer.contracts.bridge-superstructure-design-document",
  "documentId": "00000000-0000-0000-0000-000000000001",
  "revisionId": 3,
  "contentChecksum": {
    "algorithm": "sha256",
    "value": "…"
  }
}
```

## Revision rules

| Rule | Description |
|------|-------------|
| **Monotonic `revisionId`** | Integer > 0; increments per immutable save; never decrements |
| **Immutable revisions** | Published revision bytes never change; edits create new `revisionId` + checksum |
| **Parent linkage** | `revisionMetadata.parentRevisionId` (or equivalent) links revision chain |
| **Independent per document** | BSDD `revisionId` is independent of BFAD `revisionId` |
| **SUPERSEDED prior** | New APPROVED revision marks prior revision SUPERSEDED in lifecycle metadata |

## Schema versioning (`schemaVersion`)

| Rule | Description |
|------|-------------|
| **SemVer** | `MAJOR.MINOR.PATCH` per contract family |
| **Independent contracts** | BSDD, BFAD, RDD each carry own `schemaVersion` |
| **Minor = additive** | New optional fields only; readers preserve unknown optional data |
| **Major = incompatible** | Unknown major → **fail-closed**; source remains readable/quarantined |
| **Design draft** | `schema_draft.json` uses `"0.0.0-design-draft"` — not a production registry entry |

### BSDD planned identity

| Field | Planned value |
|-------|---------------|
| `schemaId` | `spacer.contracts.bridge-superstructure-design-document` |
| `schemaVersion` (draft) | `0.0.0-design-draft` |
| `documentKind` | `bridge-superstructure-design` |

Production `schemas/contracts/v0.1/` commit is **out of P06 scope**.

## Content checksum (`contentChecksum`)

| Rule | Description |
|------|-------------|
| **Algorithm** | SHA-256 (align with v0.1 `content-checksum.schema.json`) |
| **Canonical serialization** | Deterministic field ordering and numeric representation per contract spec |
| **Exclusions** | Mutable transport metadata excluded per contract rule (e.g. `updatedAt` if defined mutable) |
| **Verification** | Consumers verify checksum before authoritative use |
| **Mismatch** | Mark binding `STALE`; block authoritative export |

Legacy source file hash may seed `migrationProvenance` but **does not** substitute for target content checksum without proof (`target_data_model.md`).

## Transfer and audit (append-only)

```text
RoadToFrameTransferPackage (immutable)
        │
        ▼
TransferRecord (append-only)
        ├── packageRef (checksum pinned)
        ├── sourceDocumentRef (RDD)
        ├── targetBefore / targetAfter (BFAD or BSDD refs)
        └── status (previewed | accepted | stale | …)
```

| Rule | Description |
|------|-------------|
| **Append-only** | Transfer records are never deleted or overwritten in place |
| **No package mutation** | Transfer package bytes immutable after export |
| **Atomic apply** | Target document + record commit in one transaction (target policy OD10-01) |
| **Rollback** | Via new record referencing `rollbackOf`; no silent history erase |

## Read-old / write-target migration

Per DEC-S1-0005, D7-11, D10-04:

| Operation | Rule |
|-----------|------|
| **Read** | Legacy `ProjectModel`, `BridgeDefinition` readable via adapters |
| **Write** | New authoritative state → BSDD (Apollo) / BFAD (Frame) target form |
| **Dual-write** | **Ordinary dual-write REJECTED** — no simultaneous authoritative legacy + target |
| **Migration steps** | Pure, deterministic, idempotent pure functions in migration registry |
| **Failure** | Fail-closed; preserve raw bytes; quarantine with diagnostics |

### Apollo migration path (planning)

```text
BridgeDefinition / LINER draft
        │ read (adapter)
        ▼
BSDD revision 0.0.0-design-draft
        │ export adapter
        ▼
BFAD revision (new)  OR  ProjectModel (interim non-authoritative preview)
```

## AnalysisBinding versioning

`AnalysisBinding` records the **triple** at time of export/run:

1. BSDD `documentId` + `revisionId` + `contentChecksum`
2. BFAD `documentId` + `revisionId` + `contentChecksum`
3. Optional `FrameAnalysisResultResource` artifact ref + checksum

Any mismatch in (1)↔(2) or (2)↔(3) → binding `stale`; IF3 gates apply.

IF3 metadata minimum (server, `backend/tests/test_if3_api.py`):

- `sourceDocumentId`
- `sourceDocumentVersion` (maps to `revisionId` or contract revision string per adapter)
- `sourceContentChecksum`
- `analysisSettings`, `loadContext`, `solverName`, `solverVersion`

## Entity-level versioning within BSDD

| Pattern | Rule |
|---------|------|
| Child entity survives edit | Same `{entity}Id`; may appear in multiple revisions |
| Child entity removed | Prior revisions retain entity; SUPERSEDED revision is historical truth |
| Governance numerics | `adoptionStatus` + `sourceLocator` versioned with revision; PENDING → ADOPTED is new revision event |
| `schemaVersion` bump | Migration step required; unknown major blocks load |

## Fail-closed migration checklist

| Condition | Response |
|-----------|----------|
| Unknown `schemaVersion` major | Reject load; quarantine |
| Missing `contentChecksum` on authoritative path | Reject |
| CoordinateContext `confidence: unknown` | Block mutation/export |
| Target Standard not ADOPTED for numeric field | Keep null; block APPROVED with numerics |
| Partial write / crash mid-migration | Recovery from raw source + migration provenance |
| Concurrent writers | Optimistic revision conflict → fail; no merge without explicit policy |

## Legacy interim exceptions (Phase 1)

| Artifact | Version field | Notes |
|----------|---------------|-------|
| `ProjectModel` | `projectInfo.schemaVersion` = `1.0.0` | Operational wire; IF3 sidecar optional |
| `BridgeDefinition` | `schemaVersion` = `1.0.0` | Not checksummed contract |
| IF3 resource | `0.1.0` (`IF3_SCHEMA_VERSION`) | Result artifact |

These remain readable until BFAD/BSDD path is operational; they are not the long-term Apollo SoR.

## Related artifacts

- `schema_draft.json` — illustrative envelope (DESIGN DRAFT)
- `document_lifecycle.md` — lifecycle vs revision
- `architecture_decisions.md` — ADR-APO-005
- `../../../planning/stage6-10/target_data_model.md` — normative target rules
- `../../../planning/stage6-10/compatibility_matrix.md` — read-old/write-target
