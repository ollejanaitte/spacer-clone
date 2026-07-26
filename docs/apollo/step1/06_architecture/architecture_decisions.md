# Architecture Decisions — P06 / P07

**Authority:** DESIGN PLANNING / STEP 1  
**Date:** 2026-07-27  
**Decision:** DEC-S1-0009 (P06), DEC-S1-0010 (P07)  
**Base commit:** `a559871e3eb09e3c4e35b810d0a903be091dc4f2` (main @ P06 merge)  
**Branch:** `docs/apollo-step1-p07-interface-if3` (P07)

## Purpose

Record Step 1 architecture decisions for Apollo Superstructure Design: system-of-record boundaries, Phase 1 data model scope, and alignment with the existing dual SoR pattern documented in P03 (DEC-S1-0005) and the Phase 1 scope freeze (DEC-S1-0008).

**This document is planning-only.** It does not authorize production schema commits or implementation.

## Context summary

| Layer | Operational today (P03) | Phase 1 target SoR | Status |
|-------|-------------------------|-------------------|--------|
| Road | LINER draft + `RoadDesignDocument` infra | `RoadDesignDocument` | PARTIAL |
| Apollo Superstructure | None | **`BridgeSuperstructureDesignDocument` (candidate)** | PLANNING |
| Frame | `ProjectModel` | `BridgeFrameAnalysisDocument` (BFAD) | DUAL — legacy operational, target infra |

```text
RoadDesignDocument
        │
        ▼ (immutable transfer)
RoadToFrameTransferPackage ──► BridgeSuperstructureDesignDocument (Apollo SoR candidate)
                                        │
                                        ▼ (export / generate)
                               BridgeFrameAnalysisDocument (Frame target SoR)
                                        │
                                        ▼ (analysis)
                               FrameAnalysisResultResource (read-only back to Apollo)
```

Operational interim: LINER draft + `BridgeDefinition` + `ProjectModel` wire path bypasses BSDD/BFAD persistence (P03, P05).

---

## ADR-APO-001 — Adopt `BridgeSuperstructureDesignDocument` as Apollo SoR candidate

| Field | Value |
|-------|-------|
| **Status** | ACCEPTED (planning) |
| **Date** | 2026-07-27 |
| **Deciders** | Step 1 P06 |

### Decision

Introduce **`BridgeSuperstructureDesignDocument` (BSDD)** as the candidate Apollo Superstructure system of record for Phase 1 planning. BSDD owns superstructure layout, non-composite RC deck intent, governance-gated material references, load-case definitions, and analysis-binding metadata until export to Frame.

### Rationale

1. P05 responsibility matrix assigns Apollo Superstructure ownership of girder layout, slab loads, and support intent — no existing contract document holds that aggregate today.
2. `BridgeDefinition` (`frontend/src/bridgeDefinition/types.ts`) is a legacy intermediate parametric model upstream of FEM generation; it is **not** a versioned, checksum-addressed contract and must not be promoted to Apollo SoR without envelope migration.
3. `RoadDesignDocument` must not absorb frame materials, load cases, or analysis settings (target_data_model.md forbidden cross-domain fields).
4. BFAD is Frame-owned; Apollo must not dual-write frame nodes/members as authoritative superstructure state.

### Consequences

- BSDD requires a new `schemaId` family (design draft in `schema_draft.json`; **not** a production schema commit in P06).
- BSDD references `RoadDesignDocument` / transfer package by exact ID, revision, and checksum — never embeds road geometry copies as authoritative.
- Export to Frame produces a new BFAD revision (or interim `ProjectModel` via adapter) with explicit provenance back to BSDD.

### Alternatives considered

| Alternative | Rejected because |
|-------------|------------------|
| Extend `RoadDesignDocument` with superstructure blocks | Violates road/frame domain split; road SoR would own analysis-adjacent data |
| Promote `BridgeDefinition` directly | Missing contract envelope, revision/checksum, governance hooks |
| Store Apollo state only in BFAD | Frame would own superstructure layout; contradicts P05 RACI |

---

## ADR-APO-002 — Preserve dual SoR: BSDD (Apollo) + BFAD (Frame); `ProjectModel` interim

| Field | Value |
|-------|-------|
| **Status** | ACCEPTED (planning) |
| **Relates to** | DEC-S1-0005 (P03) |
| **Date** | 2026-07-27 |

### Decision

Phase 1 planning **extends** the P03 dual SoR pattern to a **tri-layer reference model**:

