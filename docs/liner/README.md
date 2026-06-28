# Linear Coordinate System (Liner) — Design Documents

## Purpose

This folder contains design and gate documents for the **Linear Coordinate Calculation System** — an original, functionally equivalent capability planned as an extension to the existing 3D frame analysis application. The system computes alignment geometry, stationing, profiles, and grid coordinates, then converts the results into the existing frame analysis model (`project.json`).

Implementation code does not belong in this folder. Current implementation artifacts live under `frontend/src/liner/` and `schemas/project.schema.json`; this folder remains the design, review, and handoff source of truth for those artifacts.

## Document Status

| Document | Priority | Status | Blocks implementation? |
| --- | --- | --- | --- |
| [intermediate_result_model.md](intermediate_result_model.md) | Most important | Reviewed | Frame/CAD/report export |
| [geometry_core.md](geometry_core.md) | Most important | Reviewed | Full geometry MVP |
| [frame_model_mapping.md](frame_model_mapping.md) | Most important | Reviewed | Frame generation |
| [integration_with_frame_model.md](integration_with_frame_model.md) | Most important | Reviewed | Schema merge path |
| [test_plan_geometry.md](test_plan_geometry.md) | Most important | Reviewed | Golden tests |
| [station_rules.md](station_rules.md) | High | Reviewed | Station equations |
| [profile_rules.md](profile_rules.md) | High | Reviewed | Z provenance |
| [line_dependency_graph.md](line_dependency_graph.md) | High | Reviewed | Invalidation |
| [recalculation_policy.md](recalculation_policy.md) | High | Reviewed | Edit/recompute UX |
| [calculation_pipeline.md](calculation_pipeline.md) | High | Reviewed | Pipeline stages |
| [coordinate_system_policy.md](coordinate_system_policy.md) | High | Reviewed | Axes/orientation |
| [numerical_accuracy.md](numerical_accuracy.md) | High | Reviewed | Tolerances |
| [error_handling.md](error_handling.md) | High | Reviewed | Diagnostic codes |
| [validation_rules.md](validation_rules.md) | High | Reviewed | Pre-compute gate |
| [cad_output_spec.md](cad_output_spec.md) | High | Draft | CAD export coding |
| [report_output_spec.md](report_output_spec.md) | High | Draft | Report export coding |
| [domain_model.md](domain_model.md) | High | Draft | Domain types |
| [project_file_format.md](project_file_format.md) | High | Draft | Persistence |
| [schema_migration_policy.md](schema_migration_policy.md) | Medium | Draft | Schema extension PR |
| [performance_limits.md](performance_limits.md) | High | Draft | Limits enforcement |
| [performance_architecture.md](performance_architecture.md) | Medium | Draft | Workers |
| [rendering_strategy.md](rendering_strategy.md) | Medium | Draft | 2D views |
| [logging_and_debug.md](logging_and_debug.md) | Medium | Draft | Debug tooling |
| [ui_preparation.md](ui_preparation.md) | High | Implemented constants | Phase2 UI routing |
| [ui_list_page.md](ui_list_page.md) | High | P2-2 design | Liner list entry UI |
| [ui_edit_page.md](ui_edit_page.md) | High | P2-3 design | Liner setup form UI |
| [ui_station_profile_input.md](ui_station_profile_input.md) | High | P2-4 design | Station/profile input UI |
| [ui_grid_preview.md](ui_grid_preview.md) | High | P2-5 design | Read-only grid preview UI |
| [ui_mapping_review.md](ui_mapping_review.md) | High | P2-6 design | Mapping review and Viewer3D confirmation |
| [phase1_completion_gate.md](phase1_completion_gate.md) | Gate | Reviewed | Phase2 prerequisites |
| [phase3_release_notes.md](phase3_release_notes.md) | Release notes | Phase3 complete | Phase3 output summary |
| [reviews/P2-0_ui_alignment_review.md](reviews/P2-0_ui_alignment_review.md) | Gate | Phase2 review | Phase2 UI implementation |
| [design_workflow.md](design_workflow.md) | Guide | Reviewed | Sign-off navigation |

