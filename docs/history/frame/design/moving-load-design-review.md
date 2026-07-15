# Moving Load and Influence Line Design Review Report

<!-- DOC-AUTHORITY:START -->
> **Authority:** HISTORICAL / RETAINED EVIDENCE
> This document records prior planning, review, or executed verification. Current Frame facts are governed by [`../../../scoping/stage5_frame_analysis_scope.md`](../../../scoping/stage5_frame_analysis_scope.md), and target sequence, gaps, and gates by [`../../../planning/stage6-10/stage10_gap_migration_sequence.md`](../../../planning/stage6-10/stage10_gap_migration_sequence.md). It does not establish current or target completion.
<!-- DOC-AUTHORITY:END -->

## 1. Review Scope

Target documents:

- `docs/history/frame/investigations/spacer-moving-load.md`
- `docs/frame/analysis/influence-moving-load.md`
- `docs/frame/analysis/live-load-preset.md`
- `docs/frame/analysis/influence-engine.md`
- `docs/frame/analysis/envelope-result.md`
- `docs/frame/analysis/loading-surface-grid.md`

Review viewpoints:

- Domain conflicts
- Circular references
- Data structure duplication
- Responsibility duplication
- Future extensibility
- MVP feasibility
- Performance risk

## 2. Recommended Adoptions

### Separation of StructuralModel and LoadingSurfaceModel

Decision: Recommend adoption.

Reasons:

- The responsibilities of fixed-load analysis and moving load analysis become clear.
- Structural nodes and load grids can be handled independently.
- This is consistent with the SPACER idea of separating STATICS and INFLOAD.
- It is easy to add it as an upper-layer influence line engine without polluting the existing analysis engine.

### Phased Separation of Influence Line Generation and Moving Load Analysis

Decision: Recommend adoption.

Reasons:

- The unit load method result is reusable.
- It naturally extends to a single concentrated load, multiple axles, and distributed loads.
- The influence line graph and the envelope result can be verified independently.

### Load Value Management by LiveLoadPreset

Decision: Recommend adoption.

Reasons:

- Consistent with the policy of not embedding the Road Bridge Specification R7 load values directly in the source.
- The version, source, and revision number can be kept on the result.
- It supports future additions of A-live, B-live, T load, L load, and crowd load.

### MVP Restriction to a Single LoadingLine

Decision: Recommend adoption.

Reasons:

- Station generation, unit load, K matrix reuse, and envelope processing can be verified at the minimum unit.
- Multiple lanes and standard loads can be deferred.
- The integration risk with the existing analysis engine is contained.

### K Matrix Reuse

Decision: Recommend adoption.

Reasons:

- The heaviest processing for each station is reduced.
- It is consistent with the linear analysis assumption.
- The effect is large even for future multi-target extraction.

### Make memberInterpolation the MVP Default

Decision: Recommend adoption.

Reasons:

- `nearestNode` and `explicitNode` snap the load position to a node and make the influence line stair-stepped.
- Since we already have Euler-Bernoulli beam elements, concentrated loads at arbitrary positions on a member can be handled as equivalent nodal loads.
- The position dependency required for moving load analysis can be verified from the MVP.

### Station Management by StationPoint

Decision: Recommend adoption.

Reasons:

- Treating `StationPoint` as derived data at analysis time avoids adding more entities to the persistent domain model.
- `lineId + station` is the primary key, with `stationIndex` limited to auxiliary information.
- The legacy influence line loading point entity can be removed, and the mixing of responsibilities with load direction and distribution results is avoided.

### Decoupling of DistributionRule

Decision: Recommend adoption.

Reasons:

- `LoadingLine` can focus on path geometry only.
- The load distribution method is easy to extend from the MVP `memberInterpolation` to future `gridInterpolation`, `surfaceInterpolation`, and `laneDistribution`.
- The conversion responsibility to the structural model becomes clear.

## 3. Pending