| Document | Owner tool | Role | Phase 1 |
|----------|-----------|------|---------|
| `BridgeSuperstructureDesignDocument` | Apollo Superstructure | Superstructure layout, deck, loads, analysis intent | **Candidate SoR** (not operational) |
| `BridgeFrameAnalysisDocument` | Frame Analysis | Structural model, solver catalog, result refs | **Target SoR** (infra only) |
| `ProjectModel` | Frame Analysis | Legacy wire format + persistence | **Operational SoR** (interim) |

`EngineeringProject` remains a **reference manifest** only — it holds pointers to RDD, BSDD, BFAD, and `TransferRecord` refs; it does not duplicate domain payloads (target_data_model.md).

### Rationale

P03 established that schema presence ≠ operational SoR. The Frame app runs on `ProjectModel` while BFAD contracts exist in repository/tests. Apollo Superstructure has **no operational store** today; BSDD is the planning placeholder that closes the gap without collapsing Apollo into Frame or Road domains.

### Rules (fail-closed)

1. **Single writer per aggregate** — BSDD revisions are Apollo-owned; BFAD revisions are Frame-owned after import/apply.
2. **No ordinary dual-write** — read-old/write-target per D7-11 / D10-04; BSDD export creates a **new** BFAD revision; it does not mutate BSDD in place from Frame edits.
3. **Frame geometry edits** — post-import member/node edits are Frame-owned and protected on re-import (target_data_model.md).
4. **Results are read-only in Apollo** — `FrameAnalysisResultResource` binds to BFAD; Apollo consumes via `AnalysisBinding`, never as mutable SoR.

### Mapping to existing code

| Planning entity | Existing artifact | Relationship |
|-----------------|-------------------|--------------|
| BSDD layout shell | `BridgeDefinition` spans/girders/deck/loads | Migration source candidate; not 1:1 without envelope |
| BFAD structural model | `schemas/contracts/v0.1/bridge-frame-analysis-document.schema.json` | Target contract |
| Operational frame wire | `schemas/project.schema.json`, `frontend/src/types.ts` | Interim export/import surface |
| Result resource | IF3 `FrameAnalysisResultResource` | Downstream read-only |

---

## ADR-APO-003 — Phase 1 entity boundary inside BSDD

| Field | Value |
|-------|-------|
| **Status** | ACCEPTED (planning) |
| **Relates to** | DEC-S1-0008 (P05 scope freeze) |
| **Date** | 2026-07-27 |

### Decision

BSDD Phase 1 **includes** (required unless noted):

- `Project` reference envelope (via `EngineeringProject` manifest)
- `Bridge` (single-bridge scope for Phase 1 archetype)
- `Span` (exactly one span — simple support)
- `GirderLine` (equal-depth plate girders, 4–6 typical)
- `Deck` (non-composite RC slab)
- `MaterialDefinition` (governance-gated; no invented numerics)
- `Support` / bearing layout (fixed/movable)
- `LoadCase` + `Load` (dead, slab, live — numerics BLOCKED until Target Standard)
- `AnalysisBinding` (links BSDD revision → BFAD / result resource refs)
- `CoordinateContext` / `UnitContext` (explicit; unknown blocks mutation)

**Deferred** (documented, not modeled in Phase 1 BSDD minimum):

- `LoadCombination`, `Node`, `Member`, `Section` (Frame-owned in BFAD)
- `SectionForce`, `Reaction`, `Displacement`, `DesignCheck`
- `CrossBeam`, `Bracing`, `Stiffener`, `Splice`
- `DrawingInput`, `MaterialQuantity`
- Multi-span, skewed, composite, box girder, dynamic analysis entities

See `entity_catalog.csv` and `apollo_data_model.md` for full disposition.

---

## ADR-APO-004 — Document lifecycle vocabulary

| Field | Value |
|-------|-------|
| **Status** | ACCEPTED (planning) |
| **Date** | 2026-07-27 |

### Decision

Adopt the lifecycle states in `document_lifecycle.md` for BSDD and cross-reference artifacts. Align `STALE` with IF3/transfer-record semantics already in repo; treat `DRAFT`/`VALIDATED`/`APPROVED`/`SUPERSEDED`/`ARCHIVED` as **document revision lifecycle** (distinct from IF3 result `status`).

Details: `document_lifecycle.md`.

---

## ADR-APO-005 — ID, revision, and migration policy

| Field | Value |
|-------|-------|
| **Status** | ACCEPTED (planning) |
| **Date** | 2026-07-27 |

### Decision

BSDD follows the common contract envelope (`schemaId`, `schemaVersion`, `documentId`, `revisionId`, `contentChecksum`, provenance) defined in target_data_model.md and existing v0.1 schemas. Migration is read-old/write-target, append-only transfer, fail-closed on unknown major versions.

