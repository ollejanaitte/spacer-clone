# Unit and Precision Policy

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
- Same unit policy as [docs/04_input_schema.md](../04_input_schema.md) for exported nodes.

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
- [report_output_spec.md](report_output_spec.md)
- [docs/04_input_schema.md](../04_input_schema.md)

## Pre-Implementation Checklist

- [ ] Storage vs. display precision table complete.
- [ ] Grade display format decided.
- [ ] Export formatting matches frame model validator expectations.
