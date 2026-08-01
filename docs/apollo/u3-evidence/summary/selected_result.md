# Apollo U3 Selected Result

**Source:** `source://apollo-u3-evidence/`
**Selection rule:** Prefer `*_after_fix` transcripts where present; otherwise the single checkpoint5 artifact for that gate. Raw bodies remain outside Git.

## Selected gate table

| Gate id | Selected source path | Exit | Result summary |
| --- | --- | ---: | --- |
| apollo_hygiene | `checkpoint5/apollo_hygiene.txt` | 0 | Apollo source hygiene check passed (`source://spacer-clone-apollo-u3/frontend/src/apollo`) |
| backend_relevant | `checkpoint5/backend_relevant.txt` | 0 | 73 passed in 2.75s |
| backend_schema_extra | `checkpoint5/backend_schema_extra.txt` | 0 | 19 passed in 1.30s |
| electron_compile | `checkpoint5/electron_compile.txt` | 0 | `tsc` electron compile OK |
| electron_test | `checkpoint5/electron_test.txt` | 0 | 3 files / 23 tests passed |
| electron_version_xvfb | `checkpoint5/electron_version_xvfb.txt` | 0 | Electron v42.3.3 |
| focus_test_debug | `checkpoint5/focus_test_debug.txt` | (implicit 0) | 1 passed / 16 skipped |
| frontend_apollo_suite | `checkpoint5/frontend_apollo_suite_after_fix.txt` | 0 | 25 files / 151 tests passed |
| frontend_build | `checkpoint5/frontend_build.txt` | 0 | vite production build OK (~9.28s) |
| frontend_lint | `checkpoint5/frontend_lint_after_fix.txt` | 0 | Hygiene passed; Japanese-string review findings remain informational |
| frontend_regression | `checkpoint5/frontend_regression.txt` | 1 | FAIL — BridgeDefinition regression requires project Python venv at `source://spacer-clone-apollo-u3/.venv` |
| frontend_targeted_u3 | `checkpoint5/frontend_targeted_u3.txt` | 0 | 5 files / 32 tests passed |
| frontend_test_excluding_python_venv | `checkpoint5/frontend_test_excluding_python_venv.txt` | 0 | 256 files / 1975 tests passed |
| frontend_test_full | `checkpoint5/frontend_test_full_after_fix.txt` | 1 | 256 files passed / 1 suite failed (semanticParity golden needs `.venv`); 1975 tests passed |
| frontend_typecheck | `checkpoint5/frontend_typecheck_after_fix.txt` | 0 | `tsc -b` OK |
| git_diff_check | `checkpoint5/git_diff_check_after_fix.txt` | 0 | `git diff --check` clean |
| git_diff_check_range | `checkpoint5/git_diff_check_range.txt` | 0 | range check clean |
| grok_checkpoint2 | `grok-audits/checkpoint2_cursor-grok-4.5-high-fast_attempt1.txt` | 0 | Read-only audit transcript retained in local-archive |
| grok_checkpoint3 | `grok-audits/checkpoint3_cursor-grok-4.5-high-fast_attempt3.txt` | 0 | Findings: P1 App import/export scope drift; P2 validation navigator focus gaps |

## Superseded pre-fix artifacts (indexed, not selected as final)

| Path | Note |
| --- | --- |
| `checkpoint5/frontend_apollo_suite.txt` | Pre-fix failure in suite discoverability; superseded by `*_after_fix` |
| `checkpoint5/frontend_test_full.txt` | Pre-fix Apollo focus + suite failures; superseded by `*_after_fix` |
| `checkpoint5/frontend_lint.txt` | Superseded by `frontend_lint_after_fix.txt` |
| `checkpoint5/frontend_typecheck.txt` | Superseded by `frontend_typecheck_after_fix.txt` |
| `checkpoint5/git_diff_check.txt` | Same hash as after_fix; after_fix selected for naming consistency |
| `grok-audits/checkpoint3_*_attempt1.txt` / `attempt2.txt` | Intermediate audits; attempt3 selected |

## Aggregate selected verdict

```text
U3_SELECTED_RESULT_VERDICT: PARTIAL_PASS
PASS_CORE: typecheck, lint exit 0, build, hygiene, electron, backend, apollo suite after_fix, frontend excl-venv
FAIL_OR_BLOCKED: frontend_regression (venv); frontend_test_full_after_fix suite fail (venv semanticParity)
AUDIT_NOTE: Grok checkpoint3 attempt3 recorded P1/P2 findings against historical U3 worktree
```
