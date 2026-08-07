# R1_P02_SCOPE

- **Date**: 2026-08-07
- **Phase**: R1-P02 — external golden comparison base (horizontal alignment, station,
  vertical profile, crossfall, section height)
- **Base**: `research/liner-r1-planning`

## 1. Purpose

Build the external golden comparison infrastructure so current LINER calculation results
can be automatically compared against the authoritative reference values frozen in R1-P01,
with unit / coordinate system / tolerance / provenance intact.

Principle: judge match/mismatch correctly; never modify expected values, tolerance,
rounding, or calculation results to hide a mismatch.

## 2. Target categories (P02 only)

- horizontal_alignment
- station
- vertical_profile
- crossfall
- section_height

Out of scope (P03+): span, girder_point, girder_panel_length, girder_span_length, ldist,
transverse_spacing, overhang, haunch, hoso, drawing_coordinate, dxf_coordinate.

## 3. Reference dataset (P01 handoff)

- TOTAL rows: 67
- P02 subset (ALIGNMENT_PROFILE_ROWS): 28
  - horizontal_alignment: 10
  - station: 4
  - vertical_profile: 8
  - crossfall: 3
  - section_height: 3
- UNRESOLVED: 2 (drawing_coordinate, dxf_coordinate) — NOT in P02 scope.

## 4. PR #450 count notation reconciliation

- PR #450 body states "27 rows".
- Real code `ALIGNMENT_PROFILE_ROWS.length` = 28.
- Real aggregate `REFERENCE_DATASET_ROWS` includes 28 alignment/profile rows.
- R1_P01_FINAL_REPORT lists horizontal_alignment 10, station 4, vertical_profile 8,
  crossfall 3, section_height 3 = 28.
- **Conclusion**: PR #450 "27" is a stale doc notation. The authoritative count is **28**.
  No data was added or removed to change the count; the code has always had 28 rows in
  this subset.

## 5. Comparability kinds (see R1_P02_COMPARABILITY_MATRIX.csv)

- INPUT_PARITY — value is an input/definition (radius, element length, parameter, station
  definition, grade definition, crossfall definition). Verifies input/import/serialization
  parity, NOT numeric calculation.
- DERIVED_OUTPUT — value is computed by the current LINER core from inputs. Primary numeric
  verification target.
- REPORT_OUTPUT — value transformed from internal result into report format.
- NOT_COMPARABLE — required input fixture or current output field absent.
- UNRESOLVED — excluded (drawing/dxf).

Input parity must never be counted as "numeric calculation verified".

## 6. Comparison Engine contract

- Reuses R1-P00/P01 `ReferenceValueRow`, `TolerancePolicy`, `R1Unit`, `R1CoordinateSystem`.
- Input: reference row + actual value + actual unit + actual coordinate system + policy.
- Result statuses: PASS, FAIL, SKIP_UNRESOLVED, NOT_COMPARABLE, CONTRACT_ERROR,
  UNIT_MISMATCH, COORDINATE_MISMATCH, ACTUAL_MISSING.
- tolerance = the row's `comparison_tolerance` (never widened to force PASS).
- unit conversion: explicit only (mm<->m, degree<->radian, percent<->permille) per policy.
- coordinate system mismatch → COORDINATE_MISMATCH (never auto-PASS).

## 7. Mismatch rules

On mismatch, classify: REFERENCE_ERROR, TRANSCRIPTION_ERROR, MAPPING_ERROR,
FIXTURE_INPUT_ERROR, UNIT_ERROR, COORDINATE_ERROR, ROUNDING_ERROR,
TOLERANCE_POLICY_ERROR, IMPLEMENTATION_BUG, UNSUPPORTED_CASE, UNKNOWN.

- Reference error: correct only with source evidence, via dedicated repair PR.
- Implementation bug: minimal repair PR allowed only for the 5 P02 categories with
  independent external evidence + before/after test.
- Unknown cause → report honestly; never fake PASS. OVERALL_VERDICT = PARTIAL or FAIL.

## 8. PR plan

| Step | Branch | Content |
|---|---|---|
| P02-00 | research/liner-r1-p02-00-freeze | scope + comparability freeze (docs only) |
| P02-01 | research/liner-r1-p02-01-comparator | comparison engine |
| P02-02 | research/liner-r1-p02-02-horizontal-station | horizontal + station external compare |
| P02-03 | research/liner-r1-p02-03-profile-crossfall-height | vertical + crossfall + section height compare |
| P02-04 | research/liner-r1-p02-04-reporting | report + discrepancy ledger |
| P02-04R | research/liner-r1-p02-fix-* | repair PR(s) only if needed |
| P02-05 | research/liner-r1-p02-05-integration | integration + final report |

All PR bases = `research/liner-r1-planning`.

## 9. Completion definition

- P02-00..P02-05 merged in order to `research/liner-r1-planning`.
- 28-row subset reconciled.
- comparison engine complete.
- input parity / derived output classified.
- horizontal/station comparison executed.
- vertical/crossfall/section-height comparison executed.
- discrepancy ledger complete.
- derived output results not hidden.
- focused tests PASS, typecheck PASS, build PASS.
- upper/Apollo/main unchanged.
- R1-P03 not started.
