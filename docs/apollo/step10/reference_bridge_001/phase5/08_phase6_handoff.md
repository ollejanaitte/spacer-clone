# Phase 6 Handoff — Geometry / 3D from the Common Bridge Data Model

> **Authority:** Reference Bridge 001 (RB-S10-001) — STEP 10 Phase 5 PR P5-4
> **Phase 6 must NOT start automatically.** Await explicit user instruction.

## 1. Objective

Phase 6 reproduces Reference Bridge 001 **Bridge Geometry / 3D Model** on the
production side, taking the frozen Common Bridge Data Model as input.

## 2. Canonical paths

| Item | Path |
|------|------|
| Canonical schema | `schemas/contracts/v0.1/common-bridge-data-model.schema.json` |
| Schema version | `1.0.0` |
| Canonical types | `frontend/src/contracts/commonBridgeDataModel.ts` |
| Runtime schema (source of truth) | `frontend/src/contracts/runtime/schemas/commonBridgeDataModel.ts` |
| Reference fixture | `docs/apollo/step10/reference_bridge_001/phase5/fixtures/reference_bridge_001_common_model.json` |
| Golden → Common parity | `.../phase5/validation/golden_to_common_model_parity.csv` |
| Golden traceability | `.../phase5/fixtures/...` traceability links + Phase 4 traceability CSVs |
| Mapping rules | `.../phase5/tools/cbdm_mapping.py`, `.../phase5/mapping/*.csv` |

## 3. Inputs for Geometry

- **Alignment input**: `alignments.alignments[].fields` (ALN-ACL) — bridge_length,
  span_length.*, gradients, ground level, cross/gradient values.
- **Geometry entities**:
  - `bridgeGeometry.supports[]` (SUP-*) — support ids/restraints
  - `bridgeGeometry.girders[]` (GIRDER-AG1, GIRDER-AG2) — heights, spacing, lengths
  - `bridgeGeometry.gridPoints[]` (GRID-1001..1027, 2001..2027) — endpoint X/Y
  - `bridgeGeometry.deck[]` (DECK-01) — total width, thickness
  - `structuralModel.nodes[]` (NODE-*) — endpoint coordinates; intermediate
    panel points 1002–1026 / 2002–2026 are **HOLD** (do not interpolate)
- **Coordinate rules**: right-handed, `x-longitudinal, y-transverse, z-up`, length m;
  see `contracts/coordinate_axis_contract.md`. Canonical angle rad; source deg preserved.
- **Section/girder data**: `sections.sections[]`, `design.items[]` (DES-/AD-).

## 4. Unresolved values (must propagate, never invented)

- `HOLD_INSUFFICIENT_SOURCE`: intermediate panel-point coordinates (NODE-1002–1026,
  NODE-2002–2026) — 150 hold values; explicit `stateReason`.
- `CONFLICT`: CONF-P2II-001 bottom flange width (candidates 680/700 mm, selected null)
- `HUMAN_CONFIRMATION_REQUIRED`: HCR-001 (95 records)
- `NOT_AVAILABLE`: analysisReference (no analysis values to show)

## 5. Geometry Golden references

- Geometry values trace to Golden via `traceability` links (`goldenId`,
  `sourceRecordIds`) and the parity CSV. Geometry implementation must not alter
  Golden or the fixture.

## 6. Expected Geometry parity gates

- Geometry output entity set matches fixture entity ids (GIRDER-AG1/AG2, SUP-*,
  GRID-*, NODE-*, DECK-01).
- Engineering values match fixture resolved `CONFIRMED` values (same unit/state).
- HOLD/conflict/HCR states are surfaced, never silently defaulted.
- Round-trip of the Common Model used by Geometry remains stable.

## 7. 3D visualization boundary

- 3D viewer work is permitted in Phase 6 scope only as visualization of the
  Common-model-driven geometry; it is not part of the CBDM freeze.
- No CBDM schema change is allowed solely for viewer convenience.

## 8. Phase 6 prohibited items

- Changing the frozen schema/types/serialization without a migration + seal review
- Interpolating or back-calculating HOLD coordinates
- Resolving CONF-P2II-001 or HCR-001 silently
- Fabricating analysis results (analysisReference stays NOT_AVAILABLE)
- Skipping the existing Apollo/SPACER/LINER architecture in favor of parallel models

## 9. Exact first implementation task

Add a read-only adapter `CommonModelGeometrySource` that consumes
`fixtures/reference_bridge_001_common_model.json` and produces the Phase 6
geometry entity inputs (alignments, spans, supports, girders, grid/panel points,
deck) with values + resolution states carried through, then validate with the
Phase 6 geometry parity gates above.
