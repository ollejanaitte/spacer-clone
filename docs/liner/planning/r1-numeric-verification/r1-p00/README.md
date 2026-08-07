# R1-P00 — Verification Foundations Freeze

This directory documents R1-P00: the first implementation unit of the LINER R1 numeric
verification base. R1-P00 freezes the *verification foundations* — provenance
classification, units, rounding/precision, tolerance, coordinate systems and sign
conventions — as typed, validated, fail-closed infrastructure.

## Scope

R1-P00 is **planning foundations + minimal infrastructure only**:

- Reference provenance classification (EXTERNAL_REFERENCE, INDEPENDENT_FORMULA,
  LEGACY_GOLDEN, SELF_REFERENTIAL, INTERPOLATED_PLACEHOLDER, MANUAL_TRANSCRIPTION, UNKNOWN)
- Unit policy (m, mm, degree, radian, percent, permille, station, curvature_radius_m, dxf_unit)
- Rounding / precision policy (internal, comparison, external_reference_tolerance, report,
  ui_display, serialization)
- Tolerance policy + comparison helpers (absolute / relative / exact, fail-closed on
  NaN / Infinity / unit mismatch / coordinate-system mismatch)
- Coordinate systems and sign conventions
- Provenance schema + fail-closed validation
- Verification metadata (golden) schema validation

Out of scope (R1-P01+): JIP golden value bulk load, external golden implementations for
alignment / profile / section / girder / haunch / HOSO / drawing / DXF, self-referential
golden removal, interpolated value replacement, UI / 2D / 3D changes, calculation logic
changes.

## Contents

- `R1_P00_PLAN_REVIEW.md` — confirmed requirements / unresolved / conflicts / assumptions
- `R1_P00_CODE_AUDIT.md` — existing types/helpers/tests and change boundaries
- `R1_P00_IMPLEMENTATION_DESIGN.md` — type design, fail-closed rules, API boundary
- `R1_P00_TEST_REPORT.md` — focused test results
- `R1_P00_SCOPE_AUDIT.md` — changed-files scope audit
- `R1_P00_FINAL_REPORT.md` — final report

## Implementation location

```
frontend/src/liner/core/verification/
├── types.ts                  # classifications, units, policies, coordinate, provenance, metadata
├── units.ts                  # unit conversion + comparability (reuses DxfUnits)
├── rounding.ts               # precision helpers (negative zero, boundary, non-finite)
├── tolerance.ts              # comparison helpers (fail-closed)
├── coordinate.ts             # coordinate system + sign convention validation
├── provenance.ts             # provenance validation + status helpers
├── verificationMetadata.ts   # golden metadata validation
└── index.ts                  # barrel export (re-exported from liner/core)
```

## Design principles

- **Additive only** — existing calculation modules are untouched.
- **Extend, don't duplicate** — reuses `DxfUnits`; the existing `ToleranceConfig`,
  `nearlyEqual`, `evaluateMetric`, `sourceRevisionFor` remain as-is.
- **Fail-closed** — unknown units / coordinate systems / expected-value origins / rounding
  rules are never silently defaulted; explicit `UNKNOWN` / `UNRESOLVED` / `REJECTED`.
- **No behavior change** — no existing golden, fixture, or calculation result is altered.
