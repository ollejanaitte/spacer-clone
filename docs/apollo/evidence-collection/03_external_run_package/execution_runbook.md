# External Run Execution Runbook

**Blockers:** AN-BLK-002, AN-BLK-005, AN-BLK-006, AN-BLK-007, AN-BLK-010
**Probe catalog:** `positive_probe_catalog.csv` (AN-PRB-001..022)
**Error catalog:** `negative_probe_catalog.csv` (AN-ERR-001..016)
**Status:** `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT`

## Prerequisites

1. `frozen_identity_bundle_id` fixed across AN-ID-004, AN-ID-005, AN-ID-006.
2. `run_request.json` records verbatim `invocation_command` checksum-bound to fixture manifest.
3. `license_preflight.json` and `machine_preflight.json` complete on authorized host.
4. EA-01 harness available (`scripts/apollo/evidence/`).

## Isolated execution contract

Each probe runs in a newly created isolated directory:

1. `create_run_workspace.py` with read-only copied inputs.
2. `collect_file_manifest.py` before invocation.
3. Vendor-supported invocation captured verbatim in `invocation.command`.
4. `capture_process_result.py` for stdout, stderr, exit, timeout, cancellation.
5. `collect_file_manifest.py` after invocation.
6. `detect_stale_outputs.py` where probe requires stale sentinel (AN-PRB-007, AN-PRB-008).
7. `finalize_workspace_bundle` producing EA-01 `bundle_manifest.json`.

Never modify licensed installation files. Never target production result directories.

## Probe classes

| Class | Probe IDs | Capture focus |
|---|---|---|
| Valid completion | AN-PRB-001, AN-ERR-001 | Fresh parseable outputs, complete manifests |
| Input validation | AN-PRB-002..006, AN-ERR-002..004, AN-ERR-013 | Error signature, output suppression |
| License | AN-PRB-011, AN-PRB-021, AN-ERR-005..006 | Explicit license failure, no success ingestion |
| Staleness / collision | AN-PRB-007..008, AN-ERR-010..011 | Before-after manifests, overwrite behavior |
| Timeout / cancel / crash | AN-PRB-009..010, AN-PRB-022, AN-ERR-007..009 | Process tree, cleanup, non-success |
| Concurrency | AN-PRB-012, AN-ERR-012 | Per-run isolation, seat exhaustion |
| Locale | AN-PRB-014, AN-ERR-014 | Raw bytes per locale |
| Coordinates / signs | AN-PRB-016..018 | Component-isolating fixtures |
| Load mapping | AN-PRB-019..020 | Native and IF3 load-context records |
| Repeatability | AN-PRB-015, AN-ERR-015 | Three isolated serial runs (see reproducibility runbook) |

## Import

After each probe run on the authorized host:

```bash
python3 import_external_run_bundle.py \
  --bundle <package-dir> \
  --evidence probe:AN-PRB-001=<ea01-workspace-dir> \
  --binding probe:AN-PRB-001=<identity-binding.json>
```

Import uses transactional staging, path containment, canonical probe ID allowlist (`AN-PRB-001..022`, `AN-ERR-001..016` only), EA-01 pre-promotion validation, and records `content_hashes` plus `import_manifest_sha256` for out-of-band ledger sealing.

Record `import_manifest_sha256` from import output before verification.

## Verification

```bash
# Default: fail-closed on skeleton (valid=false, nonzero exit)
python3 verify_external_run_bundle.py --bundle <package-dir>

# Structure-only package validation (only mode that may return valid=true for skeleton)
python3 verify_external_run_bundle.py --bundle <package-dir> --package-only

# Operator-complete with import seal (default verify already enforces full execution evidence)
python3 verify_external_run_bundle.py \
  --bundle <package-dir> \
  --expected-import-manifest-sha256 <raw-import-manifest-sha256>
```

Default verify never returns `valid: true` for skeleton packages. `package_valid` may be true while `execution_valid` remains false until all 38 probe bundles, 3 repeats, bindings, and import seal are satisfied. The `--require-operator-complete` flag is deprecated and ignored.

## Acceptance

Each probe execution bundle must validate under EA-01 `validate_evidence_bundle.py` with on-disk checksum verification. Catalog `package_status` and `execution_status` remain `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` until canonical register closure by governed process outside this package.
