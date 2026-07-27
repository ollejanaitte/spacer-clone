# EA-01 Evidence Acquisition Harness Specification

**Work item:** EA-01 (STAGE-00 evidence tooling)
**Checkpoint context:** EA-00 inventory at `7386bdf8be5b11cb38d445e32ddce16464fdb3c1`
**Harness version:** `1.0.0`
**Schema version:** `apollo.evidence.bundle.v1`

## Purpose

The EA-01 harness is a Python standard-library evidence acquisition framework for DS-06 machine probes and downstream Golden/parity bundles. It records invocation context, byte-preserving process streams, recursive file manifests, checksum-bound artifacts, stale-output detection, and repeated-run comparison without claiming external Analyzer identity or numeric results.

This harness does **not** produce fake machine evidence. It provides the tooling required by `analyzer_physical_io_spec.md` probe governance and AN-BLK-002/006/007/008 acquisition notes.

## Scope boundary

| In scope | Out of scope |
|---|---|
| Isolated run workspace creation | External product installation or license capture |
| Read-only copied inputs with SHA-256 | Licensed standard-source numerics (STAGE-01) |
| Command/args/cwd/env capture with redaction | SPACER parity comparison (PAR-BLK-006 comparator) |
| Before/after manifests and output checksums | Promoting blockers to closed |
| Stale detection and repeated-run verdict | Modifying `design-standards/` registers |

## Repository layout

```text
scripts/apollo/evidence/
  evidence_core.py                 # shared library
  create_run_workspace.py          # isolated workspace + input copy
  capture_environment.py           # software identity + env allowlist
  collect_file_manifest.py         # recursive manifest
  hash_artifacts.py                # artifact SHA-256 records
  capture_process_result.py        # subprocess capture
  detect_stale_outputs.py          # stale sentinel evaluation
  compare_repeated_runs.py         # deterministic/nondeterministic verdict
  validate_evidence_bundle.py      # fail-closed semantic validator
  render_evidence_summary.py       # UTF-8 JSON/CSV summaries
  tests/test_harness.py            # 32 unittest methods; harness_test_matrix.csv maps 27 named IDs T-01..T-27 (15 required + 12 audit repairs)

docs/apollo/evidence-collection/01_harness/
  evidence_harness_spec.md         # this document
  evidence_bundle_schema.json      # JSON Schema (documentary)
  harness_test_matrix.csv          # requirement-to-test map
  harness_validation_report.md     # executed validation record
  harness_usage.md                 # operator guide
```

## Run workspace contract

Each run uses a cryptographically unique `run_id` (`secrets.token_hex(32)`, exactly 64 lowercase hex characters). The workspace path is `<base_dir>/<run_id>/`, must be a resolved direct child of `base_dir`, and must not pre-exist. Invalid `run_id` values (wrong length, uppercase, or non-hex) are rejected fail-closed.

### Directory structure

| Path | Purpose |
|---|---|
| `inputs/` | Read-only copies of source inputs |
| `outputs/` | Command-generated artifacts |
| `captures/` | Manifests, environment, process result, stdout/stderr bytes |
| `summaries/` | `evidence_summary.json` and `evidence_summary.csv` |
| `bundle_manifest.json` | Top-level evidence bundle manifest |

## Capability requirements

### Identity and timing

- `run_id` is unique per workspace creation attempt.
- `created_at_utc` and `completed_at_utc` use UTC ISO-8601 with `Z` suffix.
- `software_identity` records harness and Python/platform metadata.

### Input handling

- Inputs are copied into `inputs/`; owner write permission is removed.
- Each input records `source_path`, `workspace_relative_path`, `sha256`, `size_bytes`, `read_only: true`.
- Symlink sources and non-regular files are rejected.
- Path traversal (`..`), absolute paths, and symlink escape are rejected before hashing.
- Duplicate `workspace_relative_path` values in input or output artifacts are rejected.

### Invocation capture

- `invocation.command` is a non-empty argv list.
- `invocation.cwd` records the working directory.
- `invocation.environment` uses an allowlist (`PATH`, `LANG`, `LC_*`, `TZ`, etc.) plus optional operator extensions.
- Keys matching secret patterns (`PASSWORD`, `SECRET`, `TOKEN`, `API_KEY`, `CREDENTIAL`, `LICENSE_KEY`, …) are stored as `[REDACTED]`.

### Process capture

