# Phase 6-1 Handoff — Geometry Core

> **Authority:** Reference Bridge 001 (RB-S10-001) — STEP 10 Phase 6-0 PR-3 (seal)
> **Status:** READY (implementation must NOT start automatically; await explicit user instruction)
> **Baseline main SHA:** `f5383722831515241a45fa78ab1735d20d637f9b` (Phase 6-0 seal base)

## 1. What Phase 6-0 delivered

- **Architecture freeze** (PR-1, #565): Apollo Geometry Engine is the Single Source
  of Bridge Geometry; GeometrySnapshot is the runtime authority; no hidden transforms.
- **Connector + coordinate + geometry entity freeze** (PR-2, #566): 7 connector specs,
  6 coordinate contracts + conversion matrix (16 declared conversions), 15 geometry
  entity types, unresolved-geometry contract (HCR-001 / CONF-P2II-001 / HOLD /
  NOT_AVAILABLE).
- **Reference mapping** (PR-3A, #575): `mapping/reference_bridge_001_geometry_mapping.csv`
  (25 mappings GM-001..025), every Golden reference resolves.
- **Master validation** (PR-3B, #577): `tools/validate_p6_0_pr3.py` (PASS 39 checks);
  `validation/phase6_0_master_validation_summary.md`.
- **Closeout + seal** (PR-3C): risk register, backlog, seal
  `SEAL-RB-S10-001-P6-0`, `08_phase6_1_handoff.md`.

## 2. Phase 6-0 gates (all PASS)

```
PHASE6_0_MASTER_VALIDATION: PASS
DUPLICATE_GEOMETRY_RESPONSIBILITY_UNRESOLVED: 0
HIDDEN_COORDINATE_TRANSFORM_UNRESOLVED: 0
REFERENCE_BRIDGE_GEOMETRY_MAPPING: PASS_WITH_HUMAN_TRACK
PHASE6_0_PR_CHAIN: PASS
PHASE6_0_FINAL_REPORT: PASS
```

## 3. Phase 6-1 scope (Geometry Core)

Implements the boundary layer only. See `backlog/README.md` (6.1A..6.1E).

1. **6.1A Contract**: GeometrySnapshot types/schema, Geometry Engine interface,
   coordinate system, units, station, orientation, stable ID conventions.
2. **6.1B Connections**: Alignment Connector adapter over LINER output (reuse
   `frontend/src/liner/core/coordinate3d.ts` `pointAtStationOffset` — do NOT
   reimplement alignment math); Geometry Input Adapter over the Common Bridge
   Data Model fixture (`phase5/fixtures/reference_bridge_001_common_model.json`).
3. **6.1C Placement**: support lines (SUP-AR2/PR1/PR2/PU15) + girder lines
   (GIRDER-AG1/AG2) for Reference Bridge 001.
4. **6.1D Frames**: cross-section placement frames (local/global axis, skew,
   transverse, elevation).
5. **6.1E Parity**: Reference Bridge 001 Golden parity (support stations, girder
   offsets, grid points, section frames) + regression + Phase 6-1 completion.

## 4. Hard constraints

- Reuse LINER alignment math; never copy road-alignment formulas into Geometry Core.
- Do not alter the frozen Common Bridge Data Model (schemaVersion 1.0.0).
- Do not modify substructure / design-engine implementations.
- HOLD / CONFLICT / HCR / NOT_AVAILABLE values are propagated, never invented.
- Each PR: small scope -> local verification -> branch -> PR -> merge -> main sync.

## 5. Canonical references for Phase 6-1

| Item | Path |
|------|------|
| Common model fixture | `docs/apollo/step10/reference_bridge_001/phase5/fixtures/reference_bridge_001_common_model.json` |
| Common model schema | `schemas/contracts/v0.1/common-bridge-data-model.schema.json` |
| LINER coordinate authority | `frontend/src/liner/core/coordinate3d.ts` |
| LINER geometry core | `frontend/src/liner/core/geometry/{horizontal,vertical}.ts` |
| Mapping | `.../phase6_0/mapping/reference_bridge_001_geometry_mapping.csv` |
| Engine architecture | `.../phase6_0/architecture/apollo_geometry_engine_architecture.md` |
| Connector specs | `.../phase6_0/connectors/*.md` |
| Coordinate contracts | `.../phase6_0/coordinates/*.md` |
