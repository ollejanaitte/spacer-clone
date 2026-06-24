# Coordinate System Policy

## Purpose

Unify coordinate system conventions across liner geometry, intermediate results, frame model export, rendering, and CAD output. This document is the source of truth for axis directions, local frames, and member orientation defaults.

## Scope

- Global axis directions and handedness.
- Alignment azimuth definition.
- Local frame (tangent, normal, binormal).
- Member local axis conventions for frame export.
- Datum and elevation reference.
- Consistency with existing `project.json` node coordinates.

## Out of Scope

- Map projection / geodetic coordinates (assume local engineering frame).
- Unit conversion (see [unit_and_precision_policy.md](unit_and_precision_policy.md)).
- Display precision rounding.

## Assumptions

- Right-handed coordinate system: +X, +Y, +Z per structural convention in [docs/04_input_schema.md](../04_input_schema.md).
- Plan view displays X–Y; profile view displays station vs. elevation (Z).
- Azimuth measured from +X toward +Y (CCW positive in plan).

## Design Topics

### 1. Global frame

| Axis | Typical bridge role |
| --- | --- |
| +X | Alignment direction at origin (primary bridge axis) |
| +Y | Transverse (left positive when facing +X) |
| +Z | Vertical up |

Right-handed: X × Y = Z.

### 2. Azimuth and curvature

- **Azimuth θ:** Angle from +X to tangent T in plan, radians, CCW positive.
- **Curvature κ:** + for left (CCW) turn, − for right (CW) turn; κ = 1/R with signed R.
- **Transverse offset d:** + left of alignment (positive along N).

### 3. Local frame (Frenet in plan)

At physical distance `d` along alignment:

```text
T = (cos θ, sin θ, 0)           // unit tangent
N = (-sin θ, cos θ, 0)          // left normal (+90° CCW from T in plan)
B = T × N = (0, 0, 1)           // binormal (up for level alignment)
```

Stored on every `AlignmentSamplePoint` and `GridPointResult` ([intermediate_result_model.md](intermediate_result_model.md)).

**Offset point in plan:**

```text
P_xy = H(d) + offset · N
```

Superelevation (post-MVP): rotate N and B about T by roll angle; until then N remains horizontal.

### 4. Member local axes (frame model)

Per [frame_model_mapping.md](frame_model_mapping.md) and `project.schema.json`:

| Axis | Definition |
| --- | --- |
| Local x | Node I → Node J |
| Local y | From `orientationVector`, projected ⊥ to local x |
| Local z | local x × local y (right-handed member frame) |

**Default `orientationVector`:** `{ x: 0, y: 0, z: 1 }` (global +Z) for girders.

**Curved longitudinal member:** Use average binormal of endpoint grid points:

```text
v = normalize(B_I + B_J)
orientationVector = v - (v·x_local) x_local  // make perpendicular to local x
```

**Skewed transverse member at pier:** Rotate reference vector about local x by pier `skewAngleRad` if pier-local support coordinates are used.

### 5. Support coordinate systems

| System | Use |
| --- | --- |
| Global | Default DOF flags in project.json |
| Local pier | Skewed pier: map pier-local fixed/pinned to global DOF via pier skew rotation |

### 6. Merge with existing projects

- Liner applies `coordinatePolicy` origin/rotation once at domain level.
- No additional silent transform at frame merge ([integration_with_frame_model.md](integration_with_frame_model.md)).

### 7. Verification

- GC-07 confirms left-normal offset sign at 45° azimuth ([test_plan_geometry.md](test_plan_geometry.md)).
- GC-06 confirms axis-aligned grid on +X alignment.

## Open Questions

- Match bridge wizard y-symmetric cross-section convention exactly?
- Document default azimuth when first segment defined by two points only?

## Related Documents

- [geometry_core.md](geometry_core.md)
- [frame_model_mapping.md](frame_model_mapping.md)
- [intermediate_result_model.md](intermediate_result_model.md)
- [rendering_strategy.md](rendering_strategy.md)
- [numerical_accuracy.md](numerical_accuracy.md)
- [docs/04_input_schema.md](../04_input_schema.md)

## Pre-Implementation Checklist

- [x] Axis and sign conventions documented.
- [x] Local frame formulas defined.
- [x] Member orientation rules defined.
- [ ] Offset sign verified in GC-07 implementation.
- [ ] coordinatePolicy schema field defined in [project_file_format.md](project_file_format.md).
