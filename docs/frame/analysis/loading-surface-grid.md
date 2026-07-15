# LoadingSurface and LoadingGrid Design

<!-- DOC-AUTHORITY:START -->
> **Authority:** ACTIVE FRAME REFERENCE
> This is subordinate feature/design evidence. Current implementation facts are governed by [`../../scoping/stage5_frame_analysis_scope.md`](../../scoping/stage5_frame_analysis_scope.md), and target responsibilities and gaps by [`../../planning/stage6-10/stage6_target_architecture.md`](../../planning/stage6-10/stage6_target_architecture.md) and [`../../planning/stage6-10/stage10_gap_migration_sequence.md`](../../planning/stage6-10/stage10_gap_migration_sequence.md). Partial or absent capabilities are not promoted to complete.
<!-- DOC-AUTHORITY:END -->

## 1. Purpose

This document defines the loading surface, grid, line, carriageway, sidewalk, track, load distribution, grid interpolation, and save format, in order to handle moving loads independently of the structural model.

## 2. LoadingSurface

`LoadingSurface` is the root unit of the load model. It represents a geometric region where loads are placed, such as a bridge deck, a slab, or a track bed.

```json
{
  "id": "surface-1",
  "name": "Deck",
  "description": "",
  "grids": [],
  "lines": [],
  "carriageways": [],
  "sidewalks": [],
  "tracks": []
}
```

Design principles:

- It does not own structural members.
- It does not own structural nodes.
- Conversion to the structural model is performed by the load distribution rule.

## 3. LoadingGrid

`LoadingGrid` holds a set of loading points and their interpolation relations.

```json
{
  "id": "grid-1",
  "name": "Deck grid",
  "surfaceId": "surface-1",
  "points": [
    { "id": "gp-1", "x": 0.0, "y": 0.0, "z": 0.0 }
  ],
  "cells": [
    { "id": "cell-1", "pointIds": ["gp-1", "gp-2", "gp-3", "gp-4"] }
  ]
}
```

Grid points may coincide with structural nodes, but it is not required.

## 4. LoadingLine

`LoadingLine` is the 1D path of the moving load.

```json
{
  "id": "line-1",
  "name": "Loading line",
  "surfaceId": "surface-1",
  "geometry": {
    "type": "polyline",
    "points": [
      { "x": 0.0, "y": 0.0, "z": 0.0 },
      { "x": 10.0, "y": 0.0, "z": 0.0 }
    ]
  },
  "stationRule": {
    "type": "fixedInterval",
    "interval": 0.5
  },
  "distributionRuleId": "dist-1"
}
```

In the MVP, a 2-point straight line and a fixed interval are supported.

## 5. Carriageway

`Carriageway` is the carriageway region.

```json
{
  "id": "cw-1",
  "surfaceId": "surface-1",
  "name": "Main carriageway",
  "boundary": {},
  "lanes": [],
  "applicablePresetCategories": ["roadBridgeLiveLoad"]
}
```

In the future, multiple `LoadingLine`s are generated from a carriageway.

## 6. Sidewalk

`Sidewalk` is the sidewalk region.

```json
{
  "id": "sw-1",
  "surfaceId": "surface-1",
  "name": "Sidewalk",
  "boundary": {},
  "applicablePresetCategories": ["crowdLoad"]
}
```

It is used in the future as the area for crowd load.

## 7. Track

`Track` is a railway track.

```json
{
  "id": "track-1",
  "surfaceId": "surface-1",
  "name": "Track",
  "centerLineId": "line-1",
  "gauge": null,
  "applicablePresetCategories": ["railwayTrainLoad"]
}
```

Not used in the MVP.

## 8. DistributionRule

`DistributionRule` is a standalone design target that converts a loading point into equivalent nodal loads on the structural model. It is not a simple configuration value; it has the responsibility that affects influence line accuracy and the continuity of the moving load.

MVP default:

- `memberInterpolation`: place a load at an arbitrary position on a member, and distribute it to the I and J ends as the equivalent nodal load of the Euler-Bernoulli beam element.

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

Processing policy:

```text
Station position on LoadingLine
  -> search the target member
  -> compute the local position a/L on the member
  -> distribute as equivalent nodal load to the I and J ends
  -> pass to the existing analysis engine as a load vector
```

`nearestNode` and `explicitNode` are removed from the MVP candidates. The approach that snaps the loading position to a node makes the influence line stair-stepped and harms the position dependency of the moving load analysis.

Future extensions:

- `gridInterpolation`
- `surfaceInterpolation`
- `laneDistribution`

These are not implemented in the MVP.

Distribution result:

```json
[
  { "targetType": "node", "targetId": "N1", "dof": "UZ", "factor": -1.0 }
]
```

## 9. Grid Interpolation

Grid interpolation is a future extension in Phase 2 and later. In the MVP, `LoadingGrid` is kept only as a save-format slot and is not used as an analysis default.

Candidates:

- Linear interpolation.
- Bilinear interpolation.
- Triangle-cell area coordinates.
- Projection onto a member line.

Design notes:

- The interpolation coefficients must satisfy the load conservation condition.
- It must be extensible to future horizontal loads in addition to vertical loads.
- An interpolation failure must produce an error.
- An automatic snap beyond the allowed distance must produce a warning or an error.

## 10. Line Generation

A future function is envisioned to generate `LoadingLine` from a carriageway, a sidewalk, or a track.

Source:

- Carriageway centerline.
- Lane centerline.
- Sidewalk centerline.
- Track centerline.
- Arbitrary user line.

In the MVP, the user defines a single line directly.

## 11. Save Format

`project.json` saves the load model as a separate top-level key from the structural model.

```json
{
  "structuralModel": {},
  "loadingSurfaceModel": {
    "surfaces": [],
    "distributionRules": [],
    "liveLoadModels": [],
    "movingLoadCases": []
  }
}
```

Compatibility:

- An existing project that does not have `loadingSurfaceModel` is valid.
- When it is missing, it is treated as an empty model.
- A future schema version is reserved.

## 12. Implementation Phases

### Phase 1

- Direct `LoadingLine` input.
- Station generation.
- `memberInterpolation` distribution.
- Influence line for a single concentrated load.

### Phase 2

- `LoadingGrid` save.
- Grid interpolation.
- Automatic station subdivision for influence line accuracy.

### Phase 3

- Generate multiple lines from `Carriageway`.
- `Sidewalk` area load.
- `Track` and train load.

### Phase 4

- Grid interpolation.
- Multiple lanes loaded simultaneously.
- Three.js editing of the loading region.
