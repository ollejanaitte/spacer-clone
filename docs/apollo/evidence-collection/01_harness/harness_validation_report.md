# EA-01 Harness Validation Report

**Validation completed (UTC):** 2026-07-27T14:59:40Z  
**Validators:** Codex Supervisor, Composer 2.5 Worker, Cursor Grok 4.5 independent reviewer  
**Harness version:** `1.0.0`  
**Schema version:** `apollo.evidence.bundle.v1`

## Validation scope

This report records targeted validation for EA-01 and the required full repository
validation after all adversarial-audit findings were repaired. The independent
review verdict was `PASS` with no remaining mandatory P0, P1, or P2 correction.

## Environment

| Item | Value |
|---|---|
| Python | 3.10.12 (`python3` on validation host) |
| Test runner | `python3 -m unittest discover -s tests -p 'test_*.py' -v` |
| Working directory | `scripts/apollo/evidence` |
| Artifact policy | Tests use `tempfile.TemporaryDirectory(prefix="apollo_evidence_test_")`; no repository run artifacts retained |

## Unittest execution (exact transcript)

Command:

```bash
cd scripts/apollo/evidence && python3 -m unittest discover -s tests -p 'test_*.py' -v
```

Result: **PASS** (exit code `0`, **32 tests**)

### Named test matrix coverage (27 matrix IDs T-01..T-27: 15 required + 12 audit repairs)

| test_id | test_name | result |
|---|---|---|
| T-01 | run_id_uniqueness | PASS |
| T-02 | input_checksum | PASS |
| T-03 | output_checksum | PASS |
| T-04 | empty_output | PASS |
| T-05 | missing_command | PASS |
| T-06 | nonzero_exit | PASS |
| T-07 | stdout_stderr | PASS |
| T-08 | stale_output | PASS |
| T-09 | repeated_identical | PASS |
| T-10 | repeated_different | PASS |
| T-11 | malformed_manifest | PASS |
| T-12 | path_traversal_rejection | PASS |
| T-13 | overwrite_rejection | PASS |
| T-14 | encoding_handling | PASS |
| T-15 | cancellation_record | PASS |
| T-16 | run_id_format | PASS |
| T-17 | symlink_input_rejection | PASS |
| T-18 | symlink_escape_rejection | PASS |
| T-19 | exclusive_writes | PASS |
| T-20 | duplicate_path_rejection | PASS |
| T-21 | harness_version_validation | PASS |
| T-22 | invocation_command_consistency | PASS |
| T-23 | workspace_direct_child | PASS |
| T-24 | orphan_child_cleanup | PASS |
| T-25 | secret_redaction | PASS |
| T-26 | forged_stale_detection | PASS |
| T-27 | validate_cli_fail_closed | PASS |

## Whitespace / conflict marker check (exact transcript)

Command:

```bash
git diff --check
```

Result: **PASS** (exit code `0`, no trailing-whitespace or conflict-marker findings)

## Schema sanity check

Command:

```bash
python3 -c "import json; json.load(open('docs/apollo/evidence-collection/01_harness/evidence_bundle_schema.json'))"
```

Result: **PASS** (valid JSON; semantic enforcement remains in `validate_evidence_bundle.py`)

## Full repository validation

All commands completed successfully at the same working-tree state as the
targeted harness validation.

| Gate | Command | Result |
|---|---|---|
| Typecheck | `cd frontend && npm run typecheck` | PASS |
| Lint | `cd frontend && npm run lint` | PASS |
| Frontend full suite | `cd frontend && npm run test` | PASS (240 files; 1902 tests) |
| Frontend regression | `cd frontend && npm run test:regression` | PASS (1 file; 6 tests) |
| Backend full suite | `.venv/bin/python -m pytest backend/tests -q` | PASS (652 tests) |
| Production build | `cd frontend && npm run build` | PASS (3896 modules transformed) |
| Git whitespace check | `git diff --check` | PASS |

The production build emitted the existing chunk-size advisory only; it did not
fail the build.

## Residual findings repair checklist

| Finding | Requirement | Implementation | Validated by |
|---|---|---|---|
| R-01 | PathSafetyError during validate becomes structured fail-closed invalid report | `_path_safety_as_validation_error()`, CLI catches `BundleValidationError` and `PathSafetyError`, exclusive `--output` with `valid: false` | T-27 |
| R-02 | `cleanup_attempted` / `cleanup_succeeded` always booleans; cancellation invariants | `validate_evidence_bundle()` process_result checks; schema `allOf` cancellation rules | T-15, T-24 |
| R-03 | Orphan child test non-conditional; bounded pid wait; `cleanup_succeeded` asserted | `_wait_for_pid_file()`, mandatory `/proc` absence check | T-15, T-24 |
| R-04 | Validator recomputes stale detection from bound manifests with fixed `outputs/` prefix; forged `stale_detected: false` or alternate `outputs_prefix` rejected | `detect_stale_outputs()` recomputation pinned to `outputs/` in `validate_evidence_bundle()`; `evaluated_at_utc` exempt | T-08, T-26 |

## Non-promotion statement

This validation closes EA-01 harness tooling repairs only. No AN-BLK, GOLD-BLK, PAR-BLK, or numeric-release gate status was changed. No fake external machine evidence was created.

## Verdict

**EA-01_HARNESS_VALIDATION_VERDICT: PASS**
