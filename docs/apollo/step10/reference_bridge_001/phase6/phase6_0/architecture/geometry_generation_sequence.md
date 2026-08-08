# Geometry Generation Sequence — Apollo Geometry Engine (Phase 6-0-B)

> **Authority:** Reference Bridge 001 (RB-S10-001) — STEP 10 Phase 6-0 PR B

## A. Project load

```
Project JSON (Common Bridge Data Model)
  -> Common Model load (schemaVersion 1.0.0)
  -> validate (canonical schema + semantic)
  -> Geometry Input Adapter
       - extract alignment / support / girder / grid / section / deck entities
       - classify confirmed / HCR / conflict / HOLD
       - normalize units; preserve IDs + source trace
  -> Geometry Engine Input (bridge-agnostic geometry request)
  -> Apollo Geometry Engine
       - Alignment Connector: request LINER samples (station -> XYZ + frame)
       - place support lines, girder lines, grid points, cross-section frames,
         deck reference, member placement references, bearing points
       - unresolved geometry handling (HCR/conflict/HOLD policy)
  -> GeometrySnapshot (fingerprint + traceability)
```

## B. 3D display

```
GeometrySnapshot
  -> 3D Connector (map geometry entities to render primitives, materials,
                   visibility groups, picking IDs; single display transform)
  -> Render Model
  -> Three.js / R3F (display only; no engineering coordinate math)
```

## C. Structural Model

```
GeometrySnapshot
  -> Structural Model Connector
       - geometry entity -> node
       - reference line -> member placement
       - local axis mapping (from snapshot frames)
       - support point mapping; eccentricity references
  -> Frame/Structural Model (nodes/members/supports)
```

## D. Drawing

```
GeometrySnapshot
  -> Drawing Connector
       - view projection input
       - engineering coordinates (read-only)
       - section references, member references, dimension anchor references
  -> Drawing Model
  -> SVG / DXF renderer (typography/text placement only)
```

## E. Substructure

```
GeometrySnapshot.support entity (supportId, station, skew, elevation, local transverse)
  -> Substructure Connector
       - map support placement (skew, elevation, bearing reference)
  -> Pier / Abutment Placement (solids local to support frame)
```

## F. Export

```
GeometrySnapshot
  -> Export Connector
       - engineering geometry (read-only)
       - unit conversion (single policy: m -> mm)
  -> STL / DXF / future IFC
```

## G. Invariants

- All bridge coordinates originate in the GeometrySnapshot (Single Source of
  Bridge Geometry). Downstreams never recompute station/offset/skew/elevation.
- The Geometry Engine never writes to the Common Bridge Data Model.
- Unresolved geometry is propagated (never invented); see Unresolved Geometry
  Contract (P6-0-C).
