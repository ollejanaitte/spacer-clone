# Existing Geometry Architecture Audit — Apollo Geometry Engine (Phase 6-0-A)

> **Authority:** Reference Bridge 001 (RB-S10-001) — STEP 10 Phase 6-0 PR A
> **Baseline main SHA:** `42c2815fb74de873bea529c11a8e453fde432d86`
> **Scope:** geometry architecture audit BEFORE Phase 6 implementation; no production code changed.

## 1. Current architecture (as built)

```
LINER (road alignment math: station->XY, offset->XY, azimuth, vertical, crossfall, stationing, grid)
  ├─ coordinate3d.pointAtStationOffset  -> XYZ
  ├─ bridge/pierLineGeometry            -> support line direction/skew
  └─ adapters/fromLinerBridge           -> BridgeDefinition

BridgeDefinition (design intent, Layer 3)
  └─ generator/structuralModelGenerator -> ProjectModel nodes (station->X, offset->Y, Z=0, sign)

BridgeProject (backend Bridge Wizard)
  └─ engine/bridge_fem_generator        -> ProjectModel nodes (same flat convention)

Apollo bridgeStructure (raw draft apolloBridgeStructureInput)
  ├─ generateBsdd                       -> BSDD (superstructure design document; continuous, offset formula)
  ├─ visualization/bridgeStructureSolids-> solid geometry params (z-up verbatim)
  ├─ visualization/builder              -> legacy solid params (hardcoded defaults)
  ├─ drawing/drawingSetModel            -> DrawingModel (re-derives layout from raw draft; simple-span only)
  ├─ report/reportModelContinuous       -> ReportModel (re-derives; non-centered girder offset BUG)
  ├─ quantity/quantities                -> QuantityModel (re-derives counts)
  └─ export/apolloStlExport             -> STL (mm, round)

Substructure
  ├─ SupportPlacementEngine             -> canonical LINER-based placement (skew applied)
  ├─ planning/useSubstructureRealtimeUpdate -> naive snapshot (axis-aligned, NO skew)  [UI]
  └─ planning/SubstructureViewport      -> fallback snapshot (coordinates-map)        [UI]

Viewer
  ├─ coordinateTransform                -> frame-model y-up swap + liner z=-y
  └─ ApolloVisualizationRenderer        -> apollo solids verbatim z-up

Persistence
  └─ contracts/persistence + legacy adapter -> project/frame docs (verbatim; synthetic coordinateContext unknown)
```

## 2. Duplicate geometry logic

See `duplicate_geometry_logic_register.csv` (30 rows). Highest-risk items:

| Severity | Finding |
|----------|---------|
| CRITICAL | Girder offset computed in 7 places; report uses non-centered `i*girderSpacing` (DUP-007) |
| CRITICAL | Substructure realtime snapshot diverges from canonical placement (no skew) (DUP-011) |
| HIGH | Two independent FEM grid generators (station->X/offset->Y) with no LINER/curve support (DUP-008/009) |
| HIGH | Drawing set fully re-derives layout from raw draft; simple-span only vs BSDD continuous (DUP-018) |
| HIGH | Road-marking edge inset + lift hidden constants (DUP-023) |
| HIGH | Hardcoded-default legacy solid path (DUP-006) |

## 3. Coordinate conversions & hidden transformations

- **Explicit:** LINER `station/offset -> XYZ` (`coordinate3d.ts`), BridgeDefinition `station->X/offset->Y/Z=0`, viewer `applyViewerDisplayTransform` swap.
- **Hidden / undocumented:**
  - BridgeDefinition sign policy applied to nodes but not persisted (no provenance).
  - `frameFromStartEnd` re-orientation for near-vertical bracing members.
  - `applySolidFrame` quaternion-from-basis (non-orthonormal frames silently skew).
  - STL `originShiftMm` user offset; m->mm rounding vs raw in DXF.
  - Bearing/marker "stack height" invented in solids.
  - Road-marking 0.2 m inset + 2 mm lift.
  - Drawing schematic ±0.4 / ±0.15 offsets.

