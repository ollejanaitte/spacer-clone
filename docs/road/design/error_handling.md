# Error Handling

<!-- DOC-AUTHORITY:START -->
> **Authority:** ACTIVE REFERENCE
> Current implementation facts are governed by [`../../scoping/stage4_road_design_scope.md`](../../scoping/stage4_road_design_scope.md). Target ownership and contracts are governed by [`../../planning/stage6-10/README.md`](../../planning/stage6-10/README.md); `RoadDesignDocument` is the target road source of truth.
<!-- DOC-AUTHORITY:END -->

## Purpose

Define error taxonomy, propagation from calculation core through UI and export, user-facing message policy, and the **diagnostic code catalog** for liner.

## Scope

- Validation errors (domain input).
- Computation errors (geometry failure).
- Mapping errors (frame model generation).
- I/O and schema errors.
- Recovery behavior (retain last good state).

## Out of Scope

- Analysis engine runtime errors.
- Network errors unrelated to liner.

## Assumptions

- User-facing text is Japanese via i18n; error codes are English `LINER_*` identifiers.
- Non-recoverable errors block export; warnings allow export with acknowledgment.
- Each validation rule maps to exactly one code and one i18n key.

## Design Topics

### 1. Error code namespace

Format: `LINER_{DOMAIN}_{DESCRIPTION}`

| Domain prefix | Examples |
| --- | --- |
| `LINER_GEOM_` | Geometry computation |
| `LINER_STATION_` | Station equations and queries |
| `LINER_PROFILE_` | Vertical alignment |
| `LINER_GRID_` | Grid generation |
| `LINER_FRAME_` | Frame model mapping |
| `LINER_SCHEMA_` | JSON schema / project validation |
| `LINER_IO_` | File I/O |

### 2. Diagnostic code catalog (MVP)

| Code | Level | i18n key (example) | Blocks compute | Blocks save | Blocks export |
| --- | --- | --- | --- | --- | --- |
| `LINER_GEOM_ZERO_LENGTH_SEGMENT` | error | `liner.errors.geom_zero_length` | Yes | No | Yes |
| `LINER_GEOM_POSITION_DISCONTINUITY` | error | `liner.errors.geom_position_gap` | Yes | No | Yes |
| `LINER_GEOM_AZIMUTH_DISCONTINUITY` | error | `liner.errors.geom_azimuth_gap` | Yes | No | Yes |
| `LINER_GEOM_CLOTHOID_INVALID_RADIUS` | error | `liner.errors.geom_clothoid_radius` | Yes | No | Yes |
| `LINER_GEOM_CLOTHOID_ACCURACY_EXCEEDED` | error | `liner.errors.geom_clothoid_accuracy` | Yes | No | Yes |
| `LINER_GEOM_CLOTHOID_LONG_SPIRAL` | warning | `liner.errors.geom_clothoid_long` | No | No | No |
| `LINER_GEOM_INVERSE_PROJECTION_FAILED` | error | `liner.errors.geom_inverse_failed` | Yes | No | Yes |
| `LINER_STATION_DUPLICATE_EQUATION` | warning | `liner.errors.station_duplicate` | No | No | No |
| `LINER_STATION_OUT_OF_RANGE` | error | `liner.errors.station_range` | Yes | No | Yes |
| `LINER_PROFILE_ELEVATION_DISCONTINUITY` | error | `liner.errors.profile_elevation_gap` | Yes | No | Yes |
| `LINER_PROFILE_GRADE_DISCONTINUITY` | error | `liner.errors.profile_grade_gap` | Yes | No | Yes |
| `LINER_PROFILE_COVERAGE_GAP` | error | `liner.errors.profile_coverage_gap` | Yes | No | Yes |
| `LINER_PROFILE_ADJACENCY_GAP` | error | `liner.errors.profile_adjacency_gap` | Yes | No | Yes |
| `LINER_PROFILE_END_COVERAGE_GAP` | warning | `liner.errors.profile_end_coverage_gap` | No | No | No |
| `LINER_GRID_SPACING_INVALID` | error | `liner.errors.grid_spacing` | Yes | No | Yes |
| `LINER_FRAME_MISSING_NODE` | error | `liner.errors.frame_missing_node` | N/A | N/A | Yes |
| `LINER_FRAME_MISSING_SECTION` | error | `liner.errors.frame_missing_section` | N/A | N/A | Yes |
| `LINER_FRAME_ZERO_LENGTH_MEMBER` | warning | `liner.errors.frame_zero_member` | N/A | N/A | No |
| `LINER_FRAME_DISCONNECTED` | warning | `liner.errors.frame_disconnected` | N/A | N/A | No |
| `LINER_FRAME_DUPLICATE_ID` | error | `liner.errors.frame_duplicate_id` | N/A | N/A | Yes |
| `LINER_FRAME_SCHEMA_INVALID` | error | `liner.errors.frame_schema` | N/A | N/A | Yes |
| `LINER_SPAN_END_EXCEEDS_ALIGNMENT` | error | `liner.errors.span_end_exceeds_alignment` | Yes | No | Yes |
| `LINER_ORIGIN_STATION_AMBIGUOUS` | error | `liner.errors.origin_station_ambiguous` | Yes | No | Yes |
| `LINER_PROFILE_PARABOLIC_Z_MERGE_DEFERRED` | warning | `liner.errors.profile_parabolic_z_merge_deferred` | No | No | No |
| `LINER_CROSSFALL_INTERVAL_OVERLAP` | error | `liner.errors.crossfall_interval_overlap` | Yes | No | Yes |
| `LINER_CROSSFALL_PIVOT_CHANGE_UNSUPPORTED` | error | `liner.errors.crossfall_pivot_change_unsupported` | Yes | No | Yes |
| `LINER_CROSSFALL_MEASURED_GRID_PRECEDENCE` | warning | `liner.errors.crossfall_measured_grid_precedence` | No | No | No |
| `LINER_SCHEMA_INVALID` | error | `liner.errors.schema_invalid` | No | Yes | Yes |
| `LINER_IO_CORRUPT_FILE` | error | `liner.errors.io_corrupt` | Yes | Yes | Yes |
| `LINER_IO_VERSION_MISMATCH` | error | `liner.errors.io_version` | Yes | Yes | Yes |

