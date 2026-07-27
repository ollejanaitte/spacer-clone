# EA-04 Parity Harness Specification

**Work item:** EA-04 (STAGE-00 PAR-BLK-006 comparator validation)
**Checkpoint context:** EA-00 inventory at `7386bdf8be5b11cb38d445e32ddce16464fdb3c1`
**Harness version:** `1.1.0`
**Package version:** `1.0.0`

## Purpose

EA-04 delivers a design-numeric-free, fail-closed SPACER numeric parity harness for DS-08 `numeric_parity_spec.md` and `semantic_parity_spec.md`. The harness normalizes SPACER and Apollo raw outputs through an explicit per-side mapping artifact, compares canonical quantities with a pre-frozen tolerance register, classifies mismatches with explicit evidence basis, and renders a consolidated report.

This harness does **not** claim actual SPACER parity. All repository fixtures are labeled `NOT_ACTUAL_SPACER_PARITY`.

## Scope boundary

| In scope | Out of scope |
|---|---|
| Raw and canonical normalization schemas | External SPACER machine captures |
| Explicit per-side mapping validation | Design-standard numeric adoption |
| Symmetric exact-coverage comparison | Promoting PAR-BLK or PAR-001..015 approvals |
| Pre-frozen tolerance register binding | Modifying `design-standards/` registers |
| Mismatch classification with evidence basis | Using frontend comparators as acceptance evidence |
| Synthetic negative corpus unittest validation | Actual numeric parity PASS |

## Repository layout

```text
scripts/apollo/evidence/
  parity_core.py
  normalize_spacer_results.py
  normalize_apollo_results.py
  validate_mapping.py
  compare_numeric_parity.py
  classify_mismatch.py
  render_parity_report.py
  tests/test_parity_harness.py

docs/apollo/evidence-collection/04_parity_harness/
  parity_harness_spec.md
  normalization_schema.json
  mapping_schema.json
  comparison_schema.json
  mismatch_schema.json
  tolerance_freeze_register.csv
  parity_harness_test_matrix.csv
  parity_harness_validation_report.md
  parity_harness_usage.md
```

## Machine-readable schemas

### Raw result (`apollo.parity.raw.v1`)

Carries `producer`, `producer_version`, `producer_build`, `executable_sha256`, `model_identity`, `model_version`, `source_artifact_sha256`, `stale`, `evidence_label`, and `rows`.

Each row binds: `entity_type` (node/member/material/support), `entity_id`, `load_case_id`, `combination_id`, `coordinate_context` (global/local/support), `dof`, `member_end` (I/J), `quantity`, `unit`, `internal_value`, `display_value`, `internal_precision`, `display_precision`, `feature`.

### Canonical result (`apollo.parity.canonical.v1`)

Adds `raw_sha256`, `mapping_sha256`, required `raw_file_byte_sha256` and `mapping_file_byte_sha256`, and per-side `exclusions` (propagated per-row exclusion records with `side`). Rows are sorted deterministically by `quantity_key`. Canonical `internal_value` preserves full transformed Decimal precision; `internal_precision` is metadata only.

### Mapping (`apollo.parity.mapping.v1`)

Explicitly binds per side (`spacer` / `apollo`):

- model identity, version, source artifact SHA-256
- producer version, build, executable SHA-256
- bijective maps for node/member/material/support/load-case/combination
- bijective per-side `quantity_map` from producer source quantity names to shared canonical quantity names
- orthonormal coordinate transforms (global/local/support) with det(R)=+1, applied to complete vector groups
- DOF permutation (ux..rz)
- member-end transform (`swap_ij` consistent with bijective `end_map` on I/J)
- sign transform for all 12 components (ux..rz and fx..fz and mx..mz)
- quantity sign transform for scalar quantities (e.g. shear_y)
- non-empty unit conversion per side keyed by canonical quantity (`from_unit`, `to_unit`, `scale`, `offset`) with shared canonical `to_unit` per quantity and full coverage of all `quantity_map` canonical targets
- optional `canonical_display_precision` per quantity for comparison display quantization
- exclusions with `side`, exact `source_key`, `reason`, `classification=UNSUPPORTED_FEATURE` (unique per `(side, source_key)`)