## 4. Conflicting ownership

See `responsibility_conflict_register.csv` (12 rows). Core conflicts:
1. station->XYZ owned by LINER AND by two Apollo-side flat generators.
2. girder lines owned by bridgeStructure, drawing, report, visualization independently.
3. support placement owned by 3 substructure producers.
4. elevation datum differs across solids/drawing/FEM.
5. skew units rad vs deg across substructure schemas.

## 5. Reusable modules (proposed to keep as source of truth)

| Module | Why keep |
|--------|----------|
| LINER `core/geometry/*`, `coordinate3d.ts`, `stationAtPoint.ts`, `pierLineGeometry.ts`, `crossfallResolution.ts`, `elevationAt.ts` | Authoritative road alignment math |
| LINER `grid/gridGeneration.ts` | Grid point generation math (road side) |
| `coordinate-context.schema.json` / `unit-context.schema.json` / TS mirrors | Authoritative coordinate/unit contract |
| Common Bridge Data Model (Phase 5) | Frozen input data contract |
| `geometryFormulas.deriveMainGirderOffsets` | Canonical centered girder-offset helper (to be promoted) |
| `layoutValidation.buildSupportsFromSpans` | Canonical support-station derivation |

## 6. Obsolete / parallel modules (to supersede or gate)

| Module | Action |
|--------|--------|
| `visualization/builder.ts` legacy solid path (hardcoded defaults) | Gate behind GeometrySnapshot; deprecated |
| `drawingSetModel` raw-draft re-derivation | Replace with GeometrySnapshot consumption |
| `useSubstructureRealtimeUpdate` / `SubstructureViewport` naive snapshots | Replace with canonical placement |
| Backend `bridge_fem_generator` flat grid (Bridge Wizard) | Keep as legacy consumer; new path via GeometrySnapshot |
| `reportModelContinuous` non-centered girder offset | Fix (single source) |
| prototype `geometry.ts` deg->rad skew | Unify units |

## 7. Risk ranking

1. (CRITICAL) Divergent girder offsets between report and solids → wrong report geometry.
2. (CRITICAL) Substructure UI geometry diverges from canonical placement → wrong substructure placement.
3. (HIGH) No single bridge-geometry source → consumer drift (drawing vs solids vs report).
4. (HIGH) No curve/alignment support in Apollo generators → curved bridges cannot be reproduced.
5. (HIGH) Coordinate/datum/unit inconsistencies (z-up vs y-up, 3 datums, mm rounding) → cross-subsystem misalignment.
6. (MEDIUM) Hidden transforms/constants → untraceable geometry.

## 8. Required design changes (frozen in P6-0-B/C)

1. **Single Source of Alignment = LINER** (Alignment Connector); no Apollo-side reimplementation.
2. **Single Source of Bridge Geometry = Apollo Geometry Engine** producing a **GeometrySnapshot**; all consumers (Structural/3D/Drawing/Substructure/Export) read it, never recompute coordinates.
3. **Common Bridge Data Model = input data contract**; runtime-only GeometrySnapshot, no parallel persistence model.
4. **Explicit coordinate contract** (global / bridge-local / member-local; station/offset; skew; crossfall; single elevation datum; canonical rad; m).
5. **Connector contracts** for each boundary; no hidden transforms.
6. **Unresolved geometry handling** (HCR/conflict/HOLD) — propagate, never invent.

## 9. Audit verdict

```
EXISTING_ARCHITECTURE_AUDIT: COMPLETE
DUPLICATE_GEOMETRY_LOGIC_COUNT: 30
RESPONSIBILITY_CONFLICT_COUNT: 12
HIDDEN_COORDINATE_TRANSFORM_COUNT: 10
CONNECTOR_INVENTORY_COUNT: 17
PRODUCTION_CODE_CHANGED: NO
```
