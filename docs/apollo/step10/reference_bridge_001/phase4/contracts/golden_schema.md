# Phase 4 Golden Schema

> **Authority:** STEP 10 Reference Bridge 001 (RB-S10-001) — Phase 4

## Record Columns

| Column | Type | Description |
|--------|------|-------------|
| `golden_id` | string | Unique record id (`G-GEO-####` / `G-SM-####`) |
| `domain` | enum | `geometry` \| `structural_model` |
| `field_path` | string | Canonical field path (e.g. `alignment.bridge_length`) |
| `entity_id` | string | Geometry/model entity (e.g. `ENT-LINE-ACL`) |
| `raw_value` | string | Value as extracted from source |
| `raw_unit` | string | Unit as extracted |
| `normalized_value` | string | Normalized value |
| `normalized_unit` | string | Normalized unit |
| `semantic_class` | enum | Controlled vocabulary (`candidate_enums.csv`) |
| `source_record_ids` | string (csv) | Referenced source records |
| `candidate_ids` | string | Source Phase 2-II candidate id(s) |
| `calculation_locator` | string | Calculation book locator |
| `drawing_locator` | string | Drawing sheet locator |
| `source_priority` | enum | `BOTH` \| `CALCULATION` \| `DRAWING` \| `UNKNOWN` |
| `confidence` | enum | `HIGH` \| `MEDIUM` \| `LOW` \| `UNKNOWN` |
| `verification_status` | enum | `UNVERIFIED` \| `VERIFIED` \| ... |
| `promotion_status` | enum | `APPROVED_GOLDEN_MODEL` \| ... |
| `promotion_reason` | string | Reason for promotion |
| `human_confirmation_id` | string | Open human confirmation id (if any) |
| `conflict_id` | string | Registered conflict id (if any) |
| `standard_profile` | enum | `H29_REFERENCE` |
| `notes` | string | Notes |

## Domain Files

- `golden/geometry.csv` — 33 records
- `golden/structural_model.csv` — 34 records
- `golden/reference_bridge_001_model_golden.csv` — unified (67 records)
- `golden/reference_bridge_001_model_golden.json` — JSON parity