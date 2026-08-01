# Project Consolidation Report

**Report date:** 2026-08-01
**Branch:** `agent/consolidate-apollo-handoff-research`
**Overall Phase 2 verdict:** `IN_PROGRESS`

## Executive summary

Phase 2 canonical clone is complete. PR-A (local-archive boundary) merged to `main` (#229, `36f7034`). Raw archive bulk copy verified (`118389` files, hash PASS). PR-B (bridge research selective Git integration) merged to `main` (#230). PR-C (apollo manual-research selective Git integration) is ready for review on this branch: 112 source artifacts selected, 81 `CANONICAL` copies verified (69 research + 12 handoffs), 31 `DUPLICATE_SKIPPED` (SHA match on `main`); manifest, link, secret, and hash gates PASS.

## SHA anchors

| Label | SHA | Notes |
| --- | --- | --- |
| Phase 1 observation (`origin/main` at inventory) | `146f6786c9790440504f05c2f33a551ab91ed537` | Short: `146f678` — observation value, not a permanent pin |
| PR-A merge (`main`) | `36f70341f1e9c6913a745d0645a2f619b20f6a50` | #229 local-archive boundary |
| PR-B merge (`main`) | `1cd4f51d53b795ab1b78d85dd9592869b3b2b3da` | #230 bridge research consolidation |
| PR-C working tree | `1cd4f51d53b795ab1b78d85dd9592869b3b2b3da` | Base = PR-B merge; integration uncommitted |

Commit message at PR-B anchor: squash merge of bridge research consolidation PR (#230).

## Phase status

| Step | Description | Verdict |
| --- | --- | --- |
| Gate 0 | Phase 2 user approval | `PASS` |
| Step 1 | Canonical clone (`spacer-clone`) | `PASS` |
| Step 2 | PR-A local-archive boundary | `PASS` |
| Step 2b | Raw archive bulk copy + hash | `PASS` (`118389` files verified) |
| Step 3 | Selective copy + hash (PR-B) | `PASS` (31 artifacts, #230 merged) |
| Step 3b | Selective copy + hash (PR-C) | `PASS` (112 selected; 81 canonical, 31 duplicate skipped; hash verified) |
| Step 4 | Secret scan | `PASS` (PR-C copied artifacts — no patterns detected) |
| Step 5 | Docs PR merge sequence (A→F; G when required) | `IN_PROGRESS` (PR-A/B merged; PR-C working tree) |
| Step 6 | Old folder disposition | `NOT_STARTED` |
| Step 7 | Final verification | `NOT_STARTED` |

## PR verdicts

| PR | Scope | Verdict |
| --- | --- | --- |
| PR-A | Local-archive boundary | `PASS` (#229, `36f7034`) |
| PR-B | Bridge research | `PASS` (#230, `1cd4f51`) |
| PR-C | Apollo handoff/research materials | `READY_FOR_REVIEW` (uncommitted on branch) |
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

## PR-B deliverables (merged #230)

| Item | Status |
| --- | --- |
| `docs/apollo/design-standards/research/consolidated-2026-08-01/` (29 artifacts) | Done |
| `docs/apollo/design-standards/handoffs/consolidated-2026-08-01/apollo-decoding/` (2 artifacts) | Done |
| Consolidated README files | Done |
| `project_consolidation_manifest.csv` rows (31) | Done |
| Design-standards README consolidated section | Done |
| Duplicate SHA skip vs `main` | 0 skipped (no prior canonical match) |

## PR-C deliverables (this branch)

| Item | Status |
| --- | --- |
| `docs/apollo/research/consolidated-2026-08-01/` (69 artifacts + README) | Done — verified |
| `docs/apollo/handoffs/consolidated-2026-08-01/` (12 artifacts + README) | Done — verified |
| Consolidated README files (counts, exclusions, local-archive paths) | Done |
| `docs/apollo/README.md` consolidated section | Done |
| `docs/apollo/handoffs/README.md` consolidated section | Done |
| `project_consolidation_manifest.csv` rows (112 selected; 81 `CANONICAL`, 31 `DUPLICATE_SKIPPED`) | Done — source/dest hash verified |
| Path normalization (`source://apollo/`) in copied bodies | Done (3 destinations; manifest `notes` recorded) |
| Duplicate SHA skip vs `main` | 31 skipped — target hash verified |
| Quality gates (links, secrets, >50 MiB, binaries, lockfiles, `git diff --check`) | PASS |

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

1. Open PR for PR-C consolidated artifacts (verification complete on branch).
2. Merge PR-C to `main` when approved.
3. Open PR-D for verification/operator evidence materials.
4. Continue manifest population; mark `DUPLICATE_SKIPPED` where SHA matches `main`.
5. Run secret scan before each docs PR merge touching integrated content.

## External authority

Phase 1 inventory and integration plan live in the repository parent directory and are not modified by PR-C. Source tree `apollo` is read-only for this pass.
