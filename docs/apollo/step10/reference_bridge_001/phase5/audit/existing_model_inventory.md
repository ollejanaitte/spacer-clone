# Existing Model Inventory — STEP 10 Phase 5 Architecture Audit

> **Authority:** Reference Bridge 001 (RB-S10-001) — STEP 10 Phase 5 P5-1
> **Baseline main SHA:** `979210fa203cfd6064c4f9799330a765c6d04878`
> **Purpose:** Decide, before creating any new model, what to **reuse as source of truth**, what to **fold into the Common Bridge Data Model**, and what to **treat as legacy**.

## 1. Decision summary

| Decision | Outcome |
|----------|---------|
| Root to reuse for Common Bridge Data Model envelope | `schemas/contracts/v0.1/` contract family (common-envelope, coordinate-context, unit-context, stable-entity-id, content-checksum, document-reference) + TS mirrors in `frontend/src/contracts/` |
| Structural/geometry content source | `BridgeDefinition` (Layer 3) + `ProjectModel` (Layer 4) conventions; **not copied** into the Common Model core |
| Golden / evidence source | STEP 10 Phase 3 Input Golden (CSV) + Phase 4 Model/Design/Report/Drawing Golden (CSV) + Phase 4 traceability + carry-forward registers |
| Runtime implementation pattern | Python tooling under `docs/apollo/step10/reference_bridge_001/phase{3,4}/tools/`; JSON Schema generated via zod runtime pipeline |
| Legacy / superseded (do not extend) | `schemas/bridge.schema.json` + `frontend/src/bridge/types.ts` + `backend/engine/bridge_model.py` (0.1.0), `generated-fem.schema.json` |

## 2. Inventory by area

### 2.1 JSON Schema (repo root `schemas/`)

| Path | Responsibility | Reusable | Verdict |
|------|----------------|----------|---------|
| `schemas/bridge.schema.json` (0.1.0) | Legacy bridge wizard domain model | No | **supersede** |
| `schemas/bridge-definition.schema.json` (1.0.0) | Canonical intermediate design intent (Layer 3), coordinate policy, units | Yes | **adapt** (content layer) |
| `schemas/project.schema.json` (1.0.0) | FEM/analysis input model + embedded liner/substructure sidecars | Yes | **adapt** (structural layer) |
| `schemas/result.schema.json` (1.0.0) | Analysis output format | Yes | **adapt** (future analysis layer) |
| `schemas/generated-fem.schema.json` | FEM summary | No | **supersede** |
| `schemas/contracts/v0.1/common-envelope.schema.json` | Shared document envelope (schemaId/version/revision/checksum/provenance/extensions) | Yes | **keep** (adopt as root envelope) |
| `schemas/contracts/v0.1/coordinate-context.schema.json` | Authoritative coordinate model (axis, handedness, station convention, transform) | Yes | **keep** (adopt) |
| `schemas/contracts/v0.1/unit-context.schema.json` | Authoritative units model (length/force/moment/stress/angle/sign) | Yes | **keep** (adopt) |
| `schemas/contracts/v0.1/stable-entity-id.schema.json` | namespace + UUID + kind + aliases | Yes | **keep** (adopt) |
| `schemas/contracts/v0.1/content-checksum.schema.json`, `document-reference.schema.json`, `revision-metadata.schema.json`, `provenance.schema.json` | Checksum/ref/revision/provenance primitives | Yes | **keep** (adopt) |
| `schemas/contracts/v0.1/bridge-frame-analysis-document.schema.json` | Frame analysis doc (structuralModel, loadDefinitions, capability blocks) | Yes | **adapt** (analysis layer reference) |
| `schemas/contracts/v0.1/bridge-superstructure-design-document.schema.json` | Superstructure design doc (girders/deck/sections/materials as governed quantities) | Yes | **adapt** (design layer) |
| `schemas/contracts/v0.1/road-design-document.schema.json` | Road alignment/stationing/profile doc | Yes | **adapt** (alignment layer) |
| `schemas/substructure/*` (0.1.0/0.2.0) | Substructure project + support interface + pier/abutment/foundation | Yes | **adapt** (interface boundary) |

### 2.2 TypeScript model types (`frontend/src/**`)

