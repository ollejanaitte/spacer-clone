# Validation Rules

<!-- DOC-AUTHORITY:START -->
> **Authority:** ACTIVE REFERENCE
> Current implementation facts are governed by [`../../scoping/stage4_road_design_scope.md`](../../scoping/stage4_road_design_scope.md). Target ownership and contracts are governed by [`../../planning/stage6-10/README.md`](../../planning/stage6-10/README.md); `RoadDesignDocument` is the target road source of truth.
<!-- DOC-AUTHORITY:END -->

## Purpose

Define domain-level validation rules applied before and during editing, prior to calculation pipeline execution. Each rule maps to a diagnostic code in [error_handling.md](error_handling.md).

## Scope

- Field constraints per entity in [domain_model.md](domain_model.md).
- Cross-entity rules (continuity, coverage, reference integrity).
- Validation timing: on blur, on save, pre-compute.
- Clothoid and station equation constraints.

## Out of Scope

- JSON Schema syntax (implementation artifact).
- Frame model schema validation post-mapping ([integration_with_frame_model.md](../legacy-integration/integration_with_frame_model.md)).

## Assumptions

- Validation is pure function on domain state.
- Warnings do not block compute unless strict mode enabled.
- Same validator used for UI and pre-compute gate.

## Design Topics

### 1. Validation timing

| Trigger | Rules run | On error |
| --- | --- | --- |
| Field blur | Single-field + immediate cross-field | Inline message; no recompute |
| Save project | Full domain validation | Block save if error-level |
| Pre-compute | Full domain validation | Block pipeline; retain last good result |
| Pre frame-generate | Intermediate + mapper checks | Block merge |

**Stale results:** After validation error on edit, UI shows stale badge; export and frame generate disabled until successful recompute.

### 2. Rule table (MVP)

| Entity / rule | Condition | Level | Code |
| --- | --- | --- | --- |
| Line segment | length > 0 | error | `LINER_GEOM_ZERO_LENGTH_SEGMENT` |
| Arc segment | radius > 0 | error | `LINER_GEOM_CLOTHOID_INVALID_RADIUS` |
| Arc segment | length > 0 | error | `LINER_GEOM_ZERO_LENGTH_SEGMENT` |
| Clothoid | A > 0, L > 0 | error | `LINER_GEOM_CLOTHOID_INVALID_RADIUS` |
| Clothoid | R ≥ R_min | error | `LINER_GEOM_CLOTHOID_INVALID_RADIUS` |
| Segment chain | position/azimuth continuity | error | `LINER_GEOM_*_DISCONTINUITY` |
| Vertical segment | no overlapping ranges | error | `LINER_PROFILE_OVERLAP` |
| Vertical grade | \|g\| ≤ limit | warning | `LINER_PROFILE_GRADE_EXCEEDS_LIMIT` |
| Grid definition | spacing > 0 | error | `LINER_GRID_SPACING_INVALID` |
| Grid definition | range within alignment length | error | `LINER_STATION_OUT_OF_RANGE` |
| Station equation | unique sortIndex at physical distance | warning | `LINER_STATION_DUPLICATE_EQUATION` |
| Generation settings | materialId/sectionId exist in project | error | `LINER_FRAME_MISSING_SECTION` |
| Grid reference | valid alignment id | error | `LINER_SCHEMA_INVALID` |

### 3. Strict mode (optional)

When enabled, warnings block compute and export.

## Open Questions

- Auto-fix suggestions (snap station to segment end)?

## Related Documents

- [domain_model.md](domain_model.md)
- [station_rules.md](station_rules.md)
- [profile_rules.md](profile_rules.md)
- [geometry_core.md](geometry_core.md)
- [error_handling.md](error_handling.md)
- [input_ui_behavior.md](../ui/input_ui_behavior.md)
- [calculation_pipeline.md](calculation_pipeline.md)

## Pre-Implementation Checklist

- [x] Rule table per entity type started with error codes.
- [x] Validation timing documented.
- [ ] Unit tests for validation module planned.
- [ ] Pre-compute gate uses same validator as UI.
