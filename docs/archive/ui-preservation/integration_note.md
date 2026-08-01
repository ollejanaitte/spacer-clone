# Line Tab UI Preservation — Integration Note

**PR:** PR-E
**Source:** `source://line-tab-ui-preservation-20260729-092526/`

## Purpose

Record provenance for line-tab UI work preserved before Apollo mixed-diff recovery on 2026-07-29. This note and [source_manifest.csv](source_manifest.csv) index the external preservation directory without copying raw bodies into Git.

The preservation exists so line-tab changes could be recovered independently while Apollo and unrelated edits remained in the same worktree. Operators can verify integrity via SHA-256 in the manifest and retrieve full snapshots or diffs from local storage only.

## Local retention (not Git-copied)

| Location | Role |
| --- | --- |
| `Projects/line-tab-ui-preservation-20260729-092526/` | Primary external preservation directory |
| `local-archive/ui-preservation/line-tab-ui-preservation-20260729-092526/` | Optional byte-identical mirror under repo `local-archive/` |

**Source snapshots** (`files/frontend/src/**`) and **diff artifacts** (`ui-files.diff`, `styles-full.diff`, git context files) are indexed here but **not** committed to Git. `git_managed` is `false` for every row in [source_manifest.csv](source_manifest.csv); classification is `B_ARCHIVE` with retention `local-archive/ui-preservation/`.

## Recovery context

| Field | Value |
| --- | --- |
| Preservation directory | `source://line-tab-ui-preservation-20260729-092526/` |
| Source worktree | `source://spacer-clone-main/` (per `MANIFEST.txt`) |
| Branch at capture | `main` |
| HEAD at capture | `883fbb00469a2bedc5a0f364362e1b8be5250023` |
| UI diff state | `CASE1_WORKTREE_UI_DIFF_PRESENT` (mixed Apollo + line-tab changes) |
| Styles separation | Only `.liner-tab-line` and related line-tab selectors in preserved `styles.css` diff |

## Authoritative scope

Preserved files cover the ライン tab on `LinerEditPage` and scoped CSS:

- `frontend/src/liner/pages/LinerEditPage.tsx`
- `frontend/src/liner/pages/LinerEditPage.test.tsx`
- `frontend/src/liner/components/AlignmentManager.tsx`
- `frontend/src/liner/components/AlignmentLineManager.tsx`
- `frontend/src/liner/components/HorizontalElementEditor.tsx`
- `frontend/src/styles.css` (line-tab selectors only in staged scope)

Forbidden at capture time: `frontend/src/apollo/**`, `docs/apollo/**`, startup scripts, and unrelated README edits.

## Integration disposition

| Item | Disposition |
| --- | --- |
| Preservation bundle (15 files) | `B_ARCHIVE` — indexed in Git; bodies in external source + `local-archive/ui-preservation/` |
| Line-tab final report | `A_MAIN` — already in `docs/liner/ui/line-tab-ui-improvement-final-report.md` |
| `line-tab-ui-integration-temp` | `D_EXCLUDED` — empty scratch directory; no files to migrate |
| Application source re-integration | Out of PR-E scope; follow final report verdicts when authorized |

## Diff artifacts (indexed, local only)

- `ui-files.diff` — unified diff for the six preserved frontend files (39761 bytes).
- `styles-full.diff` — full `styles.css` diff context (7017 bytes); line-tab subset is the authoritative staged scope.
- `git-diff-stat.txt` / `git-status.txt` — working-tree snapshot showing broader mixed changes at capture time.

## Related packages

- [Archive index](../README.md)
- [Startup records](../startup-records/README.md) — separate failed electron startup log under `source://docs/`
- [Migration report](../../migration/project_consolidation_report.md)
