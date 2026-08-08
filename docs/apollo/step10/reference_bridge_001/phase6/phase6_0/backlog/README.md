# Phase 6-1..6-4 Implementation Backlog — Apollo Geometry Engine

> **Authority:** Reference Bridge 001 (RB-S10-001) — STEP 10 Phase 6-0 PR-3
> **Purpose:** freeze the Phase 6 backlog so Phase 6-1..6-4 have a single
> implementation plan traceable to the frozen Phase 6-0 contracts.

## Phase 6-1 — Geometry Core (boundary layer; this PR chain)

| Item | Deliverable | Reference | Gate |
|------|-------------|-----------|------|
| 6.1A | GeometrySnapshot types / schema / contract + Geometry Engine interface + coordinate/unit/ID conventions | `phase6_0/geometry/geometry_entity_contract.md`, `connectors/*`, `coordinates/*` | contract tests |
| 6.1B | Alignment Connector adapter (over LINER output; no math) + Geometry Input Adapter (Common Model -> Engine input; no geometry calc) | `phase6_0/connectors/alignment_connector_spec.md`, `geometry_input_adapter_spec.md` | contract + integration tests |
| 6.1C | Support placement + girder placement (Reference Bridge 001 support lines/girder lines) | `phase6_0/coordinates/*`, mapping GM-002..007 | unit + integration tests |
| 6.1D | Cross-section frames (local/global axis, skew/transverse/elevation) | mapping GM-015, `coordinates/skew_crossfall_contract.md` | RB-001 verification |
| 6.1E | RB-001 Golden parity + regression + completion/handoff | mapping GM-001..025 | parity PASS |

## Phase 6-2 — Bridge Geometry (full placement)

| Item | Deliverable | Reference |
|------|-------------|-----------|
| 6.2A | Grid/panel point geometry (endpoints; HOLD propagation for intermediate) | mapping GM-008..013 |
| 6.2B | Deck reference geometry (width/thickness/edges) | mapping GM-014 |
| 6.2C | Member placement references + cross-girders | mapping GM-020..021 |
| 6.2D | Bearing reference points | mapping GM-022 |
| 6.2E | Bridge transverse frames / elevation | geometry generation sequence |

## Phase 6-3 — Connector realization

| Item | Deliverable | Reference |
|------|-------------|-----------|
| 6.3A | Structural Model Connector (GeometrySnapshot -> FEM) | `structural_model_connector_spec.md` |
| 6.3B | 3D Connector (GeometrySnapshot -> Render Model) | `3d_connector_spec.md` |
| 6.3C | Drawing Connector (GeometrySnapshot -> Drawing Model) | `drawing_connector_spec.md` |
| 6.3D | Substructure Connector (support lines/skew -> pier/abutment) | `substructure_connector_spec.md` |
| 6.3E | Export Connector (STL/DXF/IFC, unit policy) | `export_connector_spec.md` |

## Phase 6-4 — Consumers migration + seal

| Item | Deliverable | Reference |
|------|-------------|-----------|
| 6.4A | Migrate Apollo bridgeStructure/drawing/report/visualization to GeometrySnapshot | DUP-001..030, RC-001..012 |
| 6.4B | Substructure + FEM generators consume GeometrySnapshot | RC-002, RC-003, RC-007 |
| 6.4C | Phase 6 master validation + closeout + seal | phase 4/5 seal pattern |

## Sequencing rules

- Each PR: small scope, local verification, dedicated branch, PR, merge to main.
- Phase 6-2+ must NOT start until Phase 6-1 completion is merged and handoff confirmed.
- HOLD / CONFLICT / HCR values are propagated, never invented (see risk register R6-003..005).
