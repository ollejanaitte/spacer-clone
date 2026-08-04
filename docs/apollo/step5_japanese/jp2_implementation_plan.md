# JP2 implementation plan (design only — not implementing now)

## Packages

| Package | Scope | Depends |
|---------|-------|---------|
| P1 | Common translation catalog + helpers (`get*Label`) | glossary CSVs → TS modules |
| P2 | Workflow badges + Guided Mode field/step labels | P1 |
| P3 | Sample/reapply + input panels (bridge/pavement/appurtenance/haunch/cross-frame) | P1 |
| P4 | 3D / quantity / load / analysis panels | P1 |
| P5 | Outputs / errors / authorization banners | P1 |
| P6 | Residual English scan harness + closeout hooks | P1–P5 |

## Constraints

- APPLICATION code changes allowed in JP2 (not JP1)
- Do not change schema enums or persisted keys
- Migrate `STATUS_GROUP_LABELS` to glossary values
- Remove L1 dual EN tails (` / Sway`, ` / Cross beam`)

## Exit for JP2

Typed catalog wired; high-traffic screens use helpers; allowlist documented; no formal auth change.
