# Visible Vertical Slice 01 — Local Implementation Report

**Task:** AP-DX Visible Vertical Slice 01 — bridge structure input → StructuralDesignModel → 3D visualization  
**Phase:** C — BSDD-driven 3D binding (Block C complete)  
**Date:** 2026-08-01  
**Branch:** `feat/ap-dx-visible-vertical-slice-01`  
**BSDD schema version:** `0.1.0` (no bump)  
**Migration:** None  
**Numeric design authorization:** NOT_GRANTED  

## 1. Executive summary

Block C connects the existing Apollo / Three.js visualization path to the Block B `apolloBsdd` + `apolloBridgeStructureInput` sidecars:

1. **構造を生成** (or reload after save) causes RC deck, main girders, and cross-beams to appear in the Apollo 3D viewer immediately via `buildApolloVisualizationModel`.
2. Input changes followed by regeneration update solid counts, spacing, depth, deck thickness, and cross-beam stations.
3. Save/reload preserves input values, `StructuralDesignModel`, stable entity IDs, and allows 3D regeneration on reload (covered by import/export + visualization tests).
4. `ApolloSolidGeometryParameter` extended with optional `designEntityId` / `designEntityKind`; renderer `userData` carries binding metadata.
5. Stiffener / Splice / SwayBracing / LateralBracing / DeckAnchorage remain explicitly unimplemented (info warnings if present in SDM).

| Assessment | Block C conclusion |
|------------|-------------------|
| BSDD schema bump | **NO** |
| New dependencies | **NO** |
| Three.js / viewer redesign | **NO** — extended existing builder + renderer |
| STL export non-regression | **PASS** — sample bridge path unchanged |
| Main viewer non-regression | **PASS** — no BSDD → legacy defaults-provider solids |
| Block C verdict | **PASS** |

## 2. Commands run

```bash
cd /home/masaharu/Projects/spacer-clone/frontend && npm run typecheck
cd /home/masaharu/Projects/spacer-clone/frontend && npm test -- src/apollo
cd /home/masaharu/Projects/spacer-clone/frontend && npm test -- src/viewer/SceneBuilder.apolloVisualization.test.ts src/viewer/threeUtils.apolloVisualization.test.ts src/apollo/__tests__/apolloStlExport.test.ts
cd /home/masaharu/Projects/spacer-clone && git diff --check
```

| Command | Result |
|---------|--------|
| `npm run typecheck` | PASS |
| `npm test -- src/apollo` | 29 files, 197 tests PASS |
| STL / SceneBuilder focused tests | 22 tests PASS |
| `git diff --check` | (run at commit) |

## 3. Files changed (Block C)

### New

| Path | Role |
|------|------|
| `frontend/src/apollo/visualization/bridgeStructureSolids.ts` | BSDD + input → girder/deck/cross-beam solids |
| `frontend/src/apollo/visualization/designEntityBinding.ts` | Selection keys, binding warnings, unimplemented-entity notices |
| `frontend/src/apollo/__tests__/bridgeStructureVisualization.test.ts` | Block C visualization + round-trip tests |

### Modified

| Path | Role |
|------|------|
| `frontend/src/apollo/visualization/types.ts` | `ApolloDesignEntityKind`, `designEntityId` / `designEntityKind` on solids |
| `frontend/src/apollo/visualization/builder.ts` | Prefer BSDD solids; retain legacy bearings/markers |
| `frontend/src/apollo/visualization/index.ts` | Export new modules |
| `frontend/src/viewer/renderers/ApolloVisualizationRenderer.ts` | `userData.designEntityId` / `designEntityKind` |
| `frontend/src/apollo/__tests__/apolloSuite.test.ts` | Test manifest |
| `frontend/src/apollo/__tests__/bridgeStructureWorkflow.test.ts` | Typecheck-safe quantity status assertion |

## 4. Implementation design (Block C)

### 4.1 Routing

When `project.apolloBsdd.structuralDesignModel` exists and bridge structure input validates as complete:

- `buildBridgeStructureSolidGeometryParameters` emits solids for `MainGirder`, `RcDeck`, and `CrossBeam` entities.
- Legacy `buildSolidGeometryParameters` still runs for unit-2 topology wireframe; only **bearings** and **markers** are merged from the legacy path (girders/deck/cross-beams/bracing from defaults provider are replaced).
- Without BSDD, behavior is unchanged (defaults-provider PoC solids).

### 4.2 Geometry conventions

- Longitudinal axis: **+X**, bridge length `0 … bridgeLength`.
- Transverse girder offsets from BSDD `girderLines[].offsetFromCenterline` (fallback: symmetric spacing from input).
- Deck slab: width × bridge length × thickness; top at `z = deckThickness`.
- Cross-beam stations: `index × crossBeamSpacing` (documented assumption; `geometryRef` span anchor is **not** used for transverse placement in Block C).
- Cross-beam span: outer-girder transverse distance `(girderCount - 1) × girderSpacing`.

### 4.3 Design entity binding

- Selection / validation keys: `design-entity:{Kind}:{entityId}`.
- Stable IDs from Block B generation are preserved on solids via `designEntityId`.
- `collectDesignEntityBindingWarnings` reports count mismatches; `collectUnimplementedDesignEntityWarnings` surfaces unimplemented SDM entity kinds at info severity.

### 4.4 Persistence

No new persistence fields. Block B import/export + fail-closed BSDD hydration unchanged. Reload → `buildApolloVisualizationModel` rebuilds BSDD solids from hydrated sidecars.

## 5. Residual risks for Block D

| Risk | Severity | Notes |
|------|----------|-------|
| Cross-beam station uses index × spacing, not `geometryRef` span station | Medium | Block D pick panel / alignment may need span-index resolver |
| Unit-2 topology vs BSDD bridge axis not aligned | Medium | Wireframe members may not coincide with BSDD solids; dual coordinate stories |
| No 3D pick → design-entity property panel yet | Expected | Block D scope (`apollo-design-entity-panel`) |
| Bracing / stiffener / splice / anchorage unimplemented | Expected | Explicitly deferred; info warning if SDM contains entities |
| Bearing/marker legacy solids may overlap BSDD bridge | Low | Only when unit-2 supports exist alongside BSDD |
| Bounding box mixes unit-2 wireframe + BSDD solids | Low | Camera fit may include unrelated default-project nodes |

## 6. Block D preview (not implemented)

- `apollo-design-entity-panel` on 3D pick using `userData.designEntityId`
- Span-index cross-beam resolver aligned with `geometryRef`
- Optional alignment of unit-2 longitudinal axis with BSDD bridge length

## 7. Verdict fields

| Field | Verdict |
|-------|---------|
| VVS_01_BLOCK_C_IMPLEMENTATION_VERDICT | PASS |
| VVS_01_SCHEMA_VERSION_DECISION | REMAIN_0_1_0 |
| VVS_01_MIGRATION_DECISION | NONE_REQUIRED |
| VVS_01_NUMERIC_AUTHORIZATION | NOT_GRANTED |
| VVS_01_OVERALL_BLOCK_C_VERDICT | PASS — ready for Block D |

## 8. References

- Block B report (prior revision of this file)
- `docs/apollo/ap-dx-01/local_implementation_report.md`
- `frontend/src/contracts/bridgeSuperstructureDesignDocument.ts`
