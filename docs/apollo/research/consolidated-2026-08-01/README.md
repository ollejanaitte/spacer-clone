# Consolidated Apollo Manual Research (2026-08-01)

**PR:** PR-C apollo handoff/research selective integration
**Source:** `apollo` (`source://apollo/manual-research/`; see [provenance manifest](../../../migration/project_consolidation_manifest.csv))
**Authority:** Summary, CSV, and index metadata only — does not amend Step 1, design-standards (DS-00..09), or immutable handoff package decisions.

## Integration counts (PR-C manifest)

| Metric | Count |
| --- | ---: |
| Selected source artifacts | 112 |
| `CANONICAL` copies (this tree + handoffs tree) | 79 |
| `DUPLICATE_SKIPPED` (SHA match on `main`) | 33 |
| Git-tracked files under this directory (excl. README) | 67 |

Handoff acceptance/review metadata (12 `CANONICAL` files) lives at [handoffs/consolidated-2026-08-01/](../../handoffs/consolidated-2026-08-01/).

## Selection scope

Git-tracked copies preserve the source relative tree under `manual-research/` (excluding `work/`, `logs/`, `scripts/`, `handoff-work/`, and `external-handoffs/*/package/`):

| Source area | Destination (under this folder) | Copied | Skipped (SHA duplicate) |
| --- | --- | ---: | ---: |
| Stage summaries | `summaries/*.md` | 15 | 3 |
| Feature extraction | `features/*.{md,csv}` | 33 | 6 |
| Manual inventory | `inventory/*.{md,csv}` | 12 | 0 |
| Standards / traceability | `standards/*.{md,csv}` | 7 | 14 |
| Validation plans | `validation/*.md` | 0 | 3 |
| OSS mapping | `oss-mapping/*.csv` | 0 | 1 |

**Handoff acceptance and review** (external SC-20260726-001 package) lives separately at [handoffs/consolidated-2026-08-01/](../../handoffs/consolidated-2026-08-01/).

## Explicit exclusions

Not copied into Git (remain in source or `local-archive/` per [local archive policy](../../../migration/local_archive_policy.md)):

| Category | Count / examples | Local-archive or retention |
| --- | --- | --- |
| Original PDFs | 65 under `ユーザーズマニュアル/**` | `local-archive/unknown-rights/apollo/ユーザーズマニュアル/` |
| Evidence images | 97 `*.png` referenced by manifests | Frame-handoff images under `docs/apollo/handoffs/APOLLO-FRAME-HANDOFF-20260726-001/.../evidence/images/`; remainder in source `apollo/manual-research/` or `local-archive/raw-evidence/apollo/manual-research/` |
| Archives and binaries | `*.zip`, `*.pdf`, `*.jpg`, `*.xwd`, `*.doc` | See handoffs README for ZIP; PDFs as above |
| Work / planning / raw output | `work/`, `logs/`, `scripts/`, `handoff-work/` | `local-archive/research-originals/apollo/manual-research/` (partial) or source tree |
| Handoff package body | `handoff-work/` immutable snapshot | [APOLLO-FRAME-HANDOFF-20260726-001](../../handoffs/APOLLO-FRAME-HANDOFF-20260726-001/) (separate lineage) |
| External immutable package | `external-handoffs/SC-20260726-001/package/immutable/` | Bridge stage5 artifacts — [design-standards consolidated research](../../design-standards/research/consolidated-2026-08-01/) |
| Hash sidecars | `*.zip.sha256` | Hash recorded in acceptance review only |

## Rights and numeric blockers

- **Copyright:** Artifacts are inventories, locators, traceability rows, and supervisor review summaries. No standards body text, OCR dumps, or full table reproductions are integrated.
- **Numeric adoption:** Research records *location* and *evidence linkage* only. Design numerics remain blocked under DS-00..09 and Step 1 governance.
- **Open items:** The selected source copies matched the immutable frame handoff, so use the canonical [open-items register](../../handoffs/APOLLO-FRAME-HANDOFF-20260726-001/apollo_frame_team_handoff/standards/open_items.csv) and [JIS source-gap register](../../handoffs/APOLLO-FRAME-HANDOFF-20260726-001/apollo_frame_team_handoff/standards/jis_source_gaps.csv).

```text
APOLLO_MANUAL_RESEARCH_VERDICT: COMPLETE_WITH_OPEN_ITEMS
NUMERIC_RELEASE_READINESS: BLOCKED (unchanged — Step 1 / DS-09 authority)
```

## Provenance

