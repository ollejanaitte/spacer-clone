# review_docs_liner.md

## Review Scope

Reviewed `docs/liner` in the uploaded archive only. No source design files were modified, added, or deleted.

- Target directory: `docs/liner`
- Files reviewed: 35 Markdown files
- Empty files: 0
- Highest-priority files reviewed first:
  - `intermediate_result_model.md`
  - `frame_model_mapping.md`
  - `integration_with_frame_model.md`
  - `geometry_core.md`
  - `test_plan_geometry.md`

## Executive Summary

The document set is well-structured and already captures the right architectural center of gravity: **domain input → geometry core → intermediate result → grid → frame model mapping → existing analysis model**. The separation between UI, calculation core, intermediate snapshot, mapping, output, and validation is mostly sound.

However, the current state is still a **design skeleton plus several critical drafts**, not yet an implementation-ready specification. The biggest issue is not document count. The biggest issue is that the most important contracts are still underspecified:

1. `LinerIntermediateResult` is identified as canonical, but does not yet contain enough frame-generation metadata.
2. `FrameModelMapping` defines basic node/member generation, but not enough about member orientation, local axes, releases, generated entity metadata, and existing schema compatibility.
3. `GeometryCore` lists clothoid as a target, but the algorithm choice, sign convention, endpoint formulas, and verification method are still open.
4. Test cases are correctly listed, but most golden cases do not yet contain numeric expected values.
5. CAD/report/3D output depend on the intermediate result, but the intermediate model does not yet include all annotation, dimension, and traceability fields required by those consumers.

Severity count:

| Severity | Count |
| --- | ---: |
| Critical | 4 |
| High | 10 |
| Medium | 11 |
| Low | 6 |

Overall assessment:

- Design maturity: **good architecture, incomplete contracts**
- Implementation readiness: **not ready for full implementation**
- Safe implementation scope now: **scaffold, type definitions, validation skeleton, simple straight/arc MVP prototypes**
- Required before serious implementation: **resolve Critical + High items below**

---

## Critical Findings

### CR-01 — Intermediate result lacks a complete contract for frame model generation

**Target:** `intermediate_result_model.md`, `frame_model_mapping.md`, `integration_with_frame_model.md`

**Issue:**
`GridPointResult` currently contains `id`, station, offset, xyz, azimuth, and labels. This is enough to create basic nodes, but not enough to robustly create structural members. The mapper will need more than point coordinates:

- local frame vectors at each grid point, not only azimuth
- station physical distance vs. displayed station distinction
- source span / pier / section / girder / cross-girder identifiers
- grid line role: main girder, cross-girder, edge, virtual, construction-only, etc.
- mapping group metadata for material/section assignment
- exact ordering guarantees when station equations or duplicate displayed stations exist
- optional section-height/superelevation-derived z-offset provenance

**Impact:**
The frame mapper may create nodes and members that are geometrically correct in XYZ but structurally ambiguous. This is especially risky for curved/skewed bridges, transverse members, bearing lines, and future load placement.

**Recommendation:**
Extend `GridPointResult` or add related entities such as `GridLineResult`, `GridCellResult`, `SpanResult`, `PierResult`, and `FrameGenerationHintResult`. At minimum, define:

```ts
localFrame: {
  tangent: Vec3;
  normal: Vec3;
  binormal: Vec3;
};
source: {
  alignmentId: string;
  stationRuleId?: string;
  spanId?: string;
  pierId?: string;
  crossSectionTemplateId?: string;
  longitudinalLineId?: string;
  transverseLineId?: string;
};
roles: Array<"main_girder" | "cross_girder" | "pier_line" | "edge" | "virtual">;
```

This must be fixed before relying on generated frame models.

---

### CR-02 — Clothoid design is still unresolved despite being a core project requirement

**Target:** `geometry_core.md`, `test_plan_geometry.md`, `validation_rules.md`, `numerical_accuracy.md`

**Issue:**
The project objective includes straight, circular arc, and clothoid geometry. `geometry_core.md` marks `ClothoidSegment` as TBD and leaves the algorithm choice open. `test_plan_geometry.md` also marks clothoid tests as TBD and does not list a golden clothoid case.

