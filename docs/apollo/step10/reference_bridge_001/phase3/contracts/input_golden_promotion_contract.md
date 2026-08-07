# Input Golden Promotion Contract

> **Authority:** STEP 10 Reference Bridge 001 (RB-S10-001) — Phase 3
> **Companion:** `input_golden_schema.md`, `input_golden_enums.csv`, `normalization_and_units.md`

## 1. Purpose

Define the rules for promoting Phase 2-II candidate records to formal
`APPROVED_GOLDEN_INPUT` status in Phase 3.

## 2. Promotion Eligibility

### Eligible for Promotion

Only records matching ALL of the following criteria may be promoted:

1. **Candidate layer**: input, geometry, structural_model, or load
2. **Semantic class**: is a SOURCE_INPUT type (road_spec, design_speed,
   live_load, bridge_type, bridge_length, girder_length, span_length,
   total_width, effective_width, steel_grade, concrete_strength,
   elastic_modulus, shear_modulus, yield_strength, deck_thickness,
   DIMENSION, member_id, SUPPORT_CONDITION, LOAD_VALUE, COORDINATE,
   longitudinal_gradient, cross_gradient, girder_spacing, girder_height,
   applicable_code, applicable_manual, REFERENCE_TEXT)
3. **Adoption status**: `CANDIDATE_ONLY` (not `EXCLUDED_DERIVED_VALUE`,
   `EXCLUDED_ANALYSIS_RESULT`, `EXCLUDED_DESIGN_RESULT`, `EXCLUDED_DRAWING_ONLY`)
4. **Phase 3 action**: `GOLDEN_ELIGIBLE` (not `GOLDEN_EXCLUDED`,
   `HUMAN_VALIDATION`, `REVIEW_CONFLICT`)
5. **Not a result/derived value**: semantic class not in excluded list

### Eligible for Promotion with Human Confirmation Track

Records that meet all criteria above but have a `human_confirmation_id`
set are promoted as `APPROVED_WITH_HUMAN_CONFIRMATION_TRACK`.

### Not Eligible for Promotion

- `EXCLUDED_DERIVED_VALUE` — rejected as derived
- `EXCLUDED_ANALYSIS_RESULT` / `EXCLUDED_DESIGN_RESULT` — rejected as result
- `EXCLUDED_DRAWING_ONLY` — rejected as drawing-only
- `CONFLICT_REQUIRES_REVIEW` — held as conflict
- `HUMAN_CONFIRMATION_REQUIRED` — excluded (insufficient source)
- Unknown/empty semantic classes

## 3. Promotion Status Values

| Status | Usage |
|--------|-------|
| `APPROVED_INPUT_GOLDEN` | Full Golden record |
| `APPROVED_WITH_HUMAN_CONFIRMATION_TRACK` | Golden record with open human confirmation |
| `HOLD_CONFLICT` | Not promoted; conflict unresolved |
| `HOLD_INSUFFICIENT_SOURCE` | Not promoted; insufficient source evidence |
| `REJECTED_RESULT_VALUE` | Not promoted; is a result value |
| `REJECTED_DERIVED_VALUE` | Not promoted; is a derived value |
| `REJECTED_DRAWING_ONLY` | Not promoted; drawing-only without calc support |

## 4. Golden Record Fields

Defined in `input_golden_schema.md`.

## 5. Standard Profile

All Golden records carry `STANDARD_PROFILE: H29_REFERENCE`.
`R7_COMPLIANCE: NOT_VERIFIED` for all records.

## 6. Prohibitions

- No recalculation or numeric analysis
- No fabrication of missing values
- No silent upgrade of DERIVED or RESULT to INPUT
- No H29→R7 automatic conversion
- No PDF/image originals committed
- No production code changes