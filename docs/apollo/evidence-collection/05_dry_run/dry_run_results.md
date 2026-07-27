# EA-05 Dry Run Results

**Dry run version:** `1.0.0`
**Registered cases:** 20
**Case acceptance PASS:** 20
**Case acceptance FAIL:** 0

## Per-case summary

| case_id | case_name | pipeline | expected | observed | acceptance |
|---|---|---|---|---|---|
| DR-01 | synthetic_analyzer_process | EA-01 | valid_bundle_exit_0 | valid=True;exit=0 | PASS |
| DR-02 | deterministic | EA-01 | deterministic | deterministic | PASS |
| DR-03 | nondeterministic | EA-01 | nondeterministic | nondeterministic | PASS |
| DR-04 | nonzero | EA-01 | nonzero_exit | exit=7 | PASS |
| DR-05 | timeout | EA-01 | timeout_cancelled_exit_124 | cancelled=True;reason=timeout | PASS |
| DR-06 | stale_output | EA-01 | stale_detected_true | stale_detected=True | PASS |
| DR-07 | malformed_manifest | EA-01 | validation_rejected | rejected | PASS |
| DR-08 | analytical_golden_compare | EA-02 | overall_PASS | PASS | PASS |
| DR-09 | synthetic_spacer_normalization | EA-04 | normalization_success | rows=7 | PASS |
| DR-10 | synthetic_apollo_normalization | EA-04 | normalization_success | rows=7 | PASS |
| DR-11 | sign_transform | EA-04 | canonical_values_equal | equal=True | PASS |
| DR-12 | ij_transform | EA-04 | i_j_values_swapped | swap_observed=True | PASS |
| DR-13 | unit_conversion | EA-04 | both_sides_canonical_m_0.001 | conversion_ok=True | PASS |
| DR-14 | tolerance_pass | EA-04 | overall_PASS_synthetic_only | PASS | PASS |
| DR-15 | tolerance_fail | EA-04 | overall_FAIL | FAIL | PASS |
| DR-16 | missing_output | EA-04 | overall_FAIL_with_MISSING_OUTPUT | verdict=FAIL;hints=[None, None, None, None, 'MISSING_OUTPUT', None, None] | PASS |
| DR-17 | extra_output | EA-04 | overall_FAIL_with_EXTRA_OUTPUT | verdict=FAIL;hints=[None, None, None, None, 'EXTRA_OUTPUT', None, None] | PASS |
| DR-18 | mismatch_classification | EA-04 | classification_rows_present | count=1 | PASS |
| DR-19 | evidence_bundle_validation | EA-01 | validation_valid_true | valid=True | PASS |
| DR-20 | report_generation | EA-01+EA-04 | reports_generated_blocked_actual_parity | reports=True;evidence_ok=True;parity_harness=COMPLETE;actual=BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT | PASS |

## Verdict tokens (synthetic dry run only)

- **HARNESS_OPERATIONAL_VERDICT:** `OPERATIONAL`
- **ANALYTICAL_GOLDEN_PIPELINE_VERDICT:** `OPERATIONAL`
- **PARITY_COMPARISON_PIPELINE_VERDICT:** `OPERATIONAL`
- **EXTERNAL_MACHINE_EVIDENCE_VERDICT:** `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT`
- **ACTUAL_SPACER_PARITY_VERDICT:** `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT`

## Non-promotion statement

This dry run exercises repository tooling only. `EXTERNAL_MACHINE_EVIDENCE_VERDICT` and `ACTUAL_SPACER_PARITY_VERDICT` remain blocked. Synthetic parity PASS does not constitute actual SPACER parity or numeric release evidence.
