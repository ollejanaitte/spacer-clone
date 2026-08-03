# Presence Semantics

| Token | Meaning | Completes? |
|-------|---------|------------|
| NOT_PROVIDED | Unset / migrated missing | No |
| EXPLICIT_NONE | User asserted none | Yes (for that slot/girder) |
| PROVIDED | ≥1 valid item | Yes if valid |

Rules:
- `[]` ≠ EXPLICIT_NONE
- field absent ≠ EXPLICIT_NONE
- PROVIDED with 0 items → validation error
- EXPLICIT_NONE with item → validation error
- Migration / createEmpty → NOT_PROVIDED
