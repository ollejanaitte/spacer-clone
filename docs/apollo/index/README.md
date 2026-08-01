# Apollo Verification Evidence Index

**PR:** PR-D verification/operator evidence consolidation
**Date:** 2026-08-01
**Base:** `main` @ `beb942bfc09f0669b04dd70c6e38ef32ade18e97`

Navigation for Git-tracked summaries and selected evidence from external verification/smoke folders. Raw bulk remains under ignored `local-archive/`.

## Packages

| Package | Source folder | Git destination | Selected into Git |
| --- | --- | --- | --- |
| U3 checkpoint evidence | `apollo-u3-evidence` | [u3-evidence/summary/](../u3-evidence/summary/summary.md) | summary + manifest + selected result (raw `.txt` excluded) |
| PR5 browser smoke | `apollo-pr5-smoke` | [pr5-smoke/](../pr5-smoke/README.md) | smoke summary + JSON要約 + manifest (STL/PNG/log/raw JSON excluded) |
| Operator smoke | `apollo_operator_smoke_evidence` | [operator-smoke/](../operator-smoke/README.md) | formal summary + manifest + 1 representative PNG (59 PNG + 1 XWD excluded) |

## Local-archive retention

| Source | Local-archive path |
| --- | --- |
| U3 raw transcripts | `local-archive/raw-evidence/apollo-u3/` |
| PR5 STL/PNG/log/JSON | `local-archive/smoke-artifacts/apollo-pr5/` |
| Operator PNG/XWD | `local-archive/operator-evidence/apollo/` |

## Provenance

Row-level records: [project_consolidation_manifest.csv](../../migration/project_consolidation_manifest.csv).
Policy: [local_archive_policy.md](../../migration/local_archive_policy.md).
Phase status: [project_consolidation_report.md](../../migration/project_consolidation_report.md).

## Path scheme

Machine-local absolute paths are normalized to `source://<folder>/` in Git-tracked narratives (examples: `source://apollo-u3-evidence/`, `source://apollo-pr5-smoke/`, `source://apollo_operator_smoke_evidence/`, `source://spacer-clone-apollo-u3/`).
