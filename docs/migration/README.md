# Project Consolidation Migration

**Status:** Phase 2 in progress — PR-E (UI preservation/legacy indexes)
**Scope:** Documentation and local-archive layout only. No application source changes.

This directory holds provenance manifests and reports for consolidating external project folders into the canonical `spacer-clone` repository.

## Documents

| File | Role |
| --- | --- |
| [local_archive_policy.md](local_archive_policy.md) | Normative policy for classification, deduplication, Git boundaries, and workflow |
| [project_consolidation_manifest.csv](project_consolidation_manifest.csv) | Git-tracked provenance manifest for docs integrated into the repository |
| [project_consolidation_report.md](project_consolidation_report.md) | Phase status, SHA anchors, and verdict labels |

## Local archive (Git ignored)

Binary evidence, oversized files, and rights-restricted material live under `local-archive/` at the repository root. That tree is listed in `.gitignore` and is never committed.

Operational manifest for local-archive copies: `local-archive/manifests/local_archive_manifest.csv` (created on disk only).

## Phase 2 PR sequence

| PR | Focus |
| --- | --- |
| PR-A | Local-archive boundary (merged) |
| PR-B | Bridge research (merged) |
| PR-C | Apollo handoff/research materials (merged) |
| PR-D | Verification/operator evidence (merged) |
| PR-E | UI preservation/legacy indexes (this step) |
| PR-F | Final manifest/repository index |
| PR-G | Newly consolidated docs path normalization (only when required) |

Functional PRs, lockfile changes, and `npm install` are out of scope.

## Archive indexes (PR-E)

| Path | Role |
| --- | --- |
| [../archive/README.md](../archive/README.md) | Archive documentation index |
| [../archive/ui-preservation/README.md](../archive/ui-preservation/README.md) | Line-tab UI preservation record |
| [../archive/legacy-projects/README.md](../archive/legacy-projects/README.md) | External archive tree index |
| [../archive/startup-records/README.md](../archive/startup-records/README.md) | External docs startup log summary |

## Authority

Phase 1 inventory and integration plan remain the external reference set (repository parent directory). This migration tree records execution against that plan without duplicating full inventory text.
