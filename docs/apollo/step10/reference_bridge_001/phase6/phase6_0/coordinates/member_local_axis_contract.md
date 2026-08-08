# Member Local Axis Contract

> **Authority:** Reference Bridge 001 (RB-S10-001) — STEP 10 Phase 6-0 PR-2
> **Frozen** by this PR.

## 1. Member local axes

- Right-handed local frame per member.
- `local x`: along the member axis (from node I to node J).
- `local y`: reference cross-section axis (e.g. girder transverse, out of plane).
- `local z`: completes the right-handed frame (e.g. girder vertical).

## 2. Frame origin

- Local frame origin is the member reference point (e.g. girder line point at a
  station) from the GeometrySnapshot `memberPlacementReferences` / `crossSectionFrames`.

## 3. Orientation authority

- Member local axes come from the GeometrySnapshot frames (generated once by the
  Geometry Engine).
- Orientation reference: for longitudinal members, `local z` follows bridge vertical
  (up); for out-of-plane members, orientation is derived from the snapshot frame.
- The legacy `orientationVector`/`orientationNode` mechanism remains accepted for
  existing models, but new geometry routes orientation from snapshot frames.

## 4. Prohibited

- Re-deriving member frames from node coordinates in a consumer (DUP-020/021:
  `frameFromStartEnd`, `applySolidFrame` quaternion-from-basis are declared hidden
  transforms and must be replaced by snapshot frames or documented transforms).
- Non-orthonormal frame acceptance.

## 5. Eccentricity

- Bearing/member eccentricity references come from the snapshot (bearingPoints);
  no consumer-invented offsets.
