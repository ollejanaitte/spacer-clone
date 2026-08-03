# 04 — Domain Model Delta

## Ownership principle

| Concern | Owner | Notes |
|---------|-------|-------|
| Road geometry (alignment/profile/crossfall) | Road / LINER SoR | Apollo does not fork coordinates |
| Bridge structural members | Apollo BSSD / input draft | Extend, do not invent from mesh |
| Appurtenances / haunch / splice assemblies | Apollo app-specific models → projected into BSSD where contract exists | Expand Haunch/Splice beyond ID-only |
| Workflow / dimensions overlay | Apollo app-specific | Not BSSD fabrication truth |
| Quantity / report / drawings | Existing Step 2–3 models | Consume new entities via stable IDs |

## New / extended domains

### BridgeAppurtenanceModel

Fields: `appurtenanceId`, `type` (CURB|WALL_RAILING|MEDIAN|BARRIER_OPTIONAL), `side` (LEFT|RIGHT|CENTER|NONE), `startStation`, `endStation`, `transverseOffset`, `crossSection` (width/height/shape), `materialRef`, `unitWeight`, `sourceAlignmentRef?`, `status`, `provenance`.

- **Generator:** from Apollo input draft segments
- **Consumers:** 3D, quantity, loads, drawings, schedule
- **NONE:** `EXPLICIT_NONE` vs absent `NOT_PROVIDED`

### RcDeckHaunchModel

Fields: `haunchId`, `mainGirderRefId`, `startStation`, `endStation`, `shapeType` (RECT|TRAPEZOID), `topWidth`, `bottomWidth`, `height`, `materialRef`, `status`, `provenance`.

- Extends BSSD `Haunch` (today ID-only) via schema bump or sidecar payload linked by `haunchId`
- **Constructor:** pure function from draft + girder IDs
- **Empty array today:** `generateBsdd.ts` `haunches: []` must gain real generation in 4-B

### SpliceAssemblyModel

Fields: `spliceAssemblyId`, `mainGirderRefId`, `station`, `flangeSplicePlates[]`, `webSplicePlates[]`, `fillerPlates[]`, `boltPatterns[]` (count, pitch, rows — simplified), `status`, `provenance` = `NOT_DESIGN_CHECKED`.

- Extends BSSD `Splice` beyond ID-only
- Bolts are **patterns**, not individual FEM entities (DEC)

### AlignmentBridgeBindingModel

Fields: `bindingId`, `alignmentId`, `lineId`, `bridgeStartStation`, `bridgeEndStation`, `bridgeOrigin`, `axisMapping`, `handedness`, `transverseOffset`, `verticalOffset`, `crossfallSource`, `profileSource`, `bindingRevision`, `bindingChecksum`, `status`, `diagnostics`.

- Snapshot checksum of source alignment package; STALE on source change
- SoR remains Road/LINER (DEC-S1-0008)

### DimensionOverlayModel

Fields: `dimensionId`, `type` (MAJOR|ENTITY|MEASURE_2PT), `sourceEntityIds`, `anchorPoints`, `measuredValue`, `unit`, `displayPrecision`, `label`, `visibilityGroup`, `status`.

- Values from canonical entities; 2PT from user picks only
- Not exported to STL; optional project persistence (O-05)

### WorkflowStateModel

Fields: `schemaVersion`, `workflowRevision`, `steps[]`, `currentRecommendedStepId`, `diagnostics`, `progress`, `authorizationSummary` (always NOT_GRANTED summary).

## Stable IDs

Reuse `stableUuidFromSeed` / `stableEntitySeed` patterns (`bridgeStructure/stableIds.ts`).
Seeds: `projectScopeId:entityKind:key`.

## STALE dependency graph (high level)

```
alignment binding → bridge geometry → appurtenances/haunch/splice
  → loads → analysis → quantity/report/drawings/bundle/workflow badges
```

Input checksum remains master; new fields must participate in `buildInputChecksum`.
