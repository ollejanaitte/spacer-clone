# Current Document and Interface Map — P03

**Authority:** DESIGN PLANNING / STEP 1  
**Date:** 2026-07-27  
**Base commit:** `5102c918acbc4da5e8570c4606b723b73979ea91`

## Purpose

Map **document types**, **wire interfaces**, and **consumer relationships** as they exist in spacer-clone today versus the Stage 6–10 target model. Navigation only; normative contracts remain in `docs/planning/stage6-10/` and `docs/transfer/`.

## Document type map

| Document / artifact | Target role | Current operational status | Schema / code location | Primary consumers |
|---------------------|-------------|---------------------------|------------------------|-------------------|
| **RoadDesignDocument** | Road system of record | INFRASTRUCTURE — persisted via contract repository; LINER UI uses domain draft | `schemas/contracts/v0.1/road-design-document.schema.json`; `frontend/src/contracts/roadDesignDocument.ts` | LINER adapters, formal drawing, future transfer exporter |
| **BridgeFrameAnalysisDocument** | Frame system of record | INFRASTRUCTURE — store + tests; **UI uses ProjectModel** | `schemas/contracts/v0.1/bridge-frame-analysis-document.schema.json`; `frontend/src/contracts/bridgeFrameAnalysisDocument.ts` | IF3 normalizer (when metadata supplied), contract tests |
| **RoadToFrameTransferPackage** | Immutable transfer payload | INFRASTRUCTURE — validate only | `schemas/contracts/v0.1/road-to-frame-transfer-package.schema.json` | Planned Frame importer (Stage 10 P3) |
| **TransferRecord** | Append-only transfer audit | INFRASTRUCTURE — repository tests | `schemas/contracts/v0.1/transfer-record.schema.json` | Planned apply/history UI |
| **EngineeringProject** | Reference manifest | INFRASTRUCTURE | `schemas/contracts/v0.1/engineering-project.schema.json` | Not wired to main app |
| **FrameAnalysisResultResource** | Versioned analysis result | EXISTING_PARTIAL — normalized on server; gated on clients | IF3 modules; `schemas/contracts/v0.1/frame-analysis-result-resource.schema.json` | Report, Viewer, DRAFT, PRINT adapters |
| **ProjectModel** (`project.json`) | Legacy Frame wire + persistence | **OPERATIONAL SoR** for Frame app | `schemas/project.schema.json`; `frontend/src/types.ts`; `backend/engine/model.py` | App.tsx, all `/api/analysis/*`, viewer |
| **BridgeDefinition** | Legacy bridge parametric model | LEGACY — wizard / generator path | `schemas/bridge-definition.schema.json` | Bridge wizard, FEM generator |
| **BridgeProject / LINER draft** | Road design working state | OPERATIONAL for Road UI | `frontend/src/liner/schema/types.ts` | LINER pages, importer |
| **DrawingDocument** (neutral) | SP1 shared drawing primitives | PARTIAL — Road formal drawing | `frontend/src/liner/drawing/` | DXF export, PRINT (Road) |
| **AnalysisResult** (raw solver) | Compatibility only | OPERATIONAL but **non-authoritative** per IF3 | `schemas/result.schema.json` | Legacy CSV/PDF paths; IF3-E quarantine |

## Interface map (runtime)

### Frame REST API (`backend/app/main.py`)

| Endpoint | Request body | Response | IF3 sidecar | Notes |
|----------|--------------|----------|-------------|-------|
| `POST /api/projects/validate` | `{ project }` | `ValidationResponse` | — | |
| `POST /api/analysis/run` | `{ project, options?, if3? }` | `{ result, csv?, if3Result?, persistedResultRef? }` | Optional `if3` metadata | **Client omits `if3`** → binding incomplete |
| `POST /api/analysis/eigen` | eigen request + project | `{ result, if3Result? }` | Same pattern | |
| `POST /api/analysis/response-spectrum` | RS request + project | `{ result, if3Result? }` | Same | |
| `POST /api/influence/run` | influence request + project | `{ result, if3Result? }` | Same | |
| `POST /api/moving-load/run` | project + movingLoadCase | `{ result, csv?, if3Result? }` | Same | |
| `POST /api/projects/save` | `{ fileName, project }` | save ack | — | Legacy JSON file |
| `POST /api/projects/load` | `{ fileName }` | `{ project }` | — | |
| Bridge FEM API | `{ bridge, runAnalysis? }` | generated project / FEM | — | `frontend/src/bridge/api.ts` |

### Frontend API client (`frontend/src/api/client.ts`)

