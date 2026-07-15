# Geometry Core

<!-- DOC-AUTHORITY:START -->
> **Authority:** ACTIVE REFERENCE
> Current implementation facts are governed by [`../../scoping/stage4_road_design_scope.md`](../../scoping/stage4_road_design_scope.md). Target ownership and contracts are governed by [`../../planning/stage6-10/README.md`](../../planning/stage6-10/README.md); `RoadDesignDocument` is the target road source of truth.
<!-- DOC-AUTHORITY:END -->

## Purpose

Specify the **pure calculation layer** for alignment geometry: curve resolution, stationing, coordinate transformation, grid placement, and elevation combination. This module has no dependency on React, HTTP, file I/O, or FEM data structures.

This document is a **highest-priority** design artifact and the source of truth for segment algorithms, sign conventions, and numerical tolerances.

## Scope

- Horizontal alignment elements: straight line, circular arc, transition spiral (clothoid) — all three in MVP.
- Vertical alignment elements: constant grade, parabolic vertical curve.
- Station ↔ point mapping (forward and inverse).
- Offset and local frame (tangent, normal, binormal) computation at arbitrary station.
- Combination of horizontal (XY) and vertical (Z) into 3D grid points with provenance.
- Numerical tolerances and degenerate case handling ([numerical_accuracy.md](numerical_accuracy.md)).

## Out of Scope

- UI interaction (drag handles, snap).
- FEM mesh topology decisions beyond geometric point generation.
- CAD entity formatting.
- File parsing.
- Backend geometry execution in MVP ([calculation_pipeline.md](calculation_pipeline.md)).

## Assumptions

- Input is validated domain geometry ([validation_rules.md](validation_rules.md)) before core invocation.
- Angles internally in radians; azimuth convention defined in [coordinate_system_policy.md](coordinate_system_policy.md).
- Lengths in meters; curvatures in 1/m.
- Algorithms are deterministic for identical inputs (required for regression tests).
- MVP runs **TypeScript-only** in the frontend; no Python duplicate of geometry core.

## Design Topics

### 1. Module boundary

```text
liner-core/
  geometry/
    horizontal/     # segment resolution, sampling
    vertical/       # profile resolution
    station/        # chainage, equations
    transform/      # local ↔ global frames
    grid/           # transverse × longitudinal lattice
  pipeline/         # orchestration (see calculation_pipeline.md)
```

Public API returns data matching [intermediate_result_model.md](intermediate_result_model.md).

### 2. Horizontal segment resolution

| Segment type | Inputs | Outputs |
| --- | --- | --- |
| `LineSegment` | Start point, azimuth, length | End point, constant azimuth, κ=0 |
| `ArcSegment` | Start point, azimuth, radius R>0, turn direction, length L | End point, varying azimuth, κ=±1/R |
| `ClothoidSegment` | Start point, azimuth, clothoid parameter A>0, length L, start/end radius | End point, linearly varying κ |

**Parameterization:** Arc length `s` from segment start (station-based), not normalized parameter t ∈ [0,1] only.

**Sign conventions** ([coordinate_system_policy.md](coordinate_system_policy.md)):

| Quantity | Convention |
| --- | --- |
| Azimuth | From +X toward +Y, radians, CCW positive |
| Curvature κ | + left (CCW), − right (CW) in plan |
| Transverse offset d | + left of alignment tangent |
| Left turn arc | κ = +1/R |
| Right turn arc | κ = −1/R |

**Continuity at joints:**

| Check | Tolerance | On failure |
| --- | --- | --- |
| Position | 1e-6 m | Error `LINER_GEOM_POSITION_DISCONTINUITY` |
| Azimuth | 1e-9 rad | Error `LINER_GEOM_AZIMUTH_DISCONTINUITY` |
| Curvature (G2) | 1e-6 1/m | Warning at clothoid–arc joins if within clothoid tolerance |

### 3. Clothoid (Euler spiral) — MVP algorithm

**Parameters:**

