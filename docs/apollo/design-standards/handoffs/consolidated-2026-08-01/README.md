# Consolidated Apollo Handoffs (2026-08-01)

**PR:** PR-B bridge research selective integration
**Scope:** Stage 5 handoff package metadata copied from `bridge-standards-research/handoff/apollo-decoding/`.

## Contents

| Path | Role |
| --- | --- |
| [apollo-decoding/apollo_stage5_handoff_SC-20260726-001_manifest.csv](apollo-decoding/apollo_stage5_handoff_SC-20260726-001_manifest.csv) | 139-entry ZIP manifest (137 included files) |
| [apollo-decoding/apollo_stage5_handoff_SC-20260726-001_review.md](apollo-decoding/apollo_stage5_handoff_SC-20260726-001_review.md) | Package verification review |

## Not included in Git

Per [local archive policy](../../../../migration/local_archive_policy.md):

- `apollo_stage5_handoff_SC-20260726-001.zip` (~37.6 MiB) — remains in source and is consolidated under `local-archive/unknown-rights/bridge-standards/`
- 97 evidence PNGs referenced by manifest — consolidated under `local-archive/raw-evidence/bridge-standards/` or retained in the source tree
- ZIP SHA sidecar (`*.zip.sha256`) — hash recorded in review.md

## Verification summary (from review)

```text
ZIP_OPEN_TEST: PASSED
MANIFEST_MATCH: PASSED
SHA256_MATCH: PASSED
REQUIRED_FILES: PASSED
EVIDENCE_LINKAGE: PASSED
SOURCE_PDF_LEAK: NONE
```

## Provenance

Row-level copy records: [project_consolidation_manifest.csv](../../../../migration/project_consolidation_manifest.csv).

## Related

- [Bridge research artifacts](../../research/consolidated-2026-08-01/README.md)
- [Design standards authority](../../README.md)
- [Historical APOLLO frame handoff](../../../handoffs/APOLLO-FRAME-HANDOFF-20260726-001/README.md) (immutable — separate lineage)
