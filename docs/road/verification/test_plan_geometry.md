# Test Plan — Geometry

<!-- DOC-AUTHORITY:START -->
> **Authority:** ACTIVE REFERENCE
> Current implementation facts are governed by [`../../scoping/stage4_road_design_scope.md`](../../scoping/stage4_road_design_scope.md). Target ownership and contracts are governed by [`../../planning/stage6-10/README.md`](../../planning/stage6-10/README.md); `RoadDesignDocument` is the target road source of truth.
<!-- DOC-AUTHORITY:END -->

## Purpose

Define verification strategy for the liner **geometry core**, **intermediate result** computation, and **frame model mapping**: golden cases with numeric expected values, tolerance thresholds, regression fixtures, and test organization.

This document is a **highest-priority** design artifact; geometry correctness is the foundation for all outputs.

## Scope

- Unit tests for horizontal segment resolution (line, arc, clothoid).
- Unit tests for vertical profile resolution.
- Station forward/inverse mapping including station equations.
- Grid point generation (XY and XYZ) with local frames and provenance.
- Intermediate result snapshot regression.
- Frame mapping golden fixture (GC-06).
- Cross-validation against hand-calculated references.

## Out of Scope

- CAD/report output visual regression ([test_plan_cad_report.md](test_plan_cad_report.md)).
- UI interaction tests.
- Analysis engine verification ([Frame MVP test specification](../../frame/verification/11_test_spec.md)).

## Assumptions

- Tests use Vitest (frontend) per repository conventions.
- Test names and describe blocks are in English per [language policy](../../development/language-policy.md).
- Tolerances defined in [numerical_accuracy.md](../design/numerical_accuracy.md).
- Golden JSON fixtures stored under `examples/liner/` (when implementing).
- **First implementation task:** write tests from this plan so they fail, then implement until they pass.

## Design Topics

### 1. Test pyramid

| Level | Target | Count (MVP) |
| --- | --- | --- |
| Unit | Individual geometry functions | 50+ |
| Integration | Full pipeline domain → intermediate | 12+ |
| Golden | Fixed input/output JSON pairs | 10+ |
| Mapper | Intermediate → project.json | 1+ (GC-06) |
| Property-based (optional) | Random small segments, continuity | Deferred |

### 2. Tolerance table

| Quantity | Absolute tolerance | Notes |
| --- | --- | --- |
| Length (m) | 1e-6 | |
| Coordinates (m) | 1e-6 | Lines, arcs |
| Coordinates (m) | 1e-3 | Clothoid endpoints |
| Azimuth (rad) | 1e-9 | |
| Elevation (m) | 1e-6 | |
| Physical distance (m) | 1e-6 | |
| Displayed station (m) | 1e-6 | |
| Offset (m) | 1e-4 | Inverse projection |

### 3. Golden case catalog — numeric expected values

#### GC-01: Single straight segment

**Input:** Start (0, 0), azimuth 0 rad, length 100 m.

| Physical distance (m) | x (m) | y (m) | azimuth (rad) | κ (1/m) |
| ---: | ---: | ---: | ---: | ---: |
| 0 | 0 | 0 | 0 | 0 |
| 50 | 50 | 0 | 0 | 0 |
| 100 | 100 | 0 | 0 | 0 |

#### GC-02: Single circular arc

**Input:** Start (0, 0), azimuth 0, radius R = 500 m, **left turn** (κ = +0.002), deflection 30° = π/6 rad, arc length L = R·θ ≈ 261.799388 m.

| Quantity | Expected |
| --- | --- |
| End point (x, y) | (250.000000, 66.987298) m |
| Midpoint at s = L/2 (x, y) | (129.409522, 17.037087) m |
| Midpoint azimuth (rad) | π/12 ≈ 0.261799 |
| Arc length (m) | 261.799388 |

#### GC-03: Line–arc compound

**Input:** Line 100 m along +X from origin, then left arc R = 500 m, 30° deflection (same as GC-02).

