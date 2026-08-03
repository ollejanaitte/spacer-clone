# 05 — Schema and Migration Design

**DRAFT_FOR_IMPLEMENTATION** — not an adopted production schema.

## Version bumps (planned)

| Artifact | Current | Step 4 target | Notes |
|----------|---------|---------------|-------|
| ApolloBridgeStructureInputDraft | `1.0.0` | `1.1.0-development` | Appurtenances, haunch, splice, binding refs |
| BSSD / SDM | existing contract | minor extend Haunch/Splice payloads or sidecar | Keep empty-array backward compatible |
| QuantityModel | `1.0.0-development` | `1.1.0-development` | New quantity IDs |
| ReportModel | `1.0.0-development` | `1.1.0-development` | New chapters/rows |
| DrawingSetModel | `1.0.0-development` | `1.1.0-development` | New views/sheets as needed |
| Artifact bundle | `1.0.0-development` | `1.1.0-development` | Manifest fields |
| WorkflowStateModel | n/a | `1.0.0-development` | New |
| AlignmentBridgeBinding | n/a | `1.0.0-development` | New |
| DimensionOverlay | n/a | `1.0.0-development` | Display-first; persist optional |

## Presence semantics (frozen)

| Token | Meaning |
|-------|---------|
| NOT_PROVIDED | Field absent / null; do not invent |
| EXPLICIT_NONE | User asserted “none” (e.g. no median) |
| PROVIDED | User entered value |
| ASSUMED_DEVELOPMENT_ONLY | Schematic / visualization; never formal |
| USER_PROVIDED_UNVERIFIED | Unit weights etc. |
| ADOPTED | Forbidden until authorization grant |
| NOT_AUTHORIZED | Numeric design use blocked |

**Critical:** `[]` empty array ≠ `EXPLICIT_NONE`. Migration must not coerce null → 0.

## Migration (Step 3 → Step 4 projects)

1. Read Step 3 project unchanged structurally.
2. Missing new fields → `NOT_PROVIDED` / empty collections.
3. Do **not** auto-create haunches/splices/appurtenances.
4. Recompute checksums; mark structure **STALE** until regenerate.
5. Workflow steps all derive `NOT_STARTED`/`AVAILABLE` from data.
6. Backward export: Step 4 may export Step-3-compatible subset with warnings; full round-trip of new entities requires 1.1 readers.

## Schema drafts

See `schemas/*.json` — each file states `$comment: DRAFT_FOR_IMPLEMENTATION`.
