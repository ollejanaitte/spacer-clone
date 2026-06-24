# Profile Rules

## Purpose

Define vertical alignment (profile) geometry rules, cross-section height handling, and the derivation of Z coordinates for grid points and cross-section views. Each Z component has explicit provenance stored in intermediate results.

## Scope

- Vertical segment types and continuity.
- Elevation at station, grade, and vertical curve parameters.
- Cross-section template vertical offsets (road surface, structural reference).
- Combination of profile Z with horizontal grid (XY).
- Provenance fields for audit and frame generation.

## Out of Scope

- Superelevation rotation (post-MVP; crossfall offset = 0 until then).
- Hydrology or drainage design.
- Earthwork volume calculations.

## Assumptions

- Profile shares the horizontal alignment **physical distance** axis ([station_rules.md](station_rules.md)).
- Elevations in meters relative to project datum defined in [coordinate_system_policy.md](coordinate_system_policy.md).
- Profile segments cover contiguous physical-distance ranges within alignment length.

## Design Topics

### 1. Vertical component split

Responsibilities are split to avoid ambiguous Z derivation:

| Layer | Symbol | Description | Computed by |
| --- | --- | --- | --- |
| Profile elevation | Z_profile(d) | Vertical alignment on profile axis | Vertical geometry module |
| Crossfall / superelevation | ΔZ_cross(d, offset) | Transverse slope of road surface | Cross-section module (0 in MVP) |
| Structural reference | ΔZ_struct(d, offset) | Beam/girder reference vs profile axis | Cross-section template |
| Section depth | ΔZ_depth(d, offset) | Slab/haunch depth below reference | Cross-section template |
| Girder eccentricity | ΔZ_ecc(d, offset) | Centroid vs reference line | Cross-section template |
| **Node Z** | Z_node | Sum of components | Grid combiner |

```text
Z_node(d, offset) = Z_profile(d) + ΔZ_cross + ΔZ_struct + ΔZ_depth + ΔZ_ecc
```

Stored in `GridPointResult.zProvenance` ([intermediate_result_model.md](intermediate_result_model.md)).

### 2. Vertical segment types (MVP)

| Type | Formula |
| --- | --- |
| Grade segment | Z(d) = Z₀ + g·(d − d₀) |
| Parabolic curve | Z(d) = Z_PVC + g_in·s + (g_out − g_in)·s²/(2L), s = d − d_PVC |

Golden values: GC-05 in [test_plan_geometry.md](test_plan_geometry.md).

### 3. Continuity

| Joint | Required |
| --- | --- |
| Elevation | Continuous at segment boundaries |
| Grade | Continuous for parabolic joins; breaks allowed at grade segment boundaries |
| Overlap | Error if vertical segment ranges overlap |

### 4. Cross-section and structural reference

Cross-section template defines:

- Transverse offset positions (girder lines, edges).
- `structuralReferenceOffset` — vertical offset from profile axis to structural datum at each offset.
- `sectionDepthOffset` — depth to bottom flange or similar.
- `girderEccentricity` — node vs centroid offset for analysis.

MVP may use zero for all non-profile components on flat decks; provenance fields still populated for audit.

### 5. Profile view data source

Profile renderer reads `vertical.sampledPoints` (profile elevation only). Combined node Z is not used for profile view axis — only Z_profile.

### 6. Validation limits

| Parameter | Soft limit | Hard limit |
| --- | --- | --- |
| Grade | ±8% | ±12% |
| Parabolic length | ≥ 20 m for 2% grade change | ≥ 10 m |

Errors: `LINER_PROFILE_GRADE_EXCEEDS_LIMIT`, `LINER_PROFILE_OVERLAP`.

## Open Questions

- Independent vertical alignment start distance vs. locked to horizontal origin?
- Multiple profile lines (left edge vs. centerline) in MVP?

## Related Documents

- [geometry_core.md](geometry_core.md)
- [domain_model.md](domain_model.md)
- [intermediate_result_model.md](intermediate_result_model.md)
- [rendering_strategy.md](rendering_strategy.md)
- [test_plan_geometry.md](test_plan_geometry.md)

## Pre-Implementation Checklist

- [x] Vertical segment MVP types listed.
- [x] Continuity rules at segment joints defined.
- [x] Z derivation formula and provenance documented.
- [ ] Validation limits implemented.
