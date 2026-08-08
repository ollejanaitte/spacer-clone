# Global Coordinate Contract

> **Authority:** Reference Bridge 001 (RB-S10-001) — STEP 10 Phase 6-0 PR-2
> **Frozen** by this PR.

## 1. Global coordinate system

- Right-handed Cartesian.
- Axes: `X`, `Y`, `Z`.
- Units: metres (m) for length; radians (rad) for angles (display deg preserved).
- Reference frame: bridge document global origin (documented per bridge; origin of
  the LINER-based alignment evaluation or a documented bridge-local origin).
- Vertical: `+Z` is up (positive vertical direction is +Z).

## 2. Value representation

- Coordinates are finite numbers; no NaN / Infinity in serialized/exported geometry.
- Precision: canonical coordinates stored at documented precision (see
  unit_tolerance_precision_contract); no invented extra digits.
- A coordinate may carry a resolution state (CONFIRMED / HCR / CONFLICT / HOLD /
  NOT_AVAILABLE) when it originates from a non-confirmed value.

## 3. Origin

- Global origin is per-document and recorded in the GeometrySnapshot
  `coordinateSystem` (origin + axis directions + handedness).
- No component may silently choose a different global origin (Z datum must match).

## 4. Transform authority

- Global XYZ is produced by LINER (via Alignment Connector) or by the Geometry
  Engine's defined steps. Downstream systems read global XYZ from GeometrySnapshot
  and never transform it.

## 5. Coordinate context

- Follows `coordinate-context.schema.json` (axisOrder [x,y,z], axisDirections +x/+y/+z,
  handedness right, verticalAxis z, angleUnit rad, stationConvention, confidenceStatus).
- The legacy adapter's `confidenceStatus: unknown` synthetic context (DUP-030) is
  superseded by verified GeometrySnapshot coordinate context in Phase 6-1.
