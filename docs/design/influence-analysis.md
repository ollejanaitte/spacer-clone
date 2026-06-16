# Influence Line Analysis Phase B-3 Design Memo

## 1. Purpose and Position

This document records the influence line analysis implementation as of the end of Phase B, and organizes the decisions that must be fixed before Phase C proceeds to envelopes, moving loads, loading lines, and road bridge live loads.

This document does not redefine the influence line engine, loading surface, moving load, or envelope result in detail. For details, see the existing design documents. This document focuses on the current implementation status and the policy for connecting to the next phase.

## 2. Current Status

### 2.1 Influence Line MVP

The current implementation targets a single structural member, places a load at each station generated on that member, and computes the influence value for the specified target.

The currently selectable targets are:

- Nodal displacement
- Support reaction
- Member end force

The result for each target is stored in `InfluenceResult` as a value array corresponding to the common station series.

### 2.2 Save, Reload, Re-analysis

The project stores the analysis conditions of `analysisSettings.influence`, not the precomputed result.

When the saved project is reopened, the following conditions are restored and the same influence line analysis can be re-executed:

- `caseId`
- Target member
- Number of stations
- Load direction
- Load magnitude
- Target definition

It is confirmed by API tests that the re-analysis result is the same before and after saving.

### 2.3 Analysis Result Verification

For cantilever beams and simply supported beams, verification has been performed by comparing the influence line of reaction, bending moment, and displacement with hand-calculated formulas.

This verification is for the current single-member loading and member concentrated load scope. It does not guarantee the validity of multiple member lines or road bridge live loads.

### 2.4 CSV Output

`influence_lines.csv` can be output from both the backend and the frontend.

The column order is fixed as:

```text
case_id,line_id,target_id,target_type,node_id,member_id,component,end,station_index,station,ratio,x,y,z,value
```

The row order is the `targetResults` order, and within that, the `stations` order. If the lengths of `targetResults.values` and `stations` do not match, or if non-finite values are present, an error is raised.

### 2.5 Graph Display

On the frontend, the influence line series are shown per target.

- Per-target display ON / OFF
- Select all
- Clear all
- Initial state: all series shown
- When the result series changes, the display is re-initialized to show all series

The graph display selection state is a transient UI state and is not saved to the ViewModel or the analysis result.

## 3. Current InfluenceResult

The current main structure is:

```ts
type InfluenceResult = {
  caseId: string;
  line: {
    id: string;
    memberId: string;
    stationCount: number;
    loadDirection: { x: number; y: number; z: number };
    loadMagnitude: number;
  };
  stations: Array<{
    station: number;
    ratio: number;
    position: { x: number; y: number; z: number };
    stationIndex: number;
  }>;
  targets: InfluenceTarget[];
  targetResults: Array<{
    targetId: string;
    values: number[];
  }>;
};
```

The responsibility of each field is:

| Field | Current responsibility |
| --- | --- |
| `caseId` | Identification of the influence line analysis case |
| `line` | Loading condition on a single member |
| `stations` | Order, distance, ratio, and global coordinates of the loading positions |
| `targets` | Targets and components from which the response is extracted |
| `targetResults` | Per-target influence values in station order |

`targetResults.values[index]` corresponds to `stations[index]`. This correspondence is shared by graphs, CSV, and future moving load calculations.

## 4. Current Constraints

### 4.1 Loading Path

The current `line` directly corresponds to a single structural member. An independent `loadingLine` domain is not implemented, so a loading path that traverses multiple members cannot be expressed.

### 4.2 Reference Load

The current `loadMagnitude` is stored, but it is not clear in the domain whether it is fixed to a unit load or treated as an arbitrary reference load.

Before moving on to the moving load calculation, it is necessary to make explicit which reference load the influence value is a response to.

### 4.3 Unimplemented Areas

The following features are not yet implemented:

- Max, min, and absolute max envelopes from the influence line
- `movingLoadCase`
- `loadingSurface`
- Independent `loadingLine`
- Multiple member lines
- Multiple axle loads
- Multiple lines or multiple lanes loaded simultaneously
- Road bridge T load, L load, crowd load, A-live, B-live
- Road surface model including lanes, sidewalks, loading width, and transverse distribution

## 5. Future Extension Policy

### 5.1 loadingLine

`loadingLine` is independent of the structural member. It represents a 1D loading path on the loading surface, with stations, line ID, and load attachment metadata.

The current `InfluenceResult.line` needs to be refactored into `loadingLine` + `DistributionRule` once the loading surface is introduced.

For multiple members or curved paths, `loadingLine` carries a list of (member, parameter-range) pairs or a parametric curve definition, and the equivalent nodal load generation logic lives in the adapter layer.

