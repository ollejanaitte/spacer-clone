# Phase 5 Design Document

**Date:** 2026-07-22
**Status:** AUTHORITATIVE
**Phase:** Road Formal Drawing Completion and JIP-LINER Parity

## Design Goal

Phase 5 turns the existing formal drawing implementation into an official Road output surface with traceable JIP-LINER §8 parity decisions, deterministic runtime drawing generation, and preview/print/DXF parity.

It does not reimplement Phase 4 calculations. It consumes Phase 4 road intermediate results.

## Data Flow

```text
RoadDesignDocument
  -> LinerDomainDraftVNext
  -> CanonicalLinerIntermediateResult
  -> DrawingSettings
  -> runtime DrawingDocument
  -> preview / print / DXF
```

Rules:

- `RoadDesignDocument` is the save target.
- `DrawingSettings` may persist inside the road design payload/extension path.
- `DrawingDocument` is rebuilt at runtime and is not persisted.
- DXF export reads `DrawingDocument`; it does not recompute road geometry.

## Drawing Responsibilities

| Surface | Responsibility |
| --- | --- |
| Plan Type A | Road shape drawing with linework, station labels, bridge/span references, dimensions where supported. |
| Plan Type B | Centerline/coordinate-table-oriented drawing for coordinate inspection and DXF export. |
| Profile | Profile geometry, grid/axis, station alignment, band rows, and unavailable ground indicator. |
| Cross-section | Station-selected cross-section, offset lines, crossfall/template Z behavior, and centerline marker. |
| Coordinate table | Deterministic table from available XY/Z and computed result columns. |
| Dimensions | Supported line-to-line and section-to-section dimensions from active span/alignment. |
| Skew angle | Supported angle annotation at selected section-line intersections. |
| DXF | Same semantic entities as preview/print where exportable; no UI zoom/pan transform. |

## JIP §8 Adoption Shape

P5 adopts:

- Drawing settings: paper, scale, text size, frame, coordinate axis, dimension formatting.
- Span composition where current bridge/span data exists.
- Line and section visibility/style/extension semantics as supported drawing options.
- Coordinate table precision and available item count policy.
- Line/section dimensions and skew-angle drawing as MVP formal primitives.

P5 rejects or defers:

- Product-specific syntax, command labels, old file flows, and copied examples.
- Full lane composition editor.
- Small-coordinate conversion unless already represented by current geometry.
- Regional CAD standards.

## Validation

Validation is layered:

1. Road input validation and Phase 4 pipeline diagnostics.
2. Drawing builder diagnostics.
3. `DrawingDocument` validation.
4. DXF document validation.
5. E2E export/download and visual acceptance evidence.

Any error-level diagnostic blocks the affected formal drawing COMPLETE claim.

## Persistence and Migration

Persist:

- Drawing settings required to regenerate the selected formal drawing state.

Do not persist:

- `DrawingDocument`.
- Preview/print/DXF artifacts.
- Stale derived drawing results.

Migration:

- Existing legacy scalar cross-slope compatibility remains read-old behavior.
- No schemaVersion bump is permitted in P5 without a separate approval document.

## UI Boundary

The Formal Drawing workspace is the primary Phase 5 UI. Setup review remains Bridge Layout and must not become the formal drawing editor. Preview may link to Formal Drawing as a secondary entry.

## Verification Design

P5-D01 creates the executable evidence matrix. P5-D02/D03 add or repair feature tests. P5-D04 proves save/load and fail-closed behavior. P5-D05 runs the final local validation suite and records evidence.

```
PHASE5_DESIGN_VERDICT: APPROVED
```
