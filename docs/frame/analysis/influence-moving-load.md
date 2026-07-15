# Influence Line and Moving Load Design

<!-- DOC-AUTHORITY:START -->
> **Authority:** ACTIVE FRAME REFERENCE
> This is subordinate feature/design evidence. Current implementation facts are governed by [`../../scoping/stage5_frame_analysis_scope.md`](../../scoping/stage5_frame_analysis_scope.md), and target responsibilities and gaps by [`../../planning/stage6-10/stage6_target_architecture.md`](../../planning/stage6-10/stage6_target_architecture.md) and [`../../planning/stage6-10/stage10_gap_migration_sequence.md`](../../planning/stage6-10/stage10_gap_migration_sequence.md). Partial or absent capabilities are not promoted to complete.
<!-- DOC-AUTHORITY:END -->

## 1. Purpose

This document defines the domain, UI, API, and implementation phases for adding influence line generation and moving load analysis to the 3D frame analysis software. This round is design only, and no existing code is changed.

Basic idea:

```text
StructuralModel
!=
LoadingSurfaceModel
```

`StructuralModel` handles nodes, members, supports, materials, sections, and fixed loads. `LoadingSurfaceModel` handles the loading surface, grid, line, carriageway, sidewalk, track, live load, and moving load case.

## 2. MVP Scope

Scope implemented in the MVP:

- Single `LoadingLine`
- Global vertical direction
- Single concentrated load
- Influence line generation
- Moving load analysis
- Envelope result

Out of scope:

- T load
- L load
- Crowd load
- A-live
- B-live
- Train load
- Impact factor
- Multiple lanes

## 3. Domain Design

### LoadingSurface

The root entity of the load model, representing the surface or region on which the load is applied.

Responsibilities:

- Group `LoadingGrid`, `LoadingLine`, `Carriageway`, `Sidewalk`, and `Track`.
- Hold the policy for linking to the structural model.
- Serve as the management unit for the points, grids, and lines belonging to the loading surface.

Held items:

```json
{
  "id": "surface-1",
  "name": "Main deck",
  "grids": [],
  "lines": [],
  "carriageways": [],
  "sidewalks": [],
  "tracks": []
}
```

### LoadingGrid

A load-only grid. A set of grid points for load placement that is independent of structural nodes.

Responsibilities:

- Hold the loading point candidates.
- Hold the interpolation relations between grid points.
- Hold the reference for distributing the load to the structural model.

In the MVP, it is not used directly. `LoadingLine.stations` acts as a 1D grid.

### LoadingLine

The line along which a moving load travels.

Responsibilities:

- Hold the station sequence.
- Provide the 3D coordinates of each station.
- Define the path geometry of the moving load and the station generation rule.

MVP structure:

```json
{
  "id": "line-1",
  "name": "Line 1",
  "surfaceId": "surface-1",
  "points": [
    { "x": 0.0, "y": 0.0, "z": 0.0 },
    { "x": 10.0, "y": 0.0, "z": 0.0 }
  ],
  "stationRule": {
    "type": "fixedInterval",
    "interval": 0.5
  },
  "distributionRuleId": "dist-1"
}
```

`LoadingLine` holds the path only. The load direction is held by `LiveLoadModel` or `MovingLoadCase`, and the load distribution to the structural model is handled by an independent `DistributionRule`.

### Carriageway

A future-extension entity that represents a carriageway.

Responsibilities:

- Hold the carriageway range, lanes, widths, and applicable live load category.
- Hold the rules that generate multiple `LoadingLine`s.

In the MVP, only the save-slot design is kept and analysis is not supported.

### Sidewalk

A future-extension entity that represents a sidewalk.

Responsibilities:

- Hold the sidewalk region.
- Hold the area-load application range such as crowd load.

Not supported in the MVP analysis.

### Track

A future-extension entity that represents a railway track.

Responsibilities:

- Hold the track centerline, gauge, and train-load preset reference.
- Expand the axle sequence onto a `LoadingLine`.

Not supported in the MVP analysis.

### StationPoint

`StationPoint` is derived data generated from `LoadingLine` by `StationGenerator`. It is not a persistent domain entity. It is treated as the input snapshot at influence line analysis time.

Responsibilities:

- Hold the station, the normalized position, the 3D coordinates, and the polyline segment.
- Represent the loading position passed to `DistributionRule`.
- Identify the result in the influence line result by the basic key `lineId + station`.

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

Processing flow:

```text
LoadingLine
  -> StationGenerator
  -> StationPoint[]
  -> DistributionRule
  -> InfluenceSolver
  -> InfluenceResult
```

### DistributionRule

`DistributionRule` is a standalone design target that generates the equivalent nodal loads on the structural model from the loading position.

In the MVP, `memberInterpolation` is the default.

```ts
type DistributionRule = MemberInterpolationRule

type MemberInterpolationRule = {
  id: string
  type: "memberInterpolation"
  searchTolerance: number
  targetMembers?: string[]
  allowOutOfRange: false
}
```

