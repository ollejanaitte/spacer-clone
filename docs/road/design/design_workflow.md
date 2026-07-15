# Liner Design Workflow

<!-- DOC-AUTHORITY:START -->
> **Authority:** ACTIVE REFERENCE
> Current implementation facts are governed by [`../../scoping/stage4_road_design_scope.md`](../../scoping/stage4_road_design_scope.md). Target ownership and contracts are governed by [`../../planning/stage6-10/README.md`](../../planning/stage6-10/README.md); `RoadDesignDocument` is the target road source of truth.
<!-- DOC-AUTHORITY:END -->

Step-by-step guide for completing the linear coordinate calculation system design before implementation.

---

## 1. Design Assumptions and Scope

**Goal:** Lock the MVP boundary and non-goals.

**Actions:**

1. Read and finalize [liner_scope.md](liner_scope.md).
2. Confirm relationship to the existing frame analysis MVP ([legacy MVP scope](../../architecture/legacy-mvp-scope.md)).
3. Identify which bridge / alignment use cases are in scope for the first release.
4. Record explicit non-goals (e.g., no third-party file format import in MVP).

**Exit criteria:** Scope document approved; open questions logged.

---

## 2. Architecture

**Goal:** Define layer boundaries consistent with the [legacy MVP architecture](../../architecture/legacy-mvp-architecture.md).

**Actions:**

1. Map modules: `liner-core` (pure calculation), `liner-state` (session), `liner-ui` (React), `liner-export` (CAD/report/frame).
2. Confirm the calculation engine has zero dependency on FastAPI, React, or Three.js.
3. Define the data flow: input domain model → pipeline → intermediate results → outputs.
4. Draft [calculation_pipeline.md](calculation_pipeline.md) and [state_management.md](../ui/state_management.md).

**Exit criteria:** Dependency diagram agreed; no circular dependencies between UI and core.

---

## 3. Legal and Originality Policy

**Goal:** Ensure the product is an original design.

**Actions:**

1. Finalize [legal_originality_policy.md](legal_originality_policy.md).
2. List forbidden copy targets (UI strings, report templates, file extensions, logos).
3. Define acceptable reference usage (functional requirements only).

**Exit criteria:** Policy reviewed; naming conventions for files and windows decided.

---

## 4. Domain Model

**Goal:** Define the user-editable semantic model.

**Actions:**

1. Draft entity list in [domain_model.md](domain_model.md): alignment, segments, stations, profiles, grids, constraints.
2. Assign stable English identifiers and JSON keys.
3. Cross-check terms against [docs/glossary.md](../../glossary.md).

**Exit criteria:** Entity-relationship sketch complete; schema version field defined.

---

## 5. Intermediate Result Model

**Goal:** Define the canonical computed state that drives all outputs.

**Actions:**

1. Complete [intermediate_result_model.md](intermediate_result_model.md) — this is the **highest-priority** artifact.
2. Specify immutable vs. derived fields, versioning, and serialization shape.
3. Ensure every output path (CAD, report, frame model) reads from this model only.

**Exit criteria:** Type sketch reviewed; no output bypasses intermediate results.

---

## 6. Geometry Core

**Goal:** Specify pure geometric algorithms.

**Actions:**

1. Complete [geometry_core.md](geometry_core.md): curve types, interpolation, projection, offset, elevation.
2. Define coordinate frames (global, alignment-local, station-normal).
3. Document numerical methods and tolerance usage ([numerical_accuracy.md](numerical_accuracy.md)).

**Exit criteria:** Algorithm inventory complete; unit tests identified in [test_plan_geometry.md](../verification/test_plan_geometry.md).

---

## 7. Station Rules

**Goal:** Define stationing conventions and chainage logic.

**Actions:**

1. Draft [station_rules.md](station_rules.md): origin, direction, equation stations, overlaps.
2. Align with [coordinate_system_policy.md](coordinate_system_policy.md).

**Exit criteria:** Station increment and labeling rules documented with examples.

---

## 8. Profile and Section Height Rules

**Goal:** Define vertical geometry (profile) and section height handling.

**Actions:**

1. Draft [profile_rules.md](profile_rules.md): vertical curves, superelevation, section offsets.
2. Link profile output to grid Z coordinates in the intermediate result model.

