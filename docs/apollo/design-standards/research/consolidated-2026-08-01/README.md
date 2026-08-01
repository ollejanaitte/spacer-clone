# Consolidated Bridge Standards Research (2026-08-01)

**PR:** PR-B bridge research selective integration
**Source:** `bridge-standards-research` (Projects-relative; see [provenance manifest](../../../../migration/project_consolidation_manifest.csv))
**Authority:** Summary and metadata only — does not amend DS-00..09 integration decisions in the parent [design-standards README](../../README.md).

## Selection scope

Git-tracked copies preserve the source relative tree under this directory:

| Source area | Destination (under this folder) | Count |
| --- | --- | --- |
| Root Stage 5A handoff | `stage5a_*.md`, `stage5a_external_research_handoff.csv` | 3 |
| PDF inventory | `inventory/*.md`, `inventory/*.csv` | 6 |
| Stage 5B research | `research/stage5b/**` (`.md`, `.csv`, `.json`) | 20 |

**Handoff package review** (manifest + review only) lives separately at [handoffs/consolidated-2026-08-01/apollo-decoding/](../../handoffs/consolidated-2026-08-01/apollo-decoding/).

## Explicit exclusions

Not copied into Git (remain in source or `local-archive/` per [local archive policy](../../../../migration/local_archive_policy.md)):

| Category | Examples |
| --- | --- |
| Original PDFs | `260726_設計基準/**` |
| Hash snapshots | `*sha256_before*`, `*sha256_after*`, `pdf_sha256_*` |
| Page evidence images | `research/stage5b/page-images/evidence/*.png` (97 files) |
| Work / planning / validation trees | `work/`, `planning/`, `validation/` |
| Logs and raw command output | `logs/*.log`, `*.log` |
| Archives and binaries | `*.zip`, `*.pdf`, `*.png`, `*.jpg`, `*.xwd` |

## Rights and numeric blockers

- **Copyright:** Artifacts are inventories, locators, traceability rows, and supervisor review summaries. No standards body text, OCR dumps, or full table reproductions are integrated.
- **Numeric adoption:** Stage 5B explicitly records *location* and *evidence linkage* only (`LOCATED` / `PARTIALLY_LOCATED`). Design numerics, load magnitudes, and partial factors remain blocked under DS-00..09.
- **Evidence images:** 300 dpi PNG crops stay outside Git; index metadata is in `research/stage5b/stage5b_evidence_index.csv`.
- **Open items:** 34 `BLOCKED_BY_SOURCE_GAP` (JIS), 41 `RETURN_TO_APOLLO`, 15 `UNKNOWN` (see `stage5a_unresolved_questions.md`, `stage5b_unresolved_register.csv`).

```text
STAGE5B_RESEARCH_VERDICT: COMPLETE_WITH_OPEN_ITEMS
NUMERIC_RELEASE_READINESS: BLOCKED (unchanged — DS-09 authority)
```

## Provenance

- **Manifest:** Each copied source file has one row in [project_consolidation_manifest.csv](../../../../migration/project_consolidation_manifest.csv) with SHA-256, size, and `A_MAIN` / `DUPLICATE_SKIPPED` classification.
- **Local originals:** PDFs and page-image evidence are referenced by path and hash in CSV indexes only. Their physical bodies are consolidated under `local-archive/restricted-pdf/bridge-standards/` and `local-archive/raw-evidence/bridge-standards/`, respectively, or retained in the external source tree — not duplicated here.
- **Do not edit** artifact bodies for calculation or design content; corrections require a new consolidation pass.

## Artifact index

### Stage 5A (external research handoff)

| File | Role |
| --- | --- |
| [stage5a_reading_request.md](stage5a_reading_request.md) | Stage 5A reading request to external research |
| [stage5a_external_research_handoff.csv](stage5a_external_research_handoff.csv) | 273-row handoff to Stage 5B |
| [stage5a_unresolved_questions.md](stage5a_unresolved_questions.md) | 15 UNKNOWN / NEEDS_REVIEW items |

### Inventory (PDF metadata)

| File | Role |
| --- | --- |
| [inventory/phase1_document_priority.md](inventory/phase1_document_priority.md) | Phase 1 document priority tiers |
| [inventory/pdf_quick_inventory.csv](inventory/pdf_quick_inventory.csv) | Quick PDF inventory |
| [inventory/pdf_quick_review_report.md](inventory/pdf_quick_review_report.md) | Quick review report |
| [inventory/pdf_toc_overview.md](inventory/pdf_toc_overview.md) | TOC overview (metadata) |
| [inventory/pdf_version_priority_inventory.csv](inventory/pdf_version_priority_inventory.csv) | Version-priority inventory |
| [inventory/pdf_version_priority_review_report.md](inventory/pdf_version_priority_review_report.md) | Version review report |

### Stage 5B research

| File | Role |
| --- | --- |
| [research/stage5b/stage5b_research_summary.md](research/stage5b/stage5b_research_summary.md) | Executive summary |
| [research/stage5b/stage5b_research_review_report.md](research/stage5b/stage5b_research_review_report.md) | Supervisor review report |
| [research/stage5b/stage5b_research_plan.md](research/stage5b/stage5b_research_plan.md) | Research plan |
| [research/stage5b/stage5b_long_run_manifest.csv](research/stage5b/stage5b_long_run_manifest.csv) | Long-run manifest |
| [research/stage5b/stage5b_package_status.csv](research/stage5b/stage5b_package_status.csv) | Package completion status |
| [research/stage5b/stage5b_research_results.csv](research/stage5b/stage5b_research_results.csv) | Primary research results (101 rows) |
| [research/stage5b/stage5b_handoff_result_map.csv](research/stage5b/stage5b_handoff_result_map.csv) | 273-row handoff traceability |
| [research/stage5b/stage5b_handoff_result_map_pkg003.csv](research/stage5b/stage5b_handoff_result_map_pkg003.csv) | PKG-003 handoff map |
| [research/stage5b/stage5b_evidence_index.csv](research/stage5b/stage5b_evidence_index.csv) | Evidence image index (paths local-only) |
| [research/stage5b/stage5b_unresolved_register.csv](research/stage5b/stage5b_unresolved_register.csv) | Unresolved register |
| [research/stage5b/package-reports/](research/stage5b/package-reports/) | Per-package reports (PKG-003..007) |
| [research/stage5b/checkpoints/](research/stage5b/checkpoints/) | Package checkpoint JSON (5 files) |

## Related navigation

- [Design standards integration authority](../../README.md)
- [Apollo decoding handoff package](../../handoffs/consolidated-2026-08-01/README.md)
- [Migration report](../../../../migration/project_consolidation_report.md)
