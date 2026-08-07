# Input Golden Schema

> **Authority:** STEP 10 Reference Bridge 001 (RB-S10-001) — Phase 3
> **Companion:** `input_golden_promotion_contract.md`, `input_golden_enums.csv`

## 1. File Format

- UTF-8, LF line endings, no BOM
- CSV with header row; quoted fields when value contains commas or `"`
- JSON array of objects (same structure as CSV)
- One record per row (CSV) or element (JSON)

## 2. Golden Record Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `golden_id` | string | yes | Unique identifier: `GIN-XXXX` |
| `field_path` | string | yes | Canonical field path (from candidate) |
| `entity_id` | string | yes | Structural entity identifier |
| `raw_value` | string | yes | Source text value as originally extracted |
| `raw_unit` | string | yes* | Source unit or empty |
| `normalized_value` | string | yes* | SI-normalized value |
| `normalized_unit` | string | yes* | SI-normalized unit |
| `semantic_class` | string | yes | Semantic class from candidate |
| `source_record_ids` | string | yes | Comma-separated Phase 2-I source record IDs |
| `candidate_ids` | string | yes | Comma-separated Phase 2-II candidate IDs |
| `calculation_locator` | string | yes* | `calc_pdf_p{page}` or empty |
| `drawing_locator` | string | yes* | `DWG-S{sheet}` or empty |
| `source_priority` | string | yes | `BOTH` / `CALCULATION` / `DRAWING` / `UNKNOWN` |
| `confidence` | string | yes | `HIGH` / `MEDIUM` / `LOW` / `UNKNOWN` |
| `verification_status` | string | yes | From candidate |
| `promotion_status` | string | yes | From promotion contract |
| `promotion_reason` | string | yes | Justification for promotion decision |
| `human_confirmation_id` | string | yes* | `HCR-...` or empty |
| `conflict_id` | string | yes* | `CONF-...` or empty |
| `standard_profile` | string | yes | Always `H29_REFERENCE` |
| `notes` | string | yes* | Free text or empty |

`*` = empty allowed only when genuinely not applicable.

## 3. Golden ID Prefix

- `GIN-XXXX` where XXXX is zero-padded integer (GIN = Golden INput)

## 4. Field Path Convention

Field paths use dot notation: `domain.subdomain.field`.
Examples: `bridge.bridge_length`, `girder.girder_length_AG1`,
`material.steel_grade.SM520`.

## 5. Source Priority

- `BOTH` — value appears in both calculation and drawing
- `CALCULATION` — value only in calculation
- `DRAWING` — value only in drawing
- `UNKNOWN` — source not determined