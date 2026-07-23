# P6-D05 Frame DRAFT Design

**Date:** 2026-07-23
**Status:** DRAFT
**Maps to:** PR-41 formal Frame DRAFT

## Purpose

Design formal Frame drawing builders for structure, load, result, and influence sheets.

## Boundary

- Frame DRAFT consumes Frame source/result DTOs.
- Road/LINER builders are not imported directly.
- Shared drawing primitives may be reused only through SP1-compatible neutral contracts.
- `DrawingDocument` remains runtime-only.

## Candidate Sheets

| Sheet | Source |
| --- | --- |
| structure layout | Frame document geometry |
| support/load layout | Frame load definitions |
| result diagram | valid bound result resource |
| influence line/surface | valid influence result resource |

## Required Diagnostics

- missing result: unavailable or error depending on sheet type
- stale result: error for authoritative output
- unsupported result family: explicit unsupported diagnostic

```text
P6_D05_READY_FOR_IMPLEMENTATION: NOGO_UNTIL_SP1_AND_IF3_VERIFIED
```
