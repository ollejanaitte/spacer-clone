# Phase 0 Implementation Summary

## Implemented Scope

- Added an isolated TypeScript liner module under `frontend/src/liner/`.
- Added core types for alignments, stations, intermediate results, diagnostics, grid points, node candidates, and member candidates.
- Added pure geometry helpers for straight lines, circular arcs, Phase 0 clothoid approximation, local frames, offsets, and vertical profile evaluation.
- Added station generation with interval, explicit station, duplicate handling, sorting, IDs, and provenance-ready fields.
- Added intermediate result builder with source revision, validation issues, grid points, node candidates, and member candidates.
- Added frame mapping preparation helpers for future node/member IDs without connecting to `project.json`.
- Added Vitest tests and minimal examples under `examples/liner/`.

## Current Phase Boundary

| Area | Phase 0 status | Phase 1 expectation |
| --- | --- | --- |
| Core module | Implemented as isolated TypeScript | Converge public result shape to [intermediate_result_model.md](intermediate_result_model.md) |
| Intermediate result | Reduced Phase 0 shape with `gridPoints`, `nodeCandidates`, `memberCandidates`, and `issues` | Canonical `vertical`, wrapped `stations`, `grid`, `spans`, `piers`, `frameHints`, `sections`, `diagnostics`, and `dependencyGraph` |
| Frame mapping | Preparation IDs/helpers only | Pure mapper from canonical intermediate result to nodes/members/supports plus traceability |
| Schema / persistence | Not implemented | Additive schema extension and migration tests |
| UI / output | Not implemented | Remain deferred unless a later phase explicitly scopes them |

## Explicitly Not Implemented

- No React UI.
- No i18n changes.
- No PDF, CSV, SVG, DXF, or glTF output.
- No schema changes.
- No backend or analysis-engine connection.
- No direct main-branch merge work recorded by this summary.

## Verification Boundary

This file records the Phase 0 implementation scope that was reported at the implementation gate. A later documentation-only edit may clarify this status, but it must not imply that local commands were re-run.

Local lint, typecheck, test, build, schema validation, and headless analysis checks remain **requires local verification** unless a task explicitly records that those commands were executed in the implementation environment.

## Next Gate

Before Phase 1 implementation is considered complete, decide the `project.schema.json` extension strategy for `liner` and `linerTrace`, replace or verify the clothoid Phase 0 approximation with independent numeric references, and retire the temporary Phase 0 intermediate-result shape in favor of the canonical design contract.
