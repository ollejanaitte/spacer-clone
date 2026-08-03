# Input Schema 1.1.0-development

Added fields on `ApolloBridgeStructureInputDraft`:
- `appurtenanceConfiguration.slots[]` — 6 slots with presence + optional item
- `haunchConfiguration.girders[]` — per-girder presence + optional item

Legacy `1.0.0` accepted by parser → migrated to `1.1.0-development` with NOT_PROVIDED / empty girders and `generatedAt=null` (STALE).
