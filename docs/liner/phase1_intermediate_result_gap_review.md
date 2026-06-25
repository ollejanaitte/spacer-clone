# Phase 1 Intermediate Result Gap Review

## 1. Purpose

This Design Alignment Gate records the gap between the current Phase 0 implementation and the Phase 1 design source of truth before Phase 1 implementation begins.

The goal is to decide, for each gap, whether the design document or the implementation should change. Production code is intentionally not changed by this review.

Reviewed sources:

- [intermediate_result_model.md](intermediate_result_model.md)
- [geometry_core.md](geometry_core.md)
- [frame_model_mapping.md](frame_model_mapping.md)
- [integration_with_frame_model.md](integration_with_frame_model.md)
- [calculation_pipeline.md](calculation_pipeline.md)
- [domain_model.md](domain_model.md)
- [coordinate_system_policy.md](coordinate_system_policy.md)
- [test_plan_geometry.md](test_plan_geometry.md)
- [project_file_format.md](project_file_format.md)
- [import_export_policy.md](import_export_policy.md)
- [file_io_edge_cases.md](file_io_edge_cases.md)
- [schema_migration_policy.md](schema_migration_policy.md)
- [ui_window_spec.md](ui_window_spec.md)
- [input_ui_behavior.md](input_ui_behavior.md)
- [rendering_strategy.md](rendering_strategy.md)
- [docs/development/language-policy.md](../development/language-policy.md)
- [docs/glossary.md](../glossary.md)

Implementation reviewed:

- `frontend/src/liner/core/types.ts`
- `frontend/src/liner/core/pipeline/pipeline.ts`
- `frontend/src/liner/core/geometry/*`
- `frontend/src/liner/core/station/stationRules.ts`
- `frontend/src/liner/core/grid/gridGeneration.ts`
- `frontend/src/liner/mapper/*`

## 2. Intermediate Result Gap

| Section | Design | Current implementation | Gap | Design or implementation change? | Reason |
| --- | --- | --- | --- | --- | --- |
| §1 Top-level container | `LinerIntermediateResult` includes `computedAt`, `sourceRevision`, `linerModelId`, `coordinatePolicyId`, `horizontal`, `vertical`, `stations`, `grid`, `spans`, `piers`, `frameHints`, `sections`, `diagnostics`, `dependencyGraph`. | `LinerIntermediateResult` includes `schemaVersion`, `sourceRevision`, `linerModelId`, `coordinatePolicyId`, `horizontal`, `stations`, `gridPoints`, `nodeCandidates`, `memberCandidates`, `issues`. | Missing canonical top-level fields and uses flattened Phase 0 preparation fields. | Implementation change. | Phase 0 intentionally used a reduced isolated structure. Phase 1 must converge on the canonical intermediate snapshot. |
| §2 Horizontal geometry result | Includes `totalLength`, resolved `segments`, `sampledPoints`, and `piPoints`; samples include local frame. | Includes `totalLength`, `sampledPoints`, and `issues`; no resolved segment records or PI points. | Missing resolved segment metadata and PI point placeholders. | Implementation change. | Frame mapping, reports, CAD, and traceability need segment-level source data. |
| §3 Vertical geometry result | Includes profile elevation, profile segments, sampled points, and grade breaks. | Vertical evaluation helpers exist, but `vertical` is not included in the intermediate result. | Vertical calculations are not connected to the intermediate snapshot. | Implementation change. | Phase 1 requires z provenance and profile-derived grid elevations. |
| §4 Station table result | `StationTableResult` wraps `entries`, origin, and increasing direction; entries use `entryId`. | `stations` is a flat `GeneratedStation[]` with `id`, source, sourceId, and sortIndex. | Shape differs and lacks wrapper metadata. | Implementation change, with possible additive design note. | Flat stations were adequate for Phase 0 tests; Phase 1 should expose the documented station table. `source`/`sourceId` may be retained as implementation provenance if mapped to design fields. |
| §5 Local frame | Local frame stored on every alignment sample and grid point. | Implemented on `AlignmentSamplePoint` and `GridPointPreparation`. | Mostly aligned. | No design change; minor implementation hardening. | Superelevation roll remains post-MVP by design. |
| §6 Grid point result | `GridPointResult` includes `gridDefinitionId`, source ids for alignment/station/span/pier/section/lines, roles, z provenance, and optional member group key. | `GridPointPreparation` includes station id and element id, but no `gridDefinitionId`, span/pier/cross-section ids, line ids, or member group key. | Missing frame-generation metadata. | Implementation change. | These fields are required by `frame_model_mapping.md` for unambiguous node/member/support generation. |
| §7 Grid line and cell results | `GridResult` contains `points`, `lines`, and `cells`. | Only flat `gridPoints` are returned; no grid lines or cells. | Missing grid topology. | Implementation change. | Member generation should derive from grid topology rather than ad hoc station-index pairing. |
| §8 Span and pier results | `SpanResult[]` and `PierResult[]` are top-level intermediate entities. | Not implemented. | Missing span/pier entities. | Implementation change. | Pier/support and span-specific material/section rules depend on these entities. |
| §9 Frame generation hints | `FrameGenerationHintResult` includes default member group, member rules, support templates, connectivity. | Not implemented; member candidates are generated directly in Phase 0. | Missing frame hints and mapper input contract. | Implementation change; remove premature top-level member candidates from canonical intermediate. | Phase 1 mapper must consume hints and produce frame output separately. |
| §10 Section slice result | Optional `sections: SectionSliceResult[]`. | Not implemented. | Missing optional section slices. | Implementation change can be deferred if explicitly empty. | Report/CAD cross-section consumers are post-Phase 1, but the field should exist as `[]` for schema stability. |
| §11 Diagnostics | Uses `diagnostics: ComputationDiagnostic[]` with `code`, optional `messageKey`, entity targeting, station, and physical distance. | Uses `issues: ValidationIssue[]`; no `messageKey`, and code union is partial. | Naming and shape differ. | Implementation change. | The documented consumer contract uses diagnostics; Phase 1 should standardize naming and expand catalog coverage. |
| §12 Source revision and traceability | Canonical SHA-256 source revision and traceability from frame entity to grid/source. | `sourceRevision` is implemented with canonical JSON hashing; grid/node/member preparation includes partial provenance. | Hash exists; traceability is incomplete and member candidates are not canonical intermediate fields. | Implementation change. | Keep hash implementation, expand traceability through grid, mapper output, and future `linerTrace`. |
| §13 Invalidation and partial results | Defines invalidation matrix and dependency snapshot. | No `dependencyGraph` or dependency snapshot. | Missing invalidation model in intermediate result. | Implementation change. | Required for stale result handling and safe UI integration. |
| §14 Consumer contract | Render/CAD/report/mapper consume only intermediate result; no ad hoc resampling. | Implementation has no consumers yet; pipeline emits limited samples and grid points. | Contract not violated, but not enforceable yet. | Implementation change in Phase 1 tests. | Add tests ensuring mapper and future output helpers depend on intermediate snapshot, not raw domain. |
| §15 Versioning | `schemaVersion: "0.2.0"` and breaking change policy. | `schemaVersion: "0.2.0"` exists. | Version exists but does not represent full 0.2.0 design shape. | Implementation change or temporary design note. | Prefer implementation convergence before schema consumers rely on this version. |

