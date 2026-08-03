# 17 — Test and Evidence Strategy

Distinguish **development reference** fixtures from **human-approved Golden**. Do not invent formal Golden.

## Layers

| Layer | Use |
|-------|-----|
| Unit | workflow states, validators, pure geometry/load formulas |
| Schema/migration | Step3 project → Step4 read; NONE vs null |
| Dev reference / Golden | Independent calculators (like Step2/3 GOLD-*) |
| Geometry | haunch/appurtenance/splice bounds |
| Load/quantity parity | same IDs across models |
| Alignment compatibility | cases in §07 |
| 3D screenshots | evidence only; not numeric SoR |
| Workflow | recommended action; STALE propagation |
| Save/reload / STALE / export / E2E | extend Step3 patterns |
| Human review | checklist R/S |

## Per-step matrix (summary)

| Step | Must-pass |
|------|-----------|
| 4-A | state machine; GUI control smoke |
| 4-B | migration; entity IDs; EXPLICIT_NONE |
| 4-C | qty/load/3D parity |
| 4-D | splice disclosures; no fabricated checks |
| 4-E | binding checksum STALE |
| 4-F | overlay from canonical; measure mode |
| 4-G | bundle SHA; sheet register |
| 4-H | full E2E; closeout |

Full app build/test not required for P0 (docs-only).
