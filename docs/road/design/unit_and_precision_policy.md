# Unit and Precision Policy

<!-- DOC-AUTHORITY:START -->
> **Authority:** ACTIVE REFERENCE
> Current implementation facts are governed by [`../../scoping/stage4_road_design_scope.md`](../../scoping/stage4_road_design_scope.md). Target ownership and contracts are governed by [`../../planning/stage6-10/README.md`](../../planning/stage6-10/README.md); `RoadDesignDocument` is the target road source of truth.
<!-- DOC-AUTHORITY:END -->

## Purpose

Define units for storage, computation, UI display, reports, and file export; and rounding/precision rules at each boundary.

## Scope

- Length, angle, grade, curvature units.
- Decimal places for UI fields vs. internal storage.
- Report and CAD coordinate formatting.
- Alignment with project-wide SI policy.

## Out of Scope

- Imperial unit support (unless added at app level later).
- Force/moment units (frame model only).

## Assumptions

- Internal computation in meters and radians.
- UI labels in Japanese via i18n; unit symbols may appear in i18n strings.
- Same unit policy as [docs/frame/contracts/04_input_schema.md](../../frame/contracts/04_input_schema.md) for exported nodes.

## Design Topics

- Length: 3 decimal places in UI (mm precision), full double internally.
- Grade: percent vs. ratio — pick display format; store as dimensionless slope.
- Azimuth: degrees in UI, radians in core (conversion at boundary).
- Station labels: formatted string from numeric value + i18n template.
- No unit conversion in MVP.

## Open Questions

- User-configurable display precision per field type?
- Thousand separators in Japanese locale for station labels?

## Related Documents

- [coordinate_system_policy.md](coordinate_system_policy.md)
- [numerical_accuracy.md](numerical_accuracy.md)
- [report_output_spec.md](../output/report_output_spec.md)
- [docs/frame/contracts/04_input_schema.md](../../frame/contracts/04_input_schema.md)

## Pre-Implementation Checklist

- [ ] Storage vs. display precision table complete.
- [ ] Grade display format decided.
- [ ] Export formatting matches frame model validator expectations.
