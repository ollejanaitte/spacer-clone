# X4C Test Report (P06: Project Replay / Regression)

Phase: X4-C Cross Section Generator — step P06 verification.
Branch evidence: `research/liner-x4c-p06-verification` (as PR). Remote base: `research/liner-r1-planning`.

## Scope
Project Replay + Regression for the canonical Cross Section pipeline (P01-P05)
over the X4-B Alignment Solver and the X4-A Geometry Kernel.

## Results

| suite | result | count | evidence |
|-------|--------|-------|----------|
| backend full suite | **PASS** | 895 passed | `backend/tests/` |
| X4-A Geometry Kernel | **PASS** | 37 passed | `test_geometry_kernel_*.py` |
| X4-B Alignment Solver | **PASS** | 61 passed | `test_alignment_*.py` |
| X3 Rule Engine | **PASS** | 35 passed | `test_rule_engine_*.py` |
| Cross Section focused (P06) | **PASS** | 11 passed | `test_crosssection_p06_focused.py` |
| Cross Section project replay (P06) | **PASS** | 7 passed | `test_crosssection_p06_replay.py` |
| Cross Section package | **PASS** | 89 passed | `test_crosssection_*.py` |

## Focused pipeline coverage (test_crosssection_p06_focused.py)
- flat section / symmetric / asymmetric width / opposite left-right crossfall
- multiple segments / pivot (custom offset) / invalid input (non-finite station)
- out-of-range station / deterministic repeat / left-right edge XYZ / global center XYZ

## Project Replay (test_crosssection_p06_replay.py)
Real project data from the built-in sample PDF (`Hランプ4号橋`, frontend
`builtInSampleDataset.ts`) is exercised through the canonical backend pipeline.

Locked comparable evidence:
- centerline length 164.2476 m (HCL, PDF cumulative distance)
- centerline XY at PDF stations (0, 0.5897, 0.6399, 8.3121, 16.2403, 24.1779, 32.1547)
- center design elevation per PDF cross section (17.6595 … 17.3800) retained via the
  explicit-input contract (elevation producer DEFERRED)

NOT_COMPARABLE / DEFERRED (no fabrication; documented in `X4C_DISCREPANCY_LEDGER.csv`):
- road width / lane / shoulder widths — UE-004（標準横断図 OCR不能）
- per-station cross gradient — UE-003（縦断・横断は線形計算書に記載なし）
- widening / curve-length / building-clearance design rules — unresolved rule library (out of X4-C scope)

## Discrepancy summary
`X4C_DISCREPANCY_LEDGER.csv`
- PASS: 13
- NOT_COMPARABLE: 1 (XL-010 road width)
- DEFERRED: 4 (XL-011 gradient / XL-012..014 design rules)
- **BLOCKING: 0**

## Conclusion
P06 verification PASS. No BLOCKING discrepancies. Ready for X4-D gate (P07).