Details: `id_and_versioning_rules.md`.

---

## ADR-APO-006 — `AnalysisBinding` as cross-SoR provenance anchor

| Field | Value |
|-------|-------|
| **Status** | ACCEPTED (planning) |
| **Date** | 2026-07-27 |

### Decision

Introduce **`AnalysisBinding`** as a first-class planning entity that records:

- Source BSDD document ID, revision, checksum
- Target BFAD document ID, revision, checksum (post-export)
- Optional `FrameAnalysisResultResource` ref after run
- Analysis type (`static_linear` only in Phase 1)
- IF3 metadata fields required by server (`sourceDocumentId`, `sourceDocumentVersion`, `sourceContentChecksum`, etc.)

This closes the P03 IF3 client binding gap at the **data model** level; wiring in `api/client.ts` remains a Frame implementation task (BLK-S1-012).

---

## Open items / blockers

| ID | Topic | Impact on architecture |
|----|-------|------------------------|
| BLK-S1-001 | Target Standard NOT_SELECTED | MaterialDefinition and Load numerics remain null/ADOPTED-gated |
| BLK-S1-011 | Legacy Analyzer I/O UNKNOWN | BSDD exports via BFAD/ProjectModel only for Phase 1 |
| BLK-S1-012 | IF3 client binding gap | AnalysisBinding defined; runtime wiring deferred |
| ENT-CAND-0010 | Load combination rules | LoadCombination deferred; Frame may own in BFAD |

---

## P07 — Interface & IF3 binding (DEC-S1-0010)

### ADR-APO-007 — Separate physical Analyzer I/O from logical IF3/BFAD contracts

| Field | Value |
|-------|-------|
| **Status** | ACCEPTED (planning) |
| **Date** | 2026-07-27 |
| **Relates to** | BLK-S1-011, LIM-P03-004 |

**Decision:** Document Apollo physical Analyzer file exchange (IO-CAND-0003/0004) as **UNKNOWN** and **not** Phase 1 dependency. All designable interface work targets spacer-clone logical contracts: BSDD → BFAD/ProjectModel → `FrameAnalysisResultResource`.

**Consequences:** No field mapping from Analyzer physical format to OSS types until manual research resolves BLK-S1-011. OSS `ProjectModel` is interim wire only.

### ADR-APO-008 — Adopt input/output interface contract draft with field matrix

| Field | Value |
|-------|-------|
| **Status** | ACCEPTED (planning) |
| **Date** | 2026-07-27 |

**Decision:** Freeze planning-level input contract (IDs, revisions, units, coords, nodes/members/materials/sections/supports/loads, requested outputs, mapping, traceability) and output contract (run ID, engine/version, hashes, status, displacement/force/reaction components, diagnostics, binding) in `interface_contract_draft.md` + `interface_field_matrix.csv`.

**Consequences:** Implementation adapters must conform to matrix; numerics remain null until Target Standard ADOPTED.

### ADR-APO-009 — IF3 binding fields and fail-closed export authority

| Field | Value |
|-------|-------|
| **Status** | ACCEPTED (planning) |
| **Date** | 2026-07-27 |
| **Relates to** | DEC-S1-0006, LIM-P03-001, BLK-S1-012 |

**Decision:** Specify `AnalysisBinding` + run-time `if3` metadata fields in `if3_binding_design.md`. Adopt export authority matrix in `export_authority_rules.md`: JSON/CSV/PDF/PRINT authoritative only when consumer **VALID**; **UNBOUND** (missing binding) blocks all authoritative export.

**Consequences:** Client wiring in `apiClient.runAnalysis` is implementation prerequisite (not P07 scope). Stale triggers documented in `stale_and_reanalysis_rules.md`.

---

## Related artifacts

| Artifact | Path |
|----------|------|
| Data model | `apollo_data_model.md` |
| Entity catalog | `entity_catalog.csv` |
| Document lifecycle | `document_lifecycle.md` |
| ID / versioning | `id_and_versioning_rules.md` |
| Schema design draft | `schema_draft.json` |
| Interface contract (P07) | `interface_contract_draft.md` |
| Field matrix (P07) | `interface_field_matrix.csv` |
| IF3 binding (P07) | `if3_binding_design.md` |
| Stale rules (P07) | `stale_and_reanalysis_rules.md` |
| Export authority (P07) | `export_authority_rules.md` |
| P03 dual SoR | `../03_existing_capability/current_document_and_interface_map.md` |
| P05 scope freeze | `../05_scope_boundary/phase1_scope_freeze.md` |
| P05 interfaces | `../05_scope_boundary/apollo_to_frame_interface.md` |
