# Old Folder Disposition

**PR:** PR-F final manifest/repository index
**Date:** 2026-08-01
**Base:** `main` @ `e569f3f27a5a59f5d5cae133bfd5478f51eba81c` (PR-E #233 merged)

Disposition labels for Phase 2 consolidation. Physical deletion of any path requires **individual approval** after manifest and verification gates ([local_archive_policy.md](local_archive_policy.md)). No automatic deletes.

## Canonical repository

| Path | Label | Notes |
| --- | --- | --- |
| `spacer-clone` | **CANONICAL** | Active Git repository; all integrated `docs/` and migration indexes live here |

## KEEP_WORKTREE (active linked worktrees)

| Worktree | Label | Notes |
| --- | --- | --- |
| `spacer-clone-main` | **KEEP_WORKTREE** | Primary development worktree; referenced by Apollo phase docs and UI preservation capture (`source://spacer-clone-main/`) |
| `spacer-clone-apollo-u3` | **KEEP_WORKTREE** | Apollo Unit 3 implementation worktree; U3 checkpoint evidence collected against it (`source://spacer-clone-apollo-u3/`) |

Deletion prohibited until explicit disposition approval beyond Phase 2 docs integration.

## KEEP_EXTERNAL (external authority/reporting; not committed by PR-A–F)

| File (repository parent directory) | Label | Notes |
| --- | --- | --- |
| `project_inventory.txt` | **KEEP_EXTERNAL** | Phase 1 inventory authority |
| `project_integration_plan.txt` | **KEEP_EXTERNAL** | Phase 1 integration plan authority |
| `final_report.txt` | **KEEP_EXTERNAL** | External operational report; overwritten at Phase 2 milestones and completion, never committed to the repository |

The inventory and integration plan remain read-only authority inputs. `final_report.txt` is updated outside Git as the operational Phase 2 report; PR-F does not copy it into the repository.

## Integrated source folders — DELETE_SAFE candidates (pending individual approval)

All rows below completed copy/hash/manifest/Git integration (PR-B through PR-E). Legacy `Projects/<folder>/` trees may be proposed for deletion only after per-path approval. **No deletes are authorized by this document.**

| Source folder | PR | Integration outcome | Local retention | Delete gate |
| --- | --- | --- | --- | --- |
| `bridge-standards-research` | B | 31 Git-tracked docs rows; research originals/PDFs in `local-archive/` | Yes | `DELETE_SAFE` candidate |
| `apollo` | C | 112 manifest rows (81 canonical, 31 duplicate skipped) | Yes | `DELETE_SAFE` candidate |
| `apollo-u3-evidence` | D | Index-only; 34 raw `.txt` in `local-archive/raw-evidence/apollo-u3/` | Yes | `DELETE_SAFE` candidate |
| `apollo-pr5-smoke` | D | 1 byte-exact JSON + derived summaries; STL/PNG/log in `local-archive/smoke-artifacts/apollo-pr5/` | Yes | `DELETE_SAFE` candidate |
| `apollo_operator_smoke_evidence` | D | 1 representative PNG + derived summaries; 60 captures in `local-archive/operator-evidence/apollo/` | Yes | `DELETE_SAFE` candidate |
| `line-tab-ui-preservation-20260729-092526` | E | Index-only; bodies in `local-archive/ui-preservation/` | Yes | `DELETE_SAFE` candidate |
| `archive` | E | Index-only; 116833-file bulk in `local-archive/legacy-archive/archive/` | Yes | `DELETE_SAFE` candidate |
| `docs` (startup log) | E | Index-only; log in `local-archive/raw-evidence/top-level-docs/` | Yes | `DELETE_SAFE` candidate |

## D_EXCLUDED — empty temporary

| Source folder | Label | Files | Notes |
| --- | --- | ---: | --- |
| `line-tab-ui-integration-temp` | **D_EXCLUDED** | 0 | Empty scratch directory; also a `DELETE_SAFE` candidate after individual approval |

## Disposition enum reference

| Label | Meaning in Phase 2 |
| --- | --- |
| `CANONICAL` | Active repository (`spacer-clone`) |
| `KEEP_WORKTREE` | Linked worktree retained for ongoing development |
| `KEEP_EXTERNAL` | Phase 1 authority files outside repo |
| `DELETE_SAFE` | Integrated source may be proposed for removal; **not approved here** |
| `D_EXCLUDED` | No migration; empty or reproducible scratch |

## Related documents

| Document | Role |
| --- | --- |
| [project_consolidation_path_map.md](project_consolidation_path_map.md) | Full source → destination mapping |
| [project_consolidation_summary.md](project_consolidation_summary.md) | PR A–E merge results and manifest aggregates |
| [project_consolidation_report.md](project_consolidation_report.md) | Phase status and SHA anchors |
| [project_consolidation_manifest.csv](project_consolidation_manifest.csv) | Central byte-exact Git copy rows (145 data rows) |
