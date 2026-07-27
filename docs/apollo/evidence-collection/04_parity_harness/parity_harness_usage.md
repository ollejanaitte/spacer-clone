# EA-04 Parity Harness Usage

## Prerequisites

- Python 3 standard library only
- Committed tolerance register at `docs/apollo/evidence-collection/04_parity_harness/tolerance_freeze_register.csv`
- Frozen SHA-256: `7ea474a42ecf039868279ccd084d3cb7ebae6b92ca89858e610ac4229c0c3683`

All fixtures used with this harness must be labeled `NOT_ACTUAL_SPACER_PARITY`.

## Workflow

### 1. Validate mapping

```bash
cd scripts/apollo/evidence
python3 validate_mapping.py \
  --mapping /path/to/mapping.json \
  --expected-mapping-sha256 <64-hex-file-byte-sha> \
  --spacer-raw /path/to/spacer_raw.json \
  --apollo-raw /path/to/apollo_raw.json \
  --output /path/to/mapping_validation.json
```

### 2. Normalize raw results

Both normalizers require file-byte SHA bindings and reject symlinks/non-regular files.

```bash
python3 normalize_spacer_results.py \
  --raw /path/to/spacer_raw.json \
  --mapping /path/to/mapping.json \
  --expected-raw-sha256 <64-hex> \
  --expected-mapping-sha256 <64-hex> \
  --output /path/to/spacer_canonical.json

python3 normalize_apollo_results.py \
  --raw /path/to/apollo_raw.json \
  --mapping /path/to/mapping.json \
  --expected-raw-sha256 <64-hex> \
  --expected-mapping-sha256 <64-hex> \
  --output /path/to/apollo_canonical.json
```

Compute file-byte SHA-256:

```bash
python3 -c "from pathlib import Path; from parity_core import compute_raw_file_sha256 as s; print(s(Path('file.json')))"
```

### 3. Compare numeric parity

```bash
python3 compare_numeric_parity.py \
  --spacer-canonical /path/to/spacer_canonical.json \
  --apollo-canonical /path/to/apollo_canonical.json \
  --spacer-raw /path/to/spacer_raw.json \
  --apollo-raw /path/to/apollo_raw.json \
  --mapping /path/to/mapping.json \
  --expected-spacer-canonical-sha256 <64-hex> \
  --expected-apollo-canonical-sha256 <64-hex> \
  --expected-spacer-raw-sha256 <64-hex> \
  --expected-apollo-raw-sha256 <64-hex> \
  --expected-mapping-sha256 <64-hex> \
  --tolerance-freeze-sha256 7ea474a42ecf039868279ccd084d3cb7ebae6b92ca89858e610ac4229c0c3683 \
  --output /path/to/comparison_report.json
```

`--tolerance-freeze-sha256`, `--mapping`, `--spacer-raw`, `--apollo-raw`, and all five expected file-byte SHA bindings are required. Comparison re-normalizes both raw documents with the supplied mapping and byte SHAs, then requires the recomputed canonical documents exactly equal the provided canonical inputs (detecting mapping transform forgery or post-normalize mutation). Wrong or mutated SHA is rejected fail-closed before JSON parsing.

### 4. Classify mismatches

```bash
python3 classify_mismatch.py \
  --comparison /path/to/comparison_report.json \
  --mapping /path/to/mapping.json \
  --output /path/to/mismatch_report.json
```

### 5. Render consolidated report

```bash
python3 render_parity_report.py \
  --comparison /path/to/comparison_report.json \
  --classification /path/to/mismatch_report.json \
  --output /path/to/parity_report.json
```

## Exclusive writes

All `--output` paths use exclusive create. Existing files are rejected.

## Source handling

Input JSON paths must be regular files (not symlinks). Inputs are read-only; the harness does not modify source artifacts.

## Exclusions

Explicit exclusions require `side`, exact `source_key`, `reason`, and `classification: UNSUPPORTED_FEATURE`. Uniqueness is per `(side, source_key)`; exclusions apply only to the matching side. Excluded rows are counted in normalization audit, propagated into canonical `exclusions`, exposed in comparison/render reports, and always block `parity_pass`.

## Verdict interpretation

| Field | Expected for EA-04 tooling |
|---|---|
| `parity_harness_verdict` | `COMPLETE` after validation |
| `actual_spacer_parity_verdict` | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |
| `parity_pass` | `true` only for matching synthetic harness fixtures without exclusions and with exact tolerance coverage |

Do not interpret `parity_pass: true` on synthetic fixtures as actual SPACER parity.