**Impact:**
Without a fixed clothoid algorithm and reference tests, implementation may produce incompatible results across rendering, reports, CAD, and frame generation. This is the highest mathematical risk in the project.

**Recommendation:**
Before implementation, add a dedicated clothoid section or document. Define:

- parameter convention: A, L, start radius, end radius, sign of curvature
- right/left curve sign convention
- endpoint computation method: Fresnel integral, series expansion, or numerical integration
- accuracy targets by length/radius range
- inverse station query behavior on clothoids
- at least three golden cases:
  - straight → clothoid → arc
  - arc → clothoid → straight
  - egg-shaped transition with non-infinite start/end radii

---

### CR-03 — Existing project schema compatibility is not settled

**Target:** `integration_with_frame_model.md`, `frame_model_mapping.md`, `project_file_format.md`, `schema_migration_policy.md`

**Issue:**
The integration design recommends storing a `liner` section and using `meta.source === "liner"` on generated frame entities. But it is still an open question whether `project.schema.json` allows `meta` on nodes/members. There is also no final decision between ID-prefix-only tagging and formal metadata.

**Impact:**
The mapper may produce JSON that cannot pass existing validation, or it may need ad-hoc exceptions later. This directly threatens the primary workflow: generated liner model → existing analysis engine.

**Recommendation:**
Resolve schema policy before implementation:

1. Inspect current `project.schema.json` and input types.
2. Decide whether generated metadata is stored in official `meta` fields or a separate `linerTrace` table.
3. Add migration/versioning policy.
4. Add a golden fixture: `liner-intermediate.json → project.generated.json → schema validation passes`.

---

### CR-04 — Golden tests are listed but not numerically specified

**Target:** `test_plan_geometry.md`, `geometry_core.md`, `frame_model_mapping.md`

**Issue:**
The geometry test plan correctly lists GC-01 through GC-07, but most cases describe intent rather than exact expected numeric outputs. `frame_model_mapping.md` also references a worked example but does not define exact node/member/support IDs and coordinates.

**Impact:**
A test plan without expected values cannot prevent silent geometric drift. This is especially dangerous because all downstream outputs depend on the intermediate result.

**Recommendation:**
Before implementation, add numeric expected values for:

- straight line stations
- circular arc endpoint and midpoint
- line-arc compound continuity
- station equation physical/displayed station mapping
- parabolic vertical curve quarter points
- 3×3 grid coordinates and generated members
- 45° skew offset direction

The first implementation task should be making these tests fail, then implementing until they pass.

---

## High Findings

### HI-01 — Frame member local axis and orientation are missing

**Target:** `frame_model_mapping.md`, `coordinate_system_policy.md`

**Issue:**
Member connectivity is defined, but member local axis orientation is not. Existing frame analysis often depends on member local axes for section stiffness, releases, loads, and result interpretation.

**Recommendation:**
Define member i-j direction rules and member local y/z orientation for longitudinal and transverse members. Include curved alignment cases and skewed cross-girders.

---

### HI-02 — Material and section assignment is too coarse for bridge grids

**Target:** `frame_model_mapping.md`, `domain_model.md`

**Issue:**
The MVP says one `materialId` and one `sectionId` may be used. That is acceptable for a toy model, but insufficient for realistic bridge grids where main girders, cross-girders, diaphragms, pier/bearing members, and virtual construction lines differ.

**Recommendation:**
Define `memberGroupRules` by grid direction, transverse index, span, role, and user override. Keep single material/section as a default, not as the core model.

---

### HI-03 — Pier, bearing, and support modeling is underspecified

**Target:** `frame_model_mapping.md`, `integration_with_frame_model.md`, `domain_model.md`

**Issue:**
Support templates currently cover simple boundary rows. JIP-LINER-like workflows often depend on pier lines, skew angles, bearing positions, and span boundaries. The current model may place supports at min/max rows only.

**Recommendation:**
Add explicit pier/support generation rules:

- support line by station or pier entity
- support node selection by transverse role
- skewed pier-line handling
- bearing offset from girder node
- fixed/pinned/roller direction in global or local support coordinate system

---

### HI-04 — Station equation semantics are not implementation-ready

**Target:** `station_rules.md`, `intermediate_result_model.md`, `geometry_core.md`, `test_plan_geometry.md`