The `influenceResult.line` of the saved result and the new `loadingLine` must be convertible bidirectionally for backward compatibility. The result schema is extended in a backward-compatible way by adding the new field as optional.

### 5.2 Unit Load Convention

The reference load is set to a finite non-zero value, defaulting to 1.

`targetResults` holds the response values for the reference load. Real load contributions are converted by `actualLoad / referenceLoadMagnitude`.

The load direction and sign convention are kept in the influence line generation conditions.

### 5.3 Shared Display Model with Response Spectrum

The influence line result and the response spectrum result share the display model for showing the per-target response in graphs and reports.

However, the response spectrum modal combination and the worst-case placement search of the moving load are different calculations. What is shared is the result reference method and the display model, not the calculation logic itself.

## 6. Recommended EnvelopeResult Structure

The basic structure considered in Phase C is:

```ts
type EnvelopeResult = {
  movingLoadCaseId: string;
  sourceInfluenceCaseId: string;
  items: Array<{
    targetId: string;
    max: EnvelopeExtreme;
    min: EnvelopeExtreme;
    absMax: EnvelopeExtreme;
  }>;
};

type EnvelopeExtreme = {
  value: number;
  governingStation: number;
  governingStationIndex: number;
  loadPositions: Array<{
    loadId: string;
    lineId: string;
    station: number;
    position: { x: number; y: number; z: number };
    magnitude: number;
  }>;
};
```

`max`, `min`, and `absMax` keep not only the value but also the information needed to reproduce the loading state that produced it.

For multiple axles or multiple lines, the worst-case state cannot be expressed by a single station. `governingStation` is the representative position of the run case or the search step position, and the actual load configuration is held in `loadPositions`.

Whether to save the concurrent section force, the concurrent reaction, and the response snapshot of all targets is decided in Phase C or later, after checking the result size and the report requirements. For details, see [envelope-result.md](envelope-result.md).

## 7. movingLoadCase Calculation Policy

The basic formula assumed by the linear analysis is:

```text
response = sum(influenceValue * actualLoad / referenceLoad)
```

To apply this formula unambiguously, `referenceLoadMagnitude` is made explicit in future influence line results or in their generation conditions.

The recommended policy is:

1. The reference load for influence line generation is a finite non-zero value.
2. The default value is 1.
3. `targetResults` is treated as the response value when the reference load is applied.
4. The real load contribution is converted by `actualLoad / referenceLoadMagnitude`.
5. The load direction and the sign convention are kept in the influence line generation conditions.

In the single-axle, single-line case, one influence value is referenced for each run position. In the multi-axle case, the influence value at the station of each axle is referenced (by interpolation or coincidence), and the contributions are summed.

When extending to multiple lines and multiple member lines, each load position is identified by `lineId + station`, and the distribution to structural members is resolved by the rules on the loading line or loading surface side.

## 8. Decisions Before Phase C

### 8.1 Do Not Implement the Envelope Standalone First

The simple max, min, and absolute max can be computed from the current `targetResults`. However, those are the extremes of the influence line with a single reference load moved, and are a different responsibility from the future moving load envelope.

If the simple envelope alone is fixed to the persistent schema first, the worst-case load configuration required for multi-axle and multi-line cannot be expressed, and incompatible changes will be required later.

### 8.2 Fix EnvelopeResult Together with Related Designs

`EnvelopeResult` is fixed only after designing the following at the same time:

- `loadingLine` stations and multiple member representation
- `movingLoadCase` axles, vehicles, and run positions
- `referenceLoadMagnitude`
- `loadPositions` that reproduce the worst-case state
- The range of history to save
- Concurrent results and report requirements

### 8.3 Recommended Phase C Start Order

1. Fix `referenceLoadMagnitude` and the sign convention.
2. Define `movingLoadCase` for a single line.
3. Generate the moving history with a single concentrated load.
4. Generate `EnvelopeResult` from the history.
5. Extend to multiple axles.
6. Extend to independent `loadingLine` and multiple member lines.
7. Extend to `loadingSurface`, lanes, and road bridge live load rules.

Even with this order, the final shape of `EnvelopeResult` is fixed after confirming the design up to step 2.

## 9. Related Documents

- [influence-moving-load.md](influence-moving-load.md): domain and overall structure of influence line and moving load
- [influence-engine.md](influence-engine.md): station generation, load distribution, analysis engine
- [envelope-result.md](envelope-result.md): moving history, envelope, worst-case loading position
- [loading-surface-grid.md](loading-surface-grid.md): loading surface, grid, line, load distribution
- [moving-load-design-review.md](moving-load-design-review.md): design issues and stage separation
- [result-schema.md](result-schema.md): the overall result schema
- [result-visualization.md](result-visualization.md): conversion from results to the display model
- [response-spectrum-analysis.md](response-spectrum-analysis.md): responsibility comparison with the response spectrum analysis result
