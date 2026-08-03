# 07 — Alignment Compatibility Contract

## Principles (frozen)

1. **Road / LINER is geometric source of truth** (DEC-S1-0008).
2. Apollo consumes via **AlignmentBridgeBindingModel** only.
3. Apollo must not independently duplicate alignment polylines as a second SoR.
4. Binding may store **snapshot checksum/revision**; source change → Apollo STALE.
5. Missing/deleted source → `BLOCKED` binding + diagnostics; no silent fallback inventing geometry.

## Step 4-E supported profile

- Straight horizontal alignment
- Single constant grade
- Constant crossfall
- Constant width
- Bridge centerline = road centerline (offset 0 default)
- Bridge start/end station inclusive
- Skew 90°
- Simple single-span development scope

## Contract fields

See domain model + `16_entity_field_catalog.csv` (`AlignmentBridgeBindingModel`).

### Conventions (DEC)

| Topic | Decision |
|-------|----------|
| Station direction | Increasing along road stationing; Apollo X aligns with increasing station |
| Handedness | Right-handed; +Y to the right when looking along +station |
| Crossfall sign | Positive = right side down (document in UI) |
| Elevation datum | Prefer road profile datum; if absent use LOCAL DATUM warning (Step 3) |
| Units | SI meters |
| Tolerances | station 1e-6 m; coordinate compare 1e-4 m for tests |

## Compatibility verification cases

origin, midpoint, end, left/right deck edge, girder centers, curb/railing/median anchors, haunch refs, plan/elevation/3D/drawing export, save/reload.

## Explicitly deferred (contract must not forbid later)

Curve, vertical curve, crossfall transition, widening — out of Step 4 committed scope.
