# Station / Offset / Elevation Contract

> **Authority:** Reference Bridge 001 (RB-S10-001) — STEP 10 Phase 6-0 PR-2
> **Frozen** by this PR.

## 1. Alignment reference

- Station and offset are measured along/off the bridge alignment.
- Alignment authority: LINER (stationing rules, station equations, displayed station).
- Bridge-side systems consume alignment evaluation through the Alignment Connector.

## 2. Station

- `station`: distance (m) along the alignment.
- `displayedStation`: formatted station (e.g. 10+12.34) derived by LINER station
  rules; display only, not a numeric authority.
- Canonical numeric station = physical distance (m) on the alignment, increasing in
  the tangent direction.

## 3. Offset

- `offset`: transverse distance (m) from the alignment centre.
- Positive offset = to the right when looking in the station direction
  (right-positive). This matches the existing `offsetSign: right_positive`
  station convention.

## 4. Elevation

- `elevation`: vertical coordinate (m), positive up (+Z).
- Elevation source: LINER vertical profile + crossfall (via Alignment Connector) or
  confirmed geometry values.

## 5. Coordinate pairs

| Form | Meaning |
|------|---------|
| (station, offset) | bridge-local plan position |
| (station, offset, elevation) | bridge-local 3D position |
| (X, Y, Z) | global coordinate |
| (station, offset, azimuth) | position + direction |

## 6. Inverse

- XY -> station is LINER authority (`stationAtPoint`); bridge-side systems do not
  reimplement it.

## 7. Prohibited

- station->XYZ / offset->XYZ recomputation in any consumer (drawing, structural,
  substructure, export, report).
- Formatting stations with bridge-side rules that diverge from LINER.
