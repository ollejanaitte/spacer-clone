# Startup Records (External Docs Log)

**PR:** PR-E
**Source:** `docs/apollo/phase1-orchestration/electron-verification/startup_log.txt` (external `Projects/docs/` tree)

Single electron verification startup log from the top-level `Projects/docs/` folder. The raw log body is **not** copied into Git. Retention is under `local-archive/raw-evidence/top-level-docs/`.

## Summary

| Field | Value |
| --- | --- |
| Source path | `docs/apollo/phase1-orchestration/electron-verification/startup_log.txt` |
| SHA-256 | `096277438a8d71cb8f609631286bcd7937e893dd36a95225bb27dd23a4bf2364` |
| Size | 536 bytes |
| Classification | `C_EVIDENCE` |
| Git managed | `false` |
| Verification start | 2026-07-29T01:09:28Z (local Tuesday 2026-07-28 evening) |

## Log outcome (sanitized)

| Step | Result |
| --- | --- |
| `electron-compile` | Failed — `npm` reported `ENOENT` because `package.json` was missing in the invocation working directory |
| Error class | `ENOENT` — verification ran outside the repository root |
| Secrets / PII | None observed in the indexed log |

The failure indicates the electron compile step was invoked without a repository `package.json` in the current working directory. It does not, by itself, prove an application compile defect.

## Related copy note

A separate `startup_log.txt` exists under the main repository `docs/apollo/phase1-orchestration/unit2/07_electron/` with a different SHA-256 from later unit2 electron work. This package indexes only the external `Projects/docs/` copy.

## Retention

| Item | Location |
| --- | --- |
| Raw log body | `local-archive/raw-evidence/top-level-docs/apollo/phase1-orchestration/electron-verification/startup_log.txt` |
| Index | [source_manifest.csv](source_manifest.csv) |

No row added to `project_consolidation_manifest.csv` (index-only; no byte-exact Git copy).
