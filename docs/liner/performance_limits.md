# Performance Limits

## Purpose

Define acceptable scale limits, latency targets, and user-visible warnings when projects approach or exceed limits. Limits tie to intermediate output size and frame mapping scale.

## Scope

- Maximum counts: alignments, segments, grid points, generated nodes/members.
- Latency targets for full pipeline recompute and mapper.
- Memory budget for intermediate results in browser.
- Export time limits for CAD/report.
- Max report rows and CAD entities.

## Out of Scope

- Analysis engine performance.
- GPU rendering limits for main 3D viewer.

## Assumptions

- Target hardware: typical office laptop (4+ cores, 16 GB RAM).
- Limits enforced softly (warn) before hard block unless safety requires hard stop.
- Benchmarks reference [test_plan_geometry.md](test_plan_geometry.md) smoke tests.

## Design Topics

### 1. Target model sizes (MVP)

| Resource | Typical | Soft limit | Hard limit |
| --- | --- | --- | --- |
| Alignments per project | 1 | 5 | 20 |
| Horizontal segments | 20 | 200 | 1000 |
| Station equations | 5 | 50 | 200 |
| Grid points | 500 | 10,000 | 50,000 |
| Generated nodes | ≈ grid points | 10,000 | 50,000 |
| Generated members | ≈ 2× grid (grid_full) | 20,000 | 100,000 |
| Report rows (grid table) | = grid points | 10,000 | 50,000 |
| CAD polyline vertices | ≈ totalLength / sampleSpacing | 100,000 | 500,000 |
| Full pipeline recompute | — | 500 ms | 5 s |
| Mapper only | — | 200 ms | 2 s |
| Intermediate JSON size | 1 MB | 5 MB | 20 MB |

### 2. Performance smoke tests

| Test | Target | Document |
| --- | --- | --- |
| 1000 grid points pipeline | < 500 ms | [test_plan_geometry.md](test_plan_geometry.md) §7 |
| 5000 nodes mapper | < 200 ms | [test_plan_geometry.md](test_plan_geometry.md) §7 |

### 3. User warnings

- Soft limit exceeded → i18n warning in diagnostics panel; export allowed with indicator.
- Hard limit exceeded → block grid generation or require explicit override.

### 4. Complexity notes

- Grid generation O(n_long × n_trans).
- Mapper O(nodes + members).
- Avoid O(n²) all-pairs checks in hot paths.

## Open Questions

- Different limits for Electron vs. web-only dev mode?

## Related Documents

- [performance_architecture.md](performance_architecture.md)
- [recalculation_policy.md](recalculation_policy.md)
- [test_plan_geometry.md](test_plan_geometry.md)
- [rendering_strategy.md](rendering_strategy.md)
- [frame_model_mapping.md](frame_model_mapping.md)

## Pre-Implementation Checklist

- [x] Initial limits tied to grid/node/member counts.
- [x] Benchmark cases referenced in test plan.
- [ ] Warning i18n strings identified.
- [ ] Limits revisited after MVP prototype.
