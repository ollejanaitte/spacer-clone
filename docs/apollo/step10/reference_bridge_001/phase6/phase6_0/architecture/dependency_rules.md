# Dependency Rules — Apollo Geometry Engine (Phase 6-0-B)

> **Authority:** Reference Bridge 001 (RB-S10-001) — STEP 10 Phase 6-0 PR B

## 1. Frozen dependency flow

```
LINER
  └─ (contract) Alignment Connector
        └─ Apollo Geometry Engine          <- consumes Alignment Connector contract + Common Model
              └─ GeometrySnapshot
                    ├─ Structural Model Connector -> Frame/Structural Model
                    ├─ 3D Connector               -> Render Model -> Three.js/R3F
                    ├─ Drawing Connector          -> Drawing Model -> SVG/DXF
                    ├─ Substructure Connector     -> Pier/Abutment Placement
                    └─ Export Connector           -> STL / DXF / future IFC
```

## 2. Mandatory rules

1. **LINER must not import the Geometry Engine.** (one-way: Engine may read LINER contract via connector)
2. **Common Bridge Data Model must not import the Viewer / Geometry Engine / React / Three.js.**
3. **Geometry Engine may consume the LINER contract only through the Alignment Connector** (no direct LINER internals dependency).
4. **Viewer may consume GeometrySnapshot** (via 3D Connector); never computes bridge coordinates.
5. **Drawing may consume GeometrySnapshot** (via Drawing Connector); never recomputes girder/support coordinates.
6. **Structural Model may consume GeometrySnapshot** (via Structural Connector); never regenerates nodes/members coordinates.
7. **Substructure may consume GeometrySnapshot** (via Substructure Connector); placement coordinates come from the snapshot.
8. **Export may consume GeometrySnapshot** (via Export Connector); format conversion only.

## 3. Geometry Engine isolation

The Geometry Engine MUST NOT depend on:
- Three.js / @react-three/fiber (any rendering library)
- React
- Drawing renderer / SVG / DXF
- Report renderer
- UI framework

The Geometry Engine may use:
- pure math utilities (its own or shared), the LINER contract (via connector),
  and the Common Bridge Data Model contract (via Geometry Input Adapter).

## 4. Prohibited cycles

Circular dependencies are forbidden:
- No cycle between Geometry Engine, GeometrySnapshot, and any connector.
- No consumer may write back into the GeometrySnapshot (snapshot is derived/immutable output).
- No connector may depend on the consumer's renderer.

## 5. Direction-of-dependency table

| from \ to | LINER | Common Model | Geometry Engine | GeometrySnapshot | Viewer | Drawing | Structural | Substructure | Export |
|-----------|-------|--------------|-----------------|------------------|--------|---------|------------|--------------|--------|
| LINER | — | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Common Model | ✗ | — | ✓ (via Input Adapter) | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Geometry Engine | ✓ (via Alignment Connector) | ✓ (via Input Adapter) | — | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| GeometrySnapshot | ✗ | ✗ | ✗ | — | ✓ | ✓ | ✓ | ✓ | ✓ |

✓ = allowed dependency; ✗ = prohibited.

## 6. Enforcement

- Phase 6-1 implementation must locate the Geometry Engine in a framework-free
  module (no React/Three imports) and the Alignment Connector as the only LINER
  bridge. The P6-0-D master validator scans Phase 6 implementation files for
  prohibited imports (Three.js/React/renderer).
