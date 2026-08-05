# Load and Analysis Scope

## Current State
- No structural analysis engine is connected to the sway bracing
- Formal structural analysis is NOT_AUTHORIZED
- Dead load model includes secondary steel weight (derived from quantity)

## Options for Bottom Chord Load

## Option L-A: Include in Dead Load (Recommended)

| Property | Value |
|----------|-------|
| Dead load | Bottom chord self-weight added to secondary steel dead load |
| Source | Quantity-derived (same as diagonals) |
| Schema | NONE |
| Implementation | Quantity model computes weight → load model picks it up |
| Note | Analysis connection deferred to Step 4-D..H (not this scope) |

## Option L-B: Defer to Step 4-D and Beyond

| Property | Value |
|----------|-------|
| Dead load | Not added now |
| Note | Bottom chord is visible and counted in quantity, but load deferred |
| Risk | Inconsistent between quantity and load until later step |

## Option L-C: Load-Only Later

| Property | Value |
|----------|-------|
| Dead load | Add in a later phase |
| Status | Documented as known limitation |