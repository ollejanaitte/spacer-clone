# Phase 0 Implementation Gate

## 1. Executive Summary

The liner design set is ready to enter a constrained Phase 0 implementation. The safe scope is an isolated TypeScript calculation module with domain/intermediate types, pure geometry functions, minimal station generation, grid-preparation data structures, diagnostics/tolerances, fixtures, and unit tests.

Phase 0 must not implement UI, report export, CAD/DXF export, glTF/3D export, persistence schema migration, or direct connection to the existing frame analysis engine. The implementation should prove the core pipeline shape:

```text
linear alignment -> stations -> grid preparation -> node/member-ready data -> frame mapping contract
```

The design review findings in `review_docs_liner.md` have been addressed at design level, and `docs/liner/review_resolution_summary.md` records that all Critical and High findings were resolved in the documentation pass. Remaining risks are implementation gates, fixtures, schema compatibility work, and future UI/output decisions.

## 2. Gate Decision

**READY_WITH_CONDITIONS**

Phase 0 may begin if the implementation is limited to isolated TypeScript modules and tests, with no UI, output, schema, or GitHub push/merge work. Full feature implementation is not approved by this gate.

Rationale:

- The key design documents now define the intermediate result model, geometry core, station rules, frame mapping responsibilities, and test cases at a usable Phase 0 level.
- The TypeScript-only MVP execution boundary is documented.
- The current `schemas/project.schema.json` does not yet allow `liner` or `linerTrace`, so Phase 0 must avoid persisted project schema changes.
- The existing frontend stack already has Vitest, TypeScript build, lint, and source-hygiene checks suitable for isolated module work.

## 3. Remaining Blockers

### Critical

Count: **0**

No remaining Critical blocker prevents a constrained Phase 0 implementation.

### High

Count: **3**

1. `project.schema.json` does not yet include top-level `liner` or `linerTrace`; any merge into persisted `project.json` must wait for a separate schema extension task.
2. GC-08 through GC-10 clothoid cases still need committed numeric independent-reference fixtures before clothoid behavior can be treated as production-grade.
3. The first mapper fixture must validate against the existing schema or an approved schema extension before any frame-model merge feature is enabled.

### Medium

Count: **7**

1. Phase 0 needs a concrete source tree and file layout before implementation starts.
2. Domain and intermediate TypeScript type sketches need to be converted into compilable types.
3. Validation tests need to be planned as implementation tests, not only design checklist items.
4. Fixture directory conventions under `examples/liner/` need to be created during implementation.
5. Source revision canonical JSON hashing needs deterministic tests.
6. UI/i18n key groups remain future work and must not be touched in Phase 0.
7. Output consumers must remain blocked until intermediate fixtures stabilize.

### Low

Count: **5**

1. Some supporting design documents remain Draft, but they are outside Phase 0.
2. Superelevation and advanced local-frame roll behavior are deferred.
3. Backward stationing and reverse equations are deferred.
4. Performance benchmarks are optional until core correctness exists.
5. File dialog filters, report samples, and CAD samples are future implementation tasks.

## 4. Phase 0 Scope

Phase 0 should include only:

- TypeScript type definitions for liner domain input and intermediate results.
- Pure geometry functions for line, circular arc, and minimal clothoid.
- Forward point-at-distance functions and local frame computation.
- Minimal vertical profile functions: constant grade and parabolic vertical curve.
- Minimal station generation with physical distance and displayed station mapping.
- Minimal grid data structures and grid point generation for straight/arc/clothoid alignments.
- Data structures required before node/member generation, without mutating the existing app project.
- Diagnostics, error codes, tolerance constants, and validation result shapes.
- Unit tests and golden fixtures for GC-01 through GC-07.
- Clothoid tests for GC-08 through GC-10 using clearly marked independent-reference numeric baselines.
- Isolated module exports only; no app navigation or React integration.

## 5. Explicit Non-Scope

Phase 0 must not include:

- React components or UI routes.
- i18n additions unless a test-only non-user-facing identifier unexpectedly requires it; no Japanese strings in React.
- PDF, CSV, SVG, DXF, or glTF output implementation.
- Report layout or drawing template implementation.
- Any JIP-LINER-compatible file import/export.
- Any copied JIP-LINER UI text, report wording, file extension, proprietary file format, screen hierarchy, or manual structure.
- Direct mutation of existing `project.json` persistence.
- `project.schema.json` changes, unless a later task explicitly scopes schema extension.
- Backend geometry port or FastAPI endpoint.
- Connection to the analysis engine.
- GitHub push, main merge, or release work.

## 6. Required Source Tree Proposal

Recommended source tree:

```text
frontend/src/liner/
  core/
    types.ts
    tolerances.ts
    diagnostics.ts
    vector.ts
    geometry/
      line.ts
      arc.ts
      clothoid.ts
      horizontal.ts
      vertical.ts
      frame.ts
    station/
      stationRules.ts
    grid/
      gridGeneration.ts
    pipeline/
      sourceRevision.ts
      pipeline.ts
    __tests__/
      line.test.ts
      arc.test.ts
      clothoid.test.ts
      vertical.test.ts
      station.test.ts
      grid.test.ts
      sourceRevision.test.ts
  mapper/
    types.ts
    frameIds.ts
    frameMappingPreview.ts
    __tests__/
      frameIds.test.ts
examples/liner/
  gc-01-domain.json
  gc-01-intermediate.expected.json
  gc-02-domain.json
  gc-02-intermediate.expected.json
  gc-06-domain.json
  gc-06-intermediate.expected.json
```

Reasoning:

- `frontend/src/liner/` matches the documented TypeScript-only MVP boundary.
- `core` has no React, no HTTP, no file I/O, no Three.js, and no existing app state dependency.
- `mapper` can initially contain only ID and preview mapping helpers, not full project merge behavior.
- `examples/liner/` is consistent with the design documents' fixture path and keeps golden data outside source modules.

## 7. Module Responsibility Map

| Module | Responsibility | Forbidden dependencies |
| --- | --- | --- |
| `core/types.ts` | Domain and intermediate TypeScript contracts | React, API client, schema mutation |
| `core/tolerances.ts` | Numeric tolerances from design docs | UI formatting |
| `core/diagnostics.ts` | `LINER_*` diagnostic codes and result helpers | Japanese labels |
| `core/vector.ts` | Vec2/Vec3 math helpers | External mutable state |
| `core/geometry/*` | Line, arc, clothoid, vertical profile, local frame | FEM schema, UI, file I/O |
| `core/station/*` | Physical/displayed station mapping | Label formatting |
| `core/grid/*` | Grid point generation and provenance | Member creation side effects |
| `core/pipeline/*` | Deterministic orchestration and source revision | Backend calls |
| `mapper/frameIds.ts` | Namespaced generated ID helpers | Project merge |
| `mapper/frameMappingPreview.ts` | Optional pure preview output for tests | Persisted project mutation |

## 8. Data Model Implementation Plan

1. Define minimal `Vec3`, `LocalFrame`, `ComputationDiagnostic`, `StationTableEntry`, `AlignmentSamplePoint`, `ProfileSamplePoint`, `GridPointResult`, `GridLineResult`, `GridCellResult`, `GridResult`, and `LinerIntermediateResult`.
2. Keep field names aligned with `intermediate_result_model.md`.
3. Use English camelCase keys only.
4. Store numeric station values only; do not store formatted station labels.
5. Include `sourceRevision`, `linerModelId`, `schemaVersion`, `diagnostics`, and provenance fields from the start.
6. Keep type definitions independent from existing `Project` app types except where a mapper preview type needs node/member-like shapes.

## 9. Geometry Core Implementation Plan

1. Implement vector normalization, angle normalization, and local frame creation.
2. Implement line point evaluation by physical distance.
3. Implement circular arc point evaluation using signed curvature convention: positive left, negative right.
4. Implement clothoid as a minimal deterministic function:
   - standard straight-to-curve clothoid with Fresnel-series approximation;
   - generalized finite-radius transition using Simpson integration;
   - explicit tolerances and diagnostics when inputs are invalid.
5. Implement vertical profile evaluation for grade and parabolic curves.
6. Keep inverse projection limited in Phase 0 unless tests require it for GC-04/GC-07.

