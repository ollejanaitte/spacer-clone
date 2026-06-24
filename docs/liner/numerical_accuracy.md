# Numerical Accuracy

## Purpose

Define numerical methods, convergence criteria, and error tolerances for liner geometry computations. This document is the **source of truth** for numeric tolerance; display precision is in [unit_and_precision_policy.md](unit_and_precision_policy.md).

## Scope

- Floating-point type (IEEE 754 double).
- Iterative algorithms (inverse station projection, clothoid integration).
- Comparison tolerances for tests and runtime checks.
- Clothoid accuracy targets by parameter range.
- Handling of nearly colinear or nearly parallel cases.

## Out of Scope

- Analysis engine numerical precision.
- Display rounding ([unit_and_precision_policy.md](unit_and_precision_policy.md)).

## Assumptions

- Double precision sufficient for bridge-scale models (km length, mm display).
- Tests use tolerances from [test_plan_geometry.md](test_plan_geometry.md).
- Deterministic algorithms required for golden regression.

## Design Topics

### 1. Tolerance table (authoritative)

| Quantity | Absolute tolerance | Context |
| --- | --- | --- |
| Length (m) | 1e-6 | Lines, arcs |
| Coordinates (m) | 1e-6 | Lines, arcs, grid |
| Coordinates (m) | 1e-3 | Clothoid endpoints |
| Azimuth (rad) | 1e-9 | All segments |
| Curvature (1/m) | 1e-6 | Joint continuity |
| Elevation (m) | 1e-6 | Profile |
| Physical distance (m) | 1e-6 | Stationing |
| Displayed station (m) | 1e-6 | After equations |
| Offset (m) | 1e-4 | Inverse projection |

### 2. Inverse projection (Newton-Raphson)

| Parameter | Value |
| --- | --- |
| Max iterations | 20 |
| Position tolerance | 1e-6 m |
| Offset tolerance | 1e-4 m |
| Initial guess | Nearest alignment sample or segment start |

Failure: diagnostic `LINER_GEOM_INVERSE_PROJECTION_FAILED`.

### 3. Clothoid integration

| Method | Use |
| --- | --- |
| Fresnel series (N ≥ 12 terms) | Standard clothoid from infinite radius |
| Simpson rule (n ≥ 64 intervals) | Egg-shaped transitions (finite R_in, R_out) |

**Accuracy targets:**

| Range | Max endpoint error |
| --- | --- |
| L ≤ 200 m, A ≥ 50 | 1e-4 m |
| L ≤ 500 m, A ≥ 30 | 1e-3 m |
| Finite–finite radius transition | 1e-3 m |

See [geometry_core.md](geometry_core.md) §3.

### 4. Angle normalization

Use **(−π, π]** consistently for azimuth deltas and skew angles.

### 5. Degenerate geometry

| Condition | Threshold | Action |
| --- | --- | --- |
| Zero length | L < 1e-9 m | Error |
| Colinear merge | gap < 1e-6 m | Merge segments |
| Tiny radius | R < 1.0 m | Warning |
| Condition number (tight radius + long arc) | heuristic | Warning |

### 6. Regression stability

Optional ULP-aware comparison for critical golden values. CI may use relaxed clothoid tolerance (1e-3 m) on ARM if documented.

## Open Questions

- Platform differences (ARM vs x86) acceptable tolerance bump in CI?

## Related Documents

- [geometry_core.md](geometry_core.md)
- [test_plan_geometry.md](test_plan_geometry.md)
- [unit_and_precision_policy.md](unit_and_precision_policy.md)
- [validation_rules.md](validation_rules.md)
- [coordinate_system_policy.md](coordinate_system_policy.md)

## Pre-Implementation Checklist

- [x] Tolerance table authoritative and copied to test plan.
- [x] Iterative algorithm caps documented.
- [x] Clothoid accuracy targets defined.
- [ ] Edge case numeric behavior reviewed for arcs below 10 m radius.
