# Phase 5 Step 3 — Complete Formal Drawing DXF Implementation

<!-- DOC-AUTHORITY:START -->
> **Authority:** HISTORICAL / RETAINED EVIDENCE
> This document records delivery history. Current road facts are governed by [`../../../scoping/stage4_road_design_scope.md`](../../../scoping/stage4_road_design_scope.md), and target implementation sequence and gates by [`../../../planning/stage6-10/stage10_gap_migration_sequence.md`](../../../planning/stage6-10/stage10_gap_migration_sequence.md).
<!-- DOC-AUTHORITY:END -->

> Status: `COMPLETE`
> Date: 2026-07-14
> Phase: Phase 5 / Step 3
> Related: [dxf_export_design.md](../../../road/output/dxf_export_design.md), [drawing_standard_preset_design.md](../../../road/output/drawing_standard_preset_design.md), [implementation_plan.md](implementation_plan.md), [README.md](README.md)

## 1. Purpose

Complete Phase 5 Step 3 so that the formal drawing workspace can download three DXF files from the same runtime `DrawingDocument` used for screen rendering:

1. Plan DXF（平面線形図）
2. Profile and Band DXF（縦断線形図＋帯）
3. Cross-Section DXF（横断図）

## 2. Architecture (frozen)

```text
CanonicalLinerIntermediateResult
  ↓
Drawing Builders
  ↓
DrawingDocument
  ├─ Screen Renderer (viewport transform + UI zoom/pan)
  └─ DXF Mapper / Serializer (model coordinates; no UI zoom/pan)
```

Screen and DXF share one `DrawingDocument`. Geometry is not recomputed for DXF.

## 3. Coordinate and transform rules

| Concern | Rule |
| --- | --- |
| Model geometry | Export in model coordinates (meters). |
| UI zoom / pan | Never applied to DXF. |
| Viewport model→paper fit | Used for screen / paper-space annotation placement only. Not applied as a second Y flip on model geometry. |
| Paper-space primitives | Converted to model coordinates via invertible viewport inverse (geometry annotations), or band placement relative to geometry model bounds. |
| Large coordinates | Supported; finite-value validation rejects NaN/Infinity. |
| Determinism | Entity / layer / table ordering is stable. |

## 4. Drawing coverage

### 4.1 Plan DXF

Exports from plan `DrawingDocument`:

- centerline, line / circular arc / sampled clothoid
- offset / road edge lines
- station ticks and No. labels
- IP / BC / EC / KA / KE
- radius R / clothoid A when available
- north arrow, scale annotation
- plan information band
- diagnostics

### 4.2 Profile and Band DXF

Exports from profile `DrawingDocument` (geometry + band share StationAxis):

- profile grid, physical distance X, elevation Y, datum
- horizontal / vertical scale annotations
- design profile, ground missing indication
- grade break / vertical curve markers when present
- station lines / labels
- band frame and rows: station, accumulated / interval distance, ground / plan elevation, cut/fill if available, gradient, vertical curve, plan alignment, crossfall, widening if available

### 4.3 Cross-Section DXF

- selected station shape, widths, offsets, relative elevation
- offset=0 centerline and label
- flat / crown / one_way_left / one_way_right / independent mode labels
- pivot annotation
- `DrawingDimension` decomposed to LINE + TEXT (native DIMENSION not required)
- diagnostics

## 5. CAD styles

Semantic ASCII layer names (Japanese layer names avoided):

```text
PLAN_CENTER, PLAN_OFFSET, PLAN_STATION, PLAN_TEXT, PLAN_BAND
PROFILE_GRID, PROFILE_DESIGN, PROFILE_GROUND, PROFILE_TEXT, PROFILE_BAND
CROSS_SHAPE, CROSS_CENTER, CROSS_DIM, CROSS_TEXT
SHEET_FRAME, SHEET_TEXT
```

Each layer carries ACI color, linetype (`CONTINUOUS` / `CENTER` / `DASHED` / `HIDDEN`), and lineweight. Invalid names are sanitized. Table ordering is deterministic.

## 6. Sheet presets

| Preset id | Paper | Orientation | Notes |
| --- | --- | --- | --- |
| `common` | A2 | landscape | Default formal sheet (current builders) |
| `a1-landscape` | A1 | landscape | Larger sheet |
| `a3-landscape` | A3 | landscape | Compact sheet |

Presets keep paper size, orientation, width/height mm, margins, default scale hints, text height, lineweight tier, layer preset reference, and title-area boundary. Client-specific title blocks remain Open Decision; DXF still reproduces sheet extents.

**DXF responsibility:** model-space entities from `DrawingDocument`. Sheet size metadata is retained on `DrawingSheet.paper` and reflected in diagnostics / naming; full paper-space layout blocks are optional.

## 7. Compatibility

| Item | Value |
| --- | --- |
| DXF version | `AC1021` |
| `$DWGCODEPAGE` | `UTF-8` |
| `$INSUNITS` | meters (`6`) |
| `$MEASUREMENT` | metric (`1`) |
| Entities | LINE, LWPOLYLINE, ARC, CIRCLE, TEXT |
| Sections | HEADER, TABLES, BLOCKS, ENTITIES, EOF |
| Japanese TEXT | UTF-8 round-trip via dxf-parser |
| Native DIMENSION | Not required; decomposed |

## 8. UI

Formal Drawing Workspace exposes three Japanese actions:

- 平面図DXFを出力
- 縦断図DXFを出力
- 横断図DXFを出力

Rules:

- Export uses the same `DrawingDocument` as the visible tab/drawing kind
- Download file name includes drawing kind + timestamp or project identifier
- Diagnostics surface warnings/errors
- Disabled when document has no exportable entities
- Double-click safe (idempotent download)
- Existing preview / SVG remains unchanged

## 9. File naming

```text
liner-{plan|profile-band|cross-section}-{yyyyMMdd-HHmmss}.dxf
```

Optional project id prefix when available.

## 10. Automated verification

- Unit / integration tests for plan / profile / cross / styles / compatibility / UI
- `npm run typecheck`, `npm test`, `npm run build`
- Playwright download at 1366×768 and 1920×1080
- dxf-parser round-trip for three generated files
- LibreCAD open verification (fatal-free) for three files

## 11. Manual verification (user, after merge)

User visual review of screen + DXF in CAD is performed **after** GitHub merge. It is not a gate for this implementation agent.

## 12. Acceptance criteria

1. Three DXF downloads work from formal workspace
2. Same `DrawingDocument` source for screen and DXF
3. CAD styles / sheet presets applied
4. AC1021 + UTF-8 Japanese TEXT + parser round-trip PASS
5. LibreCAD opens all three files without fatal/corrupt errors
6. Automated checks PASS; user manual review deferred post-merge

## 13. Non-scope

- SXF / P21
- Final client title block
- Formal Japanese SHX font selection lock
- AutoCAD manual verification when unavailable
