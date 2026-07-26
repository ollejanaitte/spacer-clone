# Existing Capability Inventory — P03

**Authority:** DESIGN PLANNING / STEP 1  
**Date:** 2026-07-27  
**Base commit:** `5102c918acbc4da5e8570c4606b723b73979ea91`  
**Method:** Read-only survey of `docs/frame/`, `docs/road/`, `docs/transfer/`, `docs/planning/`, IF3 design package, contract schemas, frontend/backend models, export paths, and test layout.

## Purpose

Record what spacer-clone **already implements or partially implements** as of main @ `5102c91`, distinct from Apollo handoff READY claims and distinct from target Stage 6–10 architecture. This inventory feeds Step 1 gap analysis (P04+) without authorizing production implementation.

## Executive summary

The repository is a **dual-layer** system:

1. **Operational layer (legacy/current):** `ProjectModel` in `frontend/src/types.ts` and `backend/engine/model.py` is the live wire format for the Frame analysis UI, API (`/api/analysis/*`), persistence (`project.json`), and solver execution.
2. **Target contract layer (infrastructure):** Versioned JSON schemas under `schemas/contracts/v0.1/`, TypeScript runtime validators under `frontend/src/contracts/`, and backend `ContractDocumentStore` provide `RoadDesignDocument`, `BridgeFrameAnalysisDocument`, `TransferRecord`, `RoadToFrameTransferPackage`, and `FrameAnalysisResultResource` — but these are **not yet the primary system of record** for the main Frame app workflow.

Road design (LINER) has substantial Phase 4–5 implementation (geometry, LDIST/HAUNCH/HOSO, formal drawing, DXF). Frame analysis has linear static, eigen, response spectrum, influence, moving load, and time-history extensions with verification tests. IF3 semantic gates (A–E) are implemented for result resources, staleness, persistence, and consumer adapters; authoritative export is **fail-closed** when binding metadata is missing.

Road-to-Frame transfer is **designed and schema-validated** but **not end-to-end operational** in the main product path. Analyzer physical I/O format remains **UNKNOWN** per handoff (ISS-S1-007). Target Standard remains **NOT_SELECTED** (P02; not re-decided here).

## Domain inventory

### Frame analysis engine (backend)

| Area | Status | Evidence |
|------|--------|----------|
| Linear static FEM | EXISTING_FULL | `backend/engine/model.py`, `backend/tests/test_api.py` |
| Eigen / modal | EXISTING_FULL | `backend/tests/test_eigen_analysis.py` |
| Response spectrum | EXISTING_FULL | `backend/tests/test_response_spectrum_analysis.py` |
| Influence lines | EXISTING_FULL | `backend/tests/test_influence_analysis.py` |
| Moving load envelope | EXISTING_FULL | `backend/tests/test_moving_load_analysis.py` |
| Time history (Newmark SDOF path) | EXISTING_PARTIAL | `backend/engine/time_history_models.py`, known limitations in `docs/frame/verification/time-history-known-limitations.md` |
| Bridge FEM generator | EXISTING_PARTIAL | `backend/tests/test_bridge_fem_generator.py`, wizard docs |

Core structural entities in backend `model.py`: `Node`, `Member`, `Material`, `Section`, `Support`, `LoadCase`, `NodalLoad`, `MemberLoad`, `MassItem`/`MassCase` — mirrored in frontend `types.ts`.

### Frame UI and API (frontend + FastAPI)

| Area | Status | Evidence |
|------|--------|----------|
| Project editing (nodes/members/materials/loads) | EXISTING_FULL | `frontend/src/App.tsx`, `frontend/src/types.ts` |
| Analysis run via REST | EXISTING_FULL | `frontend/src/api/client.ts` → `backend/app/main.py` |
| 3D viewer with result overlay | EXISTING_PARTIAL | `frontend/src/viewer/Viewer3D.tsx`, IF3 viewer gate |
| Bridge model wizard | EXISTING_PARTIAL | `docs/frame/modeler/bridge-model-wizard.md` |
| Time history wizard | EXISTING_PARTIAL | `/pro/th/` route, `frontend/src/timeHistory/` |

### IF3 result / output contract (Phase 6)

IF3 design package: `docs/road/phase6/if3/`. Implementation slices IF3-A through IF3-E are recorded on main.

| Slice | Capability | Status |
|-------|------------|--------|
| IF3-A | `FrameAnalysisResultResource` contract + validation | EXISTING_FULL (semantic) |
| IF3-B | Normalizer, staleness, availability | EXISTING_FULL (semantic) |
| IF3-C | Persistence + reload refs | INFRASTRUCTURE_ONLY (requires `if3` metadata with frame path) |
| IF3-D | Report/Viewer/DRAFT/PRINT consumer gates | EXISTING_PARTIAL |
| IF3-E | Legacy READ_OLD_WRITE_TARGET compatibility | EXISTING_FULL |

**PR readiness (from phase6 docs, not re-adjudicated):** PR-40 `CONDITIONAL_GO`, PR-41 `NOGO`, PR-42 `CONDITIONAL_GO`.

### Export paths (CSV / PDF / JSON)