## 3. Missing Implementation Items

| Item | Design reference | Current status | Required action |
| --- | --- | --- | --- |
| `vertical` | [intermediate_result_model.md](intermediate_result_model.md) §3; [geometry_core.md](geometry_core.md) §4 | Vertical helper functions exist but are not assembled into `LinerIntermediateResult`. | Add `VerticalGeometryResult`, connect profile input, emit profile samples and grade breaks. |
| `grid` | [intermediate_result_model.md](intermediate_result_model.md) §6-§7; [geometry_core.md](geometry_core.md) §7 | Flat `gridPoints` exist, but no `GridResult` wrapper, grid lines, or cells. | Replace top-level `gridPoints` with `grid: { points, lines, cells }`; generate lines/cells deterministically. |
| `spans` | [intermediate_result_model.md](intermediate_result_model.md) §8; [domain_model.md](domain_model.md) Core entities | Not implemented. | Add domain span inputs and intermediate span results, even if empty for simple fixtures. |
| `piers` | [intermediate_result_model.md](intermediate_result_model.md) §8; [frame_model_mapping.md](frame_model_mapping.md) §6 | Not implemented. | Add pier inputs/results and support-line point resolution. |
| `frameHints` | [intermediate_result_model.md](intermediate_result_model.md) §9; [frame_model_mapping.md](frame_model_mapping.md) §3, §5, §6 | Not implemented. | Add connectivity mode, member group rules, default group key, and support templates to intermediate result. |
| `dependencyGraph` | [intermediate_result_model.md](intermediate_result_model.md) §13; [line_dependency_graph.md](line_dependency_graph.md) | Not implemented. | Add a minimal `DependencySnapshot` with node ids/kinds and invalidation metadata. |
| `diagnostics` | [intermediate_result_model.md](intermediate_result_model.md) §11; [error_handling.md](error_handling.md) | Implemented as `issues`; catalog is partial. | Rename/bridge to `diagnostics`, add `messageKey?`, and expand diagnostic code union to the design catalog. |

