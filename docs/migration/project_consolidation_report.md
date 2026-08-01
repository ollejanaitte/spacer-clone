# Project Consolidation Report

**Report date:** 2026-08-01
**Branch:** `agent/record-consolidation-completion`
**Overall Phase 2 verdict:** `COMPLETE_WITH_OLD_FOLDER_DELETION_APPROVAL_PENDING`

## Executive summary

Phase 2 canonical clone is complete through PR-H. PR-A (#229), PR-B (#230), PR-C (#231), PR-D (#232), PR-E (#233), PR-F (#234), PR-G (#235), and PR-H (#236) are merged to `main` (`5bf0077`). PR-H removed two tracked duplicate CSVs discovered in final audit, updated two central-manifest provenance rows to `DUPLICATE_SKIPPED`, and aligned path map and apollo research README counts. Central manifest remains **145 data rows** with **112** `CANONICAL` and **33** `DUPLICATE_SKIPPED` (SHA `61fdbf98106065c2243452128b114ce85900d9a3ae42956e2b955d6376d6b460`; zero source/hash/size errors; path-map missing zero; canonical duplicate groups zero; consolidation-added exact duplicate groups zero). Local manifest records **118389** `local-archive/` rows (SHA `2da55c3d131f3c2fee85ee04a816c73446e18e333e58361a012d7e816a522a18`; earlier full 5.11 GiB audit had zero errors). Immutable README snapshot remediation was completed locally under Git-ignored `local-archive/` after PR-G merge — not merged to `main`. **146** consolidation-added Git-tracked files remain after dedupe (representative PNG only; no PDF/ZIP/XWD/STL tracked). `local-archive/` is Git-ignored and untracked; tracked/untracked working tree clean; no added file above 50 MiB; no forbidden raw/archive/cache/node_modules/.venv/build files tracked. Active worktrees `spacer-clone-main` and `spacer-clone-apollo-u3` are `KEEP_WORKTREE`. Integrated `Projects/` sources are `DELETE_SAFE` candidates pending individual approval. Empty `line-tab-ui-integration-temp` is `D_EXCLUDED`.

## SHA anchors

| Label | SHA | Notes |
| --- | --- | --- |
| Phase 1 observation (`origin/main` at inventory) | `146f6786c9790440504f05c2f33a551ab91ed537` | Short: `146f678` — observation value, not a permanent pin |
| PR-A merge (`main`) | `36f70341f1e9c6913a745d0645a2f619b20f6a50` | #229 local-archive boundary |
| PR-B merge (`main`) | `1cd4f51d53b795ab1b78d85dd9592869b3b2b3da` | #230 bridge research consolidation |
| PR-C merge (`main`) | `beb942bfc09f0669b04dd70c6e38ef32ade18e97` | #231 apollo handoff/research consolidation |
| PR-D merge (`main`) | `e4552901c67b2a504a5fe7ac1efee3b66969f076` | #232 verification/operator evidence |
| PR-E merge (`main`) | `e569f3f27a5a59f5d5cae133bfd5478f51eba81c` | #233 UI preservation/legacy indexes |
| PR-F merge (`main`) | `bafe168fe37b8df786728bfb88c84c545aab8d0e` | #234 final manifest/repository index |
| PR-G merge (`main`) | `2533ca3dd73fe07fed90f473edda10de46b3f718` | #235 newly consolidated docs path normalization |
| PR-H merge (`main`) | `5bf0077763998ce3e570e83c52856db5aa3c1501` | #236 exact-SHA deduplication — post-#236 audit anchor |
| Post-#236 audit (`HEAD` / `origin/main` / GitHub `main`) | `5bf0077763998ce3e570e83c52856db5aa3c1501` | Short: `5bf0077` |

## Phase status

| Step | Description | Verdict |
| --- | --- | --- |
| Gate 0 | Phase 2 user approval | `PASS` |
| Step 1 | Canonical clone (`spacer-clone`) | `PASS` |
| Step 2 | PR-A local-archive boundary | `PASS` |
| Step 2b | Raw archive bulk copy + hash | `PASS` (`118389` files verified) |
| Step 3 | Selective copy + hash (PR-B) | `PASS` (31 artifacts, #230 merged) |
| Step 3b | Selective copy + hash (PR-C) | `PASS` (112 selected; 79 canonical in research tree + handoffs; 33 duplicate skipped; #231 merged) |
| Step 3c | Selective copy + hash (PR-D) | `PASS` (111 selected source rows; 1 byte-exact PNG; derived summaries; #232 merged) |
| Step 3d | Index-only archive packages (PR-E) | `PASS` (28 indexed source/segment rows; 0 byte-exact copies; #233 merged) |
| Step 3e | Final manifest/repository index (PR-F) | `PASS` (#234 merged, `bafe168`) |
| Step 3f | Newly consolidated docs path normalization (PR-G) | `PASS` (#235 merged, `2533ca3`) |
| Step 3g | Exact-SHA deduplication (PR-H) | `PASS` (#236 merged, `5bf0077`; 2 tracked duplicates removed; manifest/path map/README aligned) |
| Step 4 | Secret scan | `PASS` (PR-D/E derived artifacts — no patterns detected) |
| Step 5 | Docs PR merge sequence (A→H) | `COMPLETE` (PR-A through PR-H merged through #236) |
| Step 6 | Old folder disposition | `DOCUMENTED` (labels in `old_folder_disposition.md`; physical delete pending individual approval) |
| Step 7 | Final verification | `PASS` (post-#236 audit; see verified facts below) |

## PR verdicts

| PR | Scope | Verdict |
| --- | --- | --- |
| PR-A | Local-archive boundary | `PASS` (#229, `36f7034`) |
| PR-B | Bridge research | `PASS` (#230, `1cd4f51`) |
| PR-C | Apollo handoff/research materials | `PASS` (#231, `beb942b`) |
| PR-D | Verification/operator evidence | `PASS` (#232, `e455290`) |
| PR-E | UI preservation/legacy indexes | `PASS` (#233, `e569f3f`) |
| PR-F | Final manifest/repository index | `PASS` (#234, `bafe168`) |
| PR-G | Newly consolidated docs path normalization | `PASS` (#235, `2533ca3`) |
| PR-H | Exact-SHA deduplication (2 CSV copies) | `PASS` (#236, `5bf0077`) |

## PR-A / PR-B / PR-C

Merged deliverables unchanged from prior reports (#229 / #230 / #231), except PR-H removed two exact-duplicate tracked copies under `docs/apollo/research/consolidated-2026-08-01/standards/`:

| Removed duplicate | Canonical retained path | Git SHA (normalized) |
| --- | --- | --- |
| `standards/stage5a_external_research_handoff.csv` | `docs/apollo/design-standards/research/consolidated-2026-08-01/stage5a_external_research_handoff.csv` | `8bd562da80674abedbef260c93fa5b550fa8ca7f1035e842012f6c543dd5edca` |
| `standards/stage5_apollo_return_resolution.csv` | `docs/apollo/handoffs/consolidated-2026-08-01/external-handoffs/SC-20260726-001/review/apollo_return_review.csv` | `b3683eb0631faec53aa8099741231ccac3c037c30309b393a94af34dac81174e` |

## PR-D deliverables (#232 merged)

| Item | Status |
| --- | --- |
| `docs/apollo/u3-evidence/summary/` (summary + selected_result + source_manifest + manifest) | Merged |
| `docs/apollo/pr5-smoke/` (README + browser-smoke-summary.json + json-summary + source_manifest + manifest) | Merged |
| `docs/apollo/operator-smoke/` (report + source_manifest + manifest + 1 representative PNG) | Merged |
| `docs/apollo/index/README.md` | Merged |
| Apollo / migration README index updates | Merged |
| `project_consolidation_manifest.csv` PR-D rows | Merged — 2 `CANONICAL` byte-exact source-copy rows |
| Path normalization (`source://apollo-u3-evidence/`, `source://apollo-pr5-smoke/`, `source://apollo_operator_smoke_evidence/`, `source://spacer-clone-apollo-u3/`) | Done — derived docs + manifest notes |
| Package-level duplicate indexing | U3 source manifest records 4 empty stderr files with the same SHA; no duplicate raw body is copied into Git |
| Quality gates (secrets, >50 MiB, forbidden binaries) | PASS on working tree |

### PR-D selection counts

| Source | Source files indexed (`source_manifest.csv`) | Git-tracked package | Byte-exact copies | Excluded from Git |
| --- | ---: | --- | ---: | --- |
| `Projects/apollo-u3-evidence` | 34 | summary + selected_result + source_manifest + manifest + README | 0 | 34 raw `.txt` |
| `Projects/apollo-pr5-smoke` | 16 | README + json-summary + source_manifest + manifest + browser-smoke-summary.json | 1 (`browser-smoke-summary.json`) | 8 STL + 4 `.apollo.json` + 1 PNG + 1 log + 1 `result.json` (folded into json-summary) |
| `Projects/apollo_operator_smoke_evidence` | 61 | report + source_manifest + manifest + README + 1 PNG | 1 (`17_sample_loaded.png`) | 59 PNG + 1 XWD |

## PR-E deliverables (#233 merged)

| Item | Status |
| --- | --- |
| `docs/archive/README.md` | Merged |
| `docs/archive/ui-preservation/` (README + integration_note + source_manifest) | Merged — 15 files indexed |
| `docs/archive/legacy-projects/` (README + archive_tree_summary + source_summary) | Merged — 12 segment rows; symlinks not dereferenced |
| `docs/archive/startup-records/` (README + source_manifest) | Merged — 1 log indexed; no raw copy |
| `line-tab-ui-integration-temp` disposition | `D_EXCLUDED` — empty directory (0 files) |
| `project_consolidation_manifest.csv` PR-E rows | None — index-only work; no fake source-copy rows |
| Path normalization | `source://line-tab-ui-preservation-20260729-092526/`, `source://archive/`, `source://docs/` |
| Quality gates (secrets, symlink dereference policy) | PASS — startup log reviewed; archive inventory without symlink follow |

### PR-E selection counts

| Source | Rows indexed | Git-tracked package | Byte-exact copies | Excluded from Git |
| --- | ---: | --- | ---: | --- |
| `Projects/line-tab-ui-preservation-20260729-092526` | 15 | ui-preservation README + integration_note + source_manifest | 0 | 15 preservation bodies + diffs |
| `Projects/archive` | 12 segments | legacy-projects README + archive_tree_summary + source_summary | 0 | 116833 files (~2.3 GiB bulk) |
| `Projects/docs` | 1 | startup-records README + source_manifest | 0 | 1 startup log (536 bytes) |
| `Projects/line-tab-ui-integration-temp` | 0 | — | 0 | `D_EXCLUDED` empty scratch |

## PR-F deliverables (#234 merged)

| Item | Status |
| --- | --- |
| [project_consolidation_path_map.md](project_consolidation_path_map.md) | Merged — all source → Git / local-archive / excluded mappings |
| [old_folder_disposition.md](old_folder_disposition.md) | Merged — `KEEP_WORKTREE`, `KEEP_EXTERNAL`, `DELETE_SAFE` candidate labels |
| [project_consolidation_summary.md](project_consolidation_summary.md) | Merged — PR A–E rollup, central/local manifest aggregates |
| [README.md](README.md) | Merged — PR-F document index |
| [../README.md](../README.md) | Merged — Apollo/archive/migration navigation |
| `project_consolidation_manifest.csv` | Unchanged row count — 145 data rows at merge |

## PR-G deliverables (#235 merged)

| Item | Status |
| --- | --- |
| `local_archive_policy.md` machine-local provenance example | Normalized |
| Immutable README snapshot remediation | Completed locally after PR-G merge under Git-ignored `local-archive/` — not merged to `main`; local manifest SHA `2da55c3d131f3c2fee85ee04a816c73446e18e333e58361a012d7e816a522a18`; 118389 rows; zero verification errors |

## PR-H deliverables (#236 merged)

| Item | Status |
| --- | --- |
| Remove duplicate `standards/stage5a_external_research_handoff.csv` | Merged |
| Remove duplicate `standards/stage5_apollo_return_resolution.csv` | Merged |
| `project_consolidation_manifest.csv` | Merged — 2 provenance rows `DUPLICATE_SKIPPED`; central SHA `61fdbf98106065c2243452128b114ce85900d9a3ae42956e2b955d6376d6b460` |
| [project_consolidation_path_map.md](project_consolidation_path_map.md) | Merged — 2 rows aligned |
| [../apollo/research/consolidated-2026-08-01/README.md](../apollo/research/consolidated-2026-08-01/README.md) | Merged — 79/33 canonical/skipped; 67 tracked files; standards 7/14 |

### Disposition summary

| Label | Paths |
| --- | --- |
| `CANONICAL` | `spacer-clone` |
| `KEEP_WORKTREE` | `spacer-clone-main`, `spacer-clone-apollo-u3` |
| `KEEP_EXTERNAL` | `project_inventory.txt`, `project_integration_plan.txt`, `final_report.txt` |
| `DELETE_SAFE` candidate (pending approval) | Integrated `Projects/` sources (bridge research, apollo, evidence, archive, UI preservation, startup log) |
| `D_EXCLUDED` | `line-tab-ui-integration-temp` (empty) |

## Local archive structure

| Directory | Purpose |
| --- | --- |
| `local-archive/raw-evidence/` | Raw verification and trace files (`apollo-u3/`, `top-level-docs/`) |
| `local-archive/smoke-artifacts/` | Smoke STL/PNG/JSON (`apollo-pr5/`) |
| `local-archive/operator-evidence/` | Operator smoke captures (`apollo/`) |
| `local-archive/manifests/` | Local manifest (`local_archive_manifest.csv`, 118389 rows) |
| `local-archive/legacy-archive/` | External archive bulk (`archive/`) |
| `local-archive/ui-preservation/` | UI preservation bodies |
| (other PR-A dirs) | research-originals, restricted-pdf, unknown-rights |

`LOCAL_ARCHIVE_STRUCTURE_VERDICT`: `BOUNDARY_DEFINED` (PR-A). Raw archive copy: `VERIFIED` (`118389` files).

## Post-#236 final verification (verified facts)

| Check | Result |
| --- | --- |
| `HEAD` / `origin/main` / GitHub `main` | All `5bf0077763998ce3e570e83c52856db5aa3c1501` (`5bf0077`) |
| Central manifest rows / `CANONICAL` / `DUPLICATE_SKIPPED` | 145 / 112 / 33 |
| Central manifest SHA-256 | `61fdbf98106065c2243452128b114ce85900d9a3ae42956e2b955d6376d6b460` |
| Central manifest source/hash/size errors | **0** |
| Path-map missing rows | **0** |
| Canonical duplicate groups | **0** |
| Consolidation-added exact duplicate groups | **0** |
| Local manifest rows / SHA-256 | 118389 / `2da55c3d131f3c2fee85ee04a816c73446e18e333e58361a012d7e816a522a18` |
| Full 5.11 GiB local-archive audit errors | **0** |
| `local-archive/` | Git-ignored and untracked |
| Tracked/untracked working tree | Clean |
| Files added above 50 MiB | **0** |
| Forbidden raw/archive/cache/node_modules/.venv/build files tracked | **0** |
| Consolidation-added files after dedupe | **146** (87 md, 53 csv originally before deletion, 7 json, 1 png) |
| Binary policy | Representative PNG only; no PDF/ZIP/XWD/STL tracked by consolidation |

## Constraints (unchanged)

- Docs-only integration PRs; no functional code PRs.
- `local-archive/` and ≥50 MiB / rights-unknown / raw binary bulk: Git prohibited.
- Old worktree deletion prohibited; physical delete requires individual path approval.
- Phase 1 external inventory / `final_report.txt` are not modified by PR-D/E/F/G/H or completion-record updates.

## Remaining actions

1. Process individual delete approvals for `DELETE_SAFE` candidates if requested (`spacer-clone-main` and `spacer-clone-apollo-u3` remain `KEEP_WORKTREE`).

## External authority

Phase 1 inventory and integration plan live in the repository parent directory (`KEEP_EXTERNAL`) and are not modified by completion-record updates. Source trees under `Projects/` are read-only for consolidation passes; disposition labels are in [old_folder_disposition.md](old_folder_disposition.md).
