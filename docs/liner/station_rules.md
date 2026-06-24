# Station Rules

## Purpose

Define chainage (station) conventions, equations, and query semantics used across the geometry core, intermediate results, and UI. Numeric station values are stored in core results; formatted labels are generated at UI/report boundaries only.

## Scope

- Station origin and increasing direction.
- Physical distance vs. displayed chainage — formal bidirectional mapping.
- Station equations (discontinuities) and duplicate disambiguation.
- Forward and inverse station queries.
- Sorting and indexing rules for station tables.

## Out of Scope

- Vertical profile station (uses same chainage axis — see [profile_rules.md](profile_rules.md)).
- FEM node labeling.
- Formatted station label strings in intermediate results ([unit_and_precision_policy.md](unit_and_precision_policy.md)).
- Milepost road standards beyond project needs.

## Assumptions

- Station increases in the direction of alignment traversal unless reversed by user setting.
- Station equations are explicit domain entities, not implicit gaps.
- Internal storage uses numeric meters (floating point); display uses i18n templates at UI/export boundary.
- **Physical distance** is the authoritative parameterization for geometry; **displayed station** is a derived label for engineering chainage.

## Design Topics

### 1. Formal mapping

Let `d` = physical distance from alignment origin (m), monotonic along resolved geometry.

**Forward (displayed station from physical distance):**

```text
displayedStation(d) = originDisplayed + ∫₀ᵈ w(s) ds + Σ equationAdjustments(d)
```

where `w(s) = +1` for forward-increasing alignment, `−1` for backward, and `equationAdjustments` applies station equation jumps at their `physicalDistance` (sorted by `sortIndex`).

**Inverse (physical distance from displayed station):**

```text
physicalDistance(s_disp, context) = g(s_disp, activeEquationInterval)
```

Requires equation interval context when duplicate `displayedStation` values exist. API accepts optional `entryId` or `sortIndex` to disambiguate.

### 2. Station equation types

| Type | Effect at physical distance d_eq |
| --- | --- |
| `add_constant` | displayedStation += Δ after d_eq |
| `reset_to_value` | displayedStation = target value at d_eq |
| `reverse` | increasing direction of displayed chainage inverts (rare; post-MVP if needed) |

Equations stored in domain with stable `id`; resolved into [intermediate_result_model.md](intermediate_result_model.md) `StationTableEntry` rows.

### 3. Duplicate displayed stations

When equations produce equal displayed values:

1. Each row has unique `entryId` and monotonic `sortIndex`.
2. Lookup by displayed station without context returns the row whose **physical-distance interval** contains the query point.
3. At exact equation boundary (physical distance equals `d_eq`), the row with **lower** `sortIndex` applies.
4. UI lists duplicates with `sortIndex` or equation note; APIs accept `entryId` for unambiguous selection.

### 4. Origin and direction

- Default `originDisplayedStation = 0`.
- Default `increasingDirection = "forward"` (displayed station increases with physical distance).
- Backward alignment (decreasing displayed chainage with forward travel): post-MVP; document in domain if enabled.

### 5. Segment boundary behavior

When a station equation falls on a horizontal segment boundary:

- Equation applies at the boundary physical distance.
- Geometry sampling uses physical distance; displayed station jump does not affect XY geometry.

### 6. Label formatting (UI/report only)

Formatted labels (e.g., `0+010.000`) are **not** stored in `LinerIntermediateResult`. Generated at render/export using:

- `displayedStation` numeric value
- Project formatting settings
- i18n template keys

See [unit_and_precision_policy.md](unit_and_precision_policy.md).

### 7. Golden tests

GC-04 in [test_plan_geometry.md](test_plan_geometry.md) validates forward/inverse mapping and duplicate disambiguation.

## Open Questions

- Support backward alignment (decreasing chainage) in MVP?
- Maximum number of station equations per project?

## Related Documents

- [geometry_core.md](geometry_core.md)
- [intermediate_result_model.md](intermediate_result_model.md)
- [coordinate_system_policy.md](coordinate_system_policy.md)
- [unit_and_precision_policy.md](unit_and_precision_policy.md)
- [test_plan_geometry.md](test_plan_geometry.md)
- [validation_rules.md](validation_rules.md)

## Pre-Implementation Checklist

- [x] Origin and direction defaults documented.
- [x] Equation types enumerated with formal mapping.
- [x] Duplicate disambiguation rules defined.
- [x] Display format separated from numeric core.
- [ ] Golden test GC-04 implemented.