## 4. Implementation-Only Items

| Code location | Item | Reason it exists | Add to design or remove? |
| --- | --- | --- | --- |
| `frontend/src/liner/core/types.ts` | `nodeCandidates` and `memberCandidates` on `LinerIntermediateResult` | Phase 0 prepared future frame mapping without touching project schema. | Remove from canonical intermediate in Phase 1 mapper integration, or move to a separate mapper preview result. Do not add to `intermediate_result_model.md` as canonical fields. |
| `frontend/src/liner/core/types.ts` | `GridPointPreparation`, `NodePreparation`, `MemberPreparation` names | Phase 0 isolated preparation types. | Keep as implementation-layer aliases only if mapped to `GridPointResult` / mapper output; do not make them design source-of-truth names. |
| `frontend/src/liner/core/types.ts` | `issues` field on intermediate result and horizontal result | Phase 0 validation naming. | Replace or alias to `diagnostics` to match design. |
| `frontend/src/liner/core/types.ts` | `CoordinateSystemMarker` | Minimal Phase 0 marker. | Keep as implementation support if it maps to `coordinatePolicyId`; consider documenting in [coordinate_system_policy.md](coordinate_system_policy.md) only if it becomes persisted or public. |
| `frontend/src/liner/core/station/stationRules.ts` | `GeneratedStation.source` and `sourceId` | Useful provenance for start/end/interval/explicit/equation stations. | Add to station design as optional provenance fields, or map into `note`/future provenance object. Recommended: add optional station provenance in design during P1-1. |

## 5. GC-02 Investigation

### 5-1. Current design values

[test_plan_geometry.md](test_plan_geometry.md) GC-02 currently states:

| Quantity | Current expected value |
| --- | --- |
| Input | start `(0, 0)`, azimuth `0`, radius `R = 500 m`, left turn, deflection `30° = π/6`, arc length `L = Rθ ≈ 261.799388 m` |
| End point | `(250.000000, 66.987298)` |
| Midpoint at `s = L/2` | `(129.409522, 13.397459)` |
| Midpoint azimuth | `π/12 ≈ 0.261799` |

### 5-2. Standard circular arc derivation

Coordinate policy:

- [coordinate_system_policy.md](coordinate_system_policy.md) §2 defines azimuth from `+X` toward `+Y`, CCW positive.
- [coordinate_system_policy.md](coordinate_system_policy.md) §2 defines left turn as positive curvature.
- [geometry_core.md](geometry_core.md) §2 defines left arc curvature as `κ = +1/R`.

For a left circular arc starting at `(x0, y0) = (0, 0)` with initial azimuth `θ0 = 0`, radius `R = 500`, and local deflection angle `α = s/R`:

```text
x(α) = x0 + R · (sin(θ0 + α) - sin θ0)
y(α) = y0 - R · (cos(θ0 + α) - cos θ0)
     = R · (1 - cos α)    when θ0 = 0
```

End point:

```text
α_end = π/6
x_end = 500 · sin(π/6)
      = 500 · 0.5
      = 250.000000

y_end = 500 · (1 - cos(π/6))
      = 500 · (1 - 0.8660254037844386)
      = 66.9872981077807
```

Midpoint:

```text
s_mid = L / 2
α_mid = (R · π/6 / 2) / R = π/12

x_mid = 500 · sin(π/12)
      = 500 · 0.25881904510252074
      = 129.40952255126038

y_mid = 500 · (1 - cos(π/12))
      = 500 · (1 - 0.9659258262890683)
      = 17.037086855465844
```

The current implementation in `frontend/src/liner/core/geometry/arc.ts` uses the same equation, and the Phase 0 test expects `17.037087`.

### 5-3. Cause analysis

| Possible cause | Assessment |
| --- | --- |
| Design document error | **Likely confirmed.** End point, azimuth, coordinate policy, and implementation all align with the standard left-arc equation, while only the midpoint y value differs. |
| Implementation error | Not supported by current evidence. The implementation matches the same equation that reproduces the design end point. |
| Coordinate system definition | Not supported by current evidence. The documented coordinate system produces the design end point and implementation result. |
| Unit issue | Not supported by current evidence. All quantities are in meters/radians and match the end point. |
| Other | No alternative interpretation found that preserves the documented midpoint azimuth `π/12` and gives `y = 13.397459`. |

### 5-4. Conclusion

Conclusion: **Design document correction**.

The GC-02 midpoint y value should be corrected from `13.397459` to `17.037087` in [test_plan_geometry.md](test_plan_geometry.md). This is a design numeric fixture correction, not an implementation change.

## 6. Phase 1 Implementation Order

