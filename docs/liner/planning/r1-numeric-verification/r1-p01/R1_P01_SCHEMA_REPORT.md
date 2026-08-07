# R1_P01_SCHEMA_REPORT

- **Date**: 2026-08-07
- **Phase**: R1-P01-01 (schema / manifest / validation)

## Schema implemented

`frontend/src/liner/core/verification/reference-data/`

| File | Purpose |
|---|---|
| `types.ts` | ReferenceValueRow, ReferenceDataset, DatasetManifest, UnresolvedValueRow, FieldMappingRow, categories, review status, confidence, extraction method |
| `validation.ts` | guards + `validateReferenceRow` + `validateDataset` + golden-usable / self-referential / interpolated helpers |
| `manifest.ts` | `canonicalDatasetJson`, `sha256Of`, `sha256OfCsv`, `buildManifest`, `rowsToCsv` |
| `index.ts` | barrel export (re-exported from `verification/index.ts`) |

## Validation rules

- category / review_status / confidence / extraction_method are closed literal unions
- source_document & source_page required (fail-closed)
- source_unit / normalized_unit must be R1-P00 units
- coordinate_system must be R1-P00 coordinate system
- source_value / normalized_value must be finite (NaN/Infinity rejected)
- comparison_tolerance must be finite, non-negative, and define absolute/relative/exact
- expected_value_class must be R1-P00 classification
- duplicate reference_id detection
- self-referential / interpolated-placeholder entries rejected as golden

## Review status (R1-P01)

UNREVIEWED / TRANSCRIBED / CROSS_CHECKED / APPROVED / REJECTED / UNRESOLVED
Golden-usable: CROSS_CHECKED, APPROVED.

## Tests

25 focused tests in `__tests__/` — PASS.

## Manifest

- `buildManifest` computes total/approved/cross_checked/unresolved counts, categories,
  csv_sha256, json_sha256, parity flag.
- `rowsToCsv` produces deterministic CSV with quoting.
