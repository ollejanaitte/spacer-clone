# R1_P02_TEST_REPORT

- **Date**: 2026-08-07
- **Phase**: R1-P02-05

## Focused comparison tests

| File | Tests | Result |
|---|---|---|
| `comparison/__tests__/comparator.test.ts` | exact/abs/rel tolerance, zero/negative-zero, NaN/Infinity, unit/coordinate mismatch, unresolved skip, missing actual, missing tolerance, fromReferenceRow, report summary | PASS (19) |
| `comparison/__tests__/horizontal-station.test.ts` | horizontal+station comparison (14 rows: 11 INPUT_PARITY PASS, 3 NOT_COMPARABLE) | PASS (6) |
| `comparison/__tests__/profile-crossfall-height.test.ts` | vertical/crossfall/section-height comparison (14 rows: 11 INPUT_PARITY PASS, 3 NOT_COMPARABLE) | PASS (6) |
| `comparison/__tests__/reporting.test.ts` | consolidated report (28 rows), ledger, coverage matrix | PASS (6) |
| reference-data tests (P01) | schema/validation/datasets | PASS |
| **comparison focused total** | **37** | **PASS** |

## Required checklist

- schema validation — PASS
- CSV parse — PASS
- CSV/JSON parity — PASS
- duplicate reference ID — PASS
- invalid unit rejection — PASS
- invalid coordinate rejection — PASS
- missing provenance rejection — PASS
- unresolved acceptance — PASS
- self-reference golden rejection — PASS
- interpolated placeholder golden rejection — PASS
- manifest hash verification — PASS
- field mapping integrity — PASS
- fixture load test — PASS
- comparison engine tests — PASS
- input parity vs derived separation — PASS (22 parity, 0 derived claimed)
- R1-P00 focused regression — PASS
- related LINER tests — PASS
- typecheck — PASS
- build — PASS
- full test — PASS (330 files, 2588 tests)

## Regression

- `npm run typecheck` — PASS
- `npm run build` — PASS
- `npm test` — 330 files / 2588 tests PASS
- Lint: new comparison source files pass hygiene + Japanese-string checks (repo-wide
  pre-existing lint violations in unrelated Apollo/viewer files remain on baseline; not
  caused by R1-P02).

Note: expected values are NOT generated from runtime. All comparisons use R1-P01 external
references. No tolerance was widened; no reference value altered.