| Path | Responsibility | Reusable | Verdict |
|------|----------------|----------|---------|
| `frontend/src/types.ts` | ProjectModel + AnalysisResult (FEM canonical) | Yes | **adapt** |
| `frontend/src/bridge/types.ts` | Legacy BridgeProject | No | **supersede** |
| `frontend/src/bridgeDefinition/types.ts` | BridgeDefinition (Layer 3 canonical intent) | Yes | **adapt** |
| `frontend/src/apollo/bridgeStructure/types.ts` | Bridge structure input draft (1.5.0-dev) | Yes | **adapt** |
| `frontend/src/apollo/contracts/layoutTypes.ts` | BridgeLayoutContract (spans/supports) | Yes | **adapt** |
| `frontend/src/apollo/report/reportModelTypes.ts` | Canonical ContinuousReportModel (CP-01..CP-34) | Yes | **adapt** (report layer) |
| `frontend/src/apollo/drawing/drawingModel.ts` | DrawingModel (STANDARD_SECTION) | Yes | **adapt** (drawing layer) |
| `frontend/src/apollo/quantity/quantityModel.ts` | QuantityModel (QTY-* IDs) | Yes | **adapt** (future) |
| `frontend/src/apollo/loads/appurtenanceHaunchLoadModel.ts` | Dead-load model (-Z convention) | Yes | **adapt** (load layer) |
| `frontend/src/apollo/types.ts` | NumericAuthority / NumericValueRecord authority model | Yes | **keep** (adopt for value authority) |
| `frontend/src/contracts/*` | TS mirrors of the v0.1 contract family + persistence/migration | Yes | **keep** (adopt) |
| `frontend/src/liner/core/types.ts` | LINER alignment/station/grid geometry kernel (0.2.0) | Yes | **adapt** (geometry input layer) |
| `frontend/src/liner/schema/types.ts` | LinerDomainDraftVNext persisted draft | Yes | **adapt** |
| `frontend/src/liner/importer/types.ts` | LINER PDF importer model (source provenance) | Yes | **adapt** |
| `frontend/src/liner/drawing/model/document.ts` | DrawingDocument (drawing IR, ADR-BMV2-006) | Yes | **adapt** |
| `frontend/src/viewer/types.ts` | Viewer display config | No | **not applicable** (UI only) |

### 2.3 Backend (`backend/engine/**`)

| Path | Responsibility | Reusable | Verdict |
|------|----------------|----------|---------|
| `backend/engine/model.py` | FEM ProjectInfo/Node/Material/Section/Member dataclasses | Yes | **adapt** |
| `backend/engine/bridge_model.py` | Legacy BridgeProject | No | **supersede** |
| `backend/engine/bridge_fem_generator.py` | Legacy FEM generation (N1..Nn index IDs) | No | **supersede** (forbidden in V2) |
| `backend/engine/if3_*.py`, `app/contract_document_store.py`, `app/atomic_json.py` | Contract persistence | Yes | **keep** |
| `backend/app/main.py` | FastAPI endpoints | Yes | **keep** (no change in P5) |

### 2.4 Substructure planning (`substructure-planning/`)

| Path | Responsibility | Reusable | Verdict |
|------|----------------|----------|---------|
| `substructure-planning/prototype/src/model.ts` | Substructure Project/Support/Pier/Abutment model | Yes | **adapt** (interface boundary) |
| `substructure-planning/prototype/src/projectIO.ts` | JSON serialize/parse + validation | Yes | **adapt** |
| `docs/architecture/exchange_schema.md` | Exchange schema design | Yes | **keep** |

### 2.5 STEP 10 golden / evidence data (`docs/apollo/step10/reference_bridge_001/`)

