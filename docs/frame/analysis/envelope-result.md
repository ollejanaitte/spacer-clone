# Envelope Result Design

<!-- DOC-AUTHORITY:START -->
> **Authority:** ACTIVE FRAME REFERENCE
> This is subordinate feature/design evidence. Current implementation facts are governed by [`../../scoping/stage5_frame_analysis_scope.md`](../../scoping/stage5_frame_analysis_scope.md), and target responsibilities and gaps by [`../../planning/stage6-10/stage6_target_architecture.md`](../../planning/stage6-10/stage6_target_architecture.md) and [`../../planning/stage6-10/stage10_gap_migration_sequence.md`](../../planning/stage6-10/stage10_gap_migration_sequence.md). Partial or absent capabilities are not promoted to complete.
<!-- DOC-AUTHORITY:END -->

## 1. Purpose

This document defines the data structures used to save, display, and output the results obtained from influence line analysis and moving load analysis: the influence line result, the moving load history, the envelope result, and the worst-case loading position. Concurrent section forces and concurrent reactions are handled in Phase 2.

## 2. Influence Line Result

The influence line result is the target response value when a unit load is placed at each station.

```json
{
  "influenceResult": {
    "id": "inf-1",
    "lineId": "line-1",
    "unitLoad": {
      "magnitude": 1.0,
      "direction": { "x": 0.0, "y": 0.0, "z": -1.0 }
    },
    "stations": [],
    "targets": [],
    "targetResults": []
  }
}
```

`targetResults` holds the per-target value arrays in station order.

```json
{
  "targetId": "target-1",
  "values": [0.0, 1.2, 3.25]
}
```

This format keeps the graph display, CSV output, and envelope processing simple, and clarifies the per-target history management. `stationIndex` is auxiliary information for array access. The basic key for identifying a result is `lineId + station`.

## 3. Moving Load History

The moving load history is the response sequence when a real load is moved to each position.

In the MVP, with a single concentrated load, the load position coincides with the station.

```json
{
  "movingLoadHistory": [
    {
      "station": 6.0,
      "loadPositions": [
        {
          "loadId": "P1",
          "station": 6.0,
          "position": { "x": 6.0, "y": 0.0, "z": 0.0 },
          "magnitude": 10.0,
          "unit": "kN"
        }
      ],
      "responses": [
        {
          "targetId": "target-1",
          "value": 32.5
        }
      ]
    }
  ]
}
```

The history is large, so it is made optional through an API option.

## 4. Envelope Result

The envelope result holds the maximum and minimum value of each target response and the station at which it occurs.

```json
{
  "envelopeResult": {
    "caseId": "mlc-1",
    "items": [
      {
        "targetId": "target-1",
        "max": {
          "value": 32.5,
          "station": 6.0
        },
        "min": {
          "value": -4.1,
          "station": 1.5
        }
      }
    ]
  }
}
```

Max and min are determined on signed values. The absolute-value max can be added later as a separate field.

## 5. Worst-case Loading Position

The worst-case loading position is the load configuration that produces the maximum or minimum of a target response.

Fields kept:

- `targetId`
- `criterion`: `max` or `min`
- `value`
- `station`
- `loadPositions`
- `influenceValues`

For future multi-axle and multi-lane cases, the worst-case position is the entire load configuration rather than a single station.

## 6. Concurrent Section Forces

Concurrent section forces are handled in Phase 2. They are not included in the MVP result structure.

## 7. Concurrent Reactions

Concurrent reactions are handled in Phase 2. They are not included in the MVP result structure.

## 8. Result API

### POST /api/moving-load/run

Runs moving load analysis and returns the influence line, the history, and the envelope.

Options:

```json
{
  "includeInfluenceResult": true,
  "includeHistory": true,
  "returnCsv": false
}
```

The history is large, so the default is decided at MVP implementation time based on performance. The option for concurrent results is added in Phase 2.

### GET /api/moving-load/results/{resultId}

Future API for retrieving a saved result. May remain unimplemented in the MVP.

## 9. CSV Output

The CSV has multiple sections.

```text
[InfluenceLine]
caseId,lineId,targetId,station,x,y,z,value

[MovingLoadHistory]
caseId,station,targetId,value

[Envelope]
caseId,targetId,criterion,value,station
```

CSV output rules:

- `NaN` and `Infinity` are not emitted.
- Units are included in the header or the metadata.
- When a preset is used, `presetId`, `edition`, and `revision` are emitted in the metadata.
- In the MVP, InfluenceLine, MovingLoadHistory, and Envelope are prioritized.
