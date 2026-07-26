# Interface Contract Draft — Apollo ↔ Frame (P07)

**Authority:** DESIGN PLANNING / STEP 1  
**Date:** 2026-07-27  
**Decision:** DEC-S1-0010  
**Base commit:** `a559871e3eb09e3c4e35b810d0a903be091dc4f2` (main @ P06 merge)  
**Branch:** `docs/apollo-step1-p07-interface-if3`

## Purpose

Define the **logical** Apollo Superstructure ↔ Frame Analysis interface contracts for Phase 1 planning: input envelope (BSDD → BFAD/ProjectModel), output envelope (`FrameAnalysisResultResource`), traceability, and mapping rules. This document is **planning-only** — no production schema or API commits.

## Two boundaries (do not conflate)

| Boundary | Status | Phase 1 role |
|----------|--------|--------------|
| **Apollo physical Analyzer I/O** | **UNKNOWN** (BLK-S1-011, LIM-P03-004) | Not a dependency; historical SuperDesigner↔Analyzer file exchange unconfirmed |
| **spacer-clone logical IF3 / BFAD contracts** | **DESIGNABLE NOW** | OSS delivery path: BSDD export → BFAD/ProjectModel → solver → IF3 resource |

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  APOLLO PHYSICAL (UNKNOWN — reference only)                             │
│  IO-CAND-0003 analyzer_input  │  IO-CAND-0004 analyzer_output            │
│  Format, encoding, field layout NOT confirmed from manuals              │
└─────────────────────────────────────────────────────────────────────────┘
                              ≠ (not equivalent)
