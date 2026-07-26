# Apollo Data Model — Phase 1

**Authority:** DESIGN PLANNING / STEP 1  
**Date:** 2026-07-27  
**Decision:** DEC-S1-0009  
**Base commit:** `849fef17a62a63994394cfddd11b71c1f76c1350`  
**Branch:** `docs/apollo-step1-p06-architecture`

## Purpose

Describe entities and relationships for Apollo Superstructure Design in Phase 1. This is a **planning model** aligned with P05 scope freeze and P03 capability inventory. It does not replace production schemas.

## Design principles

1. **BSDD is Apollo SoR candidate** — superstructure intent lives in `BridgeSuperstructureDesignDocument` until exported.
2. **Frame owns FEM** — nodes, members, sections for analysis live in BFAD after export; Apollo holds references only.
3. **Road is upstream read-only** — alignment and cross-section data enter via `RoadToFrameTransferPackage` / RDD refs.
4. **No invented numerics** — material and load magnitudes use governance markers until ADOPTED (DEC-S1-0004).
5. **Fail-closed scope** — entities for OUT_OF_PHASE1 features are marked deferred and must not appear as required Phase 1 fields.

## Entity relationship overview

```text
EngineeringProject (manifest only)
    │
    ├── roadDesignRef ──────────────► RoadDesignDocument (Road SoR)
    ├── superstructureDesignRefs[] ─► BridgeSuperstructureDesignDocument (Apollo SoR candidate)
    ├── frameAnalysisRefs[] ────────► BridgeFrameAnalysisDocument (Frame target SoR)
    └── transferRecordRefs[] ───────► TransferRecord (append-only audit)

BridgeSuperstructureDesignDocument
    │
    ├── projectContext ─────────────► Project (label + external refs; not identity)
    ├── bridge ─────────────────────► Bridge
    │       ├── spans[] ────────────► Span (Phase 1: cardinality 1)
    │       ├── girderLines[] ────────► GirderLine
    │       ├── deck ───────────────► Deck
    │       └── supports[] ─────────► Support
    ├── materialDefinitions[] ──────► MaterialDefinition
    ├── loadCases[] ────────────────► LoadCase
    │       └── loads[] ────────────► Load
    ├── analysisBindings[] ─────────► AnalysisBinding
    ├── coordinateContexts[] ───────► CoordinateContext
    ├── unitContext ────────────────► UnitContext
    └── roadImportProvenance ───────► TransferPackageRef / RoadDesignRef

AnalysisBinding
    ├── sourceBsdDocumentRef
    ├── targetBfadDocumentRef (post-export)
    └── resultResourceRef (post-analysis, read-only)
```

## Core entities (Phase 1)

### EngineeringProject

Reference container only. Holds stable refs to RDD, BSDD, BFAD, and transfer records. Does not embed girder geometry or solver settings.

| Attribute | Cardinality | Notes |
|-----------|-------------|-------|
| `name` | 1 | User label; not identity |
| `roadDesignRef` | 1 | Exact RDD ID/revision/checksum |
| `superstructureDesignRefs` | 0..n | BSDD refs; Phase 1 expects 1 active |
| `frameAnalysisRefs` | 0..n | BFAD refs after export |
| `transferRecordRefs` | 0..n | Ordered append-only |

**Source:** `schemas/contracts/v0.1/engineering-project.schema.json` (infra).

### BridgeSuperstructureDesignDocument (BSDD)

Apollo superstructure aggregate. Immutable revisions; new edits create new revision with new checksum.

| Block | Phase 1 | Notes |
|-------|---------|-------|
| Common envelope | Required | `schemaId`, `schemaVersion`, `documentId`, `revisionId`, `contentChecksum` |
| `lifecycleStatus` | Required | See `document_lifecycle.md` |
| `bridge` | Required | Single bridge per document in Phase 1 |
| `materialDefinitions` | Required (may be empty pending governance) | Ref-only until ADOPTED |
| `loadCases` | Required (shell) | Cases without numerics allowed pre-ADOPTION |
| `analysisBindings` | Optional until first export | Required before authoritative result consumption |
| `roadImportProvenance` | Optional | Present when created from transfer |

### Project

Lightweight project context inside BSDD — name, client, phase tags. **Not** the identity root (`documentId` is).

### Bridge

Top-level bridge record within BSDD. Phase 1 constraints: straight alignment, 90° skew, single span.

| Field | Phase 1 | Constraint |
|-------|---------|------------|
| `alignmentClass` | `straight` | Reject `curved` |
| `skewAngleDeg` | `90` | Reject other values |
| `superstructureKind` | `plate_girder_rc_slab_non_composite` | Reject composite/box |
| `spanSystem` | `simple` | Reject `continuous` |

### Span

Exactly **one** span in Phase 1 (`ASM-P1-001`).

| Field | Notes |
|-------|-------|
| `spanId` | Stable UUID |
| `length` | Value + `lengthUnits` (typically `m`); null if unknown |
| `startSupportId` / `endSupportId` | Refs into `supports[]` |

### GirderLine

Transverse girder placement intent (maps to handoff `BridgeGeometry.girder_count` / cross-lines).

| Field | Notes |
|-------|-------|
| `girderLineId` | Stable UUID |
| `index` | Transverse index, 0-based |
| `offsetFromCenterline` | Metres + units |
| `depthProfile` | Phase 1: `equal` only |
| `materialRefId` | Ref to `MaterialDefinition` |
| `sectionIntentRefId` | Optional intent; detailed section in BFAD |

