# Apollo U3 Verification Evidence Summary

**PR:** PR-D verification/operator evidence consolidation
**Source:** `apollo-u3-evidence` (`source://apollo-u3-evidence/`)
**Evidence date:** 2026-07-30
**Authority:** Summary and index only — does not amend Step 1, DS-00..09, or application code.

## Scope

Read-only consolidation of Apollo Unit 3 (U3) checkpoint evidence collected against worktree `source://spacer-clone-apollo-u3/`. Git tracks this summary, the [manifest](manifest.csv), and the [selected result](selected_result.md). Raw checkpoint `.txt` bodies are **not** Git-tracked.

## Source inventory

| Area | Files | Role |
| --- | ---: | --- |
| `checkpoint5/` | 22 | Gate command transcripts (typecheck, lint, tests, build, electron, git diff) |
| `grok-audits/` | 12 | Read-only Cursor Grok audit transcripts and metadata (checkpoints 2–3) |
| **Total** | **34** | See [manifest.csv](manifest.csv) for SHA-256 and size |

## Selected outcome (after-fix posture)

| Gate | Selected artifact | Result |
| --- | --- | --- |
| Apollo suite | `checkpoint5/frontend_apollo_suite_after_fix.txt` | PASS — 25 files / 151 tests |
| Frontend tests (excl. Python-venv goldens) | `checkpoint5/frontend_test_excluding_python_venv.txt` | PASS — 256 files / 1975 tests |
| Frontend full suite | `checkpoint5/frontend_test_full_after_fix.txt` | PARTIAL — 1975 tests passed; 1 suite failed (missing `.venv` for BridgeDefinition semanticParity) |
| Regression golden | `checkpoint5/frontend_regression.txt` | FAIL — requires project Python venv |
| Typecheck / lint / build / hygiene / electron / backend | corresponding `checkpoint5/*` | PASS (`EXIT:0`) |
| Grok Checkpoint 3 audit (attempt 3) | `grok-audits/checkpoint3_cursor-grok-4.5-high-fast_attempt3.txt` | Findings recorded (P1 scope-drift import/export; P2 navigator focus gaps) — audit only |

Detail: [selected_result.md](selected_result.md).

## Explicit exclusions (Git)

| Category | Count | Retention |
| --- | ---: | --- |
| Raw checkpoint / audit `.txt` | 34 | `local-archive/raw-evidence/apollo-u3/` (and external source folder) |

## Path normalization

Machine-local absolute paths observed in raw transcripts (Projects-root worktree and evidence folders) are recorded in this Git package as:

- `source://apollo-u3-evidence/`
- `source://spacer-clone-apollo-u3/`

## Verdict

```text
U3_EVIDENCE_SUMMARY_VERDICT: COMPLETE_WITH_KNOWN_GAPS
KNOWN_GAPS: BridgeDefinition Python-venv goldens; Grok audit P1/P2 findings (historical, read-only)
NUMERIC_RELEASE_READINESS: BLOCKED (unchanged — Step 1 / DS-09 authority)
```

## Related

- [Selected result](selected_result.md)
- [Manifest](manifest.csv)
- [Apollo verification index](../../index/README.md)
- [Migration policy](../../../migration/local_archive_policy.md)
