# CAD Output Specification

## Purpose

Define CAD-style drawing export generated **exclusively** from `LinerIntermediateResult` — plan, profile, grid, and annotation layers. MVP format is **SVG** with precise conventions below.

## Scope

- SVG export (MVP); DXF subset (post-MVP).
- Layer naming, line types, colors (original naming).
- Geometry entities: polylines, points, text annotations.
- Station tick and grid labeling rules.
- Coordinate scaling and units.
- Consumer resampling contract.

## Out of Scope

- Interactive CAD editing.
- Copying third-party drawing templates or title blocks.
- 3D solid export (see [rendering_strategy.md](rendering_strategy.md) for 3D preview scope).

## Assumptions

- Export module is read-only on intermediate results.
- Text annotations resolve labels via i18n at export time (no hardcoded Japanese in templates).
- Model space coordinates in meters, 1 SVG user unit = 1 m unless scale factor applied in viewBox.

## Design Topics

### 1. Resampling contract

**Mode: fixed intermediate samples only.**

- Plan polylines use `horizontal.sampledPoints` — no ad-hoc re-sampling in CAD module.
- Grid markers use `grid.points` exactly.
- Profile uses `vertical.sampledPoints`.
- Higher density requires pipeline re-run with updated sample spacing ([calculation_pipeline.md](calculation_pipeline.md)).

### 2. MVP format: SVG

| Property | Value |
| --- | --- |
| Format | SVG 1.1 |
| Extension | `.liner-plan.svg`, `.liner-profile.svg` |
| Units | `userUnit` = meter; document `width`/`height` in mm for paper |
| Coordinate system | +X right, +Y up in model group; flip Y in root transform for plan |

### 3. Layer structure

| Layer ID | Content | Stroke |
| --- | --- | --- |
| `LINER_PLAN_AXIS` | Alignment polyline | 0.35 mm black |
| `LINER_PLAN_GRID` | Grid point markers | 0.25 mm blue |
| `LINER_PLAN_STATIONS` | Station ticks, labels | 0.18 mm gray |
| `LINER_PLAN_DIM` | Dimensions (post-MVP) | 0.18 mm |
| `LINER_PROFILE_AXIS` | Profile polyline | 0.35 mm black |
| `LINER_PROFILE_GRID` | Grid elevation markers | 0.25 mm blue |
| `LINER_ANNOT` | Generic notes | 0.18 mm |

Original naming only — no third-party layer names.

### 4. Station ticks

- Source: `stations.entries` at major interval (default 20 m displayed station, configurable in export settings).
- Tick length: 2 m in model space across alignment normal.
- Label: formatted `displayedStation` via i18n template at export boundary.

### 5. Text placement

- Grid labels: offset 1.5 m along binormal from grid point.
- Font height: 2.5 mm on paper at 1:500 scale (configurable).
- Text anchor: start for station labels along alignment.

### 6. Sheet model

- Paper sizes: A3, A1 (configurable).
- Scale: 1:500 default for plan; profile vertical exaggeration independent (default 10×).
- Title block: original minimal block (project name, date, scale) — no third-party boilerplate.

### 7. Post-MVP DXF

Subset: LINE, LWPOLYLINE, POINT, TEXT, layer table. Same layer names and unit policy (meters). Document in revision when added.

### 8. Output naming

```text
{projectName}_liner_plan_{scale}.svg
{projectName}_liner_profile_{scale}.svg
```

## Open Questions

- Batch export all sheets in one SVG vs. separate files?

## Related Documents

- [intermediate_result_model.md](intermediate_result_model.md)
- [report_output_spec.md](report_output_spec.md)
- [rendering_strategy.md](rendering_strategy.md)
- [legal_originality_policy.md](legal_originality_policy.md)
- [test_plan_cad_report.md](test_plan_cad_report.md)
- [unit_and_precision_policy.md](unit_and_precision_policy.md)

## Pre-Implementation Checklist

- [x] MVP export format chosen (SVG).
- [x] Layer naming convention documented.
- [x] Resampling contract: fixed intermediate samples.
- [x] Station tick and text rules defined.
- [ ] Sample export from GC-06 intermediate fixture planned.
