# Local Archive Policy

**Status:** ACTIVE (PR-A boundary definition)
**Applies to:** Phase 2 project consolidation into `spacer-clone`

## Purpose

Define where non-Git material is stored locally, how it is classified, deduplicated, and recorded before any delete candidate is proposed. The `local-archive/` tree is Git-ignored; only policy and Git-tracked manifests under `docs/migration/` enter version control.

## Directory layout

| Path under `local-archive/` | Intended content |
| --- | --- |
| `raw-evidence/` | Raw verification logs, screenshots, and operator traces not suitable for Git |
| `research-originals/` | Original research CSV, notes, and reference extracts (non-PDF bulk) |
| `restricted-pdf/` | PDFs with known distribution limits; Git addition prohibited |
| `unknown-rights/` | Files with unresolved copyright or license status |
| `legacy-archive/` | Legacy backups, completed handoffs, and historical reports |
| `smoke-artifacts/` | Smoke-test STL, PNG, JSON, and reproducibility runs |
| `operator-evidence/` | Operator smoke and checkpoint captures |
| `ui-preservation/` | UI preservation diffs, checksum files, and integration records |
| `manifests/` | `local_archive_manifest.csv` and future local-only manifest supplements |

Repository-external archive bulk (multi-gigabyte `ARCHIVE_LOCAL`) is **explicitly approved for local copy** into `local-archive/legacy-archive/` using `cp -a` (symlinks not expanded), followed by SHA-256 hash and `local_archive_manifest.csv` rows. Git addition of archive body or `local-archive/` content remains prohibited. Deletion of the original external archive source requires separate individual approval.

## Classification enum

Every manifest row uses exactly one `classification` value:

| Value | Meaning | Typical destination |
| --- | --- | --- |
| `A_MAIN` | Integrate into Git-tracked `docs/` (or existing tracked paths) | Repository `docs/**` |
| `B_ARCHIVE` | Archive reference; summary or index in Git, body local or external | `local-archive/legacy-archive/` or external archive |
| `C_EVIDENCE` | Evidence retained for audit; summaries may be Git-tracked | `local-archive/*-evidence/`, `smoke-artifacts/` |
| `D_EXCLUDED` | Temporary or reproducible; not migrated | No copy; manifest note only |
| `E_HOLD` | Rights, size, or sensitivity block Git addition | `restricted-pdf/`, `unknown-rights/` |
| `DUPLICATE_SKIPPED` | Identical content already canonical elsewhere | No new copy; manifest records skip reason |

Phase 1 labels A–E map to this enum: A→`A_MAIN`, B→`B_ARCHIVE`, C→`C_EVIDENCE`, D→`D_EXCLUDED`, E→`E_HOLD`.

## Deduplication

- **One SHA principle:** identical SHA-256 content must exist in at most one active canonical location per consolidation pass.
- **Priority when choosing the canonical copy** (highest wins):
  1. GitHub `main` tracked file (already authoritative)
  2. Git-tracked `docs/` destination after approved copy
  3. `local-archive/` copy (manifested, Git-ignored)
  4. Legacy source folder (old worktree or external folder; retained until delete gate)
- Lower-priority copies are not deleted automatically; they become delete candidates only after verification (see workflow).
- **File-name match alone is insufficient** for deduplication or deletion.
- Manifest `duplicate_status` examples: `CANONICAL`, `SKIPPED_SHA_MATCH`, `PENDING_REVIEW`.

## Workflow

Each migration item follows this order. Steps must not be skipped or reordered:

1. **Copy** — selective copy to `docs/` or `local-archive/` per classification.
2. **Hash** — compute SHA-256 and `original_size` for source and destination.
3. **Manifest** — append one row to `project_consolidation_manifest.csv` and/or `local_archive_manifest.csv`.
4. **GitHub main** — open docs-only PR; merge to `main` when approved (Git-tracked rows only).
5. **Verification** — post-merge checks: manifest completeness, no duplicate SHA in Git, secret scan, size ceiling.
6. **Delete candidate** — legacy copy may be *proposed* for deletion only after (1)–(5) pass and **individual path approval**.

No step implies permission to delete old worktrees or external folders.

## Symlinks

- Symlinks are **not expanded** during copy or hash operations.
- Record symlink targets in `notes` when encountered; do not follow into repository-external paths without approval.
- External archive symlinks (two known cases in Phase 1 inventory) must not be traversed or materialized into Git.

## Git prohibition rules

The following must **never** be committed:

- Entire `local-archive/` tree (enforced via `.gitignore`)
- Any single file **≥ 50 MiB**
- Raw binary bulk where policy assigns `C_EVIDENCE` or `E_HOLD` to local storage
- Material with **unknown or unconfirmed rights**
- Secrets, API keys, tokens, or environment files containing credentials

`git_managed` column: `true` only for rows whose `destination_path` lies under tracked `docs/`; `false` for `local-archive/` and external retention.

## Old worktree and folder retention

- **Deletion of old worktrees is prohibited** (`spacer-clone-main`, `spacer-clone-apollo-u3`, and linked worktrees remain until explicit disposition).
- **Physical deletion** of any legacy folder or file requires **individual approval** per path after manifest and verification gates.
- Empty or temporary folders classified `D_EXCLUDED` follow the same individual-approval rule before removal.

## Manifest schemas

### Git-tracked: `docs/migration/project_consolidation_manifest.csv`

Header (exact):

```text
original_path,original_folder,original_hash,original_size,migration_date,destination_path,classification,git_managed,duplicate_status,rights_status,notes
```

### Local only: `local-archive/manifests/local_archive_manifest.csv`

Same header. Rows describe copies under `local-archive/` (`git_managed=false`).

### Column guidance

| Column | Description |
| --- | --- |
| `original_path` | Path relative to consolidation root or logical source id (avoid absolute paths in committed rows) |
| `original_folder` | Source top-level folder name (e.g. `bridge-standards-research`) |
| `original_hash` | SHA-256 hex of content (or `SYMLINK` + target note) |
| `original_size` | Size in bytes |
| `migration_date` | ISO 8601 date (`YYYY-MM-DD`) |
| `destination_path` | Relative path under repository or `local-archive/` |
| `classification` | Enum value from table above |
| `git_managed` | `true` / `false` |
| `duplicate_status` | Result of SHA comparison against priority stack |
| `rights_status` | e.g. `CONFIRMED`, `UNKNOWN`, `RESTRICTED`, `N/A` |
| `notes` | Free text; **only column where absolute path may appear**, and then only as a provenance example |

### Provenance example (`notes` column only)

```text
provenance example: /home/masaharu/Projects/bridge-standards-research/handoffs/stage-01.md
```

Do not use absolute paths in `destination_path` or links inside policy documents.

## Rights and size

- Bridge research: five PDFs over 50 MiB → `E_HOLD` in `restricted-pdf/`; Git addition forbidden.
- PNG/ZIP/STL bulk → prefer `C_EVIDENCE` under `local-archive/` with Git-tracked summary only.
- Phase 2 **secret scan** is mandatory before any PR merge touching copied content.

## PR-A scope boundary

PR-A establishes this policy, `.gitignore` entry, empty manifest headers, and `local-archive/` directory skeleton only. After PR-A merges to `main`, approved archive bulk copy into `local-archive/legacy-archive/` (`cp -a`, symlink non-expansion, hash, manifest) proceeds as local work outside Git. Bridge research Git-tracked selection and `docs/` integration begin in PR-B.