**Issue:**
`StationTableEntry` has `station` and `physicalDistance`, but duplicate displayed stations, station jumps, reverse equations, exact-boundary behavior, and sorting/indexing rules are not fully nailed down.

**Recommendation:**
Define station equations as a formal mapping:

```text
displayedStation = f(physicalDistance)
physicalDistance = g(displayedStation, equationContext)
```

Also define how duplicate displayed values are disambiguated in APIs and UI.

---

### HI-05 — Cross-section, superelevation, and section height responsibilities are unclear

**Target:** `profile_rules.md`, `geometry_core.md`, `intermediate_result_model.md`, `domain_model.md`

**Issue:**
`P.z = Z(s) + sectionOffset(s, d)` is mentioned, but it is not clear where crossfall, superelevation, slab/haunch depth, girder eccentricity, and section height are computed and stored.

**Recommendation:**
Split vertical/profile concepts into:

- alignment profile elevation
- crossfall/superelevation surface
- structural reference elevation
- section depth/eccentricity
- generated node z-coordinate

Then record provenance for each z component in intermediate results.

---

### HI-06 — Dependency graph is too shallow for a real liner workflow

**Target:** `line_dependency_graph.md`, `recalculation_policy.md`, `calculation_pipeline.md`

**Issue:**
The design recognizes dependencies, but does not fully define graph nodes, invalidation propagation, cycle detection, or partial recomputation boundaries for line references, parallel lines, station tables, profiles, grids, and frame outputs.

**Recommendation:**
Define a typed dependency graph with node kinds and invalidation rules. Include examples:

- base alignment edit invalidates parallel lines, stations, grid, frame model
- profile edit invalidates z values and frame model but not horizontal sampled points
- material setting edit invalidates mapped members but not geometry

---

### HI-07 — CAD output is currently too generic

**Target:** `cad_output_spec.md`, `test_plan_cad_report.md`, `intermediate_result_model.md`

**Issue:**
CAD output lists plan/profile/layers but does not define coordinate scaling, sheet model, text placement, station tick generation, dimension rules, or DXF entity strategy.

**Recommendation:**
For MVP, define SVG precisely. For post-MVP DXF, define entity subset, layer naming, text height, units, and coordinate policy. Avoid copying JIP templates, but do define original sheet conventions.

---

### HI-08 — Report output lacks table schemas

**Target:** `report_output_spec.md`, `intermediate_result_model.md`, `test_plan_cad_report.md`

**Issue:**
Reports are mentioned as downstream consumers, but exact report tables and columns are not specified.

**Recommendation:**
Define report tables with stable English internal keys and Japanese i18n labels:

- alignment segment table
- station coordinate table
- profile elevation table
- grid point table
- frame mapping trace table
- diagnostics table

---

### HI-09 — Error code catalog is not started

**Target:** `error_handling.md`, `validation_rules.md`, `logging_and_debug.md`, `intermediate_result_model.md`

**Issue:**
Diagnostics have `code` and `messageKey`, but there is no catalog. Without this, UI, logs, tests, and reports will diverge.

**Recommendation:**
Create a code namespace convention such as:

- `LINER_GEOM_ZERO_LENGTH_SEGMENT`
- `LINER_GEOM_CLOTHOID_INVALID_RADIUS`
- `LINER_STATION_DUPLICATE_EQUATION`
- `LINER_FRAME_MISSING_SECTION`
- `LINER_FRAME_SCHEMA_INVALID`

Each validation rule should map to one code and one i18n key.

---

### HI-10 — Implementation boundary between frontend TypeScript and backend/FastAPI is undecided

**Target:** `geometry_core.md`, `calculation_pipeline.md`, `integration_with_frame_model.md`, `performance_architecture.md`

**Issue:**
Several documents leave open whether the geometry core runs only in TypeScript or is duplicated/ported to backend. This affects testing, export, determinism, and performance.

**Recommendation:**
Pick one MVP boundary:

- Recommended MVP: TypeScript-only pure core in frontend, mapper also TypeScript, backend only validates existing project schema.
- Later: backend export service may consume serialized intermediate results, not re-run geometry.

---

## Medium Findings

### ME-01 — `design_workflow.md` duplicates many individual specs

