# Project Consolidation Path Map

**PR:** PR-F final manifest/repository index
**Date:** 2026-08-01
**Base:** `main` @ `e569f3f27a5a59f5d5cae133bfd5478f51eba81c` (PR-E #233 merged)

Complete source-to-destination map for Phase 2 consolidation. Paths use `Projects/<folder>/` for external sources, `docs/**` for Git-tracked integration, `local-archive/**` for Git-ignored retention, and `source://<folder>/` in narratives. No absolute machine paths.

Authority for byte-exact Git copies: [project_consolidation_manifest.csv](project_consolidation_manifest.csv) (**145 data rows**, unchanged by PR-F). Policy: [local_archive_policy.md](local_archive_policy.md). Disposition labels: [old_folder_disposition.md](old_folder_disposition.md).

## Source folder rollup

| Source folder | PR | Git `docs/` destination | `local-archive/` retention | Excluded / notes | Central manifest rows |
| --- | --- | --- | --- | --- | ---: |
| `bridge-standards-research` | B | [design-standards/research/consolidated-2026-08-01/](../apollo/design-standards/research/consolidated-2026-08-01/README.md), [design-standards/handoffs/consolidated-2026-08-01/](../apollo/design-standards/handoffs/consolidated-2026-08-01/README.md) | `research-originals/bridge-standards/`, `restricted-pdf/bridge-standards/`, `unknown-rights/bridge-standards/`, `raw-evidence/bridge-standards/` | PDF bulk and unknown-rights archives stay outside Git | 31 |
| `apollo` | C | [research/consolidated-2026-08-01/](../apollo/research/consolidated-2026-08-01/README.md), [handoffs/consolidated-2026-08-01/](../apollo/handoffs/consolidated-2026-08-01/README.md) | `research-originals/apollo/`, `unknown-rights/apollo/`, `raw-evidence/apollo/` | 31 `DUPLICATE_SKIPPED` (SHA match existing `docs/apollo/handoffs/`) | 112 |
| `apollo-u3-evidence` | D | [u3-evidence/summary/](../apollo/u3-evidence/summary/summary.md) (index only) | `raw-evidence/apollo-u3/` | 34 raw `.txt` transcripts | 0 |
| `apollo-pr5-smoke` | D | [pr5-smoke/](../apollo/pr5-smoke/README.md) | `smoke-artifacts/apollo-pr5/` | STL/PNG/log/raw JSON bulk | 1 |
| `apollo_operator_smoke_evidence` | D | [operator-smoke/](../apollo/operator-smoke/README.md) + 1 representative PNG | `operator-evidence/apollo/` | 59 PNG + 1 XWD | 1 |
| `line-tab-ui-preservation-20260729-092526` | E | [archive/ui-preservation/](../archive/ui-preservation/README.md) (index only) | `ui-preservation/line-tab-ui-preservation-20260729-092526/` | 15 preservation bodies + diffs | 0 |
| `archive` | E | [archive/legacy-projects/](../archive/legacy-projects/README.md) (index only) | `legacy-archive/archive/` | 116833 files bulk; symlinks not dereferenced | 0 |
| `docs` (startup log) | E | [archive/startup-records/](../archive/startup-records/README.md) (index only) | `raw-evidence/top-level-docs/` | 1 failed electron startup log | 0 |
| `line-tab-ui-integration-temp` | E | — | — | `D_EXCLUDED` — empty scratch (0 files) | 0 |
| `spacer-clone-main` | — | — (active worktree) | — | `KEEP_WORKTREE` — not a migration source | 0 |
| `spacer-clone-apollo-u3` | — | — (active worktree) | — | `KEEP_WORKTREE` — U3 evidence reference only | 0 |

## Index-only packages (derived docs; bodies local)

| Source | Git index package | Package manifests | Byte-exact central rows |
| --- | --- | --- | ---: |
| `apollo-u3-evidence` | `docs/apollo/u3-evidence/summary/` | `source_manifest.csv`, `manifest.csv` | 0 |
| `apollo-pr5-smoke` | `docs/apollo/pr5-smoke/` | `source_manifest.csv`, `manifest.csv` | 1 (`browser-smoke-summary.json`) |
| `apollo_operator_smoke_evidence` | `docs/apollo/operator-smoke/` | `source_manifest.csv`, `manifest.csv` | 1 (`17_sample_loaded.png`) |
| `line-tab-ui-preservation-20260729-092526` | `docs/archive/ui-preservation/` | `source_manifest.csv` | 0 |
| `archive` | `docs/archive/legacy-projects/` | `source_summary.csv`, `archive_tree_summary.md` | 0 |
| `docs` | `docs/archive/startup-records/` | `source_manifest.csv` | 0 |

Navigation hub: [apollo/index/README.md](../apollo/index/README.md), [archive/README.md](../archive/README.md).

## Local-archive retention map

Operational manifest: `local-archive/manifests/local_archive_manifest.csv` (**118389 data rows**, Git-ignored).

| Source folder | Primary `local-archive/` path | Manifest rows | Classification mix |
| --- | --- | ---: | --- |
| `archive` | `legacy-archive/archive/` | 117026 | `B_ARCHIVE` bulk (`cp -a`, symlinks preserved) |
| `bridge-standards-research` | `research-originals/bridge-standards/`, `restricted-pdf/bridge-standards/`, `unknown-rights/bridge-standards/`, `raw-evidence/bridge-standards/` | 702 | `B_ARCHIVE`, `E_HOLD`, `DUPLICATE_SKIPPED` |
| `apollo` | `research-originals/apollo/`, `unknown-rights/apollo/`, `raw-evidence/apollo/` | 534 | `B_ARCHIVE`, `E_HOLD`, `DUPLICATE_SKIPPED` |
| `apollo_operator_smoke_evidence` | `operator-evidence/apollo/` | 61 | `C_EVIDENCE` |
| `apollo-u3-evidence` | `raw-evidence/apollo-u3/` | 34 | `C_EVIDENCE` |
| `apollo-pr5-smoke` | `smoke-artifacts/apollo-pr5/` | 16 | `C_EVIDENCE` |
| `line-tab-ui-preservation-20260729-092526` | `ui-preservation/line-tab-ui-preservation-20260729-092526/` | 15 | `B_ARCHIVE` |
| `docs` | `raw-evidence/top-level-docs/` | 1 | `C_EVIDENCE` |

## Excluded sources

| Source | Classification | Git / local copy | Notes |
| --- | --- | --- | --- |
| `line-tab-ui-integration-temp` | `D_EXCLUDED` | None | Empty temporary directory; disposition `DELETE_SAFE` candidate pending individual approval |

## Git-tracked byte-exact rows (central manifest)

Row-level provenance for every file copied into tracked `docs/`. `DUPLICATE_SKIPPED` rows record SHA matches against existing canonical `docs/` paths; no second copy was added.


### `apollo` (112 manifest rows)

| original_path | destination_path | classification | duplicate_status |
| --- | --- | --- | --- |
| `apollo/manual-research/external-handoffs/SC-20260726-001/acceptance/acceptance_verdict.md` | `docs/apollo/handoffs/consolidated-2026-08-01/external-handoffs/SC-20260726-001/acceptance/acceptance_verdict.md` | A_MAIN | CANONICAL |
| `apollo/manual-research/external-handoffs/SC-20260726-001/acceptance/manifest_comparison.csv` | `docs/apollo/handoffs/consolidated-2026-08-01/external-handoffs/SC-20260726-001/acceptance/manifest_comparison.csv` | A_MAIN | CANONICAL |
| `apollo/manual-research/external-handoffs/SC-20260726-001/acceptance/package_content_review.md` | `docs/apollo/handoffs/consolidated-2026-08-01/external-handoffs/SC-20260726-001/acceptance/package_content_review.md` | A_MAIN | CANONICAL |
| `apollo/manual-research/external-handoffs/SC-20260726-001/acceptance/scripts_validate_handoff_issues.csv` | `docs/apollo/handoffs/consolidated-2026-08-01/external-handoffs/SC-20260726-001/acceptance/scripts_validate_handoff_issues.csv` | A_MAIN | CANONICAL |
| `apollo/manual-research/external-handoffs/SC-20260726-001/acceptance/scripts_validate_handoff_report.md` | `docs/apollo/handoffs/consolidated-2026-08-01/external-handoffs/SC-20260726-001/acceptance/scripts_validate_handoff_report.md` | A_MAIN | CANONICAL |
| `apollo/manual-research/external-handoffs/SC-20260726-001/acceptance/sha256_verification.csv` | `docs/apollo/handoffs/consolidated-2026-08-01/external-handoffs/SC-20260726-001/acceptance/sha256_verification.csv` | A_MAIN | CANONICAL |
| `apollo/manual-research/external-handoffs/SC-20260726-001/acceptance/staging_verification.md` | `docs/apollo/handoffs/consolidated-2026-08-01/external-handoffs/SC-20260726-001/acceptance/staging_verification.md` | A_MAIN | CANONICAL |
| `apollo/manual-research/external-handoffs/SC-20260726-001/acceptance/zip_receipt.md` | `docs/apollo/handoffs/consolidated-2026-08-01/external-handoffs/SC-20260726-001/acceptance/zip_receipt.md` | A_MAIN | CANONICAL |
| `apollo/manual-research/external-handoffs/SC-20260726-001/acceptance/zip_safety_review.md` | `docs/apollo/handoffs/consolidated-2026-08-01/external-handoffs/SC-20260726-001/acceptance/zip_safety_review.md` | A_MAIN | CANONICAL |
| `apollo/manual-research/external-handoffs/SC-20260726-001/crosswalk/stage5_package_crosswalk.csv` | `docs/apollo/handoffs/consolidated-2026-08-01/external-handoffs/SC-20260726-001/crosswalk/stage5_package_crosswalk.csv` | A_MAIN | DUPLICATE_SKIPPED |
| `apollo/manual-research/external-handoffs/SC-20260726-001/review/apollo_return_review.csv` | `docs/apollo/handoffs/consolidated-2026-08-01/external-handoffs/SC-20260726-001/review/apollo_return_review.csv` | A_MAIN | CANONICAL |
| `apollo/manual-research/external-handoffs/SC-20260726-001/review/evidence_image_spotcheck.md` | `docs/apollo/handoffs/consolidated-2026-08-01/external-handoffs/SC-20260726-001/review/evidence_image_spotcheck.md` | A_MAIN | CANONICAL |
| `apollo/manual-research/external-handoffs/SC-20260726-001/review/jis_gap_review.csv` | `docs/apollo/handoffs/consolidated-2026-08-01/external-handoffs/SC-20260726-001/review/jis_gap_review.csv` | A_MAIN | DUPLICATE_SKIPPED |
| `apollo/manual-research/external-handoffs/SC-20260726-001/review/open_review.csv` | `docs/apollo/handoffs/consolidated-2026-08-01/external-handoffs/SC-20260726-001/review/open_review.csv` | A_MAIN | DUPLICATE_SKIPPED |
| `apollo/manual-research/external-handoffs/SC-20260726-001/review/ready_review.csv` | `docs/apollo/handoffs/consolidated-2026-08-01/external-handoffs/SC-20260726-001/review/ready_review.csv` | A_MAIN | DUPLICATE_SKIPPED |
| `apollo/manual-research/external-handoffs/SC-20260726-001/review/unknown_review.csv` | `docs/apollo/handoffs/consolidated-2026-08-01/external-handoffs/SC-20260726-001/review/unknown_review.csv` | A_MAIN | DUPLICATE_SKIPPED |
| `apollo/manual-research/features/data_exchange_catalog.csv` | `docs/apollo/research/consolidated-2026-08-01/features/data_exchange_catalog.csv` | A_MAIN | CANONICAL |
| `apollo/manual-research/features/feature_aliases.csv` | `docs/apollo/research/consolidated-2026-08-01/features/feature_aliases.csv` | A_MAIN | DUPLICATE_SKIPPED |
| `apollo/manual-research/features/feature_catalog.csv` | `docs/apollo/research/consolidated-2026-08-01/features/feature_catalog.csv` | A_MAIN | CANONICAL |
| `apollo/manual-research/features/feature_catalog.md` | `docs/apollo/research/consolidated-2026-08-01/features/feature_catalog.md` | A_MAIN | DUPLICATE_SKIPPED |
| `apollo/manual-research/features/feature_conflicts.md` | `docs/apollo/research/consolidated-2026-08-01/features/feature_conflicts.md` | A_MAIN | DUPLICATE_SKIPPED |
| `apollo/manual-research/features/feature_data_flow.md` | `docs/apollo/research/consolidated-2026-08-01/features/feature_data_flow.md` | A_MAIN | DUPLICATE_SKIPPED |
| `apollo/manual-research/features/feature_dependency_map.md` | `docs/apollo/research/consolidated-2026-08-01/features/feature_dependency_map.md` | A_MAIN | DUPLICATE_SKIPPED |
| `apollo/manual-research/features/manual_reading_order.md` | `docs/apollo/research/consolidated-2026-08-01/features/manual_reading_order.md` | A_MAIN | CANONICAL |
| `apollo/manual-research/features/phase1_feature_to_manual_matrix.csv` | `docs/apollo/research/consolidated-2026-08-01/features/phase1_feature_to_manual_matrix.csv` | A_MAIN | CANONICAL |
| `apollo/manual-research/features/stage4_1_common_geometry.csv` | `docs/apollo/research/consolidated-2026-08-01/features/stage4_1_common_geometry.csv` | A_MAIN | CANONICAL |
| `apollo/manual-research/features/stage4_1_dependencies.md` | `docs/apollo/research/consolidated-2026-08-01/features/stage4_1_dependencies.md` | A_MAIN | CANONICAL |
| `apollo/manual-research/features/stage4_1_unknowns.md` | `docs/apollo/research/consolidated-2026-08-01/features/stage4_1_unknowns.md` | A_MAIN | CANONICAL |
| `apollo/manual-research/features/stage4_2_dependencies.md` | `docs/apollo/research/consolidated-2026-08-01/features/stage4_2_dependencies.md` | A_MAIN | CANONICAL |
| `apollo/manual-research/features/stage4_2_rc_slab_haunch.csv` | `docs/apollo/research/consolidated-2026-08-01/features/stage4_2_rc_slab_haunch.csv` | A_MAIN | CANONICAL |
| `apollo/manual-research/features/stage4_2_unknowns.md` | `docs/apollo/research/consolidated-2026-08-01/features/stage4_2_unknowns.md` | A_MAIN | CANONICAL |
| `apollo/manual-research/features/stage4_3_dependencies.md` | `docs/apollo/research/consolidated-2026-08-01/features/stage4_3_dependencies.md` | A_MAIN | CANONICAL |
| `apollo/manual-research/features/stage4_3_main_girder_section_splice.csv` | `docs/apollo/research/consolidated-2026-08-01/features/stage4_3_main_girder_section_splice.csv` | A_MAIN | CANONICAL |
| `apollo/manual-research/features/stage4_3_program_responsibility_matrix.md` | `docs/apollo/research/consolidated-2026-08-01/features/stage4_3_program_responsibility_matrix.md` | A_MAIN | CANONICAL |
| `apollo/manual-research/features/stage4_3_unknowns.md` | `docs/apollo/research/consolidated-2026-08-01/features/stage4_3_unknowns.md` | A_MAIN | CANONICAL |
| `apollo/manual-research/features/stage4_4_dependencies.md` | `docs/apollo/research/consolidated-2026-08-01/features/stage4_4_dependencies.md` | A_MAIN | CANONICAL |
| `apollo/manual-research/features/stage4_4_floor_cross_members.csv` | `docs/apollo/research/consolidated-2026-08-01/features/stage4_4_floor_cross_members.csv` | A_MAIN | CANONICAL |
| `apollo/manual-research/features/stage4_4_phase_class_candidates.csv` | `docs/apollo/research/consolidated-2026-08-01/features/stage4_4_phase_class_candidates.csv` | A_MAIN | CANONICAL |
| `apollo/manual-research/features/stage4_4_unknowns.md` | `docs/apollo/research/consolidated-2026-08-01/features/stage4_4_unknowns.md` | A_MAIN | CANONICAL |
| `apollo/manual-research/features/stage4_5_analysis_data_flow.md` | `docs/apollo/research/consolidated-2026-08-01/features/stage4_5_analysis_data_flow.md` | A_MAIN | CANONICAL |
| `apollo/manual-research/features/stage4_5_load_analysis.csv` | `docs/apollo/research/consolidated-2026-08-01/features/stage4_5_load_analysis.csv` | A_MAIN | CANONICAL |
| `apollo/manual-research/features/stage4_5_stage5_candidates.csv` | `docs/apollo/research/consolidated-2026-08-01/features/stage4_5_stage5_candidates.csv` | A_MAIN | CANONICAL |
| `apollo/manual-research/features/stage4_5_unknowns.md` | `docs/apollo/research/consolidated-2026-08-01/features/stage4_5_unknowns.md` | A_MAIN | CANONICAL |
| `apollo/manual-research/features/stage4_6_external_dependencies.md` | `docs/apollo/research/consolidated-2026-08-01/features/stage4_6_external_dependencies.md` | A_MAIN | CANONICAL |
| `apollo/manual-research/features/stage4_6_output_data_flow.md` | `docs/apollo/research/consolidated-2026-08-01/features/stage4_6_output_data_flow.md` | A_MAIN | CANONICAL |
| `apollo/manual-research/features/stage4_6_outputs.csv` | `docs/apollo/research/consolidated-2026-08-01/features/stage4_6_outputs.csv` | A_MAIN | CANONICAL |
| `apollo/manual-research/features/stage4_6_unknowns.md` | `docs/apollo/research/consolidated-2026-08-01/features/stage4_6_unknowns.md` | A_MAIN | CANONICAL |
| `apollo/manual-research/features/stage4_extraction_plan.md` | `docs/apollo/research/consolidated-2026-08-01/features/stage4_extraction_plan.md` | A_MAIN | CANONICAL |
| `apollo/manual-research/features/stage5_traceability_candidates.csv` | `docs/apollo/research/consolidated-2026-08-01/features/stage5_traceability_candidates.csv` | A_MAIN | CANONICAL |
| `apollo/manual-research/features/standalone_program_catalog.csv` | `docs/apollo/research/consolidated-2026-08-01/features/standalone_program_catalog.csv` | A_MAIN | CANONICAL |
| `apollo/manual-research/features/system_component_catalog.csv` | `docs/apollo/research/consolidated-2026-08-01/features/system_component_catalog.csv` | A_MAIN | CANONICAL |
| `apollo/manual-research/features/system_dependency_map.md` | `docs/apollo/research/consolidated-2026-08-01/features/system_dependency_map.md` | A_MAIN | CANONICAL |
| `apollo/manual-research/features/unresolved_features.md` | `docs/apollo/research/consolidated-2026-08-01/features/unresolved_features.md` | A_MAIN | DUPLICATE_SKIPPED |
| `apollo/manual-research/features/unresolved_source_selection.md` | `docs/apollo/research/consolidated-2026-08-01/features/unresolved_source_selection.md` | A_MAIN | CANONICAL |
| `apollo/manual-research/features/unresolved_system_structure.md` | `docs/apollo/research/consolidated-2026-08-01/features/unresolved_system_structure.md` | A_MAIN | CANONICAL |
| `apollo/manual-research/handoffs/APOLLO-FRAME-HANDOFF-20260726-001_manifest.csv` | `docs/apollo/handoffs/consolidated-2026-08-01/handoffs/APOLLO-FRAME-HANDOFF-20260726-001_manifest.csv` | A_MAIN | DUPLICATE_SKIPPED |
| `apollo/manual-research/handoffs/APOLLO-FRAME-HANDOFF-20260726-001_review.md` | `docs/apollo/handoffs/consolidated-2026-08-01/handoffs/APOLLO-FRAME-HANDOFF-20260726-001_review.md` | A_MAIN | CANONICAL |
| `apollo/manual-research/inventory/duplicate_candidates.csv` | `docs/apollo/research/consolidated-2026-08-01/inventory/duplicate_candidates.csv` | A_MAIN | CANONICAL |
| `apollo/manual-research/inventory/future_manuals.md` | `docs/apollo/research/consolidated-2026-08-01/inventory/future_manuals.md` | A_MAIN | CANONICAL |
| `apollo/manual-research/inventory/manual_catalog.csv` | `docs/apollo/research/consolidated-2026-08-01/inventory/manual_catalog.csv` | A_MAIN | CANONICAL |
| `apollo/manual-research/inventory/manual_catalog.md` | `docs/apollo/research/consolidated-2026-08-01/inventory/manual_catalog.md` | A_MAIN | CANONICAL |
| `apollo/manual-research/inventory/manual_relationships.md` | `docs/apollo/research/consolidated-2026-08-01/inventory/manual_relationships.md` | A_MAIN | CANONICAL |
| `apollo/manual-research/inventory/p0_toc_entries.csv` | `docs/apollo/research/consolidated-2026-08-01/inventory/p0_toc_entries.csv` | A_MAIN | CANONICAL |
| `apollo/manual-research/inventory/pdf_file_list.csv` | `docs/apollo/research/consolidated-2026-08-01/inventory/pdf_file_list.csv` | A_MAIN | CANONICAL |
| `apollo/manual-research/inventory/pdf_metadata.csv` | `docs/apollo/research/consolidated-2026-08-01/inventory/pdf_metadata.csv` | A_MAIN | CANONICAL |
| `apollo/manual-research/inventory/phase1_core_manuals.md` | `docs/apollo/research/consolidated-2026-08-01/inventory/phase1_core_manuals.md` | A_MAIN | CANONICAL |
| `apollo/manual-research/inventory/phase1_manual_selection.csv` | `docs/apollo/research/consolidated-2026-08-01/inventory/phase1_manual_selection.csv` | A_MAIN | CANONICAL |
| `apollo/manual-research/inventory/phase1_support_manuals.md` | `docs/apollo/research/consolidated-2026-08-01/inventory/phase1_support_manuals.md` | A_MAIN | CANONICAL |
| `apollo/manual-research/inventory/revision_matrix.md` | `docs/apollo/research/consolidated-2026-08-01/inventory/revision_matrix.md` | A_MAIN | CANONICAL |
| `apollo/manual-research/oss-mapping/stage6_mapping_candidates.csv` | `docs/apollo/research/consolidated-2026-08-01/oss-mapping/stage6_mapping_candidates.csv` | A_MAIN | DUPLICATE_SKIPPED |
| `apollo/manual-research/standards/stage5_acceptance_design.md` | `docs/apollo/research/consolidated-2026-08-01/standards/stage5_acceptance_design.md` | A_MAIN | CANONICAL |
| `apollo/manual-research/standards/stage5_apollo_return_resolution.csv` | `docs/apollo/research/consolidated-2026-08-01/standards/stage5_apollo_return_resolution.csv` | A_MAIN | CANONICAL |
| `apollo/manual-research/standards/stage5_conflicts.csv` | `docs/apollo/research/consolidated-2026-08-01/standards/stage5_conflicts.csv` | A_MAIN | DUPLICATE_SKIPPED |
| `apollo/manual-research/standards/stage5_design_freeze_assessment.md` | `docs/apollo/research/consolidated-2026-08-01/standards/stage5_design_freeze_assessment.md` | A_MAIN | DUPLICATE_SKIPPED |
| `apollo/manual-research/standards/stage5_external_traceability_crosswalk.csv` | `docs/apollo/research/consolidated-2026-08-01/standards/stage5_external_traceability_crosswalk.csv` | A_MAIN | DUPLICATE_SKIPPED |
| `apollo/manual-research/standards/stage5_jis_source_gaps.csv` | `docs/apollo/research/consolidated-2026-08-01/standards/stage5_jis_source_gaps.csv` | A_MAIN | DUPLICATE_SKIPPED |
| `apollo/manual-research/standards/stage5_open_items.csv` | `docs/apollo/research/consolidated-2026-08-01/standards/stage5_open_items.csv` | A_MAIN | DUPLICATE_SKIPPED |
| `apollo/manual-research/standards/stage5_open_items_management.md` | `docs/apollo/research/consolidated-2026-08-01/standards/stage5_open_items_management.md` | A_MAIN | DUPLICATE_SKIPPED |
| `apollo/manual-research/standards/stage5_ready_requirements.csv` | `docs/apollo/research/consolidated-2026-08-01/standards/stage5_ready_requirements.csv` | A_MAIN | DUPLICATE_SKIPPED |
| `apollo/manual-research/standards/stage5_standard_traceability_report.md` | `docs/apollo/research/consolidated-2026-08-01/standards/stage5_standard_traceability_report.md` | A_MAIN | DUPLICATE_SKIPPED |
| `apollo/manual-research/standards/stage5_traceability_data_model.md` | `docs/apollo/research/consolidated-2026-08-01/standards/stage5_traceability_data_model.md` | A_MAIN | DUPLICATE_SKIPPED |
| `apollo/manual-research/standards/stage5_unknown_resolution.csv` | `docs/apollo/research/consolidated-2026-08-01/standards/stage5_unknown_resolution.csv` | A_MAIN | DUPLICATE_SKIPPED |
| `apollo/manual-research/standards/stage5a_explicit_standard_references.csv` | `docs/apollo/research/consolidated-2026-08-01/standards/stage5a_explicit_standard_references.csv` | A_MAIN | CANONICAL |
| `apollo/manual-research/standards/stage5a_external_research_handoff.csv` | `docs/apollo/research/consolidated-2026-08-01/standards/stage5a_external_research_handoff.csv` | A_MAIN | CANONICAL |
| `apollo/manual-research/standards/stage5a_external_source_matrix.csv` | `docs/apollo/research/consolidated-2026-08-01/standards/stage5a_external_source_matrix.csv` | A_MAIN | CANONICAL |
| `apollo/manual-research/standards/stage5a_manual_defined_items.csv` | `docs/apollo/research/consolidated-2026-08-01/standards/stage5a_manual_defined_items.csv` | A_MAIN | CANONICAL |
| `apollo/manual-research/standards/stage5a_priority_matrix.csv` | `docs/apollo/research/consolidated-2026-08-01/standards/stage5a_priority_matrix.csv` | A_MAIN | CANONICAL |
| `apollo/manual-research/standards/stage5a_reading_request.md` | `docs/apollo/research/consolidated-2026-08-01/standards/stage5a_reading_request.md` | A_MAIN | DUPLICATE_SKIPPED |
| `apollo/manual-research/standards/stage5a_software_specific_items.csv` | `docs/apollo/research/consolidated-2026-08-01/standards/stage5a_software_specific_items.csv` | A_MAIN | CANONICAL |
| `apollo/manual-research/standards/stage5a_traceability_scope.csv` | `docs/apollo/research/consolidated-2026-08-01/standards/stage5a_traceability_scope.csv` | A_MAIN | CANONICAL |
| `apollo/manual-research/standards/stage5a_unresolved_questions.md` | `docs/apollo/research/consolidated-2026-08-01/standards/stage5a_unresolved_questions.md` | A_MAIN | DUPLICATE_SKIPPED |
| `apollo/manual-research/summaries/apollo_processing_sequence.md` | `docs/apollo/research/consolidated-2026-08-01/summaries/apollo_processing_sequence.md` | A_MAIN | CANONICAL |
| `apollo/manual-research/summaries/apollo_system_overview.md` | `docs/apollo/research/consolidated-2026-08-01/summaries/apollo_system_overview.md` | A_MAIN | CANONICAL |
| `apollo/manual-research/summaries/phase1_relevant_manuals.md` | `docs/apollo/research/consolidated-2026-08-01/summaries/phase1_relevant_manuals.md` | A_MAIN | CANONICAL |
| `apollo/manual-research/summaries/phase1_source_selection.md` | `docs/apollo/research/consolidated-2026-08-01/summaries/phase1_source_selection.md` | A_MAIN | CANONICAL |
| `apollo/manual-research/summaries/stage0_source_preservation_report.md` | `docs/apollo/research/consolidated-2026-08-01/summaries/stage0_source_preservation_report.md` | A_MAIN | CANONICAL |
| `apollo/manual-research/summaries/stage1_manual_inventory_report.md` | `docs/apollo/research/consolidated-2026-08-01/summaries/stage1_manual_inventory_report.md` | A_MAIN | CANONICAL |
| `apollo/manual-research/summaries/stage2_system_structure_report.md` | `docs/apollo/research/consolidated-2026-08-01/summaries/stage2_system_structure_report.md` | A_MAIN | CANONICAL |
| `apollo/manual-research/summaries/stage3_phase1_source_selection_report.md` | `docs/apollo/research/consolidated-2026-08-01/summaries/stage3_phase1_source_selection_report.md` | A_MAIN | CANONICAL |
| `apollo/manual-research/summaries/stage4_1_common_geometry.md` | `docs/apollo/research/consolidated-2026-08-01/summaries/stage4_1_common_geometry.md` | A_MAIN | CANONICAL |
| `apollo/manual-research/summaries/stage4_2_rc_slab_haunch.md` | `docs/apollo/research/consolidated-2026-08-01/summaries/stage4_2_rc_slab_haunch.md` | A_MAIN | CANONICAL |
| `apollo/manual-research/summaries/stage4_3_main_girder_section_splice.md` | `docs/apollo/research/consolidated-2026-08-01/summaries/stage4_3_main_girder_section_splice.md` | A_MAIN | CANONICAL |
| `apollo/manual-research/summaries/stage4_4_floor_cross_members.md` | `docs/apollo/research/consolidated-2026-08-01/summaries/stage4_4_floor_cross_members.md` | A_MAIN | CANONICAL |
| `apollo/manual-research/summaries/stage4_5_load_analysis.md` | `docs/apollo/research/consolidated-2026-08-01/summaries/stage4_5_load_analysis.md` | A_MAIN | CANONICAL |
| `apollo/manual-research/summaries/stage4_6_outputs.md` | `docs/apollo/research/consolidated-2026-08-01/summaries/stage4_6_outputs.md` | A_MAIN | CANONICAL |
| `apollo/manual-research/summaries/stage4_feature_extraction_report.md` | `docs/apollo/research/consolidated-2026-08-01/summaries/stage4_feature_extraction_report.md` | A_MAIN | DUPLICATE_SKIPPED |
| `apollo/manual-research/summaries/stage5_final_report.md` | `docs/apollo/research/consolidated-2026-08-01/summaries/stage5_final_report.md` | A_MAIN | DUPLICATE_SKIPPED |
| `apollo/manual-research/summaries/stage5_handoff_acceptance_report.md` | `docs/apollo/research/consolidated-2026-08-01/summaries/stage5_handoff_acceptance_report.md` | A_MAIN | DUPLICATE_SKIPPED |
| `apollo/manual-research/summaries/stage5a_traceability_scope_report.md` | `docs/apollo/research/consolidated-2026-08-01/summaries/stage5a_traceability_scope_report.md` | A_MAIN | CANONICAL |
| `apollo/manual-research/validation/stage5_ready_subset_test_plan.md` | `docs/apollo/research/consolidated-2026-08-01/validation/stage5_ready_subset_test_plan.md` | A_MAIN | DUPLICATE_SKIPPED |
| `apollo/manual-research/validation/stage5_validation_plan.md` | `docs/apollo/research/consolidated-2026-08-01/validation/stage5_validation_plan.md` | A_MAIN | DUPLICATE_SKIPPED |
| `apollo/manual-research/validation/stage7_reference_bridge_input_candidates.md` | `docs/apollo/research/consolidated-2026-08-01/validation/stage7_reference_bridge_input_candidates.md` | A_MAIN | DUPLICATE_SKIPPED |

### `apollo-pr5-smoke` (1 manifest rows)

| original_path | destination_path | classification | duplicate_status |
| --- | --- | --- | --- |
| `apollo-pr5-smoke/browser-smoke-summary.json` | `docs/apollo/pr5-smoke/browser-smoke-summary.json` | A_MAIN | CANONICAL |

### `apollo_operator_smoke_evidence` (1 manifest rows)

| original_path | destination_path | classification | duplicate_status |
| --- | --- | --- | --- |
| `apollo_operator_smoke_evidence/17_sample_loaded.png` | `docs/apollo/operator-smoke/evidence/17_sample_loaded.png` | C_EVIDENCE | CANONICAL |

### `bridge-standards-research` (31 manifest rows)

| original_path | destination_path | classification | duplicate_status |
| --- | --- | --- | --- |
| `bridge-standards-research/handoff/apollo-decoding/apollo_stage5_handoff_SC-20260726-001_manifest.csv` | `docs/apollo/design-standards/handoffs/consolidated-2026-08-01/apollo-decoding/apollo_stage5_handoff_SC-20260726-001_manifest.csv` | A_MAIN | CANONICAL |
| `bridge-standards-research/handoff/apollo-decoding/apollo_stage5_handoff_SC-20260726-001_review.md` | `docs/apollo/design-standards/handoffs/consolidated-2026-08-01/apollo-decoding/apollo_stage5_handoff_SC-20260726-001_review.md` | A_MAIN | CANONICAL |
| `bridge-standards-research/inventory/pdf_quick_inventory.csv` | `docs/apollo/design-standards/research/consolidated-2026-08-01/inventory/pdf_quick_inventory.csv` | A_MAIN | CANONICAL |
| `bridge-standards-research/inventory/pdf_quick_review_report.md` | `docs/apollo/design-standards/research/consolidated-2026-08-01/inventory/pdf_quick_review_report.md` | A_MAIN | CANONICAL |
| `bridge-standards-research/inventory/pdf_toc_overview.md` | `docs/apollo/design-standards/research/consolidated-2026-08-01/inventory/pdf_toc_overview.md` | A_MAIN | CANONICAL |
| `bridge-standards-research/inventory/pdf_version_priority_inventory.csv` | `docs/apollo/design-standards/research/consolidated-2026-08-01/inventory/pdf_version_priority_inventory.csv` | A_MAIN | CANONICAL |
| `bridge-standards-research/inventory/pdf_version_priority_review_report.md` | `docs/apollo/design-standards/research/consolidated-2026-08-01/inventory/pdf_version_priority_review_report.md` | A_MAIN | CANONICAL |
| `bridge-standards-research/inventory/phase1_document_priority.md` | `docs/apollo/design-standards/research/consolidated-2026-08-01/inventory/phase1_document_priority.md` | A_MAIN | CANONICAL |
| `bridge-standards-research/research/stage5b/checkpoints/checkpoint_PKG-003-RBS-I.json` | `docs/apollo/design-standards/research/consolidated-2026-08-01/research/stage5b/checkpoints/checkpoint_PKG-003-RBS-I.json` | A_MAIN | CANONICAL |
| `bridge-standards-research/research/stage5b/checkpoints/checkpoint_PKG-004-RBS-II.json` | `docs/apollo/design-standards/research/consolidated-2026-08-01/research/stage5b/checkpoints/checkpoint_PKG-004-RBS-II.json` | A_MAIN | CANONICAL |
| `bridge-standards-research/research/stage5b/checkpoints/checkpoint_PKG-005-RBS-III.json` | `docs/apollo/design-standards/research/consolidated-2026-08-01/research/stage5b/checkpoints/checkpoint_PKG-005-RBS-III.json` | A_MAIN | CANONICAL |
| `bridge-standards-research/research/stage5b/checkpoints/checkpoint_PKG-006-DESIGN-MANUAL.json` | `docs/apollo/design-standards/research/consolidated-2026-08-01/research/stage5b/checkpoints/checkpoint_PKG-006-DESIGN-MANUAL.json` | A_MAIN | CANONICAL |
| `bridge-standards-research/research/stage5b/checkpoints/checkpoint_PKG-007-DDB.json` | `docs/apollo/design-standards/research/consolidated-2026-08-01/research/stage5b/checkpoints/checkpoint_PKG-007-DDB.json` | A_MAIN | CANONICAL |
| `bridge-standards-research/research/stage5b/package-reports/PKG-003-RBS-I_report.md` | `docs/apollo/design-standards/research/consolidated-2026-08-01/research/stage5b/package-reports/PKG-003-RBS-I_report.md` | A_MAIN | CANONICAL |
| `bridge-standards-research/research/stage5b/package-reports/PKG-004-RBS-II_report.md` | `docs/apollo/design-standards/research/consolidated-2026-08-01/research/stage5b/package-reports/PKG-004-RBS-II_report.md` | A_MAIN | CANONICAL |
| `bridge-standards-research/research/stage5b/package-reports/PKG-005-RBS-III_report.md` | `docs/apollo/design-standards/research/consolidated-2026-08-01/research/stage5b/package-reports/PKG-005-RBS-III_report.md` | A_MAIN | CANONICAL |
| `bridge-standards-research/research/stage5b/package-reports/PKG-006-DESIGN-MANUAL_report.md` | `docs/apollo/design-standards/research/consolidated-2026-08-01/research/stage5b/package-reports/PKG-006-DESIGN-MANUAL_report.md` | A_MAIN | CANONICAL |
| `bridge-standards-research/research/stage5b/package-reports/PKG-007-DDB_report.md` | `docs/apollo/design-standards/research/consolidated-2026-08-01/research/stage5b/package-reports/PKG-007-DDB_report.md` | A_MAIN | CANONICAL |
| `bridge-standards-research/research/stage5b/stage5b_evidence_index.csv` | `docs/apollo/design-standards/research/consolidated-2026-08-01/research/stage5b/stage5b_evidence_index.csv` | A_MAIN | CANONICAL |
| `bridge-standards-research/research/stage5b/stage5b_handoff_result_map.csv` | `docs/apollo/design-standards/research/consolidated-2026-08-01/research/stage5b/stage5b_handoff_result_map.csv` | A_MAIN | CANONICAL |
| `bridge-standards-research/research/stage5b/stage5b_handoff_result_map_pkg003.csv` | `docs/apollo/design-standards/research/consolidated-2026-08-01/research/stage5b/stage5b_handoff_result_map_pkg003.csv` | A_MAIN | CANONICAL |
| `bridge-standards-research/research/stage5b/stage5b_long_run_manifest.csv` | `docs/apollo/design-standards/research/consolidated-2026-08-01/research/stage5b/stage5b_long_run_manifest.csv` | A_MAIN | CANONICAL |
| `bridge-standards-research/research/stage5b/stage5b_package_status.csv` | `docs/apollo/design-standards/research/consolidated-2026-08-01/research/stage5b/stage5b_package_status.csv` | A_MAIN | CANONICAL |
| `bridge-standards-research/research/stage5b/stage5b_research_plan.md` | `docs/apollo/design-standards/research/consolidated-2026-08-01/research/stage5b/stage5b_research_plan.md` | A_MAIN | CANONICAL |
| `bridge-standards-research/research/stage5b/stage5b_research_results.csv` | `docs/apollo/design-standards/research/consolidated-2026-08-01/research/stage5b/stage5b_research_results.csv` | A_MAIN | CANONICAL |
| `bridge-standards-research/research/stage5b/stage5b_research_review_report.md` | `docs/apollo/design-standards/research/consolidated-2026-08-01/research/stage5b/stage5b_research_review_report.md` | A_MAIN | CANONICAL |
| `bridge-standards-research/research/stage5b/stage5b_research_summary.md` | `docs/apollo/design-standards/research/consolidated-2026-08-01/research/stage5b/stage5b_research_summary.md` | A_MAIN | CANONICAL |
| `bridge-standards-research/research/stage5b/stage5b_unresolved_register.csv` | `docs/apollo/design-standards/research/consolidated-2026-08-01/research/stage5b/stage5b_unresolved_register.csv` | A_MAIN | CANONICAL |
| `bridge-standards-research/stage5a_external_research_handoff.csv` | `docs/apollo/design-standards/research/consolidated-2026-08-01/stage5a_external_research_handoff.csv` | A_MAIN | CANONICAL |
| `bridge-standards-research/stage5a_reading_request.md` | `docs/apollo/design-standards/research/consolidated-2026-08-01/stage5a_reading_request.md` | A_MAIN | CANONICAL |
| `bridge-standards-research/stage5a_unresolved_questions.md` | `docs/apollo/design-standards/research/consolidated-2026-08-01/stage5a_unresolved_questions.md` | A_MAIN | CANONICAL |