### Whether to Include Displacement in the MVP Scope

Decision: Pending.

Discussion:

- The displacement influence line is technically possible, but it expands the initial UI and CSV scope.
- The bridge engineering value can be delivered with member end forces and reactions alone.

Recommendation:

- Keep `displacement` in the data structure.
- Prioritize member end forces and reactions for the MVP UI.

### Standard Return of Influence Line History

Decision: Pending.

Discussion:

- The history is required for visualization, but its size scales with the number of stations and targets.
- It can blow up the API response size.

Recommendation:

- Add an `includeHistory` option.
- Return only the targets required for the UI display.

### Accuracy Guarantee of Grid Interpolation

Decision: Pending.

Reasons:

- Grid interpolation affects load conservation, moment conservation, and the accuracy of distribution to structural members.
- In the MVP, `memberInterpolation` is the default, and grid interpolation is deferred to Phase 2.

Decisions needed:

- The interpolation method to prioritize in Phase 2 and later.
- The allowed tolerance.
- The handling when the loading point lies outside the grid.
- The verification cases for equivalent nodal loads.

### Output Scope of Concurrent Results

Decision: Pending.

Reasons:

- Returning the concurrency of all member end forces and all reactions at all times makes the result size large.
- In the MVP, prioritize `InfluenceResult`, `MovingLoadHistory`, and `EnvelopeResult`. Concurrent section forces and concurrent reactions are handled in Phase 2.

Decisions needed:

- Whether to limit Phase 2 to areas around the target.
- Whether the API option returns all members.
- Whether to include them in the standard CSV sections.

### Approval Flow for R7 Presets

Decision: Pending.

Reasons:

- Just preserving source information does not prevent a numerical registration error.
- It must be decided who checks the official tables, sections, and applicability conditions of the Road Bridge Specification R7.

Decisions needed:

- Preset registrant.
- Reviewer.
- Procedure for changing an approved preset.
- Scope of the preset snapshot saved for result reproducibility.

## 4. Re-discussion Required

### When to Make Full Use of LoadingGrid

Decision: Re-discussion required.

Reasons:

- `LoadingGrid` is an important element that inherits the SPACER grid concept, but `LoadingLine` and `memberInterpolation` are sufficient for the MVP.
- Implementing grid interpolation early blurs the focus of the MVP.

Decisions needed:

- Conditions under which grid interpolation is introduced in Phase 2.
- The timing to promote `LoadingGrid` from save-only to analysis-use.
- The relationship with grids generated from carriageways, sidewalks, and tracks.

### Result Size Management for Multiple Lanes and Area Loads

Decision: Re-discussion required.

Reasons:

- Multiple lanes, crowd load, distributed load, and concurrent results together can explode the history and envelope result.
- The MVP `targetResults` shape is easy to handle for a single line, but a result compaction policy for multiple lanes requires additional study.

Decisions needed:

- Whether to return results per target or per load case.
- Policy for thinning, saving, and splitting the history CSV.
- Whether to split the result-fetching API into UI and report use.

## 5. Domain Conflict Review

Conclusion: No significant conflicts.

Confirmed:

- `StructuralModel` does not reference the moving load model.
- `LoadingSurfaceModel` does not own the structural model.
- `LiveLoadPreset` does not reference project-specific entities.
- The reference direction from `MovingLoadCase` to `LoadingLine`, `LiveLoadModel`, and `DistributionRule` is appropriate.

Caution:

- When `DistributionRule` references structural member IDs, the load model and the structural model become strongly coupled. In the MVP, treat `targetMembers` as an arbitrary filter, and keep the distribution processing in the adapter layer.

## 6. Circular Reference Review

Conclusion: Circular references are avoided.

References that must be prohibited:

- `StructuralNode -> LoadingGridPoint`
- `Member -> LoadingLine`
- `LiveLoadPreset -> MovingLoadCase`
- `InfluenceResult -> MovingLoadCase -> InfluenceResult`

