# Step 4-C3 — Quantity Traceability

## Schema

`QUANTITY_MODEL_SCHEMA_VERSION` → `1.1.0-development`

## Categories

| Category | Source | Notes |
|----------|--------|-------|
| APPURTENANCE | BridgeAppurtenanceModel via C1 kernel | length/area/volume; weight iff unitWeight provided |
| RC_HAUNCH | RcDeckHaunchModel via C1 kernel | separate from RC_DECK body; no double count into QTY-DK-* |

## Basis

- Geometry: `EXACT_GEOMETRY_DEVELOPMENT`
- Weights: `USER_PROVIDED_UNVERIFIED`
- Missing unit weight: value null, status `NOT_AVAILABLE` (volume still READY)
- Authorization: model `NOT_GRANTED`; item warnings include `NOT_AUTHORIZED`

## Export

CSV/JSON include category, formulaId path via items, checksum, STALE guard unchanged.
Report/drawing/ZIP reintegration deferred to Step 4-G.
