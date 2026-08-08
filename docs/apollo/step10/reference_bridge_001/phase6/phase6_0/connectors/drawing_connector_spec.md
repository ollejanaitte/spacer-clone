# Drawing Connector Spec

> **Authority:** Reference Bridge 001 (RB-S10-001) — STEP 10 Phase 6-0 PR-2
> **Frozen boundary:** `GeometrySnapshot → Drawing Connector → Drawing Model`

## 1. Purpose

Supply drawing generation with engineering coordinates from GeometrySnapshot.
The connector provides view projection inputs, engineering coordinates, section/
member references, and dimension anchors. The drawing renderer only composes
typography and geometry primitives; it never recomputes bridge coordinates.

## 2. Inputs

- GeometrySnapshot (supports, girderLines, gridPoints, crossSectionFrames,
  memberPlacementReferences, deckReferences)
- drawing intent (which views/sheets)

## 3. Outputs

- Drawing Model (plan/elevation/section views, dimension anchors, annotation references)

## 4. Responsibilities

- view projection input (plan X-Y, elevation X-Z, section Y-Z)
- engineering coordinates (read-only from snapshot)
- section references, member references
- dimension anchor references (from snapshot points)

## 5. Prohibited

- girder/support coordinate recomputation (DUP-004/005/018 eliminated)
- skew recomputation
- drawing-internal station derivation (replace `drawingSetModel` re-derivation)

## 6. Existing duplication addressed

- `drawingSetModel.buildGeneralArrangementDrawingSet` (DUP-018) -> consume snapshot
  layout instead of raw draft re-derivation.
- `stationGenerator.girderCenterOffsetsY` / `drawingModel.computeStandardSectionLayout`
  (DUP-004/005) -> read girderLines from snapshot.
- Section outline datum unified with the coordinate contract (DUP-015).

## 7. Owner

Drawing Connector owner (bridge-side); drawing rendering owned by Drawing layer.
