# Documentation Validation

**Authority:** OPERATIONAL
**Status:** ACTIVE
**Related:** [documentation-governance.md](documentation-governance.md)

Repeatable checks for documentation changes. Run without installing or updating dependencies. This file is procedural; it is not a product contract.

## Before Editing

1. Confirm repository root, branch, HEAD, and `git status --short`.
2. Confirm the working tree matches repository agent policy ([../../AGENTS.md](../../AGENTS.md)): do not stage, commit, push, or run destructive Git commands unless an explicit human instruction authorizes that step.
3. Preserve any pre-existing dirty or untracked paths that are outside the approved edit set; do not “clean up” unrelated changes.
4. Limit edits to the explicitly approved path list for the current documentation change (normally under `docs/**`).

## Documentation Structure Checks

Run from the repository root after documentation edits:

1. **Allowed-path assertion** — every changed path is on the approved edit list and consistent with repository policy.
2. **Whitespace / conflict-marker check** — `git diff --check` must pass (no trailing whitespace introduced; no conflict markers).
3. **Staging assertion** — do not leave unexpected staged paths; follow the explicit staging policy for the task (default: leave the index unchanged unless staging was explicitly requested).
4. **Excluded-path assertion** — paths marked excluded or FUTURE PROPOSAL (for example untracked proposal trees) remain untouched.
5. **Relative link scan** — every Markdown relative link, reference-style link, and local HTML `href`/`src` in tracked `docs/**/*.md` resolves to an existing path (or a valid in-doc `#anchor`).
6. **Image scan** — local image targets resolve.
7. **Fence / Mermaid balance** — fenced code blocks and Mermaid fences are balanced.
8. **Heading quality (advisory on historical files)** — active docs should have one H1 and unique heading labels; report duplicates rather than silently rewriting history.
9. **Authority baseline freeze** — do not change meaning of `docs/scoping/**` or Stage 6–10 decision IDs / gates / verdicts unless the approved edit set explicitly allows those paths. Navigation may link *into* baselines without editing them.
10. **Absolute path scan** — flag new machine-specific absolute home directories or personal Windows user paths in active operational guides.
11. **Open-marker scan** — flag active TODO/TBD without `OPEN`/`DEFERRED` classification (historical evidence may retain legacy markers).

## Repository Quality Commands (no dependency changes)

Run from the **repository root** using existing environments only (subshells so the shell cwd stays at root):

```bash
(cd frontend && npm run typecheck)
(cd frontend && npm run test:all)
.venv/bin/pytest backend/ -q
git diff --check
```

Do not run `npm install`, `pip install`, or lockfile updates as part of documentation validation. If typecheck/test fails, stop and report; do not revert docs work with destructive Git commands.

Optional related scripts (when relevant to a code PR; not required for every docs-only change):

- `npm run lint` (from `frontend/`)

## Pass / Fail Rules

| Result | Meaning |
| --- | --- |
| PASS | Approved paths only; links/fences OK; `git diff --check` clean; excluded dirty state preserved; quality commands pass or are documented as not applicable with reason |
| CONDITIONAL | Docs validation passed with recorded advisory findings (for example historical TODO markers) |
| FAIL | Broken links/fences, disallowed path edits, unexpected staging, `git diff --check` failure, or quality command failure |
| BLOCKED | Cannot continue without an explicit human decision (authority conflict, required deletion, dependency install needed) |

## Related Documents

- [README.md](README.md)
- [quality-gates.md](quality-gates.md)
- [../../AGENTS.md](../../AGENTS.md)
