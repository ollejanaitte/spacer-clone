# Project Consolidation Summary

**PR:** Final completion-record update (post PR-H)
**Date:** 2026-08-01
**Branch:** `agent/record-consolidation-completion`
**Base:** `main` @ `5bf0077763998ce3e570e83c52856db5aa3c1501` (PR-H #236 merged)

Executive rollup for Phase 2 PR-A through PR-H merges and manifest boundaries. Detail: [project_consolidation_path_map.md](project_consolidation_path_map.md), [old_folder_disposition.md](old_folder_disposition.md).

## PR merge results (A–H)

| PR | Focus | GitHub | Merge commit (`main`) | Short |
| --- | --- | ---: | --- | --- |
| PR-A | Local-archive boundary | #229 | `36f70341f1e9c6913a745d0645a2f619b20f6a50` | `36f7034` |
| PR-B | Bridge research consolidation | #230 | `1cd4f51d53b795ab1b78d85dd9592869b3b2b3da` | `1cd4f51` |
| PR-C | Apollo handoff/research materials | #231 | `beb942bfc09f0669b04dd70c6e38ef32ade18e97` | `beb942b` |
| PR-D | Verification/operator evidence | #232 | `e4552901c67b2a504a5fe7ac1efee3b66969f076` | `e455290` |
| PR-E | UI preservation/legacy indexes | #233 | `e569f3f27a5a59f5d5cae133bfd5478f51eba81c` | `e569f3f` |
| PR-F | Final manifest/repository index | #234 | `bafe168fe37b8df786728bfb88c84c545aab8d0e` | `bafe168` |
| PR-G | Newly consolidated docs path normalization | #235 | `2533ca3dd73fe07fed90f473edda10de46b3f718` | `2533ca3` |
| PR-H | Exact-SHA deduplication (2 tracked duplicates removed) | #236 | `5bf0077763998ce3e570e83c52856db5aa3c1501` | `5bf0077` |

Phase 1 observation anchor (inventory time): `146f6786c9790440504f05c2f33a551ab91ed537` (`146f678`) — not a permanent pin.

## Post-#236 audit (verified)

| Check | Result |
| --- | --- |
| `HEAD` / `origin/main` / GitHub `main` | All `5bf0077763998ce3e570e83c52856db5aa3c1501` (`5bf0077`) |
| Central manifest source/hash/size errors | **0** |
| Path-map missing rows | **0** |
| Canonical duplicate groups | **0** |
| Consolidation-added exact duplicate groups | **0** |
| Tracked/untracked working tree | Clean |
| Files added above 50 MiB | **0** |
| Forbidden raw/archive/cache/node_modules/.venv/build files tracked | **0** |
| `local-archive/` | Git-ignored and untracked |

## Central manifest (`project_consolidation_manifest.csv`)

Git-tracked provenance for byte-exact copies into `docs/`. PR-H updated two PR-C provenance rows to `DUPLICATE_SKIPPED` and removed two redundant tracked copies.

| Metric | Value |
| --- | ---: |
| Data rows | **145** |
| SHA-256 (file) | `61fdbf98106065c2243452128b114ce85900d9a3ae42956e2b955d6376d6b460` |

### By `classification`

| Classification | Rows |
| --- | ---: |
| `A_MAIN` | 144 |
| `C_EVIDENCE` | 1 |

### By `duplicate_status`

| Status | Rows |
| --- | ---: |
| `CANONICAL` | 112 |
| `DUPLICATE_SKIPPED` | 33 |

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

Git-ignored operational manifest for `local-archive/` copies. Created PR-A onward; verified bulk copy **118389 files**. Immutable README snapshot remediation was completed locally under Git-ignored `local-archive/` after PR-G merge — not merged to `main`.

| Metric | Value |
| --- | ---: |
| Data rows | **118389** |
| SHA-256 (file) | `2da55c3d131f3c2fee85ee04a816c73446e18e333e58361a012d7e816a522a18` |

Earlier full **5.11 GiB** local-archive audit: **0** errors.

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

## Consolidation-added Git-tracked files (post dedupe)

**146** files remain after PR-H exact-SHA deduplication (originally 148 before 2 CSV removals: 87 md, 53 csv, 7 json, 1 png). Representative PNG only; no PDF/ZIP/XWD/STL tracked by consolidation.

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

## Completion record (this branch)

| Artifact | Status |
| --- | --- |
| Remove `docs/apollo/research/consolidated-2026-08-01/standards/stage5a_external_research_handoff.csv` | Merged — PR-H #236; canonical: `docs/apollo/design-standards/research/consolidated-2026-08-01/stage5a_external_research_handoff.csv` |
| Remove `docs/apollo/research/consolidated-2026-08-01/standards/stage5_apollo_return_resolution.csv` | Merged — PR-H #236; canonical: `docs/apollo/handoffs/consolidated-2026-08-01/external-handoffs/SC-20260726-001/review/apollo_return_review.csv` |
| [project_consolidation_manifest.csv](project_consolidation_manifest.csv) | Merged — 2 rows `DUPLICATE_SKIPPED` |
| [project_consolidation_path_map.md](project_consolidation_path_map.md) | Merged — 2 rows aligned |
| [../apollo/research/consolidated-2026-08-01/README.md](../apollo/research/consolidated-2026-08-01/README.md) | Merged — counts 79/33 canonical/skipped; 67 tracked files |
| [project_consolidation_summary.md](project_consolidation_summary.md) | This document — final completion-record update |
| [project_consolidation_report.md](project_consolidation_report.md) | Final completion-record update — Phase 2 `COMPLETE_WITH_OLD_FOLDER_DELETION_APPROVAL_PENDING` |

Old-folder physical deletion remains pending individual approval per [old_folder_disposition.md](old_folder_disposition.md). No `final_report.txt` generation in this branch scope.