Design countermeasures:

- Results keep the input case ID as a string.
- Presets do not know analysis cases.
- The structural model does not know the load model.
- `StationPoint` is derived data at analysis time, not a persistent reference target.

## 7. Data Structure Duplication Review

Conclusion: The duplication risk has been reduced.

Items that easily duplicate:

- Station coordinates appear in both `StationPoint` and `InfluenceResult`.
- Load direction can appear in both `LiveLoadModel` and `MovingLoadCase`.

Recommendations:

- `LoadingLine` carries a generation rule.
- `StationPoint` is treated as derived data at analysis time and is not persisted.
- `InfluenceResult` holds station coordinates as an analysis-time snapshot.
- The load direction is owned by `LiveLoadModel` in principle, and only overridden in `MovingLoadCase` when case-specific overrides are needed.

## 8. Responsibility Duplication Review

Conclusion: Acceptable for now.

Cautions:

- `LiveLoadModel` and `MovingLoadCase` have similar responsibilities.
- `LoadingGrid` and `LoadingLine` may overlap in station management.

Recommendations:

- `LiveLoadModel` holds the load shape, magnitude, and direction.
- `MovingLoadCase` holds where to move what, against which target.
- `LoadingLine` is a 1D path, and `LoadingGrid` is a 2D loading point set.
- `DistributionRule` is responsible for converting loading points to the structural model.

## 9. Future Extensibility Review

Conclusion: Extensibility is good.

Supported future extensions:

- Multi-axle loads.
- Distributed loads.
- Multiple lanes.
- Carriageways, sidewalks, tracks.
- Presets other than R7.
- Concurrent section forces and reactions.
- Grid interpolation.

Conditions:

- Make `memberInterpolation` the MVP default and do not fall back to `nearestNode` / `explicitNode` as initial candidates.
- Add preset versioning from the beginning.
- Persist the used preset information in the result.

## 10. MVP Feasibility Review

Conclusion: The MVP is feasible.

Minimum elements required:

- Single line input.
- Station generation.
- `StationPoint` generation.
- Equivalent nodal load vector creation per station with `memberInterpolation`.
- K matrix reuse from the existing analysis engine.
- Target response extraction.
- Multiplication with a single concentrated load.
- Max / min envelope.
- CSV output.

Elements to avoid in the MVP:

- Full implementation of specification load presets.
- Multiple lanes.
- Area loads.
- Impact factor.
- Complex grid interpolation.
- Concurrent section forces and concurrent reactions.

## 11. Performance Risk Review

Conclusion: With K matrix reuse, the MVP performance risk is manageable.

Major risks:

- More stations means more solve iterations.
- More targets means larger result size.
- Returning all-member concurrent results in Phase 2 inflates the response.

Mitigations:

- Reuse the factorized solver.
- Extract multiple targets from a single solve result.
- Make history optional and design the concurrent result output scope in Phase 2.
- Cap the number of stations or warn about it.
- Generate result CSVs only when needed.

## 12. Overall Decision

Overall decision: Recommend adoption.

Reasons:

- The domain separation is clear, and the feature can be added without breaking the existing 3D frame analysis.
- Removing the legacy influence line loading point entity and splitting responsibilities into `StationPoint` and `DistributionRule` improves consistency between terminology and data structure.
- Making `memberInterpolation` the MVP default allows the position dependency of moving load analysis to be verified from the start.
- It can be extended to the Road Bridge Specification R7 live load preset, carriageways, sidewalks, tracks, and train loads in the future.

Priorities for the next phase:

1. Finalize the `LoadingLine` and station generation specification for the MVP.
2. Finalize the target member search, allowed distance, and equivalent nodal load formula for `memberInterpolation`.
3. Restrict the initial influence line targets to member end forces and reactions.
4. Decide the approval flow for `LiveLoadPreset`.