- `A` — clothoid parameter (m), A² = R·L at end of spiral where R is instantaneous radius.
- `L` — spiral length (m).
- `R_in`, `R_out` — start/end radius (∞ for straight); finite values define egg-shaped transitions.
- `κ(s) = s/A²` for standard clothoid from infinite radius; generalized linear κ(s) for transitions between finite radii.

**Endpoint computation (chosen method):** Fresnel integrals via truncated series expansion (C++ reference style, deterministic):

```text
C(x) = ∫₀ˣ cos(πt²/2) dt ≈ Σ_{n=0}^{N} (-1)^n x^{4n+1} / ((4n+1)(2n)! (π/2)^n)
S(x) = ∫₀ˣ sin(πt²/2) dt ≈ Σ_{n=0}^{N} (-1)^n x^{4n+3} / ((4n+3)(2n+1)! (π/2)^n)
```

For segment start (x₀, y₀, azimuth θ₀) and length L along clothoid with parameter A:

```text
τ = L / A²                    // total deflection angle (rad)
x_local = A · √(π) · (C(τ/√π) - C(0))
y_local = A · √(π) · (S(τ/√π) - S(0))
// rotate (x_local, y_local) by θ₀ and translate to (x₀, y₀)
```

Generalized clothoid (finite R_in → R_out): integrate κ(s) = κ₀ + (κ₁−κ₀)·s/L numerically with Simpson rule (n=64 intervals minimum) when series form does not apply.

**Accuracy targets** ([numerical_accuracy.md](numerical_accuracy.md)):

| Range | Max endpoint error |
| --- | --- |
| L ≤ 200 m, A ≥ 50 | 1e-4 m |
| L ≤ 500 m, A ≥ 30 | 1e-3 m |
| Egg transitions (both R finite) | 1e-3 m |

**Inverse station query on clothoid:** Newton-Raphson on arc length using analytic κ(s) and numerical ds; max 20 iterations, tolerance 1e-6 m.

**Validation:**

- A > 0, L > 0.
- |κ| ≤ 1/R_min at all points (R_min from project limits).
- Error `LINER_GEOM_CLOTHOID_INVALID_RADIUS` if R_in or R_out < R_min.

Golden cases GC-08 through GC-10 in [test_plan_geometry.md](../verification/test_plan_geometry.md).

### 4. Vertical segment resolution

| Segment type | Inputs | Outputs |
| --- | --- | --- |
| `GradeSegment` | Start station, elevation, grade, length | Linear Z(s) on profile axis |
| `ParabolicCurve` | PVC station/elevation, grade in/out, length | Z(s) with constant grade rate |

**Responsibility split** ([profile_rules.md](profile_rules.md)):

| Component | Computed in | Stored in intermediate |
| --- | --- | --- |
| Profile elevation Z_profile(s) | Vertical module | `vertical.profileElevation` |
| Crossfall / superelevation | Cross-section module (post-MVP: 0) | `zProvenance.crossfallOffset` |
| Structural reference offset | Cross-section template | `zProvenance.structuralReferenceOffset` |
| Section depth / girder eccentricity | Cross-section template | `zProvenance.sectionDepthOffset`, `girderEccentricity` |
| Final node Z | Grid combiner | `GridPointResult.z` = sum of components |

PVC / PVI / PVT labeling included in `vertical.segments`.

### 5. Station computation

- Cumulative **physical distance** along resolved horizontal geometry.
- Application of [station_rules.md](station_rules.md) for displayed station mapping.
- Inverse query: given (x, y), find nearest station, physical distance, and offset (orthogonal projection).

```pseudo
function pointAtPhysicalDistance(d: number): AlignmentSamplePoint
function pointAtDisplayedStation(s: number, context?: StationLookupContext): AlignmentSamplePoint
function stationAtPoint(x: number, y: number): { physicalDistance, displayedStation, offset, distance }
function elevationAtPhysicalDistance(d: number): ProfileSamplePoint
```

**Station equation at segment boundary:** Use the equation whose `physicalDistance` equals the boundary (lower `sortIndex` wins at exact equality).

### 6. Local coordinate frame

