# Project Consolidation Report

**Report date:** 2026-08-01
**Branch:** `agent/archive-ui-preservation-legacy-indexes`
**Overall Phase 2 verdict:** `IN_PROGRESS`

## Executive summary

Phase 2 canonical clone is complete. PR-A (#229), PR-B (#230), PR-C (#231), and PR-D (#232) are merged to `main` (`e455290`). PR-E (UI preservation/legacy indexes) is on this branch: **9 Git-tracked archive package files** (archive README + three index packages), **0 byte-exact source copies**, and **28 source/segment rows indexed** in package `source_manifest.csv` / `source_summary.csv` files (15 UI preservation + 1 startup log + 12 legacy segments). Raw preservation bodies, legacy archive bulk (116833 files), and startup log text remain outside Git in `Projects/` and `local-archive/`. Empty `line-tab-ui-integration-temp` is recorded as `D_EXCLUDED`. No new rows were added to `project_consolidation_manifest.csv` for PR-E index-only work.

## SHA anchors

| Label | SHA | Notes |
| --- | --- | --- |
| Phase 1 observation (`origin/main` at inventory) | `146f6786c9790440504f05c2f33a551ab91ed537` | Short: `146f678` — observation value, not a permanent pin |
| PR-A merge (`main`) | `36f70341f1e9c6913a745d0645a2f619b20f6a50` | #229 local-archive boundary |
| PR-B merge (`main`) | `1cd4f51d53b795ab1b78d85dd9592869b3b2b3da` | #230 bridge research consolidation |
| PR-C merge (`main`) | `beb942bfc09f0669b04dd70c6e38ef32ade18e97` | #231 apollo handoff/research consolidation |
| PR-D merge (`main`) | `e4552901c67b2a504a5fe7ac1efee3b66969f076` | #232 verification/operator evidence |
| PR-E working tree base | `e455290` | Base = PR-D merge; integration uncommitted |

## Phase status

| Step | Description | Verdict |
| --- | --- | --- |
| Gate 0 | Phase 2 user approval | `PASS` |
| Step 1 | Canonical clone (`spacer-clone`) | `PASS` |
| Step 2 | PR-A local-archive boundary | `PASS` |
| Step 2b | Raw archive bulk copy + hash | `PASS` (`118389` files verified) |
| Step 3 | Selective copy + hash (PR-B) | `PASS` (31 artifacts, #230 merged) |
| Step 3b | Selective copy + hash (PR-C) | `PASS` (112 selected; 81 canonical, 31 duplicate skipped; #231 merged) |
| Step 3c | Selective copy + hash (PR-D) | `PASS` (111 selected source rows; 1 byte-exact PNG; derived summaries; #232 merged) |
| Step 3d | Index-only archive packages (PR-E) | `PASS` (28 indexed source/segment rows; 0 byte-exact copies) |
| Step 4 | Secret scan | `PASS` (PR-D/E derived artifacts — no patterns detected) |
| Step 5 | Docs PR merge sequence (A→F; G when required) | `IN_PROGRESS` (PR-A/B/C/D merged; PR-E working tree) |
| Step 6 | Old folder disposition | `NOT_STARTED` |
| Step 7 | Final verification | `NOT_STARTED` |

## PR verdicts

| PR | Scope | Verdict |
| --- | --- | --- |
| PR-A | Local-archive boundary | `PASS` (#229, `36f7034`) |
| PR-B | Bridge research | `PASS` (#230, `1cd4f51`) |
| PR-C | Apollo handoff/research materials | `PASS` (#231, `beb942b`) |
| PR-D | Verification/operator evidence | `PASS` (#232, `e455290`) |
| PR-E | UI preservation/legacy indexes | `READY_FOR_REVIEW` (uncommitted on branch) |
| PR-F | Final manifest/repository index | `NOT_STARTED` |
| PR-G | Newly consolidated docs path normalization (only when required) | `NOT_REQUIRED_YET` |

## PR-A / PR-B / PR-C

Merged deliverables unchanged from prior reports (#229 / #230 / #231).

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

### Representative PNG

| File | SHA-256 | Size | Rights / value |
| --- | --- | ---: | --- |
| `docs/apollo/operator-smoke/evidence/17_sample_loaded.png` | `fecece95cd4c10333e4d11e3e2e9213ded655760177868052ece72af6c0cfe24` | 148257 | Internal UI smoke capture; no secrets/PII; long-term value = sample 200m 5-span bridge loaded guided state |

### Deterministic text transformations

| Transformation | Notes |
| --- | --- |
| Machine-local source prefix → `source://<folder>/` | Applied in U3/PR5/operator derived Markdown |
| Raw JSON → JSON要約 + README tables | `result.json` folded into json-summary; `browser-smoke-summary.json` byte-exact copy retained in Git |
| Checkpoint transcripts → selected_result / summary | Exit codes and pass/fail lines extracted; raw `.txt` not Git-tracked |
| LF / Markdown EOF | Normalized for Git text docs |

## PR-E deliverables (this branch)

| Item | Status |
| --- | --- |
| `docs/archive/README.md` | Done |
| `docs/archive/ui-preservation/` (README + integration_note + source_manifest) | Done — 15 files indexed |
| `docs/archive/legacy-projects/` (README + archive_tree_summary + source_summary) | Done — 12 segment rows; symlinks not dereferenced |
| `docs/archive/startup-records/` (README + source_manifest) | Done — 1 log indexed; no raw copy |
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

### D_EXCLUDED sources

| Source folder | Classification | Reason |
| --- | --- | --- |
| `line-tab-ui-integration-temp` | `D_EXCLUDED` | Empty temporary integration directory; no files to copy or index |

## Local archive structure

| Directory | Purpose |
| --- | --- |
| `local-archive/raw-evidence/` | Raw verification and trace files (`apollo-u3/`) |
| `local-archive/smoke-artifacts/` | Smoke STL/PNG/JSON (`apollo-pr5/`) |
| `local-archive/operator-evidence/` | Operator smoke captures (`apollo/`) |
| `local-archive/manifests/` | Local manifest (`local_archive_manifest.csv`) |
| (other PR-A dirs) | research-originals, restricted-pdf, unknown-rights, legacy-archive, ui-preservation |

`LOCAL_ARCHIVE_STRUCTURE_VERDICT`: `BOUNDARY_DEFINED` (PR-A). Raw archive copy: `VERIFIED` (`118389` files).

## Constraints (unchanged)

- Docs-only integration PRs; no functional code PRs.
- `local-archive/` and ≥50 MiB / rights-unknown / raw binary bulk: Git prohibited.
- Old worktree deletion prohibited; physical delete requires individual path approval.
- Phase 1 external inventory / `final_report.txt` are not modified by PR-D/E worker tasks.

## Next actions

1. Open PR for PR-E archive index artifacts when authorized.
2. Merge PR-E to `main` when approved.
3. Continue with PR-F when authorized.

## External authority

Phase 1 inventory and integration plan live in the repository parent directory and are not modified by PR-E. Source trees `line-tab-ui-preservation-20260729-092526`, `archive`, `docs`, and empty `line-tab-ui-integration-temp` are read-only for this pass.