**Target:** `design_workflow.md`, all topic documents

**Issue:**
`design_workflow.md` is useful as a guide, but it overlaps with almost every dedicated document. This can drift as edits happen.

**Recommendation:**
Keep `design_workflow.md` as a navigation and sign-off document. Move detailed decisions into individual specs and make the workflow doc link to them instead of restating them.

---

### ME-02 — Document priority is clear, but readiness status is not

**Target:** `README.md`, all docs

**Issue:**
Files are prioritized, but not marked as Draft / Reviewed / Approved / Blocked.

**Recommendation:**
Add a status table in `README.md`:

| Document | Priority | Status | Blocks implementation? |

---

### ME-03 — Open questions are spread across all files without a consolidated decision log

**Target:** all docs

**Issue:**
Every file has open questions. There is no central owner/status/deadline list.

**Recommendation:**
Add `decision_log.md` or a section in `design_workflow.md` listing open decisions by ID. Example: `D-LINER-001 Clothoid algorithm`.

---

### ME-04 — Import/export policy is separate but not tied tightly enough to project format

**Target:** `import_export_policy.md`, `project_file_format.md`, `schema_migration_policy.md`

**Issue:**
The policy is sound but abstract. It needs concrete examples of accepted/rejected import/export formats, especially to avoid copying third-party file formats.

**Recommendation:**
Define original `.liner.json` or embedded project format examples, plus explicit non-goals for `.LIN`, `.OL2`, `.MDO`, etc.

---

### ME-05 — Rendering and CAD may re-sample geometry unless contract is strict

**Target:** `rendering_strategy.md`, `cad_output_spec.md`, `intermediate_result_model.md`

**Issue:**
The consumer contract says no consumer may call geometry algorithms directly. Good. But rendering/CAD specs should explicitly say whether they use `sampledPoints` only or request a new sampling density from core.

**Recommendation:**
Define one of two modes:

- fixed intermediate sampledPoints for all consumers
- controlled re-sampling through pipeline only, never ad-hoc in CAD/render modules

---

### ME-06 — Performance targets are not connected to model limits

**Target:** `performance_limits.md`, `performance_architecture.md`, `test_plan_geometry.md`

**Issue:**
Performance smoke target is listed as 1000 grid points under 500 ms, but expected project scale and memory profile are not tied to output and frame mapping.

**Recommendation:**
Define target sizes:

- number of alignments
- stations
- grid points
- generated nodes/members
- max report rows
- max CAD entities

---

### ME-07 — Validation timing needs UX detail

**Target:** `validation_rules.md`, `input_ui_behavior.md`, `error_handling.md`

**Issue:**
Validation on blur/save/pre-compute is mentioned, but user-facing behavior is not specific enough.

**Recommendation:**
Define which errors block compute, which block save, and which show warnings only. Also define how stale intermediate results are displayed after an edit introduces an error.

---

### ME-08 — Undo/redo and recalculation interaction needs an example

**Target:** `undo_redo_spec.md`, `recalculation_policy.md`, `state_management.md`

**Issue:**
Undo triggers recalculation, but there is no example of cached snapshot rollback vs. recompute.

**Recommendation:**
Add examples for numeric edit, line deletion, station equation edit, and generation setting edit.

---

### ME-09 — Existing bridge wizard overlap needs a firm reuse policy

**Target:** `integration_with_frame_model.md`, `domain_model.md`, `frame_model_mapping.md`

**Issue:**
The documents correctly recognize overlap with the bridge wizard/FEM generator but do not decide reuse boundaries.

**Recommendation:**
Adopt one policy:

- share only low-level frame entity creation helpers; or
- share `GenerationSettings`; or
- keep completely separate for MVP.

Avoid half-sharing domain models.

---

### ME-10 — Legal originality policy is good but should be linked to review gates

**Target:** `legal_originality_policy.md`, `test_plan_cad_report.md`, `ui_window_spec.md`, `cad_output_spec.md`

**Issue:**
The originality policy is present, but concrete review gates are scattered.

**Recommendation:**
Add a mandatory originality checklist before UI/CAD/report implementation:

- no copied screen hierarchy
- no copied labels unless generic engineering terms
- no copied file extension or binary/text format
- original report layout and drawing template