## 10. Station Generation Implementation Plan

1. Use physical distance as the authoritative geometry parameter.
2. Implement default displayed station mapping with origin and forward direction.
3. Implement `add_constant` and `reset_to_value` station equations.
4. Preserve duplicate displayed stations using `entryId` and `sortIndex`.
5. Keep station label formatting out of core modules.
6. Test GC-04 exactly.

## 11. Grid / Node / Member Preparation Plan

1. Generate grid points from longitudinal physical distances and transverse offsets.
2. Store local frame, roles, labels, source, and z provenance on each grid point.
3. Generate grid lines and grid cells where enough points exist.
4. Add ID helper functions for future node/member IDs:
   - `GP-{linerModelId}-{li}-{ti}`
   - `N_LINER_{linerModelId}_{li}_{ti}`
   - `M_LINER_{linerModelId}_{direction}_{li}_{ti}`
5. Do not merge generated entities into the existing project.
6. Do not write `linerTrace` into persisted `project.json` during Phase 0.

## 12. Error / Validation / Tolerance Plan

1. Define diagnostic levels: `info`, `warning`, `error`.
2. Define the initial code catalog from `error_handling.md`.
3. Implement validation helpers for:
   - zero-length line/arc/clothoid;
   - invalid radius or clothoid parameter;
   - station out of range;
   - invalid grid spacing;
   - missing material/section only as a mapper-preview diagnostic, not project validation.
4. Use numeric tolerance constants from `test_plan_geometry.md` and `numerical_accuracy.md`.
5. Return result objects with `diagnostics[]`; do not throw for normal validation failures.

## 13. Test Plan

Phase 0 tests should run under frontend Vitest.

Required tests:

- GC-01 straight segment.
- GC-02 circular arc.
- GC-03 line-arc compound continuity.
- GC-04 station equation behavior.
- GC-05 vertical parabolic curve.
- GC-06 3x3 grid and local frame.
- GC-07 45-degree offset direction.
- GC-08 through GC-10 clothoid tests with clearly documented independent-reference expected values.
- Diagnostic tests for invalid input.
- `sourceRevision` canonicalization tests.
- ID helper tests for generated grid/node/member IDs.

Recommended commands:

```bash
cd frontend
npm run test -- --runInBand
npm run typecheck
npm run lint
npm run build
```

If Vitest does not support `--runInBand` in this version, run `npm run test` without that flag.

## 14. Fixtures Plan

Create fixture files during Phase 0 implementation:

```text
examples/liner/gc-01-domain.json
examples/liner/gc-01-intermediate.expected.json
examples/liner/gc-02-domain.json
examples/liner/gc-02-intermediate.expected.json
examples/liner/gc-03-domain.json
examples/liner/gc-03-intermediate.expected.json
examples/liner/gc-04-domain.json
examples/liner/gc-04-intermediate.expected.json
examples/liner/gc-05-domain.json
examples/liner/gc-05-intermediate.expected.json
examples/liner/gc-06-domain.json
examples/liner/gc-06-intermediate.expected.json
examples/liner/gc-07-domain.json
examples/liner/gc-07-intermediate.expected.json
```

Clothoid fixtures may be added as:

```text
examples/liner/gc-08-domain.json
examples/liner/gc-08-intermediate.expected.json
examples/liner/gc-09-domain.json
examples/liner/gc-09-intermediate.expected.json
examples/liner/gc-10-domain.json
examples/liner/gc-10-intermediate.expected.json
```

Fixture rules:

- English keys only.
- No copied third-party labels, report wording, or file formats.
- Expected values should be numeric and deterministic.
- Do not include user-facing Japanese strings.

## 15. Compatibility and Originality Guardrails

Compatibility:

- Do not change existing schema keys or persisted data fields.
- Do not add `liner` or `linerTrace` to `project.schema.json` in Phase 0.
- Do not change existing bridge wizard behavior.
- Do not change existing app routes, UI, or backend APIs.
- Keep the module importable by tests without starting Vite or FastAPI.

Originality:

- Implement algorithms and data models from the project design docs only.
- Do not copy JIP-LINER UI text, report wording, file extensions, proprietary files, or screen structure.
- Use original JSON fixture shapes.
- Keep internal docs, identifiers, comments, and commit messages in English.
- If UI text is ever touched in a later phase, Japanese labels must be defined through i18n files, not hard-coded in React.

