# EA-05 Evidence Acquisition Dry Run Plan

**Work item:** EA-05 (synthetic-only end-to-end evidence pipeline dry run)
**Dry run version:** `1.0.0`
**Evidence label:** `EA-05_SYNTHETIC_DRY_RUN_NOT_MACHINE_EVIDENCE`

## Purpose

Execute a reproducible synthetic-only dry run across EA-01 harness, EA-02 analytical golden tooling, EA-03 external package validators (package-only), and EA-04 parity harness. This dry run proves pipeline wiring, fail-closed behavior, checksum binding, and report generation without claiming external machine evidence, reference software capture, licensed-source numerics, GOLD approval, or actual SPACER parity.

## Scope boundary

| In scope | Out of scope |
|---|---|
| Twenty registered synthetic cases with machine-verifiable artifacts | External Analyzer or SPACER machine capture |
| Deterministic committed summary and artifact manifest | Promoting canonical register blockers to closed |
| EA-01..04 tooling invocation with real validators/comparators | Numeric implementation release |
| Fail-closed negative-path cases (malformed manifest, tolerance FAIL, missing/extra output) | Writing PASS constants without execution |

## Registered cases

| case_id | case_name | pipeline |
|---|---|---|
| DR-01 | synthetic_analyzer_process | EA-01 |
| DR-02 | deterministic | EA-01 |
| DR-03 | nondeterministic | EA-01 |
| DR-04 | nonzero | EA-01 |
| DR-05 | timeout | EA-01 |
| DR-06 | stale_output | EA-01 |
| DR-07 | malformed_manifest | EA-01 |
| DR-08 | analytical_golden_compare | EA-02 |
| DR-09 | synthetic_spacer_normalization | EA-04 |
| DR-10 | synthetic_apollo_normalization | EA-04 |
| DR-11 | sign_transform | EA-04 |
| DR-12 | ij_transform | EA-04 |
| DR-13 | unit_conversion | EA-04 |
| DR-14 | tolerance_pass | EA-04 |
| DR-15 | tolerance_fail | EA-04 |
| DR-16 | missing_output | EA-04 |
| DR-17 | extra_output | EA-04 |
| DR-18 | mismatch_classification | EA-04 |
| DR-19 | evidence_bundle_validation | EA-01 |
| DR-20 | report_generation | EA-01+EA-04 |

## Artifact policy

- Generated case and report artifacts live under `artifacts/` only (including `artifacts/dry_run_summary.json`).
- Root-level control records (`dry_run_execution_register.csv`, `dry_run_artifact_manifest.csv`, `dry_run_failures.csv`, and narrative docs) are not listed in the artifact manifest.
- Committed case records exclude volatile metadata fields (`run_id`, timestamps, workspace paths).
- Nondeterministic case DR-03 records a normalized reproducible representation of differences.
- Synthetic parity PASS (DR-14) does not advance `ACTUAL_SPACER_PARITY_VERDICT`.

## Execution

```bash
cd scripts/apollo/evidence && python3 run_evidence_dry_run.py
```

Re-run determinism is verified by executing the runner twice and comparing `dry_run_artifact_manifest.csv` SHA-256.