---

### ME-11 — File I/O edge cases should include corruption and partial writes

**Target:** `file_io_edge_cases.md`, `project_file_format.md`, `schema_migration_policy.md`

**Issue:**
The file I/O document exists but should explicitly cover interrupted writes, autosave recovery, invalid embedded liner section, and forward-incompatible versions.

**Recommendation:**
Add atomic write and recovery policy.

---

## Low Findings

### LO-01 — Some documents are mostly templates

**Target:** `logging_and_debug.md`, `performance_architecture.md`, `rendering_strategy.md`, `schema_migration_policy.md`, others

**Issue:**
Several medium-priority files are thin and follow the same template. This is acceptable at this phase, but they should not be treated as implementation-ready.

**Recommendation:**
Mark them Draft explicitly.

---

### LO-02 — Naming convention for generated IDs should include version or namespace escape

**Target:** `frame_model_mapping.md`

**Issue:**
`N_LINER_001_002` is readable but may collide if multiple liner models or alignments are embedded.

**Recommendation:**
Use model namespace:

```text
N_LINER_{linerModelId}_{longitudinalIndex}_{transverseIndex}
```

or store unique IDs with readable labels separately.

---

### LO-03 — `sourceRevision` hash method is not defined

**Target:** `intermediate_result_model.md`, `calculation_pipeline.md`

**Issue:**
`sourceRevision` is a hash or monotonic ID, but no canonicalization rule is defined.

**Recommendation:**
Define canonical JSON serialization for hash calculation.

---

### LO-04 — Station label formatting belongs outside numeric core

**Target:** `station_rules.md`, `unit_and_precision_policy.md`, `intermediate_result_model.md`

**Issue:**
Station labels are mentioned, but numeric station values and formatted station labels should remain separate.

**Recommendation:**
Store numeric values only in core results; generate labels at UI/report/export boundary.

---

### LO-05 — Diagnostics need entity path, not only entityId

**Target:** `intermediate_result_model.md`, `error_handling.md`

**Issue:**
A flat `entityId` may not identify nested table rows or fields.

**Recommendation:**
Add `entityPath?: string` or `{ entityType, entityId, field }`.

---

### LO-06 — 3D export is mentioned in project overview but not represented as its own spec

**Target:** `README.md`, `rendering_strategy.md`, `intermediate_result_model.md`

**Issue:**
3D線形・格子出力（glTF等）が project objective にあるが、`docs/liner` には explicit `3d_output_spec.md` がない。

**Recommendation:**
If glTF is part of near-term scope, add a short spec or explicitly move it to post-MVP.

---

## Duplication Analysis

### Significant duplications

1. `design_workflow.md` overlaps with nearly all design documents.
2. `frame_model_mapping.md` and `integration_with_frame_model.md` both describe merge/tagging behavior.
3. `unit_and_precision_policy.md`, `numerical_accuracy.md`, and `coordinate_system_policy.md` overlap around units/angles/tolerances.
4. `cad_output_spec.md` and `report_output_spec.md` both depend on intermediate output but do not share a common output table/entity model.
5. `state_management.md`, `recalculation_policy.md`, and `line_dependency_graph.md` overlap around invalidation.

### Recommendation

Do not reduce file count yet. Instead, assign each duplicated topic a single source of truth:

| Topic | Source of truth |
| --- | --- |
| Merge/tagging algorithm | `integration_with_frame_model.md` |
| Node/member/support details | `frame_model_mapping.md` |
| Numeric tolerance | `numerical_accuracy.md` |
| Display precision | `unit_and_precision_policy.md` |
| Invalidation graph | `line_dependency_graph.md` |
| Recalculation behavior | `recalculation_policy.md` |
| Architecture overview | `design_workflow.md` |

---

## Missing or Underdeveloped Documents

Recommended additions or expansions:

1. `clothoid_algorithm.md` — required if clothoid is MVP.
2. `grid_generation_spec.md` — currently embedded in geometry/domain/frame mapping, but central enough to deserve its own spec.
3. `frame_generation_settings.md` — material/section/support/connectivity rules.
4. `output_table_schema.md` — common source for report/CAD/CSV tables.
5. `decision_log.md` — consolidate all open questions and decisions.
6. `3d_output_spec.md` — if glTF output remains in target scope.
7. `schema_extension_plan.md` — if `project.schema.json` will be extended with `liner` and `meta` fields.

