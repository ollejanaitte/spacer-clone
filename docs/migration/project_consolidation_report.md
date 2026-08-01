# Project Consolidation Report

**Report date:** 2026-08-01
**Branch:** `agent/prepare-consolidated-local-archive-boundary`
**Overall Phase 2 verdict:** `IN_PROGRESS`

## Executive summary

Phase 2 started after user approval. Canonical clone from GitHub `main` is complete. PR-A (local-archive boundary definition) is in progress on this branch. Archive bulk copy, selective integration, hash verification, and PR-B–F merges are not started.

## SHA anchors

| Label | SHA | Notes |
| --- | --- | --- |
| Phase 1 observation (`origin/main` at inventory) | `146f6786c9790440504f05c2f33a551ab91ed537` | Short: `146f678` — observation value, not a permanent pin |
| Canonical clone HEAD at Step 1 completion | `146f6786c9790440504f05c2f33a551ab91ed537` | Matches `origin/main` at clone time |
| PR-A working tree | `146f6786c9790440504f05c2f33a551ab91ed537` | No integration commits yet |

Commit message at anchor: `test(electron): stabilize Apollo interactive smoke (#228)`.

## Phase status

| Step | Description | Verdict |
| --- | --- | --- |
| Gate 0 | Phase 2 user approval | `PASS` |
| Step 1 | Canonical clone (`spacer-clone`) | `PASS` |
| Step 2 | PR-A local-archive boundary | `IN_PROGRESS` |
| Step 3 | Selective copy + hash | `NOT_STARTED` |
| Step 4 | Secret scan | `NOT_STARTED` |
| Step 5 | Docs PR merge sequence (A→F; G when required) | `NOT_STARTED` |
| Step 6 | Old folder disposition | `NOT_STARTED` |
| Step 7 | Final verification | `NOT_STARTED` |

## PR verdicts

| PR | Scope | Verdict |
| --- | --- | --- |
| PR-A | Local-archive boundary | `IN_PROGRESS` |
| PR-B | Bridge research | `NOT_STARTED` |
| PR-C | Apollo handoff/research materials | `NOT_STARTED` |
| PR-D | Verification/operator evidence | `NOT_STARTED` |
| PR-E | UI preservation/legacy indexes | `NOT_STARTED` |
| PR-F | Final manifest/repository index | `NOT_STARTED` |
| PR-G | Newly consolidated docs path normalization (only when required) | `NOT_REQUIRED_YET` |

## PR-A deliverables (this branch)

| Item | Status |
| --- | --- |
| `.gitignore` entry `/local-archive/` | Done |
| `docs/migration/local_archive_policy.md` | Done |
| `docs/migration/README.md` | Done |
| `project_consolidation_manifest.csv` (header) | Done |
| `local-archive/` directory skeleton | Done |
| `local-archive/manifests/local_archive_manifest.csv` (header) | Done |

## Local archive structure

| Directory | Purpose |
| --- | --- |
| `local-archive/raw-evidence/` | Raw verification and trace files |
| `local-archive/research-originals/` | Research originals not in Git |
| `local-archive/restricted-pdf/` | Rights-limited PDFs (≥50 MiB bridge PDFs target) |
| `local-archive/unknown-rights/` | Unresolved rights |
| `local-archive/legacy-archive/` | Legacy backups and handoffs |
| `local-archive/smoke-artifacts/` | Smoke STL/PNG/JSON |
| `local-archive/operator-evidence/` | Operator smoke captures |
| `local-archive/ui-preservation/` | UI preservation payloads |
| `local-archive/manifests/` | Local manifest (`local_archive_manifest.csv`) |

`LOCAL_ARCHIVE_STRUCTURE_VERDICT`: `BOUNDARY_DEFINED` (skeleton + policy; copies `NOT_STARTED`).

## Constraints (unchanged)

- Docs-only integration PRs; no functional code PRs.
- `local-archive/` and ≥50 MiB / rights-unknown / raw binary bulk: Git prohibited.
- Old worktree deletion prohibited; physical delete requires individual path approval.
- Symlinks not expanded; external archive body not added to Git.
- Phase 1 external inventory files remain outside this repository.

## Next actions

1. Review PR-A boundary documents.
2. Merge PR-A to `main`; then run approved archive bulk copy into `local-archive/legacy-archive/` (`cp -a`, symlink non-expansion, hash, manifest) as local work.
3. Open PR-B for bridge research Git-tracked selection per [local_archive_policy.md](local_archive_policy.md).
4. Populate manifest rows; mark `DUPLICATE_SKIPPED` where SHA matches `main`.
5. Run secret scan before first docs PR merge touching integrated content.

## External authority

Phase 1 inventory and integration plan live in the repository parent directory and are not modified by PR-A. This report summarizes execution state only.
