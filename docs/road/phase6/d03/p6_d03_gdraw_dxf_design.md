# P6-D03 GDRAW / DXF Design

**Date:** 2026-07-23
**Status:** FINAL_FOR_PR39_START
**Maps to:** PR-39 Road GDRAW completeness

## Purpose

Finalize Road GDRAW and DXF design before coding.

## Resolved Design Decisions

| Decision | Resolution |
| --- | --- |
| Dimension primitive shape | Use existing first-class `DrawingDimension`; do not add a new primitive kind |
| Dimension auto-creation | Enabled by deterministic settings with explicit off switch if UI exists |
| DXF layers | Extend common-preset layers for dimensions, curve annotations, profile vertical curves, crossfall, and Road structure markers |
| Bridge marker ownership | Road GDRAW shows Road/bridge layout markers; Frame DRAFT owns analysis/load/result sheets |
| Skew angle | Use existing Road pier skew data where available; defer standalone section-line skew if source data is insufficient |

## PR-39 Split

```text
PR39_SPLIT_DECISION: ACCEPTED
PR-39A: builder annotations, crossfall, vertical curve, coordinate table, DXF layer presets
PR-39B: dimensions, section dimensions, dimension tests
PR-39C: Road-owned bridge / structure marker completion
```

## Implementation Boundaries

- `RoadDesignDocument` and intermediate result are source truth.
- `DrawingSettings` may persist, but `DrawingDocument` must not.
- DXF maps from `DrawingDocument`; it must not recompute Road geometry.
- Unsupported branch/merge or missing geometry emits diagnostics.

## Test Targets

- `formalBuilders.test.ts`
- `phase5Jip8DrawingSemantics.test.ts`
- dimension unit tests
- `previewDxfPrintParity.test.ts`
- DXF mapper/validation tests
- drawing workspace E2E

```text
P6_D03_READY_FOR_PR39A_IMPLEMENTATION: YES
```
