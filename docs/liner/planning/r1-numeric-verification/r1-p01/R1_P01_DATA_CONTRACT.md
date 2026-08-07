# R1_P01_DATA_CONTRACT

- **Date**: 2026-08-07
- **Phase**: R1-P01
- **Base types**: R1-P00 `frontend/src/liner/core/verification/types.ts`

## 1. Row schema (per reference value)

Each dataset row must provide:

| Field | Type | Required | Source |
|---|---|---|---|
| reference_id | string | yes | R1-P01 dataset |
| case_id | string | yes | R1-P01 dataset |
| category | string | yes | R1-P01 target categories |
| value_name | string | yes | R1-P01 dataset |
| source_document | string | yes | SRC-* id |
| source_page | string | yes | PDF page |
| source_section | string | no | section name |
| source_table | string | no | table name |
| source_row | string | no | row key |
| source_column | string | no | column key |
| source_value | number | yes | transcribed value |
| source_unit | R1Unit | yes | P00 unit |
| normalized_value | number | yes | value normalized to normalized_unit |
| normalized_unit | R1Unit | yes | P00 unit |
| coordinate_system | R1CoordinateSystem | yes | P00 coord |
| sign_convention | string | no | e.g. right_positive |
| rounding_rule | string | no | e.g. report_rounding |
| display_precision | number | no | decimal places |
| comparison_tolerance | TolerancePolicy | yes | P00 tolerance |
| extraction_method | string | yes | TABLE_EXTRACTION/TEXT_EXTRACTION/MANUAL_TRANSCRIPTION/INDEPENDENT_FORMULA |
| expected_value_class | ReferenceSourceClassification | yes | P00 classification |
| review_status | R1P01ReviewStatus | yes | UNREVIEWED/TRANSCRIBED/CROSS_CHECKED/APPROVED/REJECTED/UNRESOLVED |
| confidence | R1Confidence | yes | HIGH/MEDIUM/LOW/UNKNOWN |
| notes | string | no | free text |

## 2. Review status (R1-P01)

| Status | Golden-usable? |
|---|---|
| UNREVIEWED | no |
| TRANSCRIBED | no |
| CROSS_CHECKED | yes |
| APPROVED | yes |
| REJECTED | no |
| UNRESOLVED | no |

## 3. Confidence

| Confidence | Meaning |
|---|---|
| HIGH | multi-source cross-checked |
| MEDIUM | single authoritative source, clear table |
| LOW | OCR / weak extraction |
| UNKNOWN | unverifiable |

## 4. ID rules

- `reference_id`: `REF-{category}-{nnn}` unique within dataset.
- `case_id`: `CASE-{source}-{docname}` consistent per source case.
- No duplicate reference_id.

## 5. Normalization

- Lengths normalized to `m` (normalized_unit=m) or kept in source mm with
  normalized_unit=mm where the source unit is mm (unit group consistency required).
- Grades normalized to `percent`.
- Angles normalized to `degree` or `radian` (consistent per field).
- negative zero normalized to 0.

## 6. Fail-closed

Golden adoption rejected if: page/unit/coordinate/sign/rounding/tolerance unknown, or
transcription doubt, or OCR unverified, or self-referential, or interpolated.

## 7. File placement

```
frontend/src/liner/core/verification/reference-data/
├── reference-dataset.schema.ts   (or JSON schema; TS preferred for reuse of P00 types)
├── reference-dataset.v1.ts       (dataset entries; or .json + loader)
├── reference-dataset.v1.csv      (export for review)
├── provenance-index.csv          (source -> page/table index)
├── field-mapping.csv             (source field -> normalized field)
├── unresolved-values.csv         (values excluded by fail-closed)
└── dataset-manifest.json         (hash + counts)
```

## 8. Manifest

`dataset-manifest.json`:
```json
{
  "dataset_version": "v1",
  "generated_at": "2026-08-07",
  "total_rows": N,
  "approved_rows": N,
  "cross_checked_rows": N,
  "unresolved_rows": N,
  "categories": [...],
  "csv_sha256": "...",
  "json_sha256": "...",
  "parity": true
}
```