Rules in [validation_rules.md](validation_rules.md) reference these codes.

P1-D03 implementation note: core diagnostics use `createIssue()` to attach the
stable `liner.errors.*` key for every `LinerDiagnosticCode`. Call sites may still
provide an explicit `messageKey`, which is preserved for compatibility.

### 3. Diagnostic shape

Per [intermediate_result_model.md](intermediate_result_model.md):

- `entityPath` for nested fields (e.g., `alignments[0].segments[2].radius`).
- `entityId` for top-level entity id.
- `physicalDistance` and `displayedStation` when relevant.

### 4. Propagation pattern

**Chosen:** Result type with `diagnostics[]` array; no thrown exceptions across pipeline stages. Stages append diagnostics and abort on first `error` if configured.

### 5. UI behavior by severity

| Level | UI | Export | Frame generate |
| --- | --- | --- | --- |
| info | Diagnostics panel | Allowed | Allowed |
| warning | Panel + optional toast | Allowed with indicator | Allowed with confirmation |
| error | Panel + block action | Blocked | Blocked |

Stale intermediate results after edit introduces error: show last good snapshot with **stale overlay**; disable export until recompute succeeds ([recalculation_policy.md](recalculation_policy.md)).

### 6. Recovery

- Retain last successful `LinerIntermediateResult` on failed recompute.
- Domain edits always preserved; user fixes validation errors and retries.

## Open Questions

- Centralized JSON catalog file for codes (implementation artifact)?
- Retry button for transient I/O only?

## Related Documents

- [validation_rules.md](validation_rules.md)
- [intermediate_result_model.md](intermediate_result_model.md)
- [logging_and_debug.md](logging_and_debug.md)
- [input_ui_behavior.md](../ui/input_ui_behavior.md)
- [recalculation_policy.md](recalculation_policy.md)
- [docs/development/language-policy.md](../../development/language-policy.md)

## Pre-Implementation Checklist

- [x] Error code naming convention documented.
- [x] MVP catalog started with geometry, station, frame codes.
- [x] Severity → UI behavior matrix complete.
- [ ] i18n message keys authored in locale files.
- [ ] Last-good-state policy aligned with recalculation policy.
