# Project Consolidation Summary

**PR:** PR-F final manifest/repository index
**Date:** 2026-08-01
**Branch:** `agent/finalize-project-consolidation-index`
**Base:** `main` @ `e569f3f27a5a59f5d5cae133bfd5478f51eba81c` (PR-E #233 merged)

Executive rollup for Phase 2 PR-A through PR-E merges and manifest boundaries. Detail: [project_consolidation_path_map.md](project_consolidation_path_map.md), [old_folder_disposition.md](old_folder_disposition.md).

## PR merge results (A–E)

| PR | Focus | GitHub | Merge commit (`main`) | Short |
| --- | --- | ---: | --- | --- |
| PR-A | Local-archive boundary | #229 | `36f70341f1e9c6913a745d0645a2f619b20f6a50` | `36f7034` |
| PR-B | Bridge research consolidation | #230 | `1cd4f51d53b795ab1b78d85dd9592869b3b2b3da` | `1cd4f51` |
| PR-C | Apollo handoff/research materials | #231 | `beb942bfc09f0669b04dd70c6e38ef32ade18e97` | `beb942b` |
| PR-D | Verification/operator evidence | #232 | `e4552901c67b2a504a5fe7ac1efee3b66969f076` | `e455290` |
| PR-E | UI preservation/legacy indexes | #233 | `e569f3f27a5a59f5d5cae133bfd5478f51eba81c` | `e569f3f` |
| PR-F | Final manifest/repository index | — | Working tree on `agent/finalize-project-consolidation-index` | — |

Phase 1 observation anchor (inventory time): `146f6786c9790440504f05c2f33a551ab91ed537` (`146f678`) — not a permanent pin.

## Central manifest (`project_consolidation_manifest.csv`)

Git-tracked provenance for byte-exact copies into `docs/`. **PR-F does not add or modify rows.**

| Metric | Value |
| --- | ---: |
| Data rows | **145** |
| SHA-256 (file) | `ff0dbc90c3b8ea42d8e5e854a2ed317aac56443e55e19e1c4ed77d10ec9d6fe2` |

### By `classification`

| Classification | Rows |
| --- | ---: |
| `A_MAIN` | 144 |
| `C_EVIDENCE` | 1 |

### By `duplicate_status`

| Status | Rows |
| --- | ---: |
| `CANONICAL` | 114 |
| `DUPLICATE_SKIPPED` | 31 |

### By `original_folder`

| Folder | Rows |
| --- | ---: |
| `apollo` | 112 |
| `bridge-standards-research` | 31 |
| `apollo-pr5-smoke` | 1 |
| `apollo_operator_smoke_evidence` | 1 |

### By `rights_status`

| Status | Rows |
| --- | ---: |
| `REVIEWED_SUMMARY_OR_METADATA` | 144 |
| `INTERNAL_UI_SCREENSHOT_NO_PII` | 1 |

All central rows: `git_managed=true`.

## Local manifest (`local-archive/manifests/local_archive_manifest.csv`)

Git-ignored operational manifest for `local-archive/` copies. Created PR-A onward; verified bulk copy **118389 files**.

| Metric | Value |
| --- | ---: |
| Data rows | **118389** |
| SHA-256 (file) | `60955644d98e7329240de9a60b4d6b43b33297fdfddd6a625ec90727bd5799d5` |

### By `classification`

| Classification | Rows |
| --- | ---: |
| `DUPLICATE_SKIPPED` | 76638 |
| `B_ARCHIVE` | 41361 |
| `C_EVIDENCE` | 312 |
| `E_HOLD` | 78 |

### By `original_folder` (top sources)

| Folder | Rows |
| --- | ---: |
| `archive` | 117026 |
| `bridge-standards-research` | 702 |
| `apollo` | 534 |
| `apollo_operator_smoke_evidence` | 61 |
| `apollo-u3-evidence` | 34 |
| `apollo-pr5-smoke` | 16 |
| `line-tab-ui-preservation-20260729-092526` | 15 |
| `docs` | 1 |

All local rows: `git_managed=false`.

## Raw boundaries (what stays outside Git)

| Boundary | Rule | Examples |
| --- | --- | --- |
| `local-archive/` tree | Entire tree Git-ignored (PR-A) | Archive bulk, smoke STL/PNG, operator captures, UI preservation bodies |
| Files ≥ 50 MiB | `E_HOLD` in `restricted-pdf/` | Bridge research PDFs |
| Derived PR-D/E packages | Git tracks README/manifest/summary and two selected PR-D source copies only | U3 transcripts, legacy archive segments, startup log |
| Active worktrees | `KEEP_WORKTREE` | `spacer-clone-main`, `spacer-clone-apollo-u3` |
| External authority/reporting | `KEEP_EXTERNAL` | Phase 1 inventory/plan plus the Phase 2-updated `final_report.txt` |
| Empty scratch | `D_EXCLUDED` | `line-tab-ui-integration-temp` |

`LOCAL_ARCHIVE_STRUCTURE_VERDICT`: `BOUNDARY_DEFINED` (PR-A). Raw archive copy: `VERIFIED` (118389 files in local manifest).

## PR-F deliverables (this branch)

| Artifact | Status |
| --- | --- |
| [project_consolidation_path_map.md](project_consolidation_path_map.md) | Done — all source mappings |
| [old_folder_disposition.md](old_folder_disposition.md) | Done — disposition labels |
| [project_consolidation_summary.md](project_consolidation_summary.md) | Done — this document |
| [README.md](README.md) | Updated — PR-F index |
| [project_consolidation_report.md](project_consolidation_report.md) | Updated — PR-E merged, PR-F working tree |
| [../README.md](../README.md) | Updated — Apollo/archive/migration navigation |

Central manifest unchanged. No `final_report.txt` generation in PR-F scope.

PR-G remains required to normalize one machine-local provenance example in `local_archive_policy.md`; no application or pre-existing product documentation is in scope.