- **Manifest:** Each selected source file has one row in [project_consolidation_manifest.csv](../../../migration/project_consolidation_manifest.csv) with SHA-256, size, and `CANONICAL` / `DUPLICATE_SKIPPED` status.
- **Path normalization:** Machine-local Apollo source prefixes in copied bodies are normalized to `source://apollo/`; transformations are recorded in manifest `notes` (3 destinations: `scripts_validate_handoff_report.md`, `zip_receipt.md`, `stage0_source_preservation_report.md`).
- **Local originals:** PDFs and PNG evidence are referenced by path and hash in CSV indexes only. Physical bodies are under `local-archive/` or retained in the external source tree.
- **Do not edit** artifact bodies for calculation or design content; corrections require a new consolidation pass.

## Artifact index

### Summaries

| File | Role |
| --- | --- |
| [summaries/apollo_system_overview.md](summaries/apollo_system_overview.md) | System overview |
| [summaries/apollo_processing_sequence.md](summaries/apollo_processing_sequence.md) | Processing sequence |
| [summaries/stage0_source_preservation_report.md](summaries/stage0_source_preservation_report.md) | Stage 0 preservation report |
| [summaries/stage1_manual_inventory_report.md](summaries/stage1_manual_inventory_report.md) | Stage 1 inventory report |
| [summaries/stage2_system_structure_report.md](summaries/stage2_system_structure_report.md) | Stage 2 system structure |
| [summaries/stage3_phase1_source_selection_report.md](summaries/stage3_phase1_source_selection_report.md) | Stage 3 source selection |
| [summaries/stage5a_traceability_scope_report.md](summaries/stage5a_traceability_scope_report.md) | Stage 5A traceability scope |
| [summaries/phase1_relevant_manuals.md](summaries/phase1_relevant_manuals.md) | Phase 1 relevant manuals |
| [summaries/phase1_source_selection.md](summaries/phase1_source_selection.md) | Phase 1 source selection |
| [summaries/stage4_1_common_geometry.md](summaries/stage4_1_common_geometry.md) | Stage 4.1 common geometry |
| [summaries/stage4_2_rc_slab_haunch.md](summaries/stage4_2_rc_slab_haunch.md) | Stage 4.2 RC slab haunch |
| [summaries/stage4_3_main_girder_section_splice.md](summaries/stage4_3_main_girder_section_splice.md) | Stage 4.3 main girder splice |
| [summaries/stage4_4_floor_cross_members.md](summaries/stage4_4_floor_cross_members.md) | Stage 4.4 floor cross members |
| [summaries/stage4_5_load_analysis.md](summaries/stage4_5_load_analysis.md) | Stage 4.5 load analysis |
| [summaries/stage4_6_outputs.md](summaries/stage4_6_outputs.md) | Stage 4.6 outputs |

### Inventory

| File | Role |
| --- | --- |
| [inventory/manual_catalog.csv](inventory/manual_catalog.csv) | Manual catalog |
| [inventory/manual_catalog.md](inventory/manual_catalog.md) | Manual catalog narrative |
| [inventory/pdf_file_list.csv](inventory/pdf_file_list.csv) | PDF file list (metadata) |
| [inventory/pdf_metadata.csv](inventory/pdf_metadata.csv) | PDF metadata |
| [inventory/p0_toc_entries.csv](inventory/p0_toc_entries.csv) | P0 TOC entries |
| [inventory/phase1_manual_selection.csv](inventory/phase1_manual_selection.csv) | Phase 1 manual selection |
| [inventory/duplicate_candidates.csv](inventory/duplicate_candidates.csv) | Duplicate candidates |
| [inventory/revision_matrix.md](inventory/revision_matrix.md) | Revision matrix |
| [inventory/manual_relationships.md](inventory/manual_relationships.md) | Manual relationships |
| [inventory/phase1_core_manuals.md](inventory/phase1_core_manuals.md) | Phase 1 core manuals |
| [inventory/phase1_support_manuals.md](inventory/phase1_support_manuals.md) | Phase 1 support manuals |
| [inventory/future_manuals.md](inventory/future_manuals.md) | Future manuals |

### Features and standards

See `features/` (33 files) and `standards/` (7 copied files) for stage 4–5 extraction catalogs and traceability registers. Stage 5A external research handoff CSV is canonical at [design-standards consolidated research](../../design-standards/research/consolidated-2026-08-01/stage5a_external_research_handoff.csv); Apollo return resolution is canonical at [handoffs consolidated review](../../handoffs/consolidated-2026-08-01/external-handoffs/SC-20260726-001/review/apollo_return_review.csv).

## Related navigation

- [Apollo handoffs consolidated package](../../handoffs/consolidated-2026-08-01/README.md)
- [Immutable frame handoff package](../../handoffs/APOLLO-FRAME-HANDOFF-20260726-001/README.md)
- [Bridge design-standards consolidated research](../../design-standards/research/consolidated-2026-08-01/README.md)
- [Migration report](../../../migration/project_consolidation_report.md)
