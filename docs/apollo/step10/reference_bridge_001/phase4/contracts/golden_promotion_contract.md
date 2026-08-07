# Phase 4 Golden Promotion Contract

> **Authority:** STEP 10 Reference Bridge 001 (RB-S10-001) — Phase 4
> **Companion:** Phase 3 `input_golden_promotion_contract.md`

## 1. Purpose

Define rules for promoting Phase 2-II candidate records to formal
`APPROVED_GOLDEN_MODEL` status in Phase 4 (geometry and structural_model
layers). The Phase 3 promotion contract is the governing framework; this
document records the Phase 4 model-layer extensions.

## 2. Promotion Eligibility

A candidate is eligible ONLY if ALL of the following hold:

1. **Candidate layer**: geometry or structural_model
2. **Phase 3 action**: `GOLDEN_ELIGIBLE`
3. **Adoption status**: `CANDIDATE_ONLY` (not
   `EXCLUDED_DERIVED_VALUE`, `EXCLUDED_ANALYSIS_RESULT`,
   `EXCLUDED_DESIGN_RESULT`, `EXCLUDED_DRAWING_ONLY`)
4. **Semantic class** is a model-appropriate type: `COORDINATE`,
   `DIMENSION`, `MEMBER_CONNECTIVITY`, `SUPPORT_CONDITION`,
   `SECTION_PROPERTY`, `member_id`, `bridge_length`, `span_length`,
   `girder_spacing`, `girder_height`, `longitudinal_gradient`,
   `cross_gradient`, `DIMENSION`
5. **Not a result/derived class** (`ANALYSIS_RESULT`, `DESIGN_RESULT`,
   `ADOPTED_VALUE`, `JUDGMENT_RESULT`, `CHECK_RATIO`, `REACTION`,
   `DISPLACEMENT`, `ROTATION`, `MEMBER_FORCE`, etc.)
6. Normalized value present for `COORDINATE` (panel-point gap records with
   empty normalized coordinate are held, not fabricated).

## 3. Human Confirmation Track

A record meeting all criteria with a `human_confirmation_id` set is promoted
as `APPROVED_WITH_HUMAN_CONFIRMATION_TRACK`.

## 4. Hold / Reject

- `CONFLICT_REQUIRES_REVIEW` or `phase3_action == REVIEW_CONFLICT` → HOLD_CONFLICT
- `HUMAN_VALIDATION` / `GOLDEN_EXCLUDED` / `ORPHAN_LOG` → HOLD_INSUFFICIENT_SOURCE
- Excluded derived/result classes → REJECTED_RESULT/DERIVED

## 5. Promotion Status Values

| Status | Usage |
|--------|-------|
| `APPROVED_GOLDEN_MODEL` | Full Phase 4 Model Golden record |
| `APPROVED_WITH_HUMAN_CONFIRMATION_TRACK` | Golden with open human confirmation |
| `HOLD_CONFLICT` | Not promoted; unresolved conflict (e.g. CONF-P2II-001) |
| `HOLD_INSUFFICIENT_SOURCE` | Not promoted; source evidence insufficient |
| `REJECTED_RESULT_VALUE` / `REJECTED_DERIVED_VALUE` | Not promoted; result/derived |

## 6. Record Schema

Model Golden records use the Phase 3 `GOLDEN_RECORD_FIELDS` plus a leading
`domain` column. See `tools/build_phase4_golden.py` `GOLDEN_RECORD_FIELDS`.

## 7. Prohibitions

- No recalculation, no fabrication of missing values, no silent class upgrade
- No PDF/image originals committed, no production code changes
- No H29→R7 conversion