# 3D Connector Spec

> **Authority:** Reference Bridge 001 (RB-S10-001) — STEP 10 Phase 6-0 PR-2
> **Frozen boundary:** `GeometrySnapshot → 3D Connector → Render Model → Three.js/R3F`

## 1. Purpose

Map GeometrySnapshot geometry entities into render primitives for the 3D viewer.
The connector is the ONLY place where snapshot engineering geometry becomes scene
representation; the Geometry Engine is never directly coupled to Three.js.

## 2. Inputs

- GeometrySnapshot (supportLines, girderLines, gridPoints, crossSectionFrames,
  deckReferences, bearingPoints, memberPlacementReferences)

## 3. Outputs

- Render Model: render primitives (boxes, lines, extruded shapes), materials,
  visibility groups, picking IDs, scene transform

## 4. Responsibilities

- geometry entity -> render primitive
- display material assignment
- visibility grouping
- picking ID mapping (snapshot entity id <-> render id)
- scene-scale representation (single display transform)

## 5. Prohibited

- engineering coordinate recomputation
- bridge geometry regeneration
- hidden per-consumer transforms (viewer must not offset/skew)

## 6. Display transform policy

- Canonical display transform is defined once (see coordinate_conversion_matrix).
- The legacy split (apollo z-up verbatim vs frame y-up swap) is unified into a
  single documented display transform (DUP-013/021 resolved).

## 7. Owner

3D Connector owner (bridge-side); 3D rendering owned by Viewer.