- `stdout.bin` and `stderr.bin` store raw bytes with exclusive create (`O_EXCL` / `xb`).
- Manifest records per-stream `sha256`, `size_bytes`, and `utf8_summary` (UTF-8 decode with replacement, truncated to 4096 chars).
- `exit_code`, `started_at_utc`, `ended_at_utc` are always recorded.
- Timeout uses `cancelled: true`, `cancellation_reason: "timeout"`, exit code `124`, and process-group cleanup fields (`cleanup_attempted`, `cleanup_succeeded`, `cleanup_detail`).
- `cleanup_attempted` and `cleanup_succeeded` are always booleans. When `cancelled` is true, `cleanup_attempted` must be true, `cancellation_reason` must be non-empty, and `cleanup_succeeded` cannot be true unless `cleanup_attempted` is true. When not cancelled, `cleanup_attempted` must be false.
- Process capture uses `Popen` with a new session/process group; timeout terminates only the spawned group (SIGTERM then SIGKILL escalation with portable fallback).

### Manifests and checksums

- `collect_file_manifest.py` walks a directory tree recursively, rejecting symlink nodes and duplicate `relative_path` entries.
- `before` and `after` manifests are stored under `manifests` in the bundle.
- `output_artifacts` lists checksum-bound files under `outputs/`.

### Stale detection

`detect_stale_outputs.py` flags files under `outputs/` whose `sha256` is unchanged between before and after manifests (mtime changes do not clear staleness). This supports AN-BLK-006 stale sentinel probes.

`validate_evidence_bundle()` recomputes `stale_detection` from the bound `manifests.before` and `manifests.after` sections using the fixed `outputs/` prefix and requires exact agreement on `stale_detected` and `stale_entries`. `stale_detection.outputs_prefix` must be exactly `outputs/`; any other value is rejected. Only `evaluated_at_utc` may differ from the recomputed record.

### Repeated-run comparison

`compare_repeated_runs.py` projects each bundle to reproducibility-relevant fields:

- exact `command` argv list
- `cwd` policy (`workspace` when cwd resolves to workspace root, otherwise resolved cwd)
- `harness_version` and full `software_identity`
- `exit_code`, `cancelled`, `cancellation_reason`
- stdout/stderr SHA-256
- sorted input/output artifact `(relative_path, sha256)` pairs
- `stale_detected`

Identical projections yield `verdict: deterministic`; otherwise `nondeterministic`. Different command argv yields nondeterministic even when stdout matches.

### Validation

`validate_evidence_bundle.py` enforces core semantics fail-closed:

- schema version, `harness_version`, and required object shapes
- `run_id` exactly 64 lowercase hex; workspace direct child of base with matching directory name
- non-empty `invocation.command` matching `process_result.command`
- integer `process_result.exit_code` and required cleanup booleans with cancellation invariants
- recomputed `stale_detection` binding to embedded before/after manifests (`evaluated_at_utc` exempt)
- required stream and artifact fields with path safety before hashing (`PathSafetyError` converted to `BundleValidationError`)
- duplicate `relative_path` / `workspace_relative_path` rejection
- embedded before/after manifest binding to on-disk captures when present
- on-disk checksum and size verification when `--workspace` is supplied

All evidence JSON, bytes, and CSV writes use exclusive create (no overwrite). Malformed JSON manifests raise `BundleValidationError`. The validator CLI catches `BundleValidationError` and `PathSafetyError`, writes an exclusive `--output` report with `valid: false`, and returns exit code `1` without emitting a traceback.

Secret-pattern environment keys are always stored as `[REDACTED]` even when explicitly allowlisted.

### Summaries

`render_evidence_summary.py` writes UTF-8 JSON and CSV summaries under `summaries/`.

## Traceability to EA-00 / DS-06

| EA-00 / DS-06 need | Harness component |
|---|---|
| Isolated directory, copied fixture | `create_run_workspace.py` |
| OS/locale/timezone/software identity | `capture_environment.py` |
| Command/env/start-end/stdout/stderr/exit | `capture_process_result.py` |
| Before/after recursive manifests | `collect_file_manifest.py` |
| SHA-256 for every retained artifact | `hash_artifacts.py`, manifests |
| Stale sentinel | `detect_stale_outputs.py` |
| Three-run reproducibility comparison | `compare_repeated_runs.py` |
| Immutable bundle manifest | `bundle_manifest.json`, `validate_evidence_bundle.py` |

## Non-promotion statement

Successful harness unit tests validate tooling only. They do not close AN-BLK-001 through AN-BLK-010, any Golden approval, or any parity approval. No external Analyzer, SPACER, or STATICS machine captures are included in this deliverable.