**Exit criteria:** Profile-to-3D-point derivation path documented.

---

## 9. Grid Generation

**Goal:** Define transverse / longitudinal grid point generation.

**Actions:**

1. Extend [geometry_core.md](geometry_core.md) grid section or add grid topics to [domain_model.md](domain_model.md).
2. Specify grid spacing rules, boundary handling, and naming.
3. Connect to [frame_model_mapping.md](../legacy-integration/frame_model_mapping.md) node generation.

**Exit criteria:** Grid point list appears in intermediate results; mapping rules drafted.

---

## 10. Frame Model Integration

**Goal:** Specify how liner output becomes `project.json`.

**Actions:**

1. Complete [integration_with_frame_model.md](../legacy-integration/integration_with_frame_model.md) — **critical path**.
2. Complete [frame_model_mapping.md](../legacy-integration/frame_model_mapping.md) with node/member/support generation rules.
3. Cross-check against [docs/frame/contracts/04_input_schema.md](../../frame/contracts/04_input_schema.md) and existing bridge FEM generator patterns.

**Exit criteria:** End-to-end mapping from intermediate results to valid `project.json` documented.

---

## 11. Dependency Graph and Recalculation

**Goal:** Define incremental recalculation behavior.

**Actions:**

1. Draft [line_dependency_graph.md](line_dependency_graph.md): entity dependencies.
2. Draft [recalculation_policy.md](recalculation_policy.md): dirty propagation, full vs. partial recompute.
3. Align with [state_management.md](../ui/state_management.md).

**Exit criteria:** Edit → invalidate → recompute flow documented for all entity types.

---

## 12. State Management

**Goal:** Define session state, persistence, and undo boundaries.

**Actions:**

1. Draft [state_management.md](../ui/state_management.md) and [undo_redo_spec.md](../ui/undo_redo_spec.md).
2. Separate editable domain state from cached intermediate results.

**Exit criteria:** State diagram shows clear separation of input vs. computed data.

---

## 13. Input UI

**Goal:** Design original UI without copying JIP-LINER layouts.

**Actions:**

1. Draft [ui_window_spec.md](../ui/ui_window_spec.md) and [input_ui_behavior.md](../ui/input_ui_behavior.md).
2. Plan i18n keys under `frontend/src/i18n/` per [language policy](../../development/language-policy.md).
3. Define validation feedback paths ([validation_rules.md](validation_rules.md)).

**Exit criteria:** Window list and panel responsibilities defined; no inline Japanese in JSX.

---

## 14. Rendering

**Goal:** Define 2D plan/profile view and optional 3D preview.

**Actions:**

1. Draft [rendering_strategy.md](../ui/rendering_strategy.md).
2. Confirm rendering reads intermediate results, not recomputing geometry in the viewer.

**Exit criteria:** Layer list, zoom/pan behavior, and highlight rules documented.

---

## 15. Output

**Goal:** Define CAD, report, and export behavior.

**Actions:**

1. Draft [cad_output_spec.md](../output/cad_output_spec.md) and [report_output_spec.md](../output/report_output_spec.md).
2. Draft [import_export_policy.md](../legacy-integration/import_export_policy.md).
3. Plan tests in [test_plan_cad_report.md](../verification/test_plan_cad_report.md).

**Exit criteria:** Output formats, file naming, and label sourcing (i18n / backend tables) defined.

---

## 16. Coordinate System

**Goal:** Unify coordinate conventions across modules.

**Actions:**

1. Finalize [coordinate_system_policy.md](coordinate_system_policy.md).
2. Reconcile with frame model axes in [docs/frame/contracts/04_input_schema.md](../../frame/contracts/04_input_schema.md).

**Exit criteria:** Axis handedness, units, and rotation conventions documented.

---

## 17. Unit and Precision

**Goal:** Define display vs. internal precision.

**Actions:**

1. Draft [unit_and_precision_policy.md](unit_and_precision_policy.md).
2. Align with [numerical_accuracy.md](numerical_accuracy.md) and project SI unit policy.

**Exit criteria:** Rounding rules for UI, reports, and file export agreed.

---

## 18. Error Handling and Logging

