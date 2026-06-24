# Calculation Pipeline

## Purpose

Define the ordered stages that transform validated domain input into `LinerIntermediateResult`, and optional downstream mapped outputs.

## Scope

- Pipeline stages, inputs, outputs, and error propagation.
- Validation gate before compute.
- Single-pass execution (MVP).
- Public entry points for UI and export modules.
- `sourceRevision` canonicalization.
- MVP execution boundary (TypeScript frontend only).

## Out of Scope

- Individual algorithm details ([geometry_core.md](geometry_core.md)).
- Async scheduling and worker threads ([performance_architecture.md](performance_architecture.md)).
- Backend geometry execution in MVP.

## Assumptions

- Pipeline is pure aside from diagnostic accumulation.
- Invalid domain input aborts before mutating cached results.
- Each stage reads only prior stage outputs and domain slices.
- **MVP:** TypeScript-only in frontend; mapper also TypeScript; backend validates project schema only.

## Design Topics

### 1. Stage order

```text
1. validateDomain(input) → ValidationResult
2. resolveHorizontal(alignment) → HorizontalGeometryResult
3. buildStationTable(horizontal, equations) → StationTableResult
4. resolveVertical(profile, stationTable) → VerticalGeometryResult
5. generateGrid(horizontal, vertical, gridDefs, sections, spans, piers) → GridResult + SpanResult[] + PierResult[]
6. buildFrameHints(generationSettings, grid) → FrameGenerationHintResult
7. buildSections(optional) → SectionSliceResult[]
8. buildDependencySnapshot(...) → DependencySnapshot
9. assembleIntermediateResult(...) → LinerIntermediateResult
10. mapToFrameModel(...) → FrameModelMappingOutput  [on user action only]
```

Stage failure: abort with diagnostics; retain previous snapshot per [recalculation_policy.md](recalculation_policy.md).

### 2. sourceRevision canonicalization

Computed at stage 0 from domain input:

```text
sourceRevision = SHA-256( canonicalJson(domain) )
```

Rules ([intermediate_result_model.md](intermediate_result_model.md) §12):

- UTF-8, lexicographic key sort, no whitespace, exclude computed/cache fields.

### 3. Public API

```ts
function runPipeline(domain: LinerProject): PipelineResult;
function runMapper(intermediate: LinerIntermediateResult, settings: GenerationSettings, project?: ProjectJson): FrameModelMappingOutput;
```

Both exported from `liner-core` package; no HTTP or React imports.

### 4. Re-sampling policy

Changing polyline sample spacing or grid density requires re-running affected stages (2–5). Export/render modules must not invoke geometry routines directly.

### 5. Progress reporting (optional)

Post-MVP: async generator yielding stage ids for progress UI.

## Open Questions

- Shared pipeline between frontend and backend? **Deferred; TS-only MVP.**

## Related Documents

- [geometry_core.md](geometry_core.md)
- [intermediate_result_model.md](intermediate_result_model.md)
- [recalculation_policy.md](recalculation_policy.md)
- [line_dependency_graph.md](line_dependency_graph.md)
- [frame_model_mapping.md](frame_model_mapping.md)
- [integration_with_frame_model.md](integration_with_frame_model.md)
- [performance_architecture.md](performance_architecture.md)

## Pre-Implementation Checklist

- [x] Stage list frozen with I/O types.
- [x] Validation gate criteria linked to validation_rules.
- [x] sourceRevision rules documented.
- [x] MVP TypeScript-only boundary documented.
- [ ] Integration test covers full pipeline on GC-06.
