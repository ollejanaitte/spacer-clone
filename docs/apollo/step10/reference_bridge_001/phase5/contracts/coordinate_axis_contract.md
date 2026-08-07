# Coordinate / Axis Contract — Common Bridge Data Model

> **Authority:** Reference Bridge 001 (RB-S10-001) — STEP 10 Phase 5 P5-1

## 1. Canonical coordinate system

- **Handedness:** right-handed
- **Axes:** `x = longitudinal (station direction)`, `y = transverse`, `z = vertical up`
- **Origin:** per bridge document (documented in metadata / coordinate context)
- This matches the repository consensus (`coordinate-context.schema.json`,
  `bridge-definition.schema.json` `axisConvention: x-longitudinal-y-transverse-z-up`,
  substructure `coordinateSystem`, project units block).

## 2. Station / offset / elevation convention

| Quantity | Convention |
|----------|-----------|
| station | distance (m) along the alignment, measured along the tangent direction |
| offset | transverse distance (m); **positive to the right** when looking in the station direction |
| elevation | vertical distance (m); **positive up** |
| azimuth | bearing angle; canonical rad, display deg (source preserved) |
| skew | angle between a line and the transverse axis; canonical rad, source deg preserved |

## 3. Sign conventions

- Vertical direction: +Z is up.
- Transverse sign: right-positive (looking down-station).
- Crossfall: right-down-positive where applicable.
- Sign is documented per entity; no silent sign flip between source and model.

## 4. Local axes / section orientation

- Member local axes: per existing LINER `LocalFrame` (tangent/normal/binormal).
- Section orientation vectors follow the existing project model
  (`orientationVector` / `orientationNode` conventions).
- Grid/girder local frames follow LINER `GridPointResult`/`GridLineResult` localFrame.

## 5. Coordinate value representation

- Coordinates are finite numbers; no NaN / Infinity in serialized JSON.
- Coordinate record: `{ axis: "x"|"y"|"z", value, unit: "m", state, sourceRefs, ... }`
  or a point record `{ x, y, z, unit, state, sourceRefs }`.
- A coordinate record MAY be `HOLD_INSUFFICIENT_SOURCE` (reason required) when the
  source did not provide it — never invented/interpolated.

## 6. Coordinate types referenced

| Type | Canonical meaning |
|------|-------------------|
| X/Y/Z | Global Cartesian in canonical units (m) |
| station/offset | Alignment-referenced position |
| azimuth | Horizontal direction of alignment tangent |
| local axes | Per-entity local frame |

## 7. Compatibility

- LINER (`frontend/src/liner/core/types.ts`): right-handed, m, rad. Compatible.
- SPACER / project model: x/y/z Cartesian, m. Compatible.
- Substructure: `x-longitudinal-y-transverse-z-up`, m, deg display. Compatible;
  canonical angle rad with source deg preserved.
- BridgeDefinition: `axisConvention` matches. Compatible.