┌─────────────────────────────────────────────────────────────────────────┐
│  spacer-clone LOGICAL (Phase 1 design surface)                          │
│  BSDD ──export──► BFAD / ProjectModel ──run──► FrameAnalysisResultResource│
│  Binding: AnalysisBinding + IF3 metadata (sourceDocumentId, checksum…)  │
└─────────────────────────────────────────────────────────────────────────┘
```

**Rule:** OSS `ProjectModel` JSON and IF3 resources are **not** evidence of historical Analyzer wire format. Parity claims for legacy Analyzer files are blocked until BLK-S1-011 is resolved.

---

## Input contract (Apollo → Frame)

Producer: **Apollo Superstructure Design** (BSDD candidate SoR). Consumer: **Frame Analysis Tool** (BFAD target SoR; `ProjectModel` operational interim).

### Envelope and identity

| Field group | Required | Rule |
|-------------|----------|------|
| `schemaId`, `schemaVersion` | Yes | BSDD family `spacer.contracts.bridge-superstructure-design-document`; unknown major → fail-closed |
| `documentId` | Yes | Stable UUID; never changes across revisions |
| `revisionId` | Yes | Monotonic integer; immutable per revision |
| `contentChecksum` | Yes | SHA-256 canonical checksum; mismatch → STALE binding |
| `lifecycleStatus` | Yes | Export requires `VALIDATED` or `APPROVED` (preview flag for non-authoritative dry-run only) |
| `provenance` | Yes | `createdAt`, `createdBy`, `producer`; audit trail |

### Context: coordinates and units

| Field | Required | Rule |
|-------|----------|------|
| `CoordinateContext` | Yes | At least one context; `confidence: unknown` blocks mutation and export |
| `UnitContext` | Yes | Canonical m, rad, kN, kPa; display units separate |
| Axis convention | Yes | Bridge-local: x-longitudinal, y-transverse, z-up (Phase 1 archetype) |

### Domain entities (Phase 1 minimum)

| Entity | IDs | Revisions | Notes |
|--------|-----|-----------|-------|
| `Bridge` | `bridgeId` (embedded) | Via BSDD `revisionId` | Single bridge; straight / 90° skew |
| `Span` | — | Via BSDD | Exactly one span (ASM-P1-001) |
| `GirderLine` | `girderLineId` | Stable across revisions when entity persists | Equal-depth plate girders |
| `Deck` | `deckId` | Stable | Non-composite RC slab only |
| `Support` | `supportId` | Stable | Fixed / movable; bearing detail deferred |
| `MaterialDefinition` | `materialId` | Stable | Governance-gated; numerics null until ADOPTED |
| `LoadCase` | `loadCaseId` | Stable | Kinds: `dead`, `slab`, `live` |
| `Load` | `loadId` | Stable | Magnitude null until Target Standard ADOPTED |

**Frame-owned on export surface (BFAD / ProjectModel):** `Node`, `Member`, `Section` — generated or mapped by Frame export adapter; Apollo supplies intent, not authoritative FEM topology post-export.

### Upstream traceability refs

| Ref | Required when | Fields |
|-----|---------------|--------|
| `RoadDesignRef` | Import from road | `schemaId`, `documentId`, `revisionId`, `contentChecksum` |
| `TransferPackageRef` | Road transfer used | Package checksum pinned; immutable blob |
| `EngineeringProject` manifest | Optional envelope | Pointer only; no payload duplication |

### Requested outputs (analysis intent)

| Field | Value (Phase 1) |
|-------|-----------------|
| `analysisType` | `static_linear` only |
| `requestedResultKinds` | Displacements, member forces, support reactions (component set per ISS-S1-007 — runtime confirmation) |
| `loadCombinationPolicy` | Deferred (ENT-CAND-0010); Frame may own in BFAD |

### Export mapping (BSDD → Frame)

| BSDD source | Frame target | Adapter |
|-------------|--------------|---------|
| GirderLine / Deck / Support layout | `ProjectModel` nodes/members or BFAD structural model | Export adapter (planning) |
| LoadCase / Load | `ProjectModel.loadCases` or BFAD load defs | Magnitude omitted when PENDING |
| MaterialDefinition | `ProjectModel.materials` | Placeholder or ADOPTED records only |
| AnalysisBinding | BFAD `documentId` + IF3 run metadata | Populated post-export |

Export creates a **new** BFAD revision (or interim ProjectModel file); does not dual-write BSDD.

### Input validation gates (fail-closed)

| Check | On failure |
|-------|------------|
| Multi-span / continuous / skew ≠ 90° | `OUT_OF_PHASE1` |
| Composite deck flag | Reject export |
| Dynamic / seismic analysis request | Reject import |
| Numeric magnitude without ADOPTED record | `BLOCKED: BLK-S1-001` |
| Missing CoordinateContext or unknown confidence | Block export |
| BSDD lifecycle not VALIDATED/APPROVED | Block authoritative export |

---

## Output contract (Frame → Apollo)

Producer: **Frame Analysis Tool**. Consumer: **Apollo Superstructure** (read-only), reports, viewer, DRAFT/PRINT adapters.

### Resource envelope (`FrameAnalysisResultResource`)

| Field | Required | Rule |
|-------|----------|------|
| `schemaId` | Yes | `spacer.contracts.frame-analysis-result-resource` |
| `schemaVersion` | Yes | SemVer; unknown major → fail-closed |
| `resultId` | Yes | Stable UUID per normalized resource |
| `analysisRunId` | Yes | Stable UUID per solver run attempt |
| `sourceDocumentId` | Yes | Bound BFAD `documentId` |
| `sourceDocumentVersion` | Yes | Bound BFAD `revisionId` (positive integer) |
| `sourceContentChecksum` | Yes | Exact BFAD checksum used for run |
| `status` | Yes | IF3 status enum (see below) |
| `generatedAt` | Yes | ISO-8601 UTC from normalizer |
| `solverName`, `solverVersion` | Yes | Engine identity for compatibility |
| `analysisSettingsChecksum` | Yes | Canonical settings checksum |
| `loadContext` | Yes | Load case IDs and checksums active in run |
| `provenance` | Yes | Result provenance (distinct from document) |
| `diagnostics` | Yes | Ordered validation/solver diagnostics |
| `payload` | Conditional | Required for non-empty success states |

Optional: `transferPackageId`, `transferRecordId`, `resultChecksum`, `unitSystem`, `capabilities`, `resultKinds`.

### Result status (IF3)

| Status | Authoritative export |
|--------|---------------------|
| `PENDING` / `RUNNING` | Block |
| `SUCCEEDED` | Allow (when binding valid → consumer `VALID`) |
| `FAILED` / `INVALID` / `UNSUPPORTED` | Block |
| `PARTIAL` | Conditional — diagnostics only unless catalog allows |
| `STALE` | Block authoritative export |

### Payload components (read-only in Apollo)

| Component | Source | Notes |
|-----------|--------|-------|
| Displacements | `payload` result kinds | Node-level; units from `UnitContext` |
| Member forces | `payload` | Section force component count UNKNOWN (ISS-S1-007) |
| Support reactions | `payload` | Read-only verification input |
| Diagnostics | `diagnostics[]` | Includes `MISSING_SOURCE_BINDING` when unbound |

### Binding back to Apollo

`AnalysisBinding.resultResourceRef` records `resultId`, checksum, and links to BSDD `sourceBsdDocumentRef` + BFAD `targetBfadDocumentRef`. Apollo never mutates the result resource.

---

## API touchpoints (operational interim)

| Surface | Direction | Payload shape |
|---------|-----------|---------------|
| `POST /api/analysis/run` | Client → solver | `{ project: ProjectModel, options?, if3? }` |
| IF3 normalizer | Internal | Raw `AnalysisResult` + `if3` metadata → resource |
| IF3 export gates | Frame → consumers | `authoritativeOutputAllowed` boolean |

**Implementation prerequisite:** LIM-P03-001 — `apiClient.runAnalysis()` currently omits `if3` block; authoritative export remains fail-closed in default UI path until client wiring (BLK-S1-012). See `if3_binding_design.md`.

---

## Traceability chain (end-to-end)

```text
RDD / TransferPackage
        │
        ▼
BSDD (documentId, revisionId, checksum)
        │ AnalysisBinding.sourceBsdDocumentRef
        ▼
BFAD (documentId, revisionId, checksum)
        │ IF3 sourceDocumentId / Version / Checksum
        ▼
FrameAnalysisResultResource (resultId, analysisRunId, checksum)
        │ AnalysisBinding.resultResourceRef
        ▼
Apollo read-only consumption / export adapters
```

Every hop must carry exact ID + revision + checksum. Floating "latest" references prohibited in persisted engineering data.

---

## Related artifacts

| Artifact | Path |
|----------|------|
| Field matrix | `interface_field_matrix.csv` |
| IF3 binding design | `if3_binding_design.md` |
| Stale rules | `stale_and_reanalysis_rules.md` |
| Export authority | `export_authority_rules.md` |
| P05 interface summary | `../05_scope_boundary/apollo_to_frame_interface.md` |
| P06 data model | `apollo_data_model.md` |
| IF3 consumer contracts | `../../../road/phase6/if3/if3_consumer_contracts.md` |
| Client binding gap | `../03_existing_capability/current_limitations.md` (LIM-P03-001) |
