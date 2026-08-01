# Legacy Projects Archive Index

**PR:** PR-E
**Source:** `source://archive/` (read-only external tree)
**Scan date:** 2026-08-01
**Method:** `find -P` (symlinks not dereferenced)

The external `archive/` folder holds a multi-gigabyte legacy backup (`spacer-clone-20260726-224112`). Git tracks **indexes only**; bodies remain outside the repository in `local-archive/legacy-archive/archive/`.

## Snapshot identity

| Field | Value |
| --- | --- |
| Bundle root | `archive/spacer-clone-20260726-224112` |
| Created stamp | `20260726-224112` |
| origin/main at capture | `17b236472a0d80dc826bce529cefeb40bc169831` |
| Classification | `B_ARCHIVE` |

## Live scan totals (external `Projects/archive/`)

| Metric | Value |
| --- | ---: |
| Regular files | 116833 |
| Symlinks (not dereferenced) | 193 |
| Regular-file bytes | 2104662779 (~2.0 GiB; `du` reports ~2.3 GiB on disk) |

## Manifest authority (`local-archive/manifests/local_archive_manifest.csv`)

Per-file SHA-256, size, and retention mapping are authoritative in the Git-ignored operational manifest (not modified by PR-E).

| Metric | Value |
| --- | ---: |
| Indexed archive rows | 117026 |
| Indexed source bytes | 2104662779 |
| Local-archive bytes retained | 1081303487 (~1.0 GiB) |
| Symlink rows (`SYMLINK_PRESERVED`) | 193 |
| External absolute symlinks (non-dereferenced) | 2 worktree links + 1 python venv chain |

Symlinks were copied with `cp -a` (no dereference). Two worktree-level links (`retired-worktrees/spacer-clone-pr40/.mimocode`, `.venv`) point outside the archive bundle and must not be expanded during indexing or deletion planning.

## Top-level layout

See [archive_tree_summary.md](archive_tree_summary.md) for the directory tree, extension breakdown, and largest-file summary. See [source_summary.csv](source_summary.csv) for per-segment counts.

| Subtree | Regular files | Symlinks | Regular bytes |
| --- | ---: | ---: | ---: |
| `from-legacy-primary/` | 3438 | 7 | 50665848 |
| `from-spacer-clone-latest/` | 115 | 0 | 4830552 |
| `from-spacer-clone-main/` | 60 | 0 | 2269459 |
| `from-spacer-clone-if3-e/` | 2 | 0 | 114 |
| `from-spacer-clone-pr40/` | 2 | 0 | 94 |
| `manifests/` | 3 | 0 | 16925 |
| `retired-worktrees/` | 113212 | 186 | 2045998923 |

## Local retention

| Path | Role |
| --- | --- |
| `local-archive/legacy-archive/archive/` | Canonical byte copies and preserved symlinks |
| `local-archive/manifests/local_archive_manifest.csv` | Operational provenance (Git-ignored; SHA/index authority) |

## Policy

- No Git addition of archive body files.
- No symlink dereference when reading or copying.
- Physical delete of `Projects/archive/` requires individual path approval after manifest gates.