At physical distance `s`:

- **T** — unit tangent in horizontal plane (from azimuth).
- **N** — left normal in horizontal plane (T rotated +90° CCW in plan).
- **B** — binormal = T × N (typically +Z for bridge axis workflows).

Grid point at transverse offset `d`:

```text
H(s) = (x(s), y(s))           // horizontal alignment point
P(s, d) = H(s) + d · N(s)     // plan position
P.z     = Σ zProvenance components   // see §4
```

Store full `localFrame` on every grid point and alignment sample.

### 7. Grid generation algorithm

```pseudo
for physicalDistance in longitudinalStations(gridDef, stationTable):
  for offset in transverseOffsets(gridDef, crossSection):
    frame = localFrameAt(physicalDistance)
    zParts = resolveZComponents(physicalDistance, offset, profile, crossSection)
    pt = GridPointResult { ..., localFrame: frame, zProvenance: zParts, source: {...}, roles: [...] }
    gridPoints.append(pt)
buildGridLines(gridPoints)
buildGridCells(gridPoints, spans)
assignFrameHints(gridPoints, generationSettings)
```

Longitudinal stations: equal spacing, span boundaries, pier lines, and user-defined extra stations.
Transverse offsets: from [profile_rules.md](profile_rules.md) and cross-section template.

### 8. Sampling density

| Use case | Default spacing | Configurable | Consumer |
| --- | --- | --- | --- |
| Rendering polyline | 1.0 m | Yes (pipeline setting) | All render/CAD consumers |
| Grid generation | User-defined | Yes | Frame mapper |
| Frame model export | Mesh division setting | Yes | Mapper only |
| Inverse projection Newton | Adaptive | Internal | Core only |

Changing sampling spacing requires pipeline re-run; consumers must not re-sample ([intermediate_result_model.md](intermediate_result_model.md) §14).

### 9. Degenerate and edge cases

| Case | Behavior |
| --- | --- |
| Zero-length segment | Error `LINER_GEOM_ZERO_LENGTH_SEGMENT` |
| Colinear adjacent segments | Merge if gap < 1e-6 m, else warning |
| Station equation at exact segment boundary | Lower `sortIndex` equation applies |
| Near-180° arc | Azimuth integrated via curvature; no angle unwrap jumps |
| Vertical curve with zero length | Error `LINER_GEOM_ZERO_LENGTH_SEGMENT` |
| Clothoid L > 10·A² | Warning `LINER_GEOM_CLOTHOID_LONG_SPIRAL` |
| Parallel point far from alignment | Large offset returned; nearest station by projection |
| Duplicate displayed station | Disambiguate via `sortIndex` and physical-distance intervals |

### 10. Test hooks

Pure functions accept plain number arrays; no class singletons.
Golden files: input domain JSON → expected intermediate result JSON ([test_plan_geometry.md](../verification/test_plan_geometry.md)).

## Open Questions

- Superelevation rotation of local frame: applied in geometry core or cross-section module when implemented?
- Use existing computational geometry library or implement in-house for auditability?

## Related Documents

- [intermediate_result_model.md](intermediate_result_model.md)
- [station_rules.md](station_rules.md)
- [profile_rules.md](profile_rules.md)
- [coordinate_system_policy.md](coordinate_system_policy.md)
- [numerical_accuracy.md](numerical_accuracy.md)
- [test_plan_geometry.md](../verification/test_plan_geometry.md)
- [calculation_pipeline.md](calculation_pipeline.md)
- [validation_rules.md](validation_rules.md)
- [error_handling.md](error_handling.md)

## Pre-Implementation Checklist

- [x] Segment type MVP list frozen (line, arc, clothoid).
- [x] Azimuth and curvature sign conventions documented.
- [x] Clothoid algorithm and accuracy targets defined.
- [x] Forward/inverse station APIs specified with tolerance bounds.
- [x] Grid generation worked example on paper (3×3 grid in test plan).
- [x] Degenerate case catalog complete.
- [ ] Unit test file structure planned under `frontend/src/liner/core/` or equivalent.
