# Project Consolidation Report

**Report date:** 2026-08-01
**Branch:** `agent/consolidate-apollo-verification-evidence`
**Overall Phase 2 verdict:** `IN_PROGRESS`

## Executive summary

Phase 2 canonical clone is complete. PR-A (#229), PR-B (#230), and PR-C (#231) are merged to `main` (`beb942b`). PR-D (verification/operator evidence) is ready on this branch: **16 Git-tracked package files** (summaries, manifests, indexes), **2 byte-exact copies** (`browser-smoke-summary.json`, representative operator PNG), and **111 source files indexed** in package `source_manifest.csv` files (34 U3 + 16 PR5 + 61 operator). Raw checkpoint txt, STL/PNG/log/raw JSON, and non-representative operator PNG/XWD remain outside Git in `local-archive/`. Paths use Projects-relative folders in manifests and `source://<folder>/` in narratives.

## SHA anchors

| Label | SHA | Notes |
| --- | --- | --- |
| Phase 1 observation (`origin/main` at inventory) | `146f6786c9790440504f05c2f33a551ab91ed537` | Short: `146f678` — observation value, not a permanent pin |
| PR-A merge (`main`) | `36f70341f1e9c6913a745d0645a2f619b20f6a50` | #229 local-archive boundary |
| PR-B merge (`main`) | `1cd4f51d53b795ab1b78d85dd9592869b3b2b3da` | #230 bridge research consolidation |
| PR-C merge (`main`) | `beb942bfc09f0669b04dd70c6e38ef32ade18e97` | #231 apollo handoff/research consolidation |
| PR-D working tree base | `beb942bfc09f0669b04dd70c6e38ef32ade18e97` | Base = PR-C merge; integration uncommitted |

## Phase status

| Step | Description | Verdict |
| --- | --- | --- |
| Gate 0 | Phase 2 user approval | `PASS` |
| Step 1 | Canonical clone (`spacer-clone`) | `PASS` |
| Step 2 | PR-A local-archive boundary | `PASS` |
| Step 2b | Raw archive bulk copy + hash | `PASS` (`118389` files verified) |
| Step 3 | Selective copy + hash (PR-B) | `PASS` (31 artifacts, #230 merged) |
| Step 3b | Selective copy + hash (PR-C) | `PASS` (112 selected; 81 canonical, 31 duplicate skipped; #231 merged) |
| Step 3c | Selective copy + hash (PR-D) | `PASS` (111 selected source rows; 1 byte-exact PNG; derived summaries) |
| Step 4 | Secret scan | `PASS` (PR-D copied/derived artifacts — no patterns detected) |
| Step 5 | Docs PR merge sequence (A→F; G when required) | `IN_PROGRESS` (PR-A/B/C merged; PR-D working tree) |
| Step 6 | Old folder disposition | `NOT_STARTED` |
| Step 7 | Final verification | `NOT_STARTED` |

## PR verdicts

| PR | Scope | Verdict |
| --- | --- | --- |
| PR-A | Local-archive boundary | `PASS` (#229, `36f7034`) |
| PR-B | Bridge research | `PASS` (#230, `1cd4f51`) |
| PR-C | Apollo handoff/research materials | `PASS` (#231, `beb942b`) |
| PR-D | Verification/operator evidence | `READY_FOR_REVIEW` (uncommitted on branch) |
| PR-E | UI preservation/legacy indexes | `NOT_STARTED` |
| PR-F | Final manifest/repository index | `NOT_STARTED` |
| PR-G | Newly consolidated docs path normalization (only when required) | `NOT_REQUIRED_YET` |

## PR-A / PR-B / PR-C

Merged deliverables unchanged from prior reports (#229 / #230 / #231).

## PR-D deliverables (this branch)

| Item | Status |
| --- | --- |
| `docs/apollo/u3-evidence/summary/` (summary + selected_result + source_manifest + manifest) | Done |
| `docs/apollo/pr5-smoke/` (README + browser-smoke-summary.json + json-summary + source_manifest + manifest) | Done |
| `docs/apollo/operator-smoke/` (report + source_manifest + manifest + 1 representative PNG) | Done |
| `docs/apollo/index/README.md` | Done |
| Apollo / migration README index updates | Done |
| `project_consolidation_manifest.csv` PR-D rows | Done — 2 `CANONICAL` byte-exact source-copy rows; generated summaries and package manifests are documented separately and are not represented as source copies |
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
- Phase 1 external inventory / `final_report.txt` are not modified by PR-D worker tasks.

## Next actions

1. Open PR for PR-D verification/operator evidence artifacts when authorized.
2. Merge PR-D to `main` when approved.
3. Continue with PR-E when authorized.

## External authority

Phase 1 inventory and integration plan live in the repository parent directory and are not modified by PR-D. Source trees `apollo-u3-evidence`, `apollo-pr5-smoke`, and `apollo_operator_smoke_evidence` are read-only for this pass.