The proposed order is mostly correct:

```text
P1-1 Intermediate Result
P1-2 Geometry Accuracy
P1-3 Frame Mapping
P1-4 Schema Extension
P1-5 Frame Analysis Connection
P1-6 UI Preparation
```

Recommended refinement:

1. **P1-1a Intermediate Result convergence:** make the runtime type match [intermediate_result_model.md](intermediate_result_model.md) §1-§15.
2. **P1-1b Fixture and snapshot convergence:** add full intermediate fixtures for GC-01 through GC-07 before extending mapping.
3. **P1-2 Geometry Accuracy:** fix GC-02 design value, then add independent GC-08 through GC-10 clothoid references.
4. **P1-3 Frame Mapping:** implement pure `mapToFrameModel()` from canonical intermediate result and generation settings.
5. **P1-4 Schema Extension:** add additive `liner` and `linerTrace` schema support and migration tests.
6. **P1-5 Headless Frame Analysis Connection:** validate generated project and run existing analysis flow without UI.
7. **P1-6 UI Preparation:** document route/window/i18n key groups, but keep UI implementation in the next phase.

Reason: canonical intermediate fixtures should precede mapper/schema work so downstream validation does not lock in a Phase 0 temporary result shape.

## 7. Phase 1 Completion Criteria

Phase 1 is complete only when all criteria below are met:

1. `frontend/src/liner` exposes a canonical `LinerIntermediateResult` matching [intermediate_result_model.md](intermediate_result_model.md) §1-§15.
2. The pipeline emits `vertical`, `stations`, `grid`, `spans`, `piers`, `frameHints`, `sections`, `diagnostics`, and `dependencyGraph`.
3. Golden intermediate fixtures exist for GC-01 through GC-07.
4. Independent numeric clothoid references exist for GC-08 through GC-10, or clothoid-supported shipping remains explicitly blocked.
5. A pure frame mapper generates nodes, members, supports, and `linerTrace` from canonical intermediate results.
6. GC-06 mapper fixture validates against the approved project schema.
7. Schema extension is additive and existing project fixtures still validate.
8. A headless generated frame model can pass existing validation and run through the existing analysis flow.
9. No React component, UI route, DXF/PDF/CSV/glTF export, or user-facing Japanese string is added unless explicitly covered by a later phase task.
10. `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` pass at each implementation commit.

## 8. Human Decisions Required

| ID | Decision | Recommended owner / source |
| --- | --- | --- |
| P1-D01 | Approve GC-02 midpoint y correction in [test_plan_geometry.md](test_plan_geometry.md). | Geometry owner; this review recommends correction. |
| P1-D02 | Decide whether `GeneratedStation.source/sourceId` becomes documented station provenance or remains an internal implementation detail. | Intermediate result owner. |
| P1-D03 | Decide if `nodeCandidates` / `memberCandidates` should be fully removed from canonical intermediate output or retained only as mapper preview output. | Frame mapping owner; recommendation is mapper output only. |
| P1-D04 | Approve additive schema extension shape for `liner` and `linerTrace`. | Schema owner; see [schema_migration_policy.md](schema_migration_policy.md). |
| P1-D05 | Decide whether `meta` on frame nodes/members is included in the same schema extension or deferred. | Schema owner; current design allows `linerTrace` without `meta`. |
| P1-D06 | Approve independent reference method for GC-08 through GC-10 clothoid fixtures. | Geometry owner; Simpson/reference script or audited external table. |
| P1-D07 | Decide whether UI preparation in P1-6 should create i18n key inventory only or also route/window design updates. | Product/UI owner. |

## 9. `review_docs_liner.md` Handling

Current repository state: `review_docs_liner.md` is already tracked in Git as commit `b49db45` (`Add review_docs_liner.md`). Therefore:

- Option A, add to Git: already done.
- Option B, add to `.gitignore`: not appropriate for a design review artifact already used for traceability.
- Option C, delete: not recommended because [review_resolution_summary.md](review_resolution_summary.md) refers to the original review report.

Recommendation: keep `review_docs_liner.md` tracked as the original review report for traceability. No additional commit is needed for this item.

## 10. Blocker Update

| Severity | Previous | P1-0 status |
| --- | ---: | --- |
| Critical | 0 | 0 |
| High | 3 | 3 remain, but GC-02 is now identified as a design fixture correction and should be fixed before P1-2. |
| Medium | 7 | 7 remain; P1-1 should retire the intermediate-result and fixture-layout items. |
| Low | 5 | 5 remain; all can stay deferred unless touched by Phase 1 implementation. |

P1-1 may start after the GC-02 design correction is committed, because the remaining High items map directly to P1-2 through P1-4 work packages.
