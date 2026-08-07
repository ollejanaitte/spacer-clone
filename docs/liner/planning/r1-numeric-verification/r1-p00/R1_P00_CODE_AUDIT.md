# R1_P00_CODE_AUDIT

- **Date**: 2026-08-07
- **Host**: frontend TypeScript codebase (`frontend/src`)
- **Method**: read-only grep / file inspection of existing types, helpers, tests.

## EXISTING_TYPES

| Concern | Existing symbol | Location |
|---|---|---|
| tolerance config | `ToleranceConfig` (`length`, `coordinate`, `clothoidCoordinate`, `azimuth`, `elevation`, `station`, `offset`) | `liner/core/types.ts` |
| default tolerances | `DEFAULT_TOLERANCES`, `AZIMUTH_TOLERANCE_RAD` | `liner/core/tolerances.ts` |
| equality helper | `nearlyEqual` | `liner/core/tolerances.ts` |
| importer tolerance | `IMPORTER_TOLERANCE_*`, `withinTolerance` | `liner/importer/diagnostics/tolerances.ts` |
| DXF units | `DxfUnits = "unitless" \| "millimeters" \| "meters"` | `liner/dxf/model/units.ts` |
| coordinate marker | `CoordinateSystemMarker` (`id`, `handedness: "right"`, `lengthUnit: "m"`, `angleUnit: "rad"`) | `liner/core/types.ts` |
| handedness | `Handedness`, `CoordinateContext` (left/right) | `contracts/coordinateContext.ts` |
| diagnostics | `ValidationIssue`, `createIssue`, `LINER_DIAGNOSTIC_CODES` | `liner/core/diagnostics.ts` |
| source revision | `canonicalJson`, `sourceRevisionFor` (sha256) | `liner/core/pipeline/sourceRevision.ts` |
| computation provenance | `{ alignmentId, elementId, sourceRevision }` on nodes/members | `liner/core/grid/gridGeneration.ts`, `liner/core/pipeline/pipeline.ts` |
| station format | `formatStationNoPlus`, `parseStationNoPlus`, `NoInterval` | `liner/core/station/stationFormat.ts` |
| verification metadata | `VerificationMetadata`, `tolerance: { relative, absolute }`, `theoryFormulas` | `verification/verificationReport.ts` |
| spacer comparison | `compareDisplacements/compareReactions`, `{ relative, absolute }` | `verification/spacerReference.ts` |

## EXISTING_HELPERS

- `nearlyEqual(actual, expected, tolerance)` — absolute tolerance only.
- `withinTolerance(left, right, tolerance)` — importer diagnostics.
- `evaluateMetric(expected, actual, {relative, absolute})` — report metric evaluation with
  combined relative/absolute rule.
- `compareDisplacements` / `compareReactions` — combined relative/absolute.
- `sourceRevisionFor(value)` — sha256 over canonical JSON.
- `isDxfUnits`, `dxfMeasurementForUnits`, `textHeightModelUnits` — DXF unit helpers.

## EXISTING_TESTS

- `verification/spacerReference.test.ts`, `verification/verificationReport.test.ts`,
  `verification/verificationRegression.test.ts` (20 tests, pass).
- `liner/core/__tests__/goldenFixture.test.ts`, `horizontalCurveGolden.test.ts`,
  `crossSectionGolden.test.ts`, `verticalGolden.test.ts` — analytic/golden regressions.
- `liner/core/station/__tests__/stationFormat.test.ts`.

## DUPLICATION_RISK

- DXF units already exist (`DxfUnits`); a general R1 unit type must *reference/reuse* or
  clearly map to it rather than redefining a conflicting `dxf_unit` concept.
- Combined relative/absolute tolerance semantics already exist in two places
  (`evaluateMetric`, `compareDisplacements`). R1-P00 tolerance policy must be the single
  definition, and existing consumers must be left unchanged (additive only) to avoid
  behavior change.
- `CoordinateSystemMarker` exists but is hardcoded (right-handed, m, rad). R1-P00
  coordinate policy must extend this into a typed enumeration without altering existing
  use sites.

## SOURCE_OF_TRUTH_CANDIDATE

- **Primary**: `frontend/src/liner/core/` (types, tolerances, diagnostics, pipeline
  provenance, station). New R1 verification foundation belongs here as
  `frontend/src/liner/core/verification/`.
- **Secondary reuse**: `liner/dxf/model/units.ts` (`DxfUnits`) and
  `contracts/coordinateContext.ts` (`Handedness`).
- **Companion**: `verification/verificationReport.ts` (metric evaluation) remains as the
  report-layer consumer; R1-P00 does not rewrite it.

## MINIMAL_CHANGE_FILES

New files (no behavior change to existing code):
1. `frontend/src/liner/core/verification/types.ts` — R1 verification foundation types
   (provenance classification, units, rounding policy, tolerance policy, coordinate
   systems, sign conventions, provenance, fail-closed states).
2. `frontend/src/liner/core/verification/units.ts` — unit validation/parse helpers.
3. `frontend/src/liner/core/verification/rounding.ts` — rounding policy type + helpers.
4. `frontend/src/liner/core/verification/tolerance.ts` — tolerance policy + comparison
   helpers (absolute/relative/exact, NaN/Infinity rejection, unit/coordinate mismatch
   rejection).
5. `frontend/src/liner/core/verification/coordinate.ts` — coordinate system + sign
   convention validation.
6. `frontend/src/liner/core/verification/provenance.ts` — provenance schema + fail-closed
   validation.
7. `frontend/src/liner/core/verification/verificationMetadata.ts` — verification metadata
   / golden schema (id, feature, source, reference, input_hash, tolerance, classification,
   provenance).
8. `frontend/src/liner/core/verification/index.ts` — barrel export.
9. Edit `frontend/src/liner/core/index.ts` — add `export * from "./verification";`
   (additive).
10. Tests under `frontend/src/liner/core/verification/__tests__/`.

## FORBIDDEN_FILES

- `frontend/src/apollo/**`, `docs/apollo/**` — Apollo / upper-structure.
- `frontend/src/liner/core/geometry/*`, `pipeline/*`, `haunch/*`, `hoso/*`, `ldist/*`,
  `station/*` (except reading), `grid/*`, `width/*`, `zMerge.ts`, `crossSection*`,
  `vertical*` — calculation modules (must not be modified).
- `frontend/package.json`, `frontend/package-lock.json`, start scripts, lock files.
- `frontend/src/liner/dxf/**` (reuse `DxfUnits` by import; do not edit).
- `docs/liner/planning/**` other than the `r1-p00/` subfolder (do not edit published
  planning docs except BRANCH_STATUS.md as permitted).
