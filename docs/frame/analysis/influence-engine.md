# Influence Line Engine Design

<!-- DOC-AUTHORITY:START -->
> **Authority:** ACTIVE FRAME REFERENCE
> This is subordinate feature/design evidence. Current implementation facts are governed by [`../../scoping/stage5_frame_analysis_scope.md`](../../scoping/stage5_frame_analysis_scope.md), and target responsibilities and gaps by [`../../planning/stage6-10/stage6_target_architecture.md`](../../planning/stage6-10/stage6_target_architecture.md) and [`../../planning/stage6-10/stage10_gap_migration_sequence.md`](../../planning/stage6-10/stage10_gap_migration_sequence.md). Partial or absent capabilities are not promoted to complete.
<!-- DOC-AUTHORITY:END -->

## 1. Purpose

This document defines the design of the engine that performs influence line generation and moving load analysis by using the existing 3D frame analysis engine. The MVP is limited to a single `LoadingLine`, a vertical unit load, and a single concentrated load.

## 2. Basic Policy

The influence line engine sits above the existing analysis engine.

```text
LoadingLine
  -> StationGenerator
  -> StationPoint[]
  -> DistributionRule
  -> unit load vector
  -> solve with reused K
  -> response extraction
  -> InfluenceResult
  -> moving load convolution
  -> envelope result
```

No knowledge of moving loads is added to the structural model side.

## 3. Station Management

A station represents a position on a `LoadingLine`.

Held items:

- `station`: distance from the start.
- `ratio`: normalized position over the line length.
- `position`: 3D coordinates.
- `segmentIndex`: segment index on a polyline.
- `isEnd`: end-point flag.

In the MVP, stations are generated from the start, the end, and a fixed interval on a straight line.

Generation rules:

- station 0 is always included.
- The end is always included.
- No duplicate station is created just before the end due to rounding.
- `StationPoint` is not a persistent domain entity. It is derived data generated at analysis time.
- The basic key for identifying a result is `lineId + station`.
- `stationIndex` is auxiliary information for array access and is not a primary key.

```ts
type StationPoint = {
  lineId: string
  station: number
  ratio?: number
  position: Point3D
  segmentIndex?: number
  isEnd?: boolean
}
```

## 4. K Matrix Reuse

During influence line generation, the structural stiffness does not change and only the load vector changes. Therefore the global stiffness matrix and the boundary-condition-reduced `Kff` are reused.

Design:

- Assemble the structural model only once before the analysis.
- Cache `freeDofs`, `fixedDofs`, and `Kff`.
- For the SciPy sparse solver, reuse the factorized solver when possible.
- Only the load vector `Ff` is updated per station.

Cache key:

```text
structuralModelHash
boundaryConditionHash
memberPropertyHash
solverOptionsHash
```

The load case is not included in the cache key.

## 5. Unit Load Method

Place a unit load at each station and extract the target response as the influence value.

MVP:

- Unit load magnitude is `1.0`.
- The direction follows the load direction of `LiveLoadModel` or `MovingLoadCase`. In the MVP, the global downward direction is assumed.
- The load distribution uses `memberInterpolation` as the default.
- The existing extraction logic for displacement, reaction, and member end force is reused for the target response.

Sign convention:

- The unit load direction is defined in `LiveLoadModel` or `MovingLoadCase`.
- The influence value is the response value when that unit load is applied.
- The sign of the live load is determined by the load magnitude and direction in `LiveLoadModel`.

`nearestNode` and `explicitNode` are removed from the MVP candidates. They snap the loading position to a structural node, which makes the influence line stair-stepped and makes it difficult to express the position dependency of the moving load analysis. The initial default is `memberInterpolation`, which uses the existing Euler-Bernoulli beam elements and distributes a concentrated load at an arbitrary position on a member to equivalent nodal loads.

## 6. Influence Line Generation

Input:

- `StructuralModel`
- `LoadingLine`
- `InfluenceTarget[]`
- `DistributionRule`

Output:

```json
{
  "lineId": "line-1",
  "stations": [
    { "station": 0.0, "position": { "x": 0, "y": 0, "z": 0 } }
  ],
  "targets": [
    { "id": "target-1", "type": "memberEndForce", "memberId": "M1", "component": "MzI" }
  ],
  "targetResults": [
    {
      "targetId": "target-1",
      "values": [0.0]
    }
  ]
}
```

Process:

1. Generate the stations.
2. Generate the `StationPoint[]`.
3. For each station, compute the target member, the local coordinate position `a/L`, and the equivalent nodal load by `memberInterpolation`.
4. Solve the displacement with the reused `Kff`.
5. Recover the reactions and the member end forces.
6. Extract the value for each `InfluenceTarget`.

## 7. Moving Load Analysis

Multiply the influence line values by the real load and create a response history for each load position.

MVP single concentrated load:

```text
response(station i) = influenceValue(station i) * loadMagnitude
```

Future multiple axles:

```text
response(position p) = sum(influenceValue(p + axleOffset[j]) * axleLoad[j])
```

Future distributed load:

```text
response(position p) = integral(influenceValue(s) * q(s - p) ds)
```

## 8. Data Structures

### InfluenceTarget

```json
{
  "id": "target-1",
  "type": "memberEndForce",
  "memberId": "M1",
  "component": "MzI"
}
```

Target candidates:

- `displacement`
- `reaction`
- `memberEndForce`

In the MVP, member end force and reaction are prioritized, and displacement is handled by the same structure.

### MovingLoadHistory

```json
{
  "station": 0.0,
  "loadPositions": [
    { "loadId": "P1", "station": 0.0 }
  ],
  "responses": [
    { "targetId": "target-1", "value": 0.0 }
  ]
}
```

### Envelope

Holds the maximum, minimum, and worst-case loading position. Concurrent results for section force and reaction are handled in Phase 2.

## 9. Cache

Cache layers:

- `StructuralSolveCache`: `Kff`, the solver, and DOF mapping.
- `InfluenceLineCache`: the influence values per line, station, and target.
- `DistributionCache`: the distribution coefficients from stations to structural DOFs.

Invalidation conditions:

- The structural model changed.
- The support conditions changed.
- The section, material, or member changed.
- The `LoadingLine` station or distribution rule changed.
- The `InfluenceTarget` changed.

## 10. Performance Design

The computational cost of influence line analysis is not `station count x target extraction cost`; in practice it is `station count x linear system solve`.

Performance policy:

- Assemble the K matrix only once.
- Reuse the factorized solver.
- Build the per-station load vector in a sparse form.
- Extract multiple targets from a single solve result.
- Make CSV or history output optional to narrow down.

MVP target:

- For several hundred stations, the analysis completes within a UI-waitable time.
- When the station count grows, progress display and cancellation are implemented later.

## 11. Verification Method

Unit tests:

- The shape of the influence line of a center concentrated load on a simple beam.
- The sign of the reaction or bending moment of a cantilever tip.
- The value at the end stations.
- Linearity with respect to the load multiplier.
- Convergence when the station interval is refined.

Integration tests:

- Compare the result of placing a concentrated load at the same position in the existing static analysis with the value at the same station in the influence line.
- Confirm that the maximum value of the moving load history equals the maximum value of the influence line multiplied by the load magnitude.
- The CSV output and the JSON output values match.

Abnormal cases:

- Unstable structure.
- Non-existent `lineId`.
- Non-existent `targetId`.
- Zero stations.
- No load distribution target found.
