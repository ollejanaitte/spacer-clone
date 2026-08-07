# R1_P01_TEST_REPORT

- **Date**: 2026-08-07
- **Phase**: R1-P01

## Focused reference-data tests

| File | Tests | Result |
|---|---|---|
| `reference-data/__tests__/validation.test.ts` | schema guards + row validation + dataset validation + golden helpers | PASS |
| `reference-data/__tests__/manifest.test.ts` | canonical json, csv quoting, manifest hashes/counts | PASS |
| `reference-data/__tests__/dataset-alignment-profile.test.ts` | P01-02 dataset integrity | PASS |
| `reference-data/__tests__/dataset-bridge-geometry.test.ts` | P01-03 dataset integrity | PASS |
| `reference-data/__tests__/dataset-haunch-hoso-drawing.test.ts` | P01-04 dataset integrity + unresolved | PASS |
| `reference-data/__tests__/integration.test.ts` | full-dataset validation, manifest hash, csv/json parity, field mapping, provenance index, unresolved separation, category coverage | PASS |

**Total: 53 focused tests — ALL PASS.**

## Required checklist

- schema validation — PASS
- CSV parse — PASS
- JSON parse — PASS
- CSV/JSON parity — PASS (header + N rows == dataset length)
- duplicate reference ID — PASS (detected/rejected)
- invalid unit rejection — PASS
- invalid coordinate rejection — PASS
- missing provenance rejection — PASS
- unresolved acceptance — PASS
- self-reference golden rejection — PASS
- interpolated placeholder golden rejection — PASS
- manifest hash verification — PASS (deterministic sha256)
- field mapping integrity — PASS (all dataset source_documents mapped)
- fixture load test — PASS (loadReferenceDataset)
- focused R1-P00 regression — PASS (verification module tests)
- related LINER tests — PASS
- typecheck — PASS
- build — PASS
- full test — PASS (326 files, 2551 tests)

## Regression

- `npm run typecheck` — PASS
- `npm run build` — PASS
- `npm test` — 326 files / 2551 tests PASS
- R1-P00 verification tests — PASS (unchanged)

Note: expected values are NOT generated from runtime; all are transcribed from external
documents with provenance.
