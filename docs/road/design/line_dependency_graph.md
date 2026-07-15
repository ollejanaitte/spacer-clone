# Line Dependency Graph

<!-- DOC-AUTHORITY:START -->
> **Authority:** ACTIVE REFERENCE
> Current implementation facts are governed by [`../../scoping/stage4_road_design_scope.md`](../../scoping/stage4_road_design_scope.md). Target ownership and contracts are governed by [`../../planning/stage6-10/README.md`](../../planning/stage6-10/README.md); `RoadDesignDocument` is the target road source of truth.
<!-- DOC-AUTHORITY:END -->

## Purpose

Define the typed directed dependency graph among liner domain entities and computed subtrees to enable efficient invalidation, partial recalculation, cycle detection, and auditability.

This document is the **source of truth** for invalidation topology; recalculation behavior is in [recalculation_policy.md](recalculation_policy.md).

## Scope

- Graph node kinds and edges.
- Mapping from entity changes to intermediate result subtrees and frame outputs.
- Topological order for calculation pipeline stages.
- Circular dependency detection.
- Invalidation propagation examples.

## Out of Scope

- Implementation of reactive state library ([state_management.md](../ui/state_management.md)).
- UI event wiring.

## Assumptions

- Domain graph is acyclic under normal editing.
- Dependency metadata is declarative (config or generated from schema).
- Snapshot of active graph stored in `LinerIntermediateResult.dependencyGraph` for debugging.

## Design Topics

### 1. Node kinds

| Kind | Examples |
| --- | --- |
| `domain.*` | `HorizontalSegment`, `VerticalSegment`, `StationEquation`, `GridDefinition`, `CrossSectionTemplate`, `Pier`, `Span`, `GenerationSettings` |
| `computed.*` | `horizontal`, `vertical`, `stations`, `grid`, `sections`, `spans`, `piers`, `frameHints` |
| `output.*` | `frameModel`, `cadExport`, `reportExport` |

### 2. Core edges (invalidation)

```text
HorizontalSegment ──► horizontal ──► stations ──► grid ──► frameModel
StationEquation ──► stations ──► grid (displayed labels only for XY)
VerticalSegment ──► vertical ──► grid ──► frameModel
GridDefinition ──► grid ──► frameModel
CrossSectionTemplate ──► grid, sections
Pier / Span ──► piers, spans, grid, frameHints ──► frameModel
GenerationSettings ──► frameHints ──► frameModel (no geometry change)
ParallelLineRef ──► horizontal (derived) ──► … (same as base)
```

### 3. Invalidation examples

| Edit | Invalidated computed nodes | Frame model |
| --- | --- | --- |
| Base alignment segment | horizontal, stations, grid, sections | Yes — full regen |
| Profile grade change | vertical, grid (Z only paths) | Yes — node Z, not XY |
| Station equation | stations, grid metadata | Yes if supports use displayed station labels |
| Grid spacing only | grid, frameHints | Yes |
| Material ID in settings | frameHints only | Yes — member props only |
| Cross-section depth offset | grid Z provenance, sections | Yes — node Z |

**Partial recompute (MVP):** Full grid recompute acceptable; post-MVP may invalidate station ranges only.

### 4. Topological compute order

Matches [calculation_pipeline.md](calculation_pipeline.md):

```text
validateDomain → horizontal → stations → vertical → grid (+ spans/piers) → sections → assemble → [mapToFrameModel]
```

### 5. Cycle detection

- Domain references (e.g., parallel line referencing parent) validated acyclically on save.
- Error `LINER_SCHEMA_INVALID` if cycle detected.

### 6. Dependency snapshot

```ts
type DependencySnapshot = {
  nodes: { id: string; kind: string }[];
  edges: { from: string; to: string }[];
  invalidatedAt?: string;
};
```

Included in intermediate result for audit and debug visualization.

### 7. Batch edits

Multiple domain edits in one transaction → single invalidation union → one pipeline pass ([recalculation_policy.md](recalculation_policy.md)).

## Open Questions

- Fine-grained grid invalidation by station range in post-MVP?

## Related Documents

- [recalculation_policy.md](recalculation_policy.md)
- [calculation_pipeline.md](calculation_pipeline.md)
- [intermediate_result_model.md](intermediate_result_model.md)
- [state_management.md](../ui/state_management.md)
- [domain_model.md](domain_model.md)

## Pre-Implementation Checklist

- [x] Dependency matrix entity × subtree documented.
- [x] Topological compute order documented.
- [x] Cycle detection strategy defined.
- [x] Invalidation examples recorded.
- [ ] Partial invalidation scope: full grid recompute for MVP.