---

## Responsibility Separation Review

Current separation is mostly good:

- UI does not own geometry logic.
- Geometry core does not know React, HTTP, file I/O, or FEM.
- Intermediate result is intended as canonical output.
- Mapper is intended as a pure function.
- Existing analysis engine remains unchanged.

Weak points:

- Section height / crossfall / superelevation responsibility is not clear.
- Backend vs frontend geometry execution is not decided.
- Frame schema extension and mapper tagging are not finalized.
- Rendering/CAD may need controlled resampling rules.

---

## Frame Model Integration Review

The conceptual flow is correct:

```text
LinerProject
  → Calculation pipeline
  → LinerIntermediateResult
  → FrameModelMapper
  → project.json subset
  → existing validator
  → existing analysis flow
```

But for implementation, the frame integration still needs:

- exact generated entity schema
- schema validation fixture
- member local axis convention
- support coordinate system
- material/section group rules
- merge conflict policy
- traceability storage policy
- handling of multiple liner-generated models in one project

This is the most important area to strengthen before coding.

---

## CAD Output Review

The CAD design correctly avoids copying JIP-LINER templates and proposes original layers. However, it is too abstract for implementation.

Needed before coding:

- chosen MVP format: SVG or DXF
- exact layer/entity naming
- model-space units
- station tick spacing
- text label placement
- dimension generation rules
- output naming convention
- golden visual fixture

---

## Intermediate Data Model Review

The model is directionally right and should remain the center of the architecture.

Required improvements:

- add local frame vectors
- add source/provenance per grid point
- add grid line/span/pier/role concepts
- add station equation disambiguation
- add section/crossfall/elevation component provenance
- add stronger diagnostics targeting
- add output table derivation requirements

This file should be revised before most other implementation work.

---

## Geometry and Clothoid Review

Straight and circular arc concepts are adequate as a starting point. Vertical profile and grid placement are also directionally correct.

The major gap is clothoid. A JIP-LINER-equivalent system without a nailed-down transition curve implementation will not be reliable.

Required before implementation:

- clothoid formula selection
- sign conventions
- parameter validation
- tangent/curvature continuity rules
- inverse projection method
- golden cases with independent references

---

## Test Design Review

The test strategy is correctly shaped, but still incomplete.

Strengths:

- good test pyramid
- tolerance table exists
- golden case catalog exists
- inverse projection tests recognized
- frame mapping example referenced

Gaps:

- no numeric expected outputs
- no clothoid golden case
- mapper-specific golden fixture is missing
- CAD/report snapshots are not fully specified
- CI gate criteria are not finalized

Implementation should begin by writing golden fixtures first.

---

## Recommended Next Actions

### Must do before implementation

1. Resolve schema extension and generated metadata policy.
2. Expand `intermediate_result_model.md` for frame generation metadata.
3. Decide clothoid algorithm and add golden tests.
4. Add numeric expected values to GC-01 through GC-07.
5. Finalize frame member local axis and support template rules.
6. Define material/section assignment rules beyond single default values.

### Good next design pass order

1. `intermediate_result_model.md`
2. `geometry_core.md`
3. `test_plan_geometry.md`
4. `frame_model_mapping.md`
5. `integration_with_frame_model.md`
6. `domain_model.md`
7. `line_dependency_graph.md` / `recalculation_policy.md`
8. `cad_output_spec.md` / `report_output_spec.md`

---

## Final Assessment

The document set is valuable and correctly focused. The architecture is not drifting into a UI-first design, which is good. The core concept — **線形 → 測点 → 格子 → 節点 → 部材 → 骨組み解析モデル** — is preserved throughout the documents.

But the current docs should be treated as **Phase 0 / design framework complete**, not **implementation-ready specification complete**.

Recommended status:

```text
Architecture direction: Approved
Implementation contract: Not yet approved
Full implementation: Blocked by Critical findings
Prototype straight-line MVP: Possible with caveats
Clothoid-supported implementation: Blocked until CR-02 resolved
Frame model generation: Blocked until CR-01 and CR-03 resolved
```
