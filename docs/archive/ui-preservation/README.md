# Line Tab UI Preservation Index

**PR:** PR-E
**Source:** `source://line-tab-ui-preservation-20260729-092526/`
**Preservation date:** 2026-07-29 09:25:26

Git-tracked index for the line-tab UI preservation bundle captured from `spacer-clone-main` during Apollo/line-tab mixed-diff recovery. This package records **what was preserved and where it lives**; it does not copy raw preservation bodies into Git.

## Preservation purpose

Before Apollo mixed-diff recovery on 2026-07-29, line-tab UI work on the ライン tab (`LinerEditPage` and related components) was isolated into an external preservation directory. The bundle holds:

- Six frontend source snapshots under `files/frontend/src/liner/**` and `files/frontend/src/styles.css`
- Unified diffs (`ui-files.diff`, `styles-full.diff`) and git context snapshots from the mixed worktree
- Checksum and manifest metadata for integrity verification

Git carries only this index ([integration_note.md](integration_note.md) and [source_manifest.csv](source_manifest.csv)). **Source snapshots and diff artifacts stay local** in `Projects/line-tab-ui-preservation-20260729-092526/` and, when mirrored, `local-archive/ui-preservation/line-tab-ui-preservation-20260729-092526/`.

## Contents

| Document | Role |
| --- | --- |
| [integration_note.md](integration_note.md) | Integration context, scope, and disposition |
| [source_manifest.csv](source_manifest.csv) | All 15 source files with SHA-256, size, and retention |

## Summary

| Metric | Value |
| --- | --- |
| Source files indexed | 15 |
| Total indexed bytes (source) | 235876 |
| Git byte-exact copies | 0 |
| Classification | `B_ARCHIVE` (index in Git; bodies local) |
| Preservation HEAD | `883fbb00469a2bedc5a0f364362e1b8be5250023` |
| Target tab | ライン (LinerEditPage line tab) |
| Authoritative scope report | [line-tab-ui-improvement-final-report.md](../../liner/ui/line-tab-ui-improvement-final-report.md) |

## File categories

| Category | Count | Examples |
| --- | ---: | --- |
| Preservation metadata | 3 | `MANIFEST.txt`, `SHA256SUMS.txt`, `PRESERVATION_DIRECTORY.txt` |
| Git context snapshots | 4 | `current-head.txt`, `git-status.txt`, `git-diff-stat.txt` |
| Unified diffs | 2 | `ui-files.diff`, `styles-full.diff` |
| Preserved source snapshots | 6 | `files/frontend/src/liner/**`, `files/frontend/src/styles.css` |

## Local-archive retention

Full bundle (byte-identical to external source): `local-archive/ui-preservation/line-tab-ui-preservation-20260729-092526/`

See [archive index](../README.md).