| Method | Sends | Receives | Gap |
|--------|-------|----------|-----|
| `runAnalysis(project, returnCsv)` | `project`, `options.returnCsv` only | `AnalysisRunResponse` | **No `if3` / `sourceBinding` metadata** |
| Other analysis methods | Project-derived payloads | `If3AnalysisSidecar` + result | Same binding gap |

Expected `if3` metadata shape (server): `sourceDocumentId`, `sourceDocumentVersion`, `sourceContentChecksum`, `analysisSettings`, `loadContext`, `solverName`, `solverVersion`; optional `frameDocumentPath`, `frameDocumentChecksum` for persistence. See `backend/tests/test_if3_api.py::if3_metadata`.

### IF3 consumer interfaces

```text
BridgeFrameAnalysisDocument (target SoR)
        │
        ▼
  Analysis API + if3 metadata ──► normalize_linear_static_result_resource()
        │
        ▼
  FrameAnalysisResultResource
        │
        ├──► if3ResultGate / if3ExportGate ──► CSV / PDF / result.json
        ├──► if3ResultViewModel ──► Viewer3D overlays
        ├──► if3DraftEligibility ──► DRAFT sheets (PR-41 blocked)
        └──► reports.py gates ──► backend authoritative exports
```

### Road-to-Frame boundary (target)

```text
RoadDesignDocument
        │
        ▼ (export)
RoadToFrameTransferPackage (immutable, versioned, checksum)
        │
        ▼ (import/preflight/apply — NOT in main app)
BridgeFrameAnalysisDocument + TransferRecord (append-only)
```

Crosswalk: [docs/transfer/contract-index.md](../../../transfer/contract-index.md)

## Schema versioning map

| Layer | Version field | Location | Migration |
|-------|---------------|----------|-----------|
| Target contracts | `schemaId` + `schemaVersion` (SemVer) | `schemas/contracts/v0.1/*` | `frontend/src/contracts/migration/` pure-step registry |
| Legacy project | `projectInfo.schemaVersion` = `1.0.0` | `schemas/project.schema.json` | Liner helpers in `projectLinerMigration.ts` |
| IF3 result resource | `0.1.0` | `IF3_SCHEMA_VERSION` in normalizer | IF3-E legacy wrap; no invented provenance |
| Result payload catalog | `0.1.0` | IF3 payload schema | Per-kind adapters |

Policy references:

- [schema_migration_policy.md](../../../road/legacy-integration/schema_migration_policy.md) — liner/project extensions
- [compatibility_matrix.md](../../../planning/stage6-10/compatibility_matrix.md) — target migration pipeline
- [target_data_model.md](../../../planning/stage6-10/target_data_model.md#schema-version-and-migration) — envelope rules

## PR boundary map (Phase 6)

| PR | Scope | Current interface touchpoints | Verdict (phase6 docs) |
|----|-------|------------------------------|------------------------|
| PR-39 | Road GDRAW / DXF | LINER drawing, DXF export | Complete (Road) |
| PR-40 | Frame PRINT / report catalog | `if3ExportGate`, `if3PrintCatalog`, `reports.py` | CONDITIONAL_GO |
| PR-41 | Frame formal DRAFT | `if3DraftEligibility` | NOGO (SP1) |
| PR-42 | Viewer IF3 adapters | `Viewer3D`, `if3ResultViewModel` | CONDITIONAL_GO |

PRINT vs IF3: PRINT owns layout/rendering only; IF3 owns result validity. See [if3_consumer_contracts.md](../../../road/phase6/if3/if3_consumer_contracts.md#print-boundary).

## Handoff / external interfaces (Apollo context)

| Interface | Direction | Status | Register |
|-----------|-----------|--------|----------|
| SuperDesigner → Analyzer input | APOLLO_TO_FRAME | **UNKNOWN** physical format | IO-CAND-0003, ISS-S1-007 |
| Analyzer → Design results | FRAME_TO_APOLLO | **UNKNOWN** physical format | IO-CAND-0004 |
| OSS Frame API | Internal JSON | EXISTING | `ProjectModel` / `AnalysisResult` |
| Target transfer package | Road → Frame | DESIGNED not operational | Stage 10 P3 |

## Mention index (docs ↔ schemas)

| Name | Docs mentions | Schema file |
|------|---------------|-------------|
| `BridgeFrameAnalysisDocument` | `target_data_model.md`, `contract-index.md`, `frame/README.md`, IF3 package | `bridge-frame-analysis-document.schema.json` |
| `RoadDesignDocument` | `road/README.md`, `transfer/contract-index.md`, Phase 5/6 docs | `road-design-document.schema.json` |
| `TransferRecord` | `road_to_frame_contract.md`, `contract-index.md` | `transfer-record.schema.json` |
| `FrameAnalysisResultResource` | IF3 package (all docs) | `frame-analysis-result-resource.schema.json` |
