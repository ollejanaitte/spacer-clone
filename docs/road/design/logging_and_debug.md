# Logging and Debug

<!-- DOC-AUTHORITY:START -->
> **Authority:** ACTIVE REFERENCE
> Current implementation facts are governed by [`../../scoping/stage4_road_design_scope.md`](../../scoping/stage4_road_design_scope.md). Target ownership and contracts are governed by [`../../planning/stage6-10/README.md`](../../planning/stage6-10/README.md); `RoadDesignDocument` is the target road source of truth.
<!-- DOC-AUTHORITY:END -->

**Status: Draft** — not implementation-ready; diagnostic codes are defined in [error_handling.md](error_handling.md).

## Purpose

Define logging levels, diagnostic output, and developer tooling for the liner calculation pipeline and UI.

## Scope

- Structured logs for pipeline stages.
- Diagnostic codes in intermediate results.
- Debug overlays (station ticks, segment ids, normals).
- Optional export of intermediate JSON for support.

## Out of Scope

- Production telemetry/analytics.
- User-facing help documentation.

## Assumptions

- English log messages in code; user sees i18n via diagnostic `messageKey`.
- Verbose logging disabled in production Electron builds by default.

## Design Topics

- Log levels: debug, info, warn, error.
- Stage timing logs for performance profiling.
- `LINER_DEBUG=1` env flag for dump intermediate to console/file.
- Debug overlay toggles in developer menu only.
- Correlation id per pipeline run linked to `sourceRevision`.

## Open Questions

- Write debug dumps to user-accessible folder on error?
- Integrate with existing app logging infrastructure?

## Related Documents

- [error_handling.md](error_handling.md)
- [calculation_pipeline.md](calculation_pipeline.md)
- [intermediate_result_model.md](intermediate_result_model.md)
- [performance_architecture.md](performance_architecture.md)

## Pre-Implementation Checklist

- [ ] Diagnostic code registry started.
- [ ] Log format (JSON lines vs. text) decided.
- [ ] Debug overlay feature list bounded for MVP.