**Overall:** Architecture direction approved; Phase1 core, mapper, schema extension, headless assembly, and UI preparation constants exist in the repository. Phase2 has started with the P2-2 list route, P2-3 setup form route, P2-4 station/profile input panel, P2-5 read-only grid preview, and P2-6 mapping review / Viewer3D confirmation; production generate readiness remains gated by the reviews and fixture gaps tracked in [phase1_completion_gate.md](phase1_completion_gate.md).

## Reading Order

Follow this order when filling in detailed design or starting implementation.

### Phase 1 — Foundation (read first)

| Order | Document | Priority |
| --- | --- | --- |
| 1 | [design_workflow.md](design_workflow.md) | Guide |
| 2 | [liner_scope.md](liner_scope.md) | High |
| 3 | [legal_originality_policy.md](legal_originality_policy.md) | High |
| 4 | [domain_model.md](domain_model.md) | High |
| 5 | [intermediate_result_model.md](intermediate_result_model.md) | **Most important** |
| 6 | [geometry_core.md](geometry_core.md) | **Most important** |

### Phase 2 — Rules and Pipeline

| Order | Document | Priority |
| --- | --- | --- |
| 7 | [station_rules.md](station_rules.md) | High |
| 8 | [profile_rules.md](profile_rules.md) | High |
| 9 | [line_dependency_graph.md](line_dependency_graph.md) | High |
| 10 | [calculation_pipeline.md](calculation_pipeline.md) | High |
| 11 | [recalculation_policy.md](recalculation_policy.md) | High |
| 12 | [coordinate_system_policy.md](coordinate_system_policy.md) | High |
| 13 | [numerical_accuracy.md](numerical_accuracy.md) | High |
| 14 | [unit_and_precision_policy.md](unit_and_precision_policy.md) | Medium |

### Phase 3 — Frame Model Integration (critical path)

| Order | Document | Priority |
| --- | --- | --- |
| 15 | [integration_with_frame_model.md](integration_with_frame_model.md) | **Most important** |
| 16 | [frame_model_mapping.md](frame_model_mapping.md) | **Most important** |

### Phase 4 — I/O, UI, and Output

| Order | Document | Priority |
| --- | --- | --- |
| 17 | [project_file_format.md](project_file_format.md) | High |
| 18 | [import_export_policy.md](import_export_policy.md) | Medium |
| 19 | [cad_output_spec.md](cad_output_spec.md) | High |
| 20 | [report_output_spec.md](report_output_spec.md) | High |
| 21 | [ui_window_spec.md](ui_window_spec.md) | High |
| 22 | [input_ui_behavior.md](input_ui_behavior.md) | High |
| 23 | [rendering_strategy.md](rendering_strategy.md) | Medium |
| 24 | [state_management.md](state_management.md) | Medium |
| 24a | [ui_mapping_review.md](ui_mapping_review.md) | High |

### Phase 5 — Quality, Operations, and Performance

| Order | Document | Priority |
| --- | --- | --- |
| 25 | [validation_rules.md](validation_rules.md) | High |
| 26 | [error_handling.md](error_handling.md) | High |
| 27 | [logging_and_debug.md](logging_and_debug.md) | Medium |
| 28 | [file_io_edge_cases.md](file_io_edge_cases.md) | Medium |
| 29 | [schema_migration_policy.md](schema_migration_policy.md) | Medium |
| 30 | [undo_redo_spec.md](undo_redo_spec.md) | Medium |
| 31 | [performance_limits.md](performance_limits.md) | High |
| 32 | [performance_architecture.md](performance_architecture.md) | Medium |

### Phase 6 — Testing

| Order | Document | Priority |
| --- | --- | --- |
| 33 | [test_plan_geometry.md](test_plan_geometry.md) | **Most important** |
| 34 | [test_plan_cad_report.md](test_plan_cad_report.md) | High |

## Priority Summary

### Most important

These documents define the architectural backbone. They must be substantially complete before implementation begins.

- [intermediate_result_model.md](intermediate_result_model.md)
- [geometry_core.md](geometry_core.md)
- [integration_with_frame_model.md](integration_with_frame_model.md)
- [frame_model_mapping.md](frame_model_mapping.md)
- [test_plan_geometry.md](test_plan_geometry.md)

