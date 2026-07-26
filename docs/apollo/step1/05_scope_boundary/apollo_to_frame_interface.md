# Apollo → Frame Interface — Data Direction & Ownership

**Authority:** DESIGN PLANNING / STEP 1  
**Date:** 2026-07-27  
**Decision:** DEC-S1-0008  
**Base commit:** `7240f1818d6de9bfbf1dbbc56113cef700ccad16`

## Summary

| Attribute | Value |
|-----------|-------|
| **Direction** | Apollo Superstructure Design → Frame Analysis Tool |
| **Phase 1 analysis** | Static linear only |
| **Target contract** | `BridgeFrameAnalysisDocument` (BFAD) + analysis API with IF3 metadata |
| **Operational interim** | `ProjectModel` JSON via Frame UI / API; BFAD store infra-only |
| **Legacy Analyzer I/O** | UNKNOWN — **not** a Phase 1 dependency (BLK-S1-011) |

## Data flow

```text
┌──────────────────────────────┐   model + loads    ┌─────────────────────────┐
│ Apollo Superstructure Design │ ────────────────► │  Frame Analysis Tool    │
│  (layout, slab, load intent) │  BFAD / ProjectModel │  (solver + IF3 results) │
└──────────────────────────────┘                    └─────────────────────────┘
         │                                                    │
         │ owns until export                                  │ owns post-run
         ▼                                                    ▼
  Girder layout, slab loads,                          Nodes, members, sections,
  support locations, load case defs                     static linear results,
  (non-composite RC deck)                             FrameAnalysisResultResource
```

**Return path (Frame → Apollo):** Analysis results and reactions flow back as **read-only** `FrameAnalysisResultResource` for superstructure verification and downstream design shells. Member-level detailed design (Girder/Section/Splice) is OUT_OF_PHASE1.

## Ownership table

| Data entity | Producer (owner) | Consumer | Phase 1 status |
|-------------|------------------|----------|----------------|
| Bridge geometry (span, girder lines, supports) | Apollo Superstructure | Frame Analysis | CANDIDATE |
| Structural nodes / members | Frame Analysis | Apollo (read-only results) | CAP-FRM-001 |
| Section properties (analysis) | Frame Analysis | — | CAP-FRM-003 |
| Materials (analysis values) | Apollo (governance-gated) | Frame Analysis | BLOCKED_BY_STANDARD |
| Supports (fixed/movable) | Apollo Superstructure | Frame Analysis | CANDIDATE |
| Load cases (dead, slab, live) | Apollo Superstructure | Frame Analysis | PARTIAL / BLOCKED |
| Load combinations | Frame Analysis | Apollo (read-only) | NOT_CONFIRMED |
| Analysis settings (static linear) | Frame Analysis | — | Phase 1 freeze |
| Raw solver output | Frame Analysis | — | Non-authoritative without IF3 |
| `FrameAnalysisResultResource` | Frame Analysis | Apollo, reports, viewer | CAP-IF3-001 |
| Section forces / reactions / displacements | Frame Analysis | Apollo (read-only) | EXISTING_PARTIAL |
| Member design checks | — | — | OUT_OF_PHASE1 |

## Phase 1 export minimum (Apollo → Frame)

1. **Geometry** — Single span, equal-depth girders, 90° skew; node/member topology or parametric recipe generating equivalent `ProjectModel`.
2. **Sections & materials** — Placeholder or governance-approved records only; no invented yield/weight constants.
3. **Supports** — Fixed and movable boundary conditions at span ends.
4. **Loads** — Dead, slab (REQ-5C-0002), live (REQ-5C-0003) as load cases when numerics ADOPTED.
5. **Analysis intent** — `analysisType: static_linear` only; reject dynamic/seismic requests.

## API / contract touchpoints (P03)

| Surface | Direction | Notes |
|---------|-----------|-------|
| `POST /api/analysis/run` | Apollo/Frame → solver | Requires `{ project, if3? }`; client binding gap |
| BFAD persistence | Apollo → Frame store | INFRASTRUCTURE_ONLY |
| IF3 normalizer | Frame internal | `normalize_linear_static_result_resource()` |
| IF3 export gates | Frame → consumers | Fail-closed without binding |

Expected `if3` metadata (server): `sourceDocumentId`, `sourceDocumentVersion`, `sourceContentChecksum`, `analysisSettings`, `loadContext`, `solverName`, `solverVersion`.

## Validation & fail-closed

| Check | Gate | On failure |
|-------|------|------------|
| Non-composite slab modeling | Apollo export | Reject composite flags |
| Multi-span / continuous model | Apollo export | `OUT_OF_PHASE1` |
| Static linear only | Frame import | Reject eigen/RS/TH requests |
| Missing IF3 binding (authoritative export) | Frame IF3 gate | `BLOCKED: IF3_GATE` |
| Analyzer legacy file expected | Frame | `UNSUPPORTED: LEGACY_ANALYZER_IO` |
| Unadopted live-load numerics | Apollo export | `BLOCKED: BLK-S1-001` |

## Legacy APOLLO interfaces (reference only)

| IO candidate | Direction | Phase 1 |
|--------------|-----------|---------|
| IO-CAND-0003 analyzer_input | APOLLO_TO_FRAME | UNKNOWN — use OSS API |
| IO-CAND-0004 analyzer_output | FRAME_TO_APOLLO | UNKNOWN — use IF3 resource |
| IO-CAND-0006 slab_load_table | APOLLO_TO_FRAME | REQUIRED concept; format TBD |
| IO-CAND-0007 live_load_definition | APOLLO_TO_FRAME | REQUIRED concept; BLOCKED numerics |
| IO-CAND-0012 section_check_input | FRAME_TO_APOLLO | OUT_OF_PHASE1 (section design deferred) |

## Open items

| ID | Topic | Owner |
|----|-------|-------|
| BLK-S1-011 | Analyzer physical format | Frame — internal path for Phase 1 |
| BLK-S1-012 | IF3 client binding | Frame UI |
| ISS-S1-007 | Force component set (3 vs 6) | Runtime confirmation |
| ENT-CAND-0010 | Load combination rules | OPEN / JIS_GAP |

## References

- Handoff: `../../handoffs/.../docs/06_frame_analysis_boundary.md`
- P03: `../03_existing_capability/current_document_and_interface_map.md`
- P04: REQ-5C-0034 (section force assignment EXISTING_PARTIAL)