Non-identity coordinate transforms require complete displacement (ux,uy,uz), rotation (rx,ry,rz), force (fx,fy,fz), and moment (mx,my,mz) groups per context; incomplete groups are rejected fail-closed.

## Normalization gates

Normalizers reject fail-closed:

- stale raw output
- version/hash/model/build/executable mismatch against per-side mapping bindings
- required `--expected-raw-sha256` and `--expected-mapping-sha256` file-byte SHA mismatch
- symlink or non-regular-file input paths
- duplicate raw or canonical quantity keys
- missing mappings or incomplete vector groups for non-identity transforms
- invalid or nonfinite values
- noninvertible or invalid coordinate transforms
- silently dropped rows (input count must equal output + explicit exclusions)

Excluded rows propagate into canonical `exclusions` and comparison reports.

## Comparison gates

`compare_numeric_parity.py` requires exact `--tolerance-freeze-sha256`, required `--mapping`, required `--spacer-raw` and `--apollo-raw`, and required file-byte SHA bindings for spacer canonical, apollo canonical, spacer raw, apollo raw, and mapping inputs. Inputs are verified before parsing; symlinks are rejected. The tolerance register raw file SHA-256 must equal the canonical sorted SHA-256. Mutation and duplicate tolerance keys are rejected.

Comparison requires exact set equality: `spacer_keys == apollo_keys == tolerance_keys`. Unused tolerance rows fail closed.

Cross-side `mapping_sha256` must match. `--mapping` is required and re-validates mapping identity plus producer bindings for both sides. Canonical `mapping_file_byte_sha256` on both sides must match the expected mapping file-byte SHA. Canonical `model_identity`, `model_version`, and `source_artifact_sha256` are validated against mapping per side in addition to producer bindings.

Mandatory re-normalization provenance seal: comparison calls `normalize_raw_results` for each side with the supplied raw documents, mapping, and file-byte SHAs, then requires the recomputed canonical documents exactly equal the provided canonical inputs (detecting mapping transform forgery or post-normalize field/value mutation).

Comparison uses internal full-precision Decimal evaluation separate from canonical display precision. Display comparison requires equal row `display_precision` or mapping-declared `canonical_display_precision`; mismatched declared precision is rejected fail-closed. Comparison quantizes display values only at the agreed canonical display precision (never `min(spacer, apollo)` after seeing inputs). Exposes `rounding_difference` and `utilization_ratio` (error/tolerance bound). Worst case is selected by maximum utilization ratio. Input file-byte checksums (`spacer_canonical`, `apollo_canonical`, `spacer_raw`, `apollo_raw`, `mapping`) are recorded in `input_checksums`.

Mismatch classification of `SOLVER_NUMERIC_DIFFERENCE` requires mapping producer-binding validation evidence; unbound mappings do not infer solver numeric cause.

Exclusions block `parity_pass` even when numeric rows match.

## Mismatch classifications

Exactly: `MODEL_MAPPING_ERROR`, `UNIT_CONVERSION_ERROR`, `SIGN_CONVENTION_ERROR`, `MEMBER_END_ERROR`, `COORDINATE_TRANSFORM_ERROR`, `LOAD_CASE_MAPPING_ERROR`, `COMBINATION_RULE_ERROR`, `SOLVER_NUMERIC_DIFFERENCE`, `ROUNDING_DISPLAY_DIFFERENCE`, `MISSING_OUTPUT`, `EXTRA_OUTPUT`, `STALE_OUTPUT`, `UNSUPPORTED_FEATURE`, `UNKNOWN_REQUIRES_EVIDENCE`.

The classifier never infers transformation cause from magnitude alone.

## Verdicts

| Verdict | Meaning |
|---|---|
| `PARITY_HARNESS_VERDICT: COMPLETE` | Tooling and synthetic validation complete |
| `ACTUAL_SPACER_PARITY_VERDICT: BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | No actual SPACER parity claim |

## Traceability

| Register item | EA-04 impact |
|---|---|
| `parity_blocker_register.csv` PAR-BLK-006 | Comparator validation bundle delivered |
| `parity_approval_register.csv` PAR-001..015 | Unchanged `NOT_APPROVED` |
| `executable_work_items.csv` WI-001 | Addressed by this package |
| Numeric release gate | Not advanced |