**Goal:** Define failure modes and diagnostics.

**Actions:**

1. Draft [error_handling.md](error_handling.md) and [logging_and_debug.md](logging_and_debug.md).
2. Map validation errors to user-facing i18n messages.

**Exit criteria:** Error taxonomy and log levels defined.

---

## 19. File Format and Migration

**Goal:** Define the liner project file and schema evolution.

**Actions:**

1. Draft [project_file_format.md](../legacy-integration/project_file_format.md) and [schema_migration_policy.md](../legacy-integration/schema_migration_policy.md).
2. Draft [file_io_edge_cases.md](../legacy-integration/file_io_edge_cases.md).

**Exit criteria:** Schema version, file extension (original), and migration steps documented.

---

## 20. Testing

**Goal:** Plan verification before and during implementation.

**Actions:**

1. Complete [test_plan_geometry.md](../verification/test_plan_geometry.md) — **critical**.
2. Draft [test_plan_cad_report.md](../verification/test_plan_cad_report.md).
3. Cross-check [development quality gates](../../development/quality-gates.md).

**Exit criteria:** Golden-case list and tolerance thresholds defined.

---

## 21. Performance

**Goal:** Set limits and architecture for responsive editing.

**Actions:**

1. Draft [performance_limits.md](performance_limits.md) and [performance_architecture.md](performance_architecture.md).
2. Define maximum entity counts and recalculation budgets.

**Exit criteria:** Acceptable latency targets documented.

---

## 22. Extensibility

**Goal:** Plan for future curve types, import formats, and integrations.

**Actions:**

1. Record extension points in [domain_model.md](domain_model.md) and [geometry_core.md](geometry_core.md).
2. Log deferred features in [liner_scope.md](liner_scope.md) Out of Scope with future hooks noted.

**Exit criteria:** Plugin or strategy interfaces identified where appropriate.

---

## Recommended Review Sequence

```text
Scope + Legal → Domain Model → Intermediate Results → Geometry Core
       ↓
Station + Profile + Grid → Frame Mapping → Pipeline + Recalc
       ↓
UI + Rendering + Output → Validation + Errors → File Format → Tests + Performance
```

## Open Decision Log

Consolidated tracker for cross-document decisions. Details live in linked specs — this section does not duplicate them.

| ID | Topic | Status | Decision / owner doc |
| --- | --- | --- | --- |
| D-LINER-001 | Clothoid algorithm | **Resolved** | Fresnel series + Simpson for egg transitions — [geometry_core.md](geometry_core.md) |
| D-LINER-002 | Frame entity traceability | **Resolved** | ID prefix + `linerTrace` table until `meta` extension — [integration_with_frame_model.md](../legacy-integration/integration_with_frame_model.md) |
| D-LINER-003 | MVP compute boundary | **Resolved** | TypeScript-only frontend — [calculation_pipeline.md](calculation_pipeline.md) |
| D-LINER-004 | Bridge wizard reuse | **Resolved** | Separate mapper; shared helpers only — [integration_with_frame_model.md](../legacy-integration/integration_with_frame_model.md) §10 |
| D-LINER-005 | CAD MVP format | **Resolved** | SVG with defined layers — [cad_output_spec.md](../output/cad_output_spec.md) |
| D-LINER-006 | Optional `meta` on nodes/members | Open | Schema owner; see [schema_migration_policy.md](../legacy-integration/schema_migration_policy.md) |
| D-LINER-007 | 3D glTF export scope | Open | Post-MVP unless added to [rendering_strategy.md](../ui/rendering_strategy.md) |
| D-LINER-008 | Liner file extension | Open | [project_file_format.md](../legacy-integration/project_file_format.md) |

**Navigation rule:** [design_workflow.md](design_workflow.md) links to topic documents; detailed contracts are not restated here.

## Sign-off Checklist

Before any implementation PR:

- [ ] All **Most important** documents reviewed and substantially complete.
- [ ] Frame model mapping produces valid `project.json` on paper (walkthrough).
- [ ] No JIP-LINER-specific artifacts in naming or layout specs.
- [ ] Language policy compliance confirmed for planned UI strings.
- [ ] Golden geometry test cases listed with expected coordinates.
