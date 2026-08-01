# Project Consolidation Report

**Report date:** 2026-08-01
**Branch:** `agent/consolidate-bridge-research`
**Overall Phase 2 verdict:** `IN_PROGRESS`

## Executive summary

Phase 2 canonical clone is complete. PR-A (local-archive boundary) merged to `main` (#229, `36f7034`). Raw archive bulk copy verified (`118389` files, hash PASS). PR-B (bridge research selective Git integration) is in progress on this branch: 31 source artifacts copied with SHA verification; manifest rows appended.

## SHA anchors

| Label | SHA | Notes |
| --- | --- | --- |
| Phase 1 observation (`origin/main` at inventory) | `146f6786c9790440504f05c2f33a551ab91ed537` | Short: `146f678` — observation value, not a permanent pin |
| PR-A merge (`main`) | `36f70341f1e9c6913a745d0645a2f619b20f6a50` | #229 local-archive boundary |
| PR-B working tree | `36f70341f1e9c6913a745d0645a2f619b20f6a50` | Base = PR-A merge; integration uncommitted |

Commit message at PR-A anchor: merge of local-archive boundary PR (#229).

## Phase status

| Step | Description | Verdict |
| --- | --- | --- |
| Gate 0 | Phase 2 user approval | `PASS` |
| Step 1 | Canonical clone (`spacer-clone`) | `PASS` |
| Step 2 | PR-A local-archive boundary | `PASS` |
| Step 2b | Raw archive bulk copy + hash | `PASS` (`118389` files verified) |
| Step 3 | Selective copy + hash (PR-B) | `IN_PROGRESS` |
| Step 4 | Secret scan | `IN_PROGRESS` (PR-B gate run on copied artifacts) |
| Step 5 | Docs PR merge sequence (A→F; G when required) | `IN_PROGRESS` (PR-A merged; PR-B open) |
| Step 6 | Old folder disposition | `NOT_STARTED` |
| Step 7 | Final verification | `NOT_STARTED` |

## PR verdicts

| PR | Scope | Verdict |
| --- | --- | --- |
| PR-A | Local-archive boundary | `PASS` (#229, `36f7034`) |
| PR-B | Bridge research | `IN_PROGRESS` |
| PR-C | Apollo handoff/research materials | `NOT_STARTED` |
| PR-D | Verification/operator evidence | `NOT_STARTED` |
| PR-E | UI preservation/legacy indexes | `NOT_STARTED` |
| PR-F | Final manifest/repository index | `NOT_STARTED` |
| PR-G | Newly consolidated docs path normalization (only when required) | `NOT_REQUIRED_YET` |

## PR-A deliverables (merged)

| Item | Status |
| --- | --- |
| `.gitignore` entry `/local-archive/` | Done |
| `docs/migration/local_archive_policy.md` | Done |
| `docs/migration/README.md` | Done |
| `project_consolidation_manifest.csv` (header) | Done |
| `local-archive/` directory skeleton | Done |
| `local-archive/manifests/local_archive_manifest.csv` (header) | Done |

## PR-B deliverables (this branch)

| Item | Status |
| --- | --- |
| `docs/apollo/design-standards/research/consolidated-2026-08-01/` (29 artifacts) | Done |
| `docs/apollo/design-standards/handoffs/consolidated-2026-08-01/apollo-decoding/` (2 artifacts) | Done |
| Consolidated README files | Done |
| `project_consolidation_manifest.csv` rows (31) | Done |
| Design-standards README consolidated section | Done |
| Duplicate SHA skip vs `main` | 0 skipped (no prior canonical match) |

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

`LOCAL_ARCHIVE_STRUCTURE_VERDICT`: `BOUNDARY_DEFINED` (PR-A). Raw archive copy: `VERIFIED` (`118389` files).

## Constraints (unchanged)

- Docs-only integration PRs; no functional code PRs.
- `local-archive/` and ≥50 MiB / rights-unknown / raw binary bulk: Git prohibited.
- Old worktree deletion prohibited; physical delete requires individual path approval.
- Symlinks not expanded; external archive body not added to Git.
- Phase 1 external inventory files remain outside this repository.

## Next actions

1. Review PR-B consolidated artifacts and manifest.
2. Merge PR-B to `main` when approved.
3. Open PR-C for remaining Apollo handoff/research materials.
4. Continue manifest population; mark `DUPLICATE_SKIPPED` where SHA matches `main`.
5. Run secret scan before each docs PR merge touching integrated content.

## External authority

Phase 1 inventory and integration plan live in the repository parent directory and are not modified by PR-B. Source tree `bridge-standards-research` is read-only for this pass.
