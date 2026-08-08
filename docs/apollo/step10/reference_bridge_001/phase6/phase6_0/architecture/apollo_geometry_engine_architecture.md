# Apollo Geometry Engine Architecture

> **Authority:** Reference Bridge 001 (RB-S10-001) — STEP 10 Phase 6-0 PR-1
> **Status:** FROZEN by this PR (design freeze; no production implementation in Phase 6-0)

## 1. Architecture (frozen)

```
LINER  (Single Source of Alignment)
    |
    v
Alignment Connector
    |
    v
Common Bridge Data Model  (input / persistence data contract, Phase 5 frozen)
    |
    v
Geometry Input Adapter
    |
    v
Apollo Geometry Engine  (Single Source of Bridge Geometry; UI-agnostic)
    |
    v
GeometrySnapshot  (generated bridge geometry authority)
    |--- Structural Model Connector -> Frame/Structural Model
    |--- 3D Connector               -> Render Model -> Three.js/R3F
    |--- Drawing Connector          -> Drawing Model -> SVG/DXF
    |--- Substructure Connector     -> Pier/Abutment Placement
    --- Export Connector            -> STL / DXF / future IFC
```

## 2. Single-source principles (frozen)

1. **Single Source of Alignment = LINER.** Road alignment math (line/arc/clothoid,
   station/offset, vertical, crossfall, azimuth, stationing, XYZ evaluation) is LINER
   authority. Apollo never reimplements alignment math.
2. **Common Bridge Data Model = input / persistence data contract.** The Geometry
   Engine consumes the Common Model via the Geometry Input Adapter. It does NOT create
   a parallel project persistence model. GeometrySnapshot is a derived runtime/output
   model, NOT a replacement persistence format.
3. **Single Source of Bridge Geometry = Apollo Geometry Engine.** All bridge geometry
   entities are generated once by the Geometry Engine and exposed through
   GeometrySnapshot. Downstream systems read GeometrySnapshot; they never recompute
   station->XYZ, offset->XYZ, skew, crossfall, girder lines, support lines, or elevation.
4. **No hidden coordinate transform.** Every coordinate conversion is declared in a
   connector or in the Geometry Engine's defined steps. Viewer/Drawing/Structural/
   Substructure/Export hidden transforms are prohibited.
5. **Geometry Engine is UI-agnostic.** No dependency on React / Three.js / R3F /
   drawing renderer / UI state.

## 3. System ownership (summary)

See `system_ownership_matrix.csv`. Each concern has exactly one primary owner:

| Concern | Primary owner |
|---------|---------------|
| Road horizontal/vertical alignment, crossfall, stationing, station/offset->XYZ | LINER |
| Common persistence data contract | Common Bridge Data Model |
| Bridge geometry generation (supports/girders/grid/sections/bearings/frames) | Apollo Geometry Engine |
| GeometrySnapshot (runtime output) | Apollo Geometry Engine |
| Structural connectivity | Structural Model layer (via connector) |
| 3D rendering | 3D Viewer (via connector) |
| Drawing rendering | Drawing layer (via connector) |
| Substructure physical geometry | Substructure module (via connector) |
| STL/DXF/IFC format conversion | Export Connector |
| Save/load | Common Bridge Data Model persistence boundary |

## 4. Geometry Engine responsibilities

**Owns:**
- alignment sampling request (via Alignment Connector)
- support line placement, girder line placement, grid point geometry
- bridge transverse frames, cross-section placement frames
- deck reference geometry, member placement reference geometry
- bearing reference points, local bridge coordinate frames
- global XYZ conversion result
- geometry entity relationships
- GeometrySnapshot generation

**Does NOT own:**
- road alignment mathematical authority (LINER)
- structural stiffness / FEM / design judgment
- mesh rendering style / drawing typography / dimension text placement
- user interface

## 5. GeometrySnapshot (design)

Runtime/output model with:
- `snapshotVersion`, `bridgeId`, `sourceModelVersion`
- `coordinateSystem` (global + bridge-local conventions)
- `alignmentReferences`
- `supportLines`, `supportPoints`
- `girderLines`, `gridPoints`
- `crossSectionFrames`
- `deckReferences`, `bearingPoints`
- `memberPlacementReferences`
- `geometryIssues`
- `unresolvedGeometry` (HCR/conflict/HOLD propagated)
- `traceability` (source + Golden references)
- `fingerprint` (deterministic; for parity/reload checks)

GeometrySnapshot is derived and immutable per generation; consumers read it only.

## 6. Dependency rules (summary)

See `dependency_rules.md`. Mandatory: LINER must not import the Geometry Engine;
Common Model must not import Viewer; Geometry Engine must not import
React/Three.js/Drawing renderer; Viewer/Drawing/Structural/Substructure may consume
GeometrySnapshot. No cycles.

## 7. Sequences (summary)

See `geometry_generation_sequence.md` for A (project load -> GeometrySnapshot),
B (3D), C (structural), D (drawing), E (substructure), F (export).

## 8. Design decision record

| Decision | Rationale |
|----------|-----------|
| Single Source of Alignment = LINER | Avoid duplicate alignment math; LINER is authoritative and tested |
| Single Source of Bridge Geometry = Geometry Engine | Fixes duplicated girder/support/grid logic (30 audit rows) |
| GeometrySnapshot as runtime authority | One generated model read by all consumers; no per-consumer recompute |
| Common Model as input contract | Phase 5 frozen; no parallel persistence model |
| Explicit connectors | No hidden transforms; each boundary has a contract |
| Unresolved geometry propagated | HCR/conflict/HOLD never invented |

## 9. Phase 6-1 boundary

Phase 6-1 implements Geometry Core (GeometrySnapshot types, engine interfaces,
Alignment Connector adapter, Geometry Input Adapter, support/girder placement,
cross-section frames, Golden parity tests). This PR freezes the architecture;
implementation begins only after the Phase 6-0 seal and explicit user instruction.
