# Archive Documentation Index

**Status:** Phase 2 PR-E — UI preservation and legacy archive indexes
**Scope:** Git-tracked indexes and summaries only. No archive body files.

This tree records provenance for external `B_ARCHIVE` and related evidence held outside Git in `local-archive/`.

## Packages

| Package | Source folder | Indexed files | Git raw copies |
| --- | --- | ---: | ---: |
| [ui-preservation/](ui-preservation/README.md) | `line-tab-ui-preservation-20260729-092526` | 15 | 0 |
| [legacy-projects/](legacy-projects/README.md) | `archive/` | 117026 | 0 |
| [startup-records/](startup-records/README.md) | `docs/` (1 log) | 1 | 0 |

## Local archive map

| Local path | Contents |
| --- | --- |
| `local-archive/ui-preservation/` | Line-tab UI preservation bundle |
| `local-archive/legacy-archive/archive/` | External archive bulk (`cp -a`, symlinks preserved) |
| `local-archive/raw-evidence/top-level-docs/` | External docs-folder verification log |
| `local-archive/manifests/local_archive_manifest.csv` | Operational manifest (Git-ignored) |

## Excluded sources (reported, not indexed)

| Source | Classification | Reason |
| --- | --- | --- |
| `line-tab-ui-integration-temp` | `D_EXCLUDED` | Empty temporary directory (0 files) |

## Policy references

| Document | Role |
| --- | --- |
| [migration/local_archive_policy.md](../migration/local_archive_policy.md) | Normative local-archive boundaries |
| [migration/project_consolidation_report.md](../migration/project_consolidation_report.md) | Phase 2 status and PR verdicts |
| [migration/project_consolidation_manifest.csv](../migration/project_consolidation_manifest.csv) | Byte-exact Git copies only (no PR-E fake rows) |

## Path convention

Manifests use `Projects/<folder>/` relative paths. Narrative docs use `source://<folder>/` URIs. Absolute machine paths are omitted from Git-tracked summaries.
