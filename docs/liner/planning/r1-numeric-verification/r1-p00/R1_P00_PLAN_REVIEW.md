# R1_P00_PLAN_REVIEW

- **Date**: 2026-08-07
- **Phase**: R1-P00 (verification foundations freeze)
- **Planning sources reviewed**:
  - `README.md`, `BRANCH_STATUS.md`, `R1_PLAN.md`, `R1_DESIGN.md`, `R1_TEST_PLAN.md`,
    `R1_ACCEPTANCE_CRITERIA.md`, `R1_VERIFICATION_STRATEGY.md`, `R1_BOUNDARY_REPORT.md`,
    `B3_NON_MODIFICATION_AUDIT.md`, `COPY_MANIFEST.csv`, `matrices/*`

## CONFIRMED_REQUIREMENTS

1. **Reference provenance classification** must be machine-readable. Required classifications:
   `EXTERNAL_REFERENCE`, `INDEPENDENT_FORMULA`, `LEGACY_GOLDEN`, `SELF_REFERENTIAL`,
   `INTERPOLATED_PLACEHOLDER`, `MANUAL_TRANSCRIPTION`, `UNKNOWN`.
2. **Unit policy** must cover at minimum: `m`, `mm`, `degree`, `radian`, `percent`,
   `permille`, `station`, `curvature_radius_m`, `dxf_unit`.
3. **Rounding / precision** must separate:
   `internal_precision`, `comparison_precision`, `external_reference_tolerance`,
   `report_rounding`, `ui_display_rounding`, `serialization_precision`.
4. **Coordinate systems** must be typed and documentable:
   `GLOBAL_XY`, `ALIGNMENT_TANGENT_NORMAL`, `BRIDGE_LOCAL`, `GIRDER_LOCAL`, `VERTICAL_DATUM`.
   Sign conventions: left/right offset, clockwise/counterclockwise, crossfall sign,
   skew sign, station direction, vertical positive direction.
5. **Provenance** fields required: `source_document`, `source_page`, `source_section`,
   `source_table`, `source_row`, `source_column`, `source_value`, `source_unit`,
   `extraction_method`, `review_status`.
6. **Fail-closed**: unknown unit / coordinate system / expected-value origin / rounding rule
   must not be silently defaulted. Explicit states: `UNKNOWN`, `UNRESOLVED`, `REJECTED`.
7. **Scope**: planning-only freeze. No JIP golden values bulk-loaded, no external golden
   implementations for alignment/profile/section/girder/haunch/HOSO/drawing/DXF, no
   self-referential golden removal, no interpolated value replacement, no UI/2D/3D change,
   no calculation logic change.

## UNRESOLVED_REQUIREMENTS

- Default numeric values for the six rounding fields and per-quantity external tolerance
  were suggested in R1_DESIGN (coordinate/length 1e-6 m, angle 1e-9 rad, ratio 1e-9) but
  not formally frozen by an approving authority. R1-P00 will encode the *structure* and
  the proposed defaults as constants, flagged as "proposed defaults subject to review".
- The authoritative reference set (which JIP pages/tables map to which fixture) is not yet
  settled; that is R1-P01 work. R1-P00 only freezes the provenance *schema*.

## CONFLICTS

- None between planning docs and R1-P00 scope. R1_DESIGN proposed golden schema
  (`source: LAYER2_EXTERNAL | LAYER1_ANALYTIC | DERIVED`) uses a *layer* notion while
  R1-P00 requires a *classification* notion (`EXTERNAL_REFERENCE`, ...). These are
  complementary: R1-P00 classifies the *origin of expectation values*; the R1_DESIGN
  layer describes the *verification pass*. R1-P00 will expose the classification and note
  the mapping (EXTERNAL_REFERENCE ≈ LAYER2_EXTERNAL, INDEPENDENT_FORMULA ≈ LAYER1_ANALYTIC)
  in code documentation.

## ASSUMPTIONS

- Implementation host is the frontend TypeScript codebase under `frontend/src/liner/core/`.
- Existing `ToleranceConfig`, `nearlyEqual`, `DEFAULT_TOLERANCES`, `sourceRevisionFor`,
  `CoordinateSystemMarker`, and `VerificationMetadata` are the existing source-of-truth
  candidates. R1-P00 should extend them (not create a duplicate foundation) where
  backward-compatible, and add new types where no equivalent exists.
- New source files must not contain Japanese characters (repo hygiene policy).
- No new runtime dependencies; no package.json / lock file changes.

## IMPLEMENTATION_BOUNDARY

- New files: under `frontend/src/liner/core/verification/` (types, enums, validation,
  comparison helper, fail-closed guard) plus focused tests under its `__tests__/`.
- Extensions (additive only): re-export from `frontend/src/liner/core/index.ts`.
- No modification of existing calculation modules (`geometry/*`, `pipeline/*`,
  `haunch/*`, `hoso/*`, `ldist/*`, `station/*`, `grid/*`, `width/*`, `zMerge.ts`,
  `crossSection*`, `vertical*`).

## PROHIBITED_SCOPE

- No JIP golden values injected as fixtures.
- No external golden implementations for alignment/profile/section/girder/haunch/HOSO/
  drawing/DXF.
- No removal of self-referential goldens; no replacement of interpolated values.
- No UI / 2D / 3D / drawing changes.
- No change to existing calculation results.
- No package dependency changes, lock files, or start scripts.
- No curved bridge / girder arc / width widening / pier-9 methods / unsupported haunch.
- No Apollo / upper-structure / frontend-apollo changes.