## 16. Implementation Order

1. Create `frontend/src/liner/core` and minimal shared types.
2. Add tolerances and diagnostic code constants.
3. Add vector/local-frame helpers.
4. Implement line and arc evaluation with GC-01 through GC-03 tests.
5. Implement vertical profile with GC-05 tests.
6. Implement station table mapping with GC-04 tests.
7. Implement grid generation with GC-06 and GC-07 tests.
8. Implement deterministic `sourceRevision` canonicalization tests.
9. Implement minimal clothoid functions and GC-08 through GC-10 tests.
10. Add ID helpers in `frontend/src/liner/mapper` without project merge behavior.
11. Run frontend test/typecheck/lint/build.

## 17. Cursor Delegation Recommendation

Cursor CLI can be used for Phase 0 implementation if the prompt is tightly scoped and explicitly forbids UI, schema, output, GitHub push, and main merge work.

Recommended delegation style:

- Use one implementation pass for types, core functions, fixtures, and tests.
- Require changed-file summary and validation commands.
- Require no source changes outside:
  - `frontend/src/liner/`
  - `examples/liner/`
  - test-only files directly under those paths
- Prohibit package dependency changes.
- Prohibit `schemas/project.schema.json` changes.
- Prohibit `frontend/src/i18n/*` changes because UI is out of scope.

## 18. Phase 0 Implementation Prompt Draft

```text
You are implementing Phase 0 of the liner feature.

Implement only an isolated TypeScript calculation module for the Linear Coordinate Calculation System.

Read these documents first:
- docs/liner/phase0_implementation_gate.md
- docs/liner/intermediate_result_model.md
- docs/liner/geometry_core.md
- docs/liner/station_rules.md
- docs/liner/test_plan_geometry.md
- docs/liner/frame_model_mapping.md
- docs/liner/error_handling.md
- docs/liner/validation_rules.md

Implementation target:
- Add isolated TypeScript modules under frontend/src/liner/.
- Add golden fixtures under examples/liner/.
- Implement domain/intermediate result types, diagnostics, tolerances, vector helpers, line/arc/clothoid geometry, vertical profile evaluation, station generation, grid point generation, sourceRevision canonicalization, and generated ID helpers.
- Add Vitest tests for GC-01 through GC-07.
- Add clothoid tests for GC-08 through GC-10 using deterministic independent-reference numeric expected values.
- Keep all logic pure. No React, no HTTP, no file I/O in core modules.

Implementation forbidden:
- Do not implement UI or React components.
- Do not modify i18n files.
- Do not implement PDF, CSV, SVG, DXF, glTF, or 3D output.
- Do not connect to the analysis engine.
- Do not modify schemas/project.schema.json.
- Do not modify existing project persistence format.
- Do not alter existing bridge wizard behavior.
- Do not add package dependencies.
- Do not copy JIP-LINER UI text, report wording, file extensions, proprietary file formats, or screen/manual structure.
- Do not push to GitHub, do not merge to main, and do not create a release.

Allowed file ranges:
- frontend/src/liner/**
- examples/liner/**
- Existing frontend test configuration only if absolutely required, but prefer no config changes.

Source language rules:
- Source code identifiers, comments, internal design docs, and commit messages must be English.
- Do not hard-code Japanese UI strings anywhere.
- JSON schema keys, API field names, persisted data fields, and existing project data must remain backward-compatible.

Required tests and checks:
- Run frontend Vitest for the new liner tests.
- Run npm run typecheck in frontend.
- Run npm run lint in frontend.
- Run npm run build in frontend if feasible.

Completion output:
- List changed files.
- List tests/checks run and their result.
- State clearly that no UI, schema, output, GitHub push, or main merge was performed.
```

## 19. Final Recommendation

Proceed to Phase 0 implementation only under the constraints above.

Do not start full product implementation yet. The next approved work should prove the pure geometry and intermediate-model foundation with tests and fixtures. After Phase 0 passes, a separate gate should decide whether to proceed to schema extension and frame model merge work.