| Path | Responsibility | Reusable | Verdict |
|------|----------------|----------|---------|
| `phase3/golden/*.csv` (10 files; 141 input golden records) | Phase 3 Input Golden (bridge identity, geometry, girder, material, load, cross member, deck inputs) | Yes | **keep as source** |
| `phase4/golden/reference_bridge_001_model_golden.csv` (67) | Phase 4 Model Golden (geometry + structural) | Yes | **keep as source** |
| `phase4/golden/reference_bridge_001_design_golden.csv` (99) | Phase 4 Design Golden | Yes | **keep as source** |
| `phase4/golden/reference_bridge_001_report_drawing_golden.csv` (3,650) | Phase 4 Report (1,591) + Drawing (2,059) Golden | Yes | **keep as source** |
| `phase4/traceability/traceability_phase4_rd_golden.csv` | RD golden → sheet/source traceability | Yes | **keep as source** |
| `phase4/review/human_confirmation_register.csv` | HCR-001 (sheet 141 OCR, 91 records) | Yes | **keep as source** |
| `phase4/review/conflict_resolution_register.csv` | CONF-P2II-001 (bottom flange 680 vs 700 mm) | Yes | **keep as source** |
| `phase4/review/non_promoted_*.csv`, `candidate_promotion_register*.csv` | Promotion/disposition registers | Yes | **keep as source** |
| `phase4/review/drawing_sheet_coverage.csv` | 141-sheet coverage register | Yes | **keep as source** |
| `phase4/phase4_seal.md` | SEAL-RB-S10-001-P4 | Yes | **keep** |

## 3. Cross-cutting observations

1. **Two authoritative runtime roots already exist**: `BridgeDefinition` (design intent) and `ProjectModel` (FEM). The Common Bridge Data Model must NOT duplicate these; it references/reuses their concepts.
2. **The formal contract envelope exists**: `schemas/contracts/v0.1/` + `frontend/src/contracts/`. The Common Bridge Data Model is added as a **new contract document in this family**, not a parallel island.
3. **Version fields are inconsistent** across the repo (`0.1.0`, `1.0.0`, `0.2.0`, `1.x-development`, `bmv2-1.0.0`). The Common Bridge Data Model freezes **schemaVersion = 1.0.0** and defines its own migration/versioning contract; it does not attempt to unify all other models in P5.
4. **ID conventions are inconsistent** (free-form, UUID, `ENT-*`/`G-*`, `N1`). The Common Model introduces a stable-ID contract (see `entity_id_contract.md`) that maps source golden IDs into stable Common IDs without forcing changes to legacy data.
5. **Angle conventions are split**: deg (substructure) vs rad (liner/project substructure `skewRad`). The Common Model mandates a canonical angle unit (rad) and records display unit + source unit explicitly (no silent conversion).
6. **Loads/materials are fragmented** across legacy, definition, project, apollo-load, and contract models. The Common Model defines layer containers and maps golden records into them; it does not merge the fragmented runtime models.
7. **Coordinate convention consensus**: right-handed, `x-longitudinal, y-transverse, z-up`, length m, force kN, station/offset with right-positive transverse and up-positive vertical. Adopted as canonical; `coordinate-context` governs axis/sign semantics.

## 4. Migration impact & risk

| Risk | Mitigation |
|------|------------|
| Creating a parallel model that ignores existing roots | Explicit reuse decisions above; Common Model is a contract document in the existing contract family |
| Golden CSVs rewritten to fit the Common Schema | **Forbidden by Golden integrity rule**; adapter normalizes source Golden → Common representation; corrections require a Golden correction request |
| Breaking existing project save/load | P5 only adds new optional fields/document; no required changes to `project.schema.json` or `frontend/src/types.ts` |
| deg/rad confusion | Canonical angle unit rad; source + display units carried on every value; no silent conversion |
| Index-based IDs | Prohibited; stable IDs required (see entity_id_contract.md) |
| Duplicate schema ownership | `model_ownership_freeze.md` (P5-4) assigns single owners per concept |
| New dependency / lockfile change | Prohibited; use `jsonschema` (already available) and zod (already in frontend) |

## 5. Conclusion

The Common Bridge Data Model will be:
- a **new contract document** in `schemas/contracts/v0.1/` (generated from a zod runtime schema),
- with canonical TS types in `frontend/src/contracts/commonBridgeDataModel.ts`,
- that **reuses** the existing contract envelope/coordinate/unit/stable-id primitives,
- and a **STEP 10 Python adapter** (under `phase5/tools/`) that maps Phase 3/4 Golden CSV → Common Model JSON losslessly,
- with the Reference Bridge 001 fixture under `phase5/fixtures/`.

No new runtime duplication of BridgeDefinition or ProjectModel is introduced.