| Path | Module | IF3 gate | Notes |
|------|--------|----------|-------|
| CSV (displacements, reactions, forces) | `frontend/src/exports/resultCsvExport.ts` | `if3ExportGate.ts` | Legacy path emits raw `AnalysisResult` JSON as `result.json` |
| PDF report | `frontend/src/exports/resultPdfReport.ts` | `if3ExportGate.ts` | Authoritative only when gate allows |
| Member force CSV | `frontend/src/exports/memberForceReport.ts` | `if3ExportGate.ts` | |
| IF3 `result.json` | `if3ExportGate.ts` | self | Emits `FrameAnalysisResultResource` when authorized |
| Backend authoritative export | `backend/app/reports.py` | `evaluate_if3_authoritative_export_gate` | Blocks raw `AnalysisResult` |
| PRINT DTO catalog | `frontend/src/exports/if3PrintDto.ts`, `if3PrintCatalog.ts` | catalog completeness open | PR-40 boundary |

### Road design (LINER)

| Area | Status | Evidence |
|------|--------|----------|
| Alignment / station / profile input | EXISTING_FULL | `docs/road/ui/`, Phase 4 completion |
| LDIST / HAUNCH / HOSO | EXISTING_PARTIAL | Phase 4 docs + e2e `p4-d02`…`p4-d04` |
| Formal drawing / DXF | EXISTING_PARTIAL | Phase 5 docs, `frontend/src/liner/drawing/` |
| `RoadDesignDocument` persistence | INFRASTRUCTURE_ONLY | `frontend/src/contracts/repository/roadDesignDocumentRepository.ts`, e2e `p3-f03-rdd-bridge-drawing-persistence` |
| Road PRINT (GDRAW) | EXISTING_PARTIAL | PR-39 scope; OD8-04 blocks visual release |

### Road-to-Frame transfer

| Area | Status | Evidence |
|------|--------|----------|
| Target contract (normative) | INFRASTRUCTURE_ONLY | `docs/planning/stage6-10/road_to_frame_contract.md` |
| Navigation crosswalk | EXISTING_FULL (docs) | `docs/transfer/contract-index.md` |
| JSON schemas v0.1 | INFRASTRUCTURE_ONLY | `schemas/contracts/v0.1/*.schema.json` |
| TS validators + mappers | INFRASTRUCTURE_ONLY | `frontend/src/contracts/` |
| Import/apply lifecycle in product | NOT_PRESENT | Stage 10 P3 sequence; no main-app transfer UI |
| `TransferRecord` append-only history | INFRASTRUCTURE_ONLY | schema + repository tests |

### Schema versioning and migration

| Area | Status | Evidence |
|------|--------|----------|
| Target contracts v0.1 | INFRASTRUCTURE_ONLY | `schemas/contracts/v0.1/`, `schema-identity.schema.json` |
| Migration framework (pure steps) | INFRASTRUCTURE_ONLY | `frontend/src/contracts/migration/` |
| Legacy `project.schema.json` (1.0.0) | LEGACY_ONLY | `schemas/project.schema.json`, operational SoR |
| Liner `projectLinerMigration.ts` | EXISTING_PARTIAL | `docs/road/legacy-integration/schema_migration_policy.md` |
| READ_OLD_WRITE_TARGET policy | EXISTING_FULL (policy) | IF3-E, `if3LegacyCompatibility.ts` |

### Tests and fixtures (high level)

| Layer | Location | Scope |
|-------|----------|-------|
| Backend unit/integration | `backend/tests/` (42 files) | Engine, IF3, API, schema, reports gate, bridge |
| Frontend unit | `frontend/src/**/__tests__/`, `*.test.ts` | Contracts, IF3 gates, exports, liner, bridgeDefinition parity |
| Frontend e2e | `frontend/tests/e2e/` (16 specs + 2 fixtures) | Road phases, liner, bridge, time-history |
| Contract conformance fixtures | `frontend/src/contracts/repository/__tests__/fixtures.ts` | RDD/BFAD/TR document shapes |
| Bridge regression fixtures | `frontend/src/bridgeDefinition/__fixtures__/` | Semantic parity golden sets |
| Formal drawing fixtures | `frontend/src/liner/drawing/phase5/formalDrawingFixtureManifest.ts` | Phase 5 drawing manifest |
| No top-level `tests/fixtures/` | — | Fixtures are co-located with test modules |

## Apollo reuse potential (summary)

| Reuse posture | Examples |
|---------------|----------|
| **High** — engine + verification harness | Linear static/eigen/R-spectrum/influence/moving-load solvers and `backend/tests/` regression patterns |
| **High** — contract infrastructure | v0.1 schemas, migration framework, IF3 resource model (after binding wiring) |
| **Medium** — Road LINER stack | Geometry, drawing, DXF; needs Target Standard and coordinate authority (OD6-01) |
| **Medium** — Viewer/export adapters | IF3-gated paths; blocked for authoritative claims until client binding + OD8-04 |
| **Low / blocked** — Road-to-Frame apply | Schemas exist; OD6-01/02/09-01 block apply |
| **Not reusable without external evidence** — Analyzer I/O | Physical format UNKNOWN (ISS-S1-007) |

## Related Step 1 artifacts

- [existing_capability_matrix.csv](existing_capability_matrix.csv) — row-level classification
- [current_document_and_interface_map.md](current_document_and_interface_map.md) — document and API map
- [current_limitations.md](current_limitations.md) — explicit blockers and gaps
- P02 [target_standard_decision.md](../02_standards_baseline/target_standard_decision.md) — Target Standard N/A for capability presence

## Classification counts

See matrix CSV summary in delegation report; counts are computed from `existing_capability_matrix.csv` at stage time.
