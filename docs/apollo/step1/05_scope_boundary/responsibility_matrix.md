# Responsibility Matrix — Phase 1

**Authority:** DESIGN PLANNING / STEP 1  
**Date:** 2026-07-27  
**Decision:** DEC-S1-0008  
**Base commit:** `7240f1818d6de9bfbf1dbbc56113cef700ccad16`

## Product boundaries (three tools)

| Tool | OSS mapping (P03) | System of record (Phase 1 target) | Operational today |
|------|-------------------|-----------------------------------|-------------------|
| **Road Design Tool** | LINER (`frontend/src/liner/`), `RoadDesignDocument` schema | `RoadDesignDocument` | LINER domain draft; RDD infra partial |
| **Apollo Superstructure Design** | Planned superstructure layer (handoff SuperDesigner scope, minus legacy desktop) | Bridge layout + slab/load design shell (BFAD-aligned) | **Not operational** — planning boundary only |
| **Frame Analysis Tool** | Frame app + backend solver (`ProjectModel`, `/api/analysis/*`) | `BridgeFrameAnalysisDocument` + `FrameAnalysisResultResource` | `ProjectModel` operational; BFAD/IF3 infra partial |

Legacy APOLLO desktop modules (Girder, Section, Splice, SuperDrawing, y-Mater) are **not** OSS tools in Phase 1. Their responsibilities are either deferred (LATER_PHASE) or out of product scope.

## RACI-style matrix (Phase 1 frozen scope)

Legend: **R** = responsible (builds/owns data), **A** = accountable (acceptance), **C** = consulted, **I** = informed, **—** = out of scope

| Capability domain | Road Design Tool | Apollo Superstructure Design | Frame Analysis Tool | Notes |
|-------------------|:----------------:|:----------------------------:|:-------------------:|-------|
| Alignment / stationing / cross-section | **R/A** | C | I | CAP-RDD-001; ENT-CAND-0001 |
| Bridge layout (span, girder count, 90° skew) | C | **R/A** | C | ENT-CAND-0002; straight/equal-depth constraints |
| Support/bearing layout (fixed/movable) | I | **R** | C | Detailed bearing design deferred |
| Material catalog (governance-gated) | I | **R** | C | BLK-S1-002/005; no auto numerics |
| Section properties for analysis | I | C | **R/A** | CAP-FRM-003; APOLLO Section app not in OSS |
| Structural model (nodes/members) | — | C | **R/A** | CAP-FRM-001 |
| Load cases (dead/slab/live) | I | **R** | C | NEW_MODULE slab; BLOCKED_BY_STANDARD live |
| Load combinations | — | C | **R** | Rules OPEN/JIS-dependent |
| Static linear analysis execution | — | I | **R/A** | Phase 1 analysis type freeze |
| Analysis results normalization (IF3) | — | I | **R/A** | CAP-IF3-001; client binding gap |
| RC slab design (non-composite) | — | **R/A** | C | REQ-5C-0002 NEW_MODULE |
| Member design (girder/web/flange check) | — | — | I | OUT_OF_PHASE1 |
| Splice / bracing / stiffener design | — | — | — | OUT_OF_PHASE1 |
| Formal drawings / CAD export | **R** (road DXF) | — | C (viewer) | SuperDrawing parity deferred |
| Calculation reports (authoritative) | I | C | **R/A** | IF3-gated; CAP-OUT-002 partial |
| Road → superstructure transfer | **R** (export) | **A** (import) | I | `RoadToFrameTransferPackage` target |
| Superstructure → frame transfer | I | **R** (export) | **A** (import) | BFAD / transfer apply path |
| Legacy Analyzer file I/O | — | C | I | UNKNOWN; not Phase 1 dependency |

## Ownership principles

1. **Single writer per aggregate** — Each persisted document type has one accountable owner tool; consumers read via versioned contracts only.
2. **Road does not solve structural analysis** — Road Design Tool stops at road geometry and transfer package export; it does not own member forces or solver settings.
3. **Frame does not own road alignment SoR** — Frame Analysis Tool imports geometry via transfer; it does not mutate `RoadDesignDocument`.
4. **Apollo Superstructure owns layout + slab/load intent** — Girder spacing, span assumptions, slab load tables, and superstructure metadata live here until exported to frame model.
5. **Fail-closed on scope violation** — Tools MUST NOT silently accept OUT_OF_PHASE1 inputs (see `phase1_scope_freeze.md`).

## Gap ownership (P04 blockers touching boundaries)

| Blocker | Primary owner tool | Action |
|---------|-------------------|--------|
| BLK-S1-001 Target Standard | Governance (all tools) | No binding numerics |
| BLK-S1-011 Analyzer I/O | Frame Analysis Tool | Internal solver path for Phase 1 |
| BLK-S1-012 IF3 client binding | Frame Analysis Tool | Wire `if3` metadata in API client |
| BLK-S1-010 composite/box leakage | Apollo Superstructure Design | Reject composite/box inputs |

## References

- P03: `../03_existing_capability/current_document_and_interface_map.md`
- P04: `../04_gap_analysis/ready69_gap_analysis.csv`
- Handoff entities: `../../handoffs/.../analysis-input/data_entity_candidates.csv`