`memberInterpolation` searches the target member from `StationPoint.position`, computes the position `a/L` on the member''s local coordinate system, and distributes it to the I and J ends as the equivalent nodal load of the Euler-Bernoulli beam element. `nearestNode` and `explicitNode` are removed from the MVP candidates because they snap the loading position to a node and tend to make the influence line stair-stepped.

### MovingLoadCase

A moving load analysis case.

Responsibilities:

- Specify the `LoadingLine` and `LiveLoadModel` to use.
- Specify the analysis target responses.
- Use the influence line generation result to produce the moving history and the envelope result.

```json
{
  "id": "mlc-1",
  "name": "Single vertical point load",
  "lineId": "line-1",
  "liveLoadModelId": "llm-1",
  "distributionRuleId": "dist-1",
  "targets": [
    { "type": "memberEndForce", "memberId": "M1", "component": "MzI" }
  ],
  "options": {
    "includeHistory": true
  }
}
```

### LiveLoadModel

A live load instance used in an analysis case.

Responsibilities:

- Reference a `LiveLoadPreset` or a user-defined load.
- Hold the multiplier, direction, loading range, and axle sequence.

MVP:

```json
{
  "id": "llm-1",
  "type": "singlePoint",
  "magnitude": {
    "source": "userInput",
    "value": 1.0,
    "unit": "kN"
  },
  "direction": { "x": 0.0, "y": 0.0, "z": -1.0 }
}
```

In the future, `presetId` can be made mandatory. The MVP''s single concentrated load for verification allows a user-input value.

## 4. Dependency Relations

Permitted references:

```text
MovingLoadCase -> LoadingLine
MovingLoadCase -> LiveLoadModel
LoadingLine -> LoadingSurface
LoadingSurfaceModel -> StructuralModel adapter setting
InfluenceResult -> StructuralModel result target
```

Prohibited references:

```text
StructuralModel -> LoadingSurfaceModel
StructuralNode -> LoadingGridPoint
Member -> LoadingLine
LiveLoadPreset -> Project specific entity
```

The structural model does not know about the moving load model. The moving load engine calls the existing analysis engine.

## 5. UI Tree

The UI is unified, but the internal tree separates fixed loads from moving loads.

```text
Project
  Structural Model
    Nodes
    Members
    Supports
    Materials
    Sections
    Static Load Cases
  Loading Surface Model
    Loading Surfaces
      Loading Grids
      Loading Lines
      Carriageways
      Sidewalks
      Tracks
    Live Load Models
    Moving Load Cases
  Results
    Static Analysis
    Influence Lines
    Moving Load Envelopes
```

MVP UI:

- `Loading Lines`: start, end, station interval, load direction of a single line.
- `Live Load Models`: name and magnitude of a single concentrated load.
- `Moving Load Cases`: target line, target load, output target.
- `Results`: influence line graph, moving history, max / min envelope.

## 6. API Design

The API is separated from the existing analysis API.

### POST /api/influence/run

Generates the influence line.

Request:

```json
{
  "project": {},
  "loadingSurfaceModel": {},
  "case": {
    "lineId": "line-1",
    "targets": []
  }
}
```

Response:

```json
{
  "influenceResult": {
    "caseId": "influence-line-1",
    "stations": [],
    "targets": [],
    "targetResults": [],
    "warnings": [],
    "errors": []
  }
}
```

### POST /api/moving-load/run

Runs the influence line generation and the moving load analysis together. In the MVP this API may create the influence line internally, but the result structure keeps the influence line and the moving load separated.

Request:

```json
{
  "project": {},
  "loadingSurfaceModel": {},
  "movingLoadCaseId": "mlc-1",
  "options": {
    "returnCsv": false
  }
}
```

Response:

```json
{
  "result": {
    "influenceResult": {},
    "movingLoadHistory": [],
    "envelopeResult": {},
    "warnings": [],
    "errors": []
  },
  "csv": null
}
```

### GET /api/live-load-presets

A future API to retrieve presets. May remain unimplemented in the MVP.

## 7. Implementation Phases

### Phase 1: MVP

- `LoadingLine` input.
- Station generation.
- Distribution of a concentrated load at an arbitrary position on a member by `memberInterpolation`.
- Conversion of a vertical unit load at each station to an equivalent nodal load.
- Influence line generation with K matrix reuse.
- Moving analysis for a single concentrated load.
- Max / min envelope and worst-case loading position.
- CSV output.

### Phase 2: Load Model Extension

- `LoadingGrid`.
- Grid interpolation.
- Multiple `LoadingLine`.
- Save of carriageways and sidewalks.

### Phase 3: Live Load Preset

- R7 Road Bridge Specification preset.
- T load, L load, crowd load.
- A-live, B-live applicability conditions.
- Source information, version management, audit log.

### Phase 4: Advanced Moving Load

- Multiple lanes.
- Train load.
- Impact factor.
- Load combination.
- Detailed output of concurrent section forces and concurrent reactions.
