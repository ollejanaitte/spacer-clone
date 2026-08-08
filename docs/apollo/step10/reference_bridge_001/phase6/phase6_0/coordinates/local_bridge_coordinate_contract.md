# Bridge Local Coordinate Contract

> **Authority:** Reference Bridge 001 (RB-S10-001) — STEP 10 Phase 6-0 PR-2
> **Frozen** by this PR.

## 1. Bridge-local axes

- Right-handed.
- `longitudinal` (L): along the bridge, increasing with station (tangent direction).
- `transverse` (T): cross-axis, positive to the right when looking in the +longitudinal
  direction.
- `vertical` (V): +Z up.

This matches the repository consensus `x-longitudinal-y-transverse-z-up`.

## 2. Positive conventions

- +longitudinal = station increase.
- +transverse = right (looking down-station).
- +vertical = up.

## 3. Elevation datum

- **Single canonical bridge-local vertical datum** is required.
- Per audit, three datums exist today (3D solids top-flange-upper-face Z=0; drawing
  section bottom flange y=0; FEM flat z=0). The contract chooses ONE bridge-local
  datum (girder bottom-flange reference plane; Z=0 at the bottom of the girder
  section) and each consumer maps it via its connector with the datum declared.
  No component invents a different Z baseline.

## 4. Bridge-local frames

- Each geometry entity carries a bridge-local frame: `{longitudinal, transverse,
  vertical}` (right-handed), derived from the alignment tangent/normal/binormal by
  the Geometry Engine.
- Skew rotates the transverse axis about vertical (see skew_crossfall_contract).

## 5. Transform authority

- bridge-local <-> global conversion is performed by the Geometry Engine's defined
  steps (alignment frames + offsets). Consumers receive bridge-local and/or global
  coordinates from GeometrySnapshot; they never recompute the frame.

## 6. Sign provenance

- Sign conventions are declared per bridge (axis directions). Any sign override
  (e.g. legacy BridgeDefinition sign policy) must be recorded with provenance in
  the GeometrySnapshot coordinateSystem (resolves RC-012).
