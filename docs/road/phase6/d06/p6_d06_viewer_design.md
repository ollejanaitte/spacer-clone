# P6-D06 Viewer Design

**Date:** 2026-07-23
**Status:** DRAFT
**Maps to:** PR-42 Viewer target adapters/staleness/output UI

## Purpose

Design Viewer adapters that consume target Frame documents and result resources with explicit staleness handling.

## Adapter Contract

Viewer adapter input:

- Frame source document revision
- result resource ID and checksum binding
- load/solver/schema metadata
- staleness diagnostics

Viewer adapter output:

- render/session DTO
- unavailable/stale/valid state
- export availability flags

## Rules

- Viewer session state is runtime-only by default.
- Adapter does not recompute solver results.
- Stale result blocks authoritative export.
- Old Viewer adapter remains rollback until PR-42 passes.

## Tests

- valid result renders
- stale result shows blocked state
- missing result shows unavailable state
- export controls disabled for stale/missing state

```text
P6_D06_READY_FOR_IMPLEMENTATION: NOGO_UNTIL_IF3_VERIFIED
```
