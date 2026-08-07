# R1_P02_TARGET_CASES

- **Date**: 2026-08-07
- **Phase**: R1-P02

## Cases

| target_case | categories | reference rows | source doc/pages | comparability |
|---|---|---|---|---|
| case-liner-sample-cl | horizontal_alignment, station | 9 (REF-horizontal-001..005, REF-station-001..003) | SRC-LINER-SAMPLE p7 | 6 INPUT_PARITY, 3 DERIVED_OUTPUT |
| case-liner-sample-ecl | horizontal_alignment | 3 (REF-horizontal-006..008) | SRC-LINER-SAMPLE p8 | 3 INPUT_PARITY |
| case-liner-sample-hcl | horizontal_alignment, station, vertical_profile | 9 (REF-horizontal-009..010, REF-station-004, REF-vertical-001..008) | SRC-LINER-SAMPLE p9,10 | 6 INPUT_PARITY, 3 DERIVED_OUTPUT |
| case-liner-sample-hl1 | crossfall, section_height | 2 (REF-crossfall-001, REF-section_height-001) | SRC-LINER-SAMPLE p13 | 1 INPUT_PARITY, 1 DERIVED_OUTPUT |
| case-liner-sample-g1 | crossfall | 1 (REF-crossfall-002) | SRC-LINER-SAMPLE p13 | 1 INPUT_PARITY |
| case-liner-sample-g2 | crossfall | 1 (REF-crossfall-003) | SRC-LINER-SAMPLE p13 | 1 INPUT_PARITY |
| case-liner-sample-hcl (section) | section_height | 1 (REF-section_height-002) | SRC-LINER-SAMPLE p13 | 1 DERIVED_OUTPUT |
| case-liner-sample-hl2 | section_height | 1 (REF-section_height-003) | SRC-LINER-SAMPLE p13 | 1 DERIVED_OUTPUT |

Total target cases: 8. Total reference rows: 28 (18 INPUT_PARITY, 10 DERIVED_OUTPUT).

## Fixture availability audit

The source is a JIP-LINER PDF output (sample calc). The current LINER pipeline
(`frontend/src/liner/core/pipeline/pipeline.ts`) consumes domain drafts
(alignment, stationDefinition, offsets, z, verticalAlignment). To reproduce the same case
the fixture must reconstruct these inputs from the PDF (element definitions, radius,
station interval, grades, crown heights).

- Element length / radius / parameter / station / grade / crossfall / plan-height values
  are available in the dataset (INPUT_PARITY rows) and can be reconstructed as fixture
  inputs with provenance.
- Whether the current pipeline exposes each value at the same point in the computation is
  checked per-row in P02-02/P02-03; if no current output field exists → NOT_COMPARABLE.
- Missing inputs must NOT be zero-filled or guessed; if a case cannot be fully reproduced
  it is recorded as NOT_COMPARABLE/BLOCKED.

## Rule

- Never generate expected from runtime.
- Never back-calculate convenient inputs from expected outputs.
- Input echo (INPUT_PARITY) is not counted as numeric calculation verification.
