# Liner Design Review — Resolution Summary

This note records which findings from `review_docs_liner.md` were addressed in the `docs/liner/` design pass. It does not reproduce the full review report.

## Critical (4/4 addressed in design)

| ID | Topic | Resolution |
| --- | --- | --- |
| CR-01 | Intermediate result frame-generation metadata | Extended `GridPointResult` with `localFrame`, `source`, `roles`, `zProvenance`; added `GridLineResult`, `GridCellResult`, `SpanResult`, `PierResult`, `FrameGenerationHintResult` in [intermediate_result_model.md](intermediate_result_model.md) |
| CR-02 | Clothoid algorithm unresolved | Defined Fresnel series + Simpson fallback, sign conventions, validation, and GC-08–GC-10 in [geometry_core.md](geometry_core.md) and [test_plan_geometry.md](test_plan_geometry.md) |
| CR-03 | Schema compatibility unsettled | Documented current schema limits, `linerTrace` + ID prefix MVP policy, planned extension, golden fixture path in [integration_with_frame_model.md](integration_with_frame_model.md) and [schema_migration_policy.md](schema_migration_policy.md) |
| CR-04 | Golden tests without numeric values | Added numeric expected values for GC-01–GC-07 and mapper fixture in [test_plan_geometry.md](test_plan_geometry.md) and [frame_model_mapping.md](frame_model_mapping.md) |

## High (10/10 addressed in design)

| ID | Topic | Primary document |
| --- | --- | --- |
| HI-01 | Member local axis | [frame_model_mapping.md](frame_model_mapping.md), [coordinate_system_policy.md](coordinate_system_policy.md) |
| HI-02 | Material/section assignment | [frame_model_mapping.md](frame_model_mapping.md), [domain_model.md](domain_model.md) |
| HI-03 | Pier/bearing/support rules | [frame_model_mapping.md](frame_model_mapping.md), [intermediate_result_model.md](intermediate_result_model.md) |
| HI-04 | Station equation semantics | [station_rules.md](station_rules.md) |
| HI-05 | Cross-section / Z responsibilities | [profile_rules.md](profile_rules.md), [intermediate_result_model.md](intermediate_result_model.md) |
| HI-06 | Dependency graph depth | [line_dependency_graph.md](line_dependency_graph.md), [recalculation_policy.md](recalculation_policy.md) |
| HI-07 | CAD output generic | [cad_output_spec.md](cad_output_spec.md) |
| HI-08 | Report table schemas | [report_output_spec.md](report_output_spec.md) |
| HI-09 | Error code catalog | [error_handling.md](error_handling.md), [validation_rules.md](validation_rules.md) |
| HI-10 | Frontend/backend boundary | [calculation_pipeline.md](calculation_pipeline.md), [integration_with_frame_model.md](integration_with_frame_model.md), [performance_architecture.md](performance_architecture.md) |

## Medium (11/11 addressed where low-risk)

| ID | Topic | Resolution |
| --- | --- | --- |
| ME-01 | design_workflow duplication | Source-of-truth index in [README.md](README.md); decision log in [design_workflow.md](design_workflow.md) |
| ME-02 | Readiness status | Status table in [README.md](README.md) |
| ME-03 | Open questions scattered | Decision log D-LINER-001–008 in [design_workflow.md](design_workflow.md) |
| ME-04 | Import/export vs project format | Examples and non-goals in [import_export_policy.md](import_export_policy.md) |
| ME-05 | Rendering/CAD re-sampling | Fixed-sample contract in [intermediate_result_model.md](intermediate_result_model.md), [rendering_strategy.md](rendering_strategy.md), [cad_output_spec.md](cad_output_spec.md) |
| ME-06 | Performance vs model limits | Expanded [performance_limits.md](performance_limits.md) |
| ME-07 | Validation timing UX | [validation_rules.md](validation_rules.md), [input_ui_behavior.md](input_ui_behavior.md) |
| ME-08 | Undo/redo examples | [recalculation_policy.md](recalculation_policy.md), [undo_redo_spec.md](undo_redo_spec.md) |
| ME-09 | Bridge wizard overlap | Policy in [integration_with_frame_model.md](integration_with_frame_model.md) §10 |
| ME-10 | Originality review gates | [legal_originality_policy.md](legal_originality_policy.md) |
| ME-11 | File I/O edge cases | [file_io_edge_cases.md](file_io_edge_cases.md) |

## Low (6/6 addressed)

| ID | Topic | Resolution |
| --- | --- | --- |
| LO-01 | Template docs | Draft status on thin docs ([logging_and_debug.md](logging_and_debug.md), [performance_architecture.md](performance_architecture.md), [rendering_strategy.md](rendering_strategy.md)) |
| LO-02 | ID namespace | `linerModelId` in IDs — [frame_model_mapping.md](frame_model_mapping.md) |
| LO-03 | sourceRevision hash | Canonical JSON rules — [intermediate_result_model.md](intermediate_result_model.md), [calculation_pipeline.md](calculation_pipeline.md) |
| LO-04 | Station labels vs numeric | [station_rules.md](station_rules.md) |
| LO-05 | Diagnostics entityPath | [intermediate_result_model.md](intermediate_result_model.md), [error_handling.md](error_handling.md) |
| LO-06 | 3D export spec | glTF deferred to post-MVP — [rendering_strategy.md](rendering_strategy.md), D-LINER-007 |

## Duplication cleanup

Assigned single sources of truth per review recommendation; index in [README.md](README.md). Merge/tagging details consolidated under [integration_with_frame_model.md](integration_with_frame_model.md); mapping details under [frame_model_mapping.md](frame_model_mapping.md).

## Not created (by scope)

Separate files `clothoid_algorithm.md`, `decision_log.md`, `3d_output_spec.md`, etc. were not added; content integrated into existing documents per project scope.

## Remaining implementation gates

- Golden JSON fixtures under `examples/liner/` (code/tests, not design)
- `project.schema.json` PR for `liner`, `linerTrace`, optional `meta`
- i18n message keys for diagnostic catalog
