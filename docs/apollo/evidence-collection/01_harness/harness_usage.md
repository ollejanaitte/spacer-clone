# EA-01 Evidence Harness Usage

This guide describes how operators invoke the EA-01 harness CLIs. All commands use Python 3 and the standard library only.

## Prerequisites

- Python 3.10+ available as `python3`
- Writable parent directory **outside** the repository for run workspaces (tests use system temp; production captures should also avoid committing run artifacts into the repo)

## Recommended workflow

### 1. Create an isolated workspace

```bash
python3 scripts/apollo/evidence/create_run_workspace.py \
  --base-dir /tmp/apollo_evidence_runs \
  --input /path/to/checksum-fixed-model.dat
```

The command prints a JSON record containing `run_id` and `workspace_path`. The workspace directory must not already exist.

### 2. Capture environment metadata

```bash
python3 scripts/apollo/evidence/capture_environment.py \
  --workspace /tmp/apollo_evidence_runs/<run_id> \
  --allow-env MY_APPROVED_FLAG
```

Writes `captures/environment.json` and prints the same record to stdout.

### 3. Record a before manifest

```bash
python3 scripts/apollo/evidence/collect_file_manifest.py \
  --root /tmp/apollo_evidence_runs/<run_id> \
  --label before \
  --output /tmp/apollo_evidence_runs/<run_id>/captures/before_manifest.json
```

### 4. Execute the probed command

```bash
python3 scripts/apollo/evidence/capture_process_result.py \
  --workspace /tmp/apollo_evidence_runs/<run_id> \
  --command "/path/to/analyzer --input inputs/model.dat --output outputs/result.out" \
  --timeout 300
```

Raw stdout/stderr bytes are written to `captures/stdout.bin` and `captures/stderr.bin`. Process metadata is written to `captures/process_result.json`.

### 5. Record an after manifest and evaluate staleness

```bash
python3 scripts/apollo/evidence/collect_file_manifest.py \
  --root /tmp/apollo_evidence_runs/<run_id> \
  --label after \
  --output /tmp/apollo_evidence_runs/<run_id>/captures/after_manifest.json

python3 scripts/apollo/evidence/detect_stale_outputs.py \
  --before /tmp/apollo_evidence_runs/<run_id>/captures/before_manifest.json \
  --after /tmp/apollo_evidence_runs/<run_id>/captures/after_manifest.json
```

### 6. Finalize, validate, and summarize

After assembling `bundle_manifest.json` (via orchestration script or external supervisor flow), validate and render summaries:

```bash
python3 scripts/apollo/evidence/validate_evidence_bundle.py \
  --workspace /tmp/apollo_evidence_runs/<run_id>

python3 scripts/apollo/evidence/render_evidence_summary.py \
  --workspace /tmp/apollo_evidence_runs/<run_id>
```

Validation exits `0` on success and `1` on semantic failure.

### 7. Compare repeated runs

```bash
python3 scripts/apollo/evidence/compare_repeated_runs.py \
  --run-a /tmp/apollo_evidence_runs/<run_id_a> \
  --run-b /tmp/apollo_evidence_runs/<run_id_b>
```

Inspect `verdict` (`deterministic` or `nondeterministic`) and `differences`.

## Auxiliary commands

### Hash individual artifacts

```bash
python3 scripts/apollo/evidence/hash_artifacts.py \
  outputs/result.out captures/stdout.bin
```

## Safety rules

1. Never reuse a `run_id` directory; overwrite attempts are rejected.
2. Do not pass repository paths as `--base-dir` during real machine captures.
3. Extend environment capture only through `--allow-env`; never disable redaction.
4. Treat harness PASS as tooling validation only, not DS-06 blocker closure.

## Running harness unit tests

```bash
cd scripts/apollo/evidence
python3 -m unittest discover -s tests -p 'test_*.py' -v
```

Tests write only to temporary directories prefixed `apollo_evidence_test_` and do not leave repository artifacts.

## Library import

For in-repo orchestration, add `scripts/apollo/evidence` to `PYTHONPATH` or import from the package path used by tests:

```python
from evidence_core import create_run_workspace, validate_evidence_bundle
```
