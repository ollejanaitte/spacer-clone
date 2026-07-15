# Test Plan — CAD and Report

<!-- DOC-AUTHORITY:START -->
> **Authority:** ACTIVE REFERENCE
> Current implementation facts are governed by [`../../scoping/stage4_road_design_scope.md`](../../scoping/stage4_road_design_scope.md). Target ownership and contracts are governed by [`../../planning/stage6-10/README.md`](../../planning/stage6-10/README.md); `RoadDesignDocument` is the target road source of truth.
<!-- DOC-AUTHORITY:END -->

## Purpose

Define verification for CAD and report outputs generated from intermediate results, ensuring correct content, formatting, and originality compliance.

## Scope

- SVG structure and geometry presence.
- Report section completeness, table schemas, and numeric accuracy.
- CSV column correctness for grid exports.
- Regression snapshots for stable outputs.
- Label rendering from i18n (not hardcoded in templates).

## Out of Scope

- Core geometry numeric tests ([test_plan_geometry.md](test_plan_geometry.md)).
- Visual pixel-perfect comparison (optional manual smoke).

## Assumptions

- Tests run on golden intermediate fixtures (GC-06 minimum).
- Snapshot tests for SVG/XML stable subsets (strip timestamps).

## Design Topics

### CAD tests

- Parse exported SVG: polyline vertex count matches `horizontal.sampledPoints.length`.
- Grid points appear as markers at coordinates from `grid.points` (after root Y-flip transform).
- Layer ids follow [cad_output_spec.md](../output/cad_output_spec.md) naming (`LINER_PLAN_*`).
- Station tick count matches configured interval on `stations.entries`.
- File validates as well-formed XML.
- **No re-sampling:** vertex count must not exceed intermediate sample count.

### Report tests

- HTML contains sections per [report_output_spec.md](../output/report_output_spec.md) keys.
- `gridPoints` table row count equals `grid.points.length`.
- `stationCoordinates` rows match `stations.entries.length`.
- `frameMappingTrace` present when mapper fixture included.
- CSV headers match English keys: `gridPointId`, `displayedStation`, `offset`, `x`, `y`, `z`.
- Diagnostics section lists injected warning from fixture.

### Originality checks (manual)

Per [legal_originality_policy.md](../design/legal_originality_policy.md) review gates.

### Test layout (proposed)

```text
frontend/src/liner/export/
  __tests__/
    cadExport.golden.test.ts
    reportExport.golden.test.ts
examples/liner/
  gc-06-intermediate.json
  gc-06-plan.expected.svg
  gc-06-report.expected.html
```

## Open Questions

- Snapshot entire SVG or hash normalized geometry only?

## Related Documents

- [cad_output_spec.md](../output/cad_output_spec.md)
- [report_output_spec.md](../output/report_output_spec.md)
- [intermediate_result_model.md](../design/intermediate_result_model.md)
- [test_plan_geometry.md](test_plan_geometry.md)
- [legal_originality_policy.md](../design/legal_originality_policy.md)

## Pre-Implementation Checklist

- [x] Report table column specs referenced.
- [ ] Golden intermediate fixture shared with geometry tests.
- [ ] Expected SVG snapshot committed when implementing.
- [ ] CSV column spec asserted in tests.