| Check | Expected |
| --- | --- |
| Junction point | (100, 0) |
| Junction azimuth | 0 |
| Position gap at junction | < 1e-6 m |
| Azimuth gap at junction | < 1e-9 rad |
| End point (x, y) | (350.000000, 66.987298) m |

#### GC-04: Station equation

**Input:** 200 m straight along +X; equation at physical distance 100 m: displayed station jumps by +100 (e.g., displayed 100 → 200 at same physical point).

| Query | Expected |
| --- | --- |
| physicalDistance 50 | displayedStation 50 |
| physicalDistance 100 (before eq.) | displayedStation 100 |
| physicalDistance 100 (after eq., higher sortIndex) | displayedStation 200 |
| physicalDistance 150 | displayedStation 250 |
| Point (150, 0) inverse | physicalDistance 150, displayedStation 250, offset 0 |

Duplicate displayedStation 100 disambiguated by `sortIndex`; interval lookup uses physical distance.

#### GC-05: Vertical parabolic curve

**Input:** PVC at physical distance 0, elevation 100.0 m, grade in g_in = +0.02, grade out g_out = −0.02, curve length L = 100 m.

Parabolic formula: Z(s) = Z_PVC + g_in·s + (g_out − g_in)·s²/(2L) for s ∈ [0, L].

| s (m) | Z (m) |
| ---: | ---: |
| 0 | 100.000000 |
| 25 | 101.187500 |
| 50 | 102.000000 |
| 75 | 101.812500 |
| 100 | 100.000000 |

#### GC-06: 3×3 grid on straight alignment

**Input:** Alignment as GC-01 segment 0–20 m; grid longitudinal indices 0,1,2 at x = 0, 10, 20; transverse offsets −5, 0, +5; flat profile Z = 10.0; `linerModelId = "gc06"`.

**Grid points (sample):**

| Grid ID | x | y | z | longitudinalIndex | transverseIndex |
| --- | ---: | ---: | ---: | ---: | ---: |
| GP-gc06-000-000 | 0 | −5 | 10 | 0 | 0 |
| GP-gc06-001-001 | 10 | 0 | 10 | 1 | 1 |
| GP-gc06-002-002 | 20 | 5 | 10 | 2 | 2 |

**Local frame at (10, 0):** tangent (1,0,0), normal (0,1,0), binormal (0,0,1).

**Mapper output:** See [frame_model_mapping.md](../legacy-integration/frame_model_mapping.md) §8 — 9 nodes, 12 members, 6 boundary supports. Fixture `gc-06-project.generated.json` must pass schema validation.

#### GC-07: Skewed alignment (45° azimuth)

**Input:** Straight from (0,0), azimuth π/4, length 100 m. Query point at physical distance 50, offset +5 (left).

| Quantity | Expected |
| --- | --- |
| Base point (x, y) | (35.355339, 35.355339) |
| Left normal N | (−√2/2, √2/2, 0) ≈ (−0.707107, 0.707107, 0) |
| Offset point (x, y) | (31.819805, 38.890873) |
| offset sign | +5 |

#### GC-08: Straight → clothoid → arc

**Input:** Line 50 m; clothoid A = 100, L = 50 m (κ: 0 → 0.002); arc R = 500 m, 30° deflection.

| Check | Tolerance |
| --- | --- |
| Clothoid end matches arc start position | 1e-3 m |
| Clothoid end azimuth matches arc start azimuth | 1e-6 rad |
| Clothoid end κ = 0.002 | 1e-6 1/m |
| Compound end point | Reference: independent Simpson integration or published table |

#### GC-09: Arc → clothoid → straight

**Input:** Reverse of GC-08 pattern; κ: 0.002 → 0 over clothoid length 50 m.

| Check | Tolerance |
| --- | --- |
| G1/G2 continuity at clothoid–straight joint | 1e-3 m, 1e-6 rad |

#### GC-10: Egg-shaped transition (finite radii)

