# Archive Tree Summary

**PR:** PR-E
**Source:** `source://archive/spacer-clone-20260726-224112/`
**Scan date:** 2026-08-01
**Method:** Read-only `find -P` (symlinks not dereferenced) cross-checked against `local-archive/manifests/local_archive_manifest.csv`.

## Bundle root

```
archive/
└── spacer-clone-20260726-224112/
    ├── TaskEndSound.wav
    ├── from-legacy-primary/
    ├── from-spacer-clone-if3-e/
    ├── from-spacer-clone-latest/
    ├── from-spacer-clone-main/
    ├── from-spacer-clone-pr40/
    ├── manifests/
    └── retired-worktrees/
        ├── spacer-clone-if3-e/
        ├── spacer-clone-latest/
        ├── spacer-clone-main/
        └── spacer-clone-pr40/
```

## Scan totals

| Metric | Value |
| --- | ---: |
| Regular files | 116833 |
| Symlinks | 193 |
| Regular-file bytes | 2104662779 |

## Capture subtrees

| Path under bundle | Regular files | Symlinks | Regular bytes | Notes |
| --- | ---: | ---: | ---: | --- |
| `from-legacy-primary/` | 3438 | 7 | 50665848 | Legacy primary worktree delta |
| `from-spacer-clone-latest/` | 115 | 0 | 4830552 | Phase worktree + agent-run evidence |
| `from-spacer-clone-main/` | 60 | 0 | 2269459 | Main-sync worktree agent runs |
| `from-spacer-clone-if3-e/` | 2 | 0 | 114 | IF3-E HEAD/log capture |
| `from-spacer-clone-pr40/` | 2 | 0 | 94 | PR40 status notes |
| `manifests/` | 3 | 0 | 16925 | Pre-consolidation capture manifests |
| `retired-worktrees/` | 113212 | 186 | 2045998923 | Full retired worktree bodies |

### Retired worktrees

| Worktree | Regular files | Symlinks | Regular bytes | Branch @ capture |
| --- | ---: | ---: | ---: | --- |
| `spacer-clone-latest` | 42375 | 64 | 1092572021 | `phase6/pr39-road-gdraw` @ `1031001` |
| `spacer-clone-pr40` | 34604 | 62 | 461961312 | `feat/phase6-pr40-print-catalog` @ `4020a04` |
| `spacer-clone-if3-e` | 34564 | 60 | 458277042 | `feat/phase6-if3-e-completion` @ `858620b` |
| `spacer-clone-main` | 1669 | 0 | 33188548 | `main-sync` @ `dd6b316` |

## Manifests subdirectory (indexed names only)

| File | Role |
| --- | --- |
| `archive-tree.txt` | Top-level directory listing at capture |
| `archive-sizes.txt` | Per-subtree size survey |
| `pre-consolidation.txt` | Worktree HEAD table and folder statuses at `20260726-224112` |

## Symlink policy (non-dereferenced)

| Count | Location | Policy |
| ---: | --- | --- |
| 193 | Entire indexed archive tree | `SYMLINK_PRESERVED` in local manifest |
| 190 | Extension `(none)` rows | Mostly `node_modules/.bin` shim symlinks |
| 2 | `retired-worktrees/spacer-clone-pr40/` | External worktree links (`.mimocode`, `.venv`) — do not expand |
| 1 | `retired-worktrees/spacer-clone-latest/.venv/bin/python3` | Python venv chain symlink to system interpreter |

External worktree symlinks are recorded as link nodes only. Targets are **not** copied into Git or dereferenced in this index.

## Major extensions (regular files only)

| Extension | File count | Bytes |
| --- | ---: | ---: |
| `js` | 47840 | 513605575 |
| `(none)` | 2035 | 289106097 |
| `map` | 15384 | 280592571 |
| `so` | 148 | 165081488 |
| `ts` | 24198 | 164729779 |
| `wasm` | 45 | 88188063 |
| `json` | 3592 | 63827110 |
| `py` | 3534 | 57395549 |
| `pak` | 58 | 56086129 |
| `pdb` | 15 | 42572112 |
| `cjs` | 1922 | 42331163 |
| `pyc` | 3241 | 42145867 |
| `png` | 273 | 34556452 |
| `md` | 4442 | 32838640 |

Dominant byte mass sits under `retired-worktrees/**/frontend/node_modules/`, Python `.venv` trees, and compiled artifacts. Full per-segment breakdown: [source_summary.csv](source_summary.csv).

## Largest regular files (relative paths)

| Bytes | Path under `archive/` |
| ---: | --- |
| 216620248 | `spacer-clone-20260726-224112/retired-worktrees/spacer-clone-latest/frontend/node_modules/electron/dist/electron` |
| 25021457 | `spacer-clone-20260726-224112/retired-worktrees/spacer-clone-latest/.venv/lib/python3.10/site-packages/numpy.libs/libscipy_openblas64_-56d6093b.so` |
| 22211841 | `spacer-clone-20260726-224112/retired-worktrees/spacer-clone-latest/.venv/lib/python3.10/site-packages/scipy.libs/libscipy_openblas-68440149.so` |
| 20008180 | `spacer-clone-20260726-224112/retired-worktrees/spacer-clone-latest/frontend/node_modules/electron/dist/LICENSES.chromium.html` |
| 12680120 | `spacer-clone-20260726-224112/retired-worktrees/spacer-clone-latest/.venv/lib/python3.10/site-packages/uvloop/loop.cpython-310-x86_64-linux-gnu.so` |
| 11120788 | `spacer-clone-20260726-224112/retired-worktrees/spacer-clone-pr40/frontend/node_modules/esbuild/bin/esbuild` |
| 11120788 | `spacer-clone-20260726-224112/retired-worktrees/spacer-clone-pr40/frontend/node_modules/@esbuild/linux-x64/bin/esbuild` |
| 11120788 | `spacer-clone-20260726-224112/retired-worktrees/spacer-clone-latest/frontend/node_modules/esbuild/bin/esbuild` |
| 11120788 | `spacer-clone-20260726-224112/retired-worktrees/spacer-clone-latest/frontend/node_modules/@esbuild/linux-x64/bin/esbuild` |

Per-file SHA-256 for retention copies: `local-archive/manifests/local_archive_manifest.csv`.

## Retention

| Item | Location |
| --- | --- |
| Archive bodies | `local-archive/legacy-archive/archive/spacer-clone-20260726-224112/` |
| Operational manifest | `local-archive/manifests/local_archive_manifest.csv` (Git-ignored) |
| External source (read-only) | `Projects/archive/` — not modified by PR-E |
