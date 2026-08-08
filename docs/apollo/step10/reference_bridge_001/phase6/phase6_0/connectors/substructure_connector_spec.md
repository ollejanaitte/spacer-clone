# Substructure Connector Spec

> **Authority:** Reference Bridge 001 (RB-S10-001) — STEP 10 Phase 6-0 PR-2
> **Frozen boundary:** `GeometrySnapshot support entity → Substructure Connector → Pier / Abutment Placement`

## 1. Purpose

Map GeometrySnapshot support entities into substructure pier/abutment placement.
The connector supplies placement coordinates and frames; the substructure module
builds local solids only.

## 2. Inputs (minimum)

- `supportId`
- `station`
- `skew` (rad, canonical)
- `elevation`
- `transverse axis` (local frame from snapshot)
- `bearing reference point`

## 3. Outputs

- Substructure placement (position, local frame, skew, elevation) for pier/abutment
  solid generation

## 4. Responsibilities

- map snapshot support point -> substructure placement
- carry local frame (tangent/transverse/vertical) from snapshot
- carry skew/elevation without recomputation
- propagate unresolved states (HCR/conflict/HOLD)

## 5. Prohibited

- recomputing support coordinates (replaces `useSubstructureRealtimeUpdate`
  and `SubstructureViewport` naive snapshots — DUP-011/012)
- recomputing skew (replaces SupportPlacementEngine-local skew math with snapshot
  frame)
- deg/rad mismatch (canonical rad; source deg preserved)

## 6. Existing duplication addressed

- Unify the 3 substructure snapshot producers (DUP-010/011/012) into one connector
  reading GeometrySnapshot.
- Skew units rad vs deg (RC-009) resolved by the coordinate contract.

## 7. Owner

Substructure Connector owner (bridge-side); substructure solid generation owned by
Substructure module.
