# Consolidated Apollo Handoffs (2026-08-01)

**PR:** PR-C apollo handoff/research selective integration
**Scope:** External handoff acceptance/review metadata and frame handoff package index copied from `apollo/manual-research/`.

## Integration counts (PR-C manifest — handoffs subtree)

| Metric | Count |
| --- | ---: |
| Selected source artifacts (handoffs + external-handoffs rows) | 18 |
| `CANONICAL` copies under this directory | 12 |
| `DUPLICATE_SKIPPED` (SHA match on `main`) | 6 |

Full PR-C selection across research + handoffs: **112 selected**, **81 canonical**, **31 duplicate skipped** (see [research consolidated README](../../research/consolidated-2026-08-01/README.md)).

## Contents

| Path | Role | Status |
| --- | --- | --- |
| [external-handoffs/SC-20260726-001/acceptance/](external-handoffs/SC-20260726-001/acceptance/) | ZIP receipt, staging verification, acceptance verdict (9 artifacts) | Copied |
| [external-handoffs/SC-20260726-001/review/](external-handoffs/SC-20260726-001/review/) | Apollo return review, evidence spotcheck (2 artifacts) | Copied |
| [handoffs/APOLLO-FRAME-HANDOFF-20260726-001_review.md](handoffs/APOLLO-FRAME-HANDOFF-20260726-001_review.md) | Frame handoff package review | Copied |

### Skipped (SHA match — canonical elsewhere)

| Source | Canonical location |
| --- | --- |
| `handoffs/APOLLO-FRAME-HANDOFF-20260726-001_manifest.csv` | [APOLLO-FRAME-HANDOFF-20260726-001/.../MANIFEST.csv](../APOLLO-FRAME-HANDOFF-20260726-001/apollo_frame_team_handoff/MANIFEST.csv) |
| `external-handoffs/.../crosswalk/stage5_package_crosswalk.csv` | Frame handoff `standards/external_traceability_crosswalk.csv` |
| `external-handoffs/.../review/jis_gap_review.csv` | Frame handoff `standards/jis_source_gaps.csv` |
| `external-handoffs/.../review/open_review.csv` | Frame handoff `standards/open_items.csv` |
| `external-handoffs/.../review/ready_review.csv` | Frame handoff `standards/ready_requirements.csv` |
| `external-handoffs/.../review/unknown_review.csv` | Frame handoff `standards/unknown_items.csv` |

## Not included in Git

Per [local archive policy](../../../migration/local_archive_policy.md):

| Category | Local-archive or retention |
| --- | --- |
| `APOLLO-FRAME-HANDOFF-20260726-001.zip` | `local-archive/unknown-rights/apollo/manual-research/handoffs/` (also retained in source) |
| 97 evidence PNGs referenced by manifests | Frame-handoff images under [APOLLO-FRAME-HANDOFF-20260726-001](../APOLLO-FRAME-HANDOFF-20260726-001/apollo_frame_team_handoff/evidence/images/); remainder in source or `local-archive/raw-evidence/apollo/manual-research/` |
| `external-handoffs/SC-20260726-001/package/immutable/` | Bridge stage5 immutable package — [design-standards handoffs](../../design-standards/handoffs/consolidated-2026-08-01/) |
| ZIP SHA sidecar (`*.zip.sha256`) | Hash recorded in acceptance review only |

## Verification summary (from acceptance)

```text
ZIP_OPEN_TEST: PASSED
MANIFEST_MATCH: PASSED
SHA256_MATCH: PASSED
REQUIRED_FILES: PASSED
EVIDENCE_LINKAGE: PASSED
SOURCE_PDF_LEAK: NONE
```

## Provenance

Row-level copy records: [project_consolidation_manifest.csv](../../../migration/project_consolidation_manifest.csv).

Absolute paths in copied bodies are normalized to `source://apollo/`; see manifest `notes` for each transformation (2 files under `acceptance/`).

## Related

- [Apollo manual research artifacts](../../research/consolidated-2026-08-01/README.md)
- [Immutable APOLLO frame handoff](../APOLLO-FRAME-HANDOFF-20260726-001/README.md) (separate lineage — do not edit in place)
- [Bridge design-standards handoff](../../design-standards/handoffs/consolidated-2026-08-01/README.md)
- [Migration report](../../../migration/project_consolidation_report.md)