**Input:** R_in = 800 m, R_out = 500 m, clothoid length L = 60 m, A derived from standard transition formula.

| Check | Tolerance |
| --- | --- |
| Start κ = 1/800 | 1e-6 1/m |
| End κ = 1/500 | 1e-6 1/m |
| Endpoint coordinates | 1e-3 m (Simpson reference) |

### 4. Degenerate case tests

| Case | Expected |
| --- | --- |
| Zero-length segment | Error `LINER_GEOM_ZERO_LENGTH_SEGMENT`, no crash |
| Duplicate segment join | Warning or merge if gap < 1e-6 m |
| Station outside range | Error on query |
| Parallel point far from alignment | Large offset, nearest station returned |
| Invalid clothoid A ≤ 0 | Error `LINER_GEOM_CLOTHOID_INVALID_RADIUS` |

### 5. Regression workflow

1. Author domain input JSON in `examples/liner/gc-NN-domain.json`.
2. Run pipeline in test to produce intermediate JSON.
3. Compare to committed `gc-NN-intermediate.expected.json`.
4. Run mapper for GC-06 → `gc-06-project.generated.json`; validate against schema.
5. On intentional algorithm change, update expected with review.

### 6. Inverse projection tests

For `stationAtPoint(x, y)`:

- Points on alignment → offset ≈ 0.
- Points 5 m left of alignment → offset ≈ +5 (sign per [coordinate_system_policy.md](../design/coordinate_system_policy.md)).
- Newton iteration convergence within 20 iterations.

### 7. Performance smoke tests

| Scenario | Target | Reference |
| --- | --- | --- |
| 1000 grid points full pipeline | < 500 ms | [performance_limits.md](../design/performance_limits.md) |
| 10 alignments, 500 stations each | < 2 s | Soft limit |
| Mapper 5000 nodes + 8000 members | < 200 ms | Soft limit |

Not blocking CI initially; tracked as benchmark.

### 8. Test file layout (proposed)

```text
frontend/src/liner/core/
  __tests__/
    horizontal.test.ts
    clothoid.test.ts
    vertical.test.ts
    station.test.ts
    grid.test.ts
    pipeline.golden.test.ts
frontend/src/liner/mapper/
  __tests__/
    frameModel.golden.test.ts
examples/liner/
  gc-01-domain.json
  gc-01-intermediate.expected.json
  gc-06-intermediate.json
  gc-06-project.generated.json
  ...
```

### 9. CI gate criteria (MVP)

| Gate | Required in CI |
| --- | --- |
| GC-01 through GC-07 unit/golden | Yes |
| GC-08 through GC-10 clothoid | Yes before clothoid MVP ships |
| GC-06 schema validation | Yes |
| Performance smoke | Optional benchmark job |

## Open Questions

- Independent reference script (Python) for clothoid GC-08–10 numeric baselines?
- Platform tolerance bump for ARM vs x86 in CI?

## Related Documents

- [geometry_core.md](../design/geometry_core.md)
- [intermediate_result_model.md](../design/intermediate_result_model.md)
- [frame_model_mapping.md](../legacy-integration/frame_model_mapping.md)
- [integration_with_frame_model.md](../legacy-integration/integration_with_frame_model.md)
- [numerical_accuracy.md](../design/numerical_accuracy.md)
- [station_rules.md](../design/station_rules.md)
- [profile_rules.md](../design/profile_rules.md)
- [performance_limits.md](../design/performance_limits.md)
- [Development quality gates](../../development/quality-gates.md)

## Pre-Implementation Checklist

- [x] Golden case GC-01 through GC-07 specified with numeric expected values.
- [x] Clothoid golden cases GC-08 through GC-10 defined.
- [x] GC-06 mapper fixture and schema validation path defined.
- [x] Tolerance table aligned with numerical_accuracy doc.
- [ ] Fixture directory convention agreed in repo.
- [ ] CI inclusion criteria implemented.