### High

Required for a coherent MVP design; should be drafted early and refined in parallel with the most important documents.

- [liner_scope.md](liner_scope.md)
- [legal_originality_policy.md](legal_originality_policy.md)
- [project_file_format.md](project_file_format.md)
- [domain_model.md](domain_model.md)
- [station_rules.md](station_rules.md)
- [profile_rules.md](profile_rules.md)
- [line_dependency_graph.md](line_dependency_graph.md)
- [calculation_pipeline.md](calculation_pipeline.md)
- [recalculation_policy.md](recalculation_policy.md)
- [coordinate_system_policy.md](coordinate_system_policy.md)
- [numerical_accuracy.md](numerical_accuracy.md)
- [cad_output_spec.md](cad_output_spec.md)
- [report_output_spec.md](report_output_spec.md)
- [ui_window_spec.md](ui_window_spec.md)
- [input_ui_behavior.md](input_ui_behavior.md)
- [error_handling.md](error_handling.md)
- [validation_rules.md](validation_rules.md)
- [performance_limits.md](performance_limits.md)
- [test_plan_cad_report.md](test_plan_cad_report.md)

### Medium

Supporting documents. Can be refined after the backbone is stable.

- [state_management.md](state_management.md)
- [rendering_strategy.md](rendering_strategy.md)
- [logging_and_debug.md](logging_and_debug.md)
- [import_export_policy.md](import_export_policy.md)
- [file_io_edge_cases.md](file_io_edge_cases.md)
- [schema_migration_policy.md](schema_migration_policy.md)
- [performance_architecture.md](performance_architecture.md)
- [undo_redo_spec.md](undo_redo_spec.md)
- [unit_and_precision_policy.md](unit_and_precision_policy.md)

## Cross-References to Existing Project Documents

| Existing document | Relevance |
| --- | --- |
| [docs/03_architecture.md](../03_architecture.md) | Layer boundaries; calculation/UI separation |
| [docs/04_input_schema.md](../04_input_schema.md) | Target frame model (`project.json`) |
| [docs/development/language-policy.md](../development/language-policy.md) | English design docs; Japanese UI via i18n |
| [docs/glossary.md](../glossary.md) | Domain term mapping |
| [docs/design/bridge-domain-model.md](../design/bridge-domain-model.md) | Prior art for domain-to-FEM conversion |
| [docs/design/bridge-fem-generator.md](../design/bridge-fem-generator.md) | Prior art for coordinate grid generation |

## Design Principles (non-negotiable)

1. **Functional equivalence, not copy.** Do not replicate JIP-LINER UI text, report layouts, file extensions, or screen structure.
2. **Logic/UI separation.** All geometry and coordinate computation lives in a pure calculation layer with no React or HTTP dependencies.
3. **Intermediate-result-driven output.** CAD drawings, reports, and frame model export are generated exclusively from computed intermediate data — never directly from raw UI state.
4. **Frame model mapping is first-class.** Conversion to `project.json` is a primary design deliverable, not an afterthought.

## Source-of-truth index (avoid duplication)

| Topic | Authoritative document |
| --- | --- |
| Intermediate computed state | [intermediate_result_model.md](intermediate_result_model.md) |
| Segment algorithms & clothoid | [geometry_core.md](geometry_core.md) |
| Node/member/support mapping | [frame_model_mapping.md](frame_model_mapping.md) |
| Merge, schema, app integration | [integration_with_frame_model.md](integration_with_frame_model.md) |
| Numeric tolerances | [numerical_accuracy.md](numerical_accuracy.md) |
| Display precision | [unit_and_precision_policy.md](unit_and_precision_policy.md) |
| Invalidation graph | [line_dependency_graph.md](line_dependency_graph.md) |
| Recalculation behavior | [recalculation_policy.md](recalculation_policy.md) |
| Diagnostic codes | [error_handling.md](error_handling.md) |
| Golden test values | [test_plan_geometry.md](test_plan_geometry.md) |

## Document Template

Every design file in this folder follows the same section structure:

- Purpose
- Scope
- Out of Scope
- Assumptions
- Design Topics
- Open Questions
- Related Documents
- Pre-Implementation Checklist