### Deck

Non-composite RC slab on steel plate girders.

| Field | Notes |
|-------|-------|
| `deckKind` | `rc_non_composite` |
| `width` | Metres + units |
| `thickness` | Metres + units; null until designed |
| `unitWeight` | Governance-gated; null until ADOPTED |

### MaterialDefinition

Governance-gated material record. Phase 1 allows **shell records** with `adoptionStatus: PENDING`.

| Field | Notes |
|-------|-------|
| `materialId` | Stable UUID |
| `designation` | e.g. `SN400B` label only |
| `yieldStrength` | null + `adoptionStatus` until ADOPTED |
| `elasticModulus` | null until ADOPTED |
| `unitWeight` | null until ADOPTED |
| `sourceLocator` | Required when ADOPTED |

### Support

Bearing/fixity at span ends. Detailed bearing design deferred.

| Field | Notes |
|-------|-------|
| `supportId` | Stable UUID |
| `station` | Along bridge axis |
| `fixity` | `fixed` \| `pinned` \| `roller` |
| `role` | `abutment` \| `bearing` |

### LoadCase

Individual load cases (ENT-CAND-0008). Phase 1 kinds: `dead`, `slab`, `live`.

| Field | Notes |
|-------|-------|
| `loadCaseId` | Stable UUID |
| `kind` | Enum per Phase 1 |
| `loads` | Child Load entities |
| `adoptionStatus` | `PENDING` until numerics ADOPTED |

### Load

Load magnitudes and distribution intent (ENT-CAND-0009).

| Field | Notes |
|-------|-------|
| `loadId` | Stable UUID |
| `pattern` | `uniform` \| `point` \| `line` (subset TBD) |
| `magnitude` | null until ADOPTED |
| `magnitudeUnits` | e.g. `kN/m`, `kPa` |
| `targetRef` | GirderLine, Deck, or support region |

### AnalysisBinding

Cross-SoR provenance link (ADR-APO-006).

| Field | Notes |
|-------|-------|
| `bindingId` | Stable UUID |
| `analysisType` | `static_linear` only in Phase 1 |
| `sourceBsdDocumentRef` | Exact BSDD ref |
| `targetBfadDocumentRef` | Populated after export |
| `resultResourceRef` | Populated after analysis; read-only |
| `if3Metadata` | Server-expected binding fields |
| `bindingStatus` | `pending` \| `exported` \| `analyzed` \| `stale` |

## Shared context entities

### CoordinateContext / UnitContext

Required on BSDD per target_data_model.md. Unknown/conflicted coordinate confidence **blocks mutation**. Canonical engineering units: m, rad, kN, kPa (see `UnitContext` in v0.1 schemas).

### TransferPackageRef / RoadDesignRef

Immutable references to upstream road artifacts. Include `documentId`, `revisionId`, `contentChecksum`, `schemaId`.

## Frame-side entities (referenced, not Apollo-owned)

These appear in BFAD / `ProjectModel` after export. Apollo **reads** via refs; does not authoritatively edit post-export.

| Entity | Owner | Phase 1 |
|--------|-------|---------|
| `Node` | Frame | CANDIDATE via BFAD |
| `Member` | Frame | CANDIDATE via BFAD |
| `Section` | Frame | CAP-FRM-003 |
| `LoadCombination` | Frame | DEFERRED rules (ENT-CAND-0010) |
| `FrameAnalysisResultResource` | Frame | Read-only in Apollo |

## Deferred entities (later phase)

| Entity | Reason deferred |
|--------|-----------------|
| `CrossBeam` | OUT_OF_PHASE1 bracing family |
| `Bracing` / `Stiffener` / `Splice` | P04 OUT_OF_PHASE1 |
| `SectionForce` / `Reaction` / `Displacement` | Consumed via IF3 resource; not BSDD-owned |
| `DesignCheck` | Member design OUT_OF_PHASE1 |
| `DrawingInput` / `MaterialQuantity` | SuperDrawing / y-Mater parity deferred |
| `ModalCase` / `ResponseSpectrumCase` | Dynamic analysis OUT_OF_PHASE1 |

## Operational interim mapping

Until BSDD is operational, the following approximate mapping supports migration planning:

| BSDD planning entity | Interim source |
|---------------------|----------------|
| Bridge / Span / GirderLine / Deck | `BridgeDefinition` (`frontend/src/bridgeDefinition/types.ts`) |
| LoadCase / Load | `BridgeDefinition.loads` + `ProjectModel.loadCases` |
| MaterialDefinition | `ProjectModel.materials` (governance-gated) |
| Structural model | `ProjectModel` nodes/members |
| Analysis results | IF3 sidecar / `FrameAnalysisResultResource` |

## Validation gates (Phase 1)

| Gate | Trigger | Response |
|------|---------|----------|
| Scope preflight | continuous/skewed/composite flags | `OUT_OF_PHASE1` |
| Numeric freeze | magnitude without ADOPTED record | `BLOCKED: BLK-S1-001` |
| Coordinate unknown | `confidence: unknown` on CoordinateContext | Block save/export |
| Missing AnalysisBinding | Authoritative result display | `BLOCKED: IF3_GATE` |
| BFAD revision mismatch | Result binding stale | `STALE` (IF3 aligned) |

## Related artifacts

- `architecture_decisions.md` — ADRs
- `entity_catalog.csv` — machine-readable catalog
- `schema_draft.json` — JSON design draft (not production)
- `../05_scope_boundary/phase1_scope_freeze.md` — scope authority
