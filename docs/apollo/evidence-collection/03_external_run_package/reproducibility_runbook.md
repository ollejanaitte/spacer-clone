# Reproducibility Runbook (AN-PRB-015 / AN-BLK-008)

**Blocker:** AN-BLK-008
**Required repeat count:** exactly 3 isolated serial runs
**Status:** `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT`

## Objective

Acquire three isolated serial reproducibility runs on one checksum-fixed representative valid fixture after identity and invocation are frozen.

## Procedure

1. Select one representative valid fixture; record SHA-256 in `input_bundle/fixture_checksum_manifest.json`.
2. Freeze `run_request.json` with identical `invocation_command`, `invocation_cwd`, and environment allowlist.
3. For `repeat_01`, `repeat_02`, `repeat_03` slots under `repeat_runs/`:
   - Create a new EA-01 run workspace in a separate isolated directory.
   - Copy the same read-only input artifact with matching SHA-256.
   - Execute with identical settings; no manual edit between runs.
   - Finalize EA-01 evidence bundle.
   - Import into `repeat_runs/<slot>/<run_id>/` preserving EA-01 workspace contract.
4. Import each bundle:

```bash
python3 import_external_run_bundle.py \
  --bundle <package-dir> \
  --evidence repeat_01=<workspace-1> \
  --evidence repeat_02=<workspace-2> \
  --evidence repeat_03=<workspace-3>
```

5. Verify with `verify_external_run_bundle.py` (default is operator-complete; pass `--expected-import-manifest-sha256` when sealing).

## Comparison policy

EA-01 `compare_repeated_runs.py` projects reproducibility-relevant fields:

- exact `command` argv list
- cwd policy
- harness and software identity metadata
- exit code, cancellation state
- stdout/stderr SHA-256
- sorted input/output artifact checksum pairs
- stale detection flag

Identical projections yield `deterministic`; any mismatch yields `nondeterministic` and fails verification.

## Version mixing rejection

All three repeat bundles must share the same external software identity checksums. `verify_external_run_bundle.py` rejects version mixing across `software_identities/` and repeat-run harness projections.

## Manual edit rejection

`import_manifest.json` records `content_hashes` at import time. Post-import edits to tracked JSON files fail verification.

## Acceptance

Three runs satisfy predeclared exact-field and numeric-tolerance policy after only approved metadata normalization. Until operator evidence is imported, slots remain empty and execution verdict stays `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT`.
