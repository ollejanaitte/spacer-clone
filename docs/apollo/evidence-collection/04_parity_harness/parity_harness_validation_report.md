# EA-04 Parity Harness Validation Report

**Review completed (UTC):** 2026-07-27T17:00:00Z
**Package version:** `1.0.0`
**Harness version:** `1.1.0`
**Package approval status:** `TOOLING_COMPLETE_NOT_ACTUAL_SPACER_PARITY`
**Actual SPACER parity status:** `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT`

## Scope

Independent validation of EA-04 parity harness tooling against DS-08 `numeric_parity_spec.md`, `semantic_parity_spec.md`, `sign_coordinate_member_end_conventions.md`, and PAR-BLK-006 acquisition notes. Review confirms:

- Stdlib-only normalization, mapping validation, comparison, classification, and report rendering.
- Machine-readable raw, canonical, mapping, comparison, and mismatch schemas aligned with semantic validators in `parity_core.py`.
- Per-side bijective entity maps, bijective `quantity_map`, coordinate transforms, DOF permutation, bijective member-end transform, all-12-component sign/quantity-sign transform, and non-empty per-side unit conversion keyed by canonical quantity with shared `to_unit`.
- Non-identity orthonormal 3×3 transforms applied to complete displacement/rotation/force/moment vector groups; incomplete groups rejected fail-closed.
- Per-side producer version/build/executable SHA/model identity/source artifact SHA bindings enforced during normalization and comparison.
- Normalization CLIs require `--expected-raw-sha256` and `--expected-mapping-sha256` file-byte SHA bindings only (not canonical JSON digests); symlink/non-file inputs rejected; exclusive writes enforced.
- Canonical records required `raw_file_byte_sha256` and `mapping_file_byte_sha256`; comparison CLI requires mapping, spacer/apollo raw, and expected byte SHA bindings for all five inputs (verified before parsing).
- Mandatory re-normalization provenance seal in comparison: raw documents re-normalized and must exactly match provided canonical documents.
- Pre-frozen tolerance register with raw SHA-256 equal to canonical sorted SHA-256 (`7ea474a42ecf039868279ccd084d3cb7ebae6b92ca89858e610ac4229c0c3683`).
- Exact set equality required: `spacer_keys == apollo_keys == tolerance_keys`; duplicate/unused tolerance rows rejected.
- Comparison uses internal full-precision Decimal evaluation (no internal quantization), canonical display precision agreement (or mapping-declared per-quantity precision), `rounding_difference`, and worst-case by `utilization_ratio`.
- Per-side exclusions require `side` + exact `source_key`; merge key is `(side, source_key)`; always block `parity_pass`.
- Fail-closed rejection of stale, version/hash mismatch, duplicate keys, missing mappings, invalid transforms, silent row drops, tolerance mutation, forged canonical transforms, and raw byte SHA mismatch.
- Classifier requires mapping binding evidence for `SOLVER_NUMERIC_DIFFERENCE`; never guesses unit/sign/coordinate cause from magnitude alone.
- End-to-end CLI success path validated with pretty-printed JSON normalize-both-sides-then-compare workflow.
- All synthetic fixtures labeled `NOT_ACTUAL_SPACER_PARITY`.

## Canonical register non-promotion

| Register item | EA-04 impact |
|---|---|
| `parity_blocker_register.csv` PAR-BLK-001..005,007,008 | Unchanged `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |
| `parity_approval_register.csv` PAR-001..015 | Unchanged `NOT_APPROVED` |
| `executable_work_items.csv` WI-001 | Tooling delivered; does not close PAR-BLK-006 organizational sign-off |
| Numeric release gate | Not advanced |

## Validation execution (exact results)

### Targeted EA-04 unittest

Command:

```bash
cd scripts/apollo/evidence && python3 -m unittest tests.test_parity_harness -v
```

Result: **PASS** (exit code `0`, **63 tests**; synthetic fixtures labeled `NOT_ACTUAL_SPACER_PARITY`)

### Full evidence unittest discovery

Command:

```bash
cd scripts/apollo/evidence && python3 -m unittest discover -s tests -p 'test_*.py' -v
```

Result: **PASS** (exit code `0`, **167 tests**)

### Whitespace / conflict marker check

Command:

```bash
git diff --check
```

Result: **PASS** (exit code `0`)

## Non-promotion statement

This validation closes EA-04 parity harness tooling only. No external SPACER STATICS machine captures were performed. Synthetic unittest fixtures are `NOT_ACTUAL_SPACER_PARITY`. No PAR-BLK, PAR-001..015, EXT-ID, or numeric-release gate status was changed.

## Verdict

**PARITY_HARNESS_VERDICT: COMPLETE**

**ACTUAL_SPACER_PARITY_VERDICT: BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT**

## Unresolved / out-of-scope items

- JSON Schema files are structural contracts; runtime validation is implemented in `parity_core.py` semantic validators (no third-party schema engine; stdlib-only constraint).
- File-byte SHA binding for raw/mapping/canonical JSON is enforced at CLI ingress; document-content `raw_sha256` / `mapping_sha256` in canonical output remain canonical JSON digests (distinct from on-disk formatting).
- `validate_mapping.py` requires `--expected-mapping-sha256` as file-byte SHA only; no `--expected-mapping-document-sha256` canonical digest flag is needed.
- No actual SPACER machine evidence was collected; `parity_pass: true` on synthetic fixtures does not advance numeric release gates.
