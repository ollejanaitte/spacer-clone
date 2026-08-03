# Step 4-B — WF-03 Appurtenances / WF-05 Haunch

**STEP_ID:** APOLLO_STEP_4B_APPURTENANCE_HAUNCH_INPUT  
**STATUS:** COMPLETE (implementation + evidence)  
**NUMERIC_DESIGN_AUTHORIZATION:** NOT_GRANTED  
**DESIGN_OR_CONSTRUCTION_USE:** PROHIBITED

## Scope

- WF-03: 床版・橋面付属物 canonical input (presence, validation, UI, workflow)
- WF-05: RC床版ハンチ canonical input + BSSD Haunch projection
- Input schema `1.1.0-development` + migration from `1.0.0`
- Checksum / STALE / save-reload

## Out of scope (Step 4-C+)

3D solids, quantity, loads, analysis, drawings, splice (WF-06), alignment binding (WF-01/4-E).

## Key decisions

| ID | Decision |
|----|----------|
| DEC-S4B-0001 | Per-slot / per-girder PresenceStatus: NOT_PROVIDED / EXPLICIT_NONE / PROVIDED |
| DEC-S4B-0002 | Empty array ≠ EXPLICIT_NONE; migration never auto-creates entities |
| DEC-S4B-0003 | BSSD Haunch additive optional geometry fields (DEC-S4-0003) |
| DEC-S4B-0004 | Appurtenances remain Apollo app-specific (no BSSD slot); stable IDs for future consumers |
| DEC-S4B-0005 | Cross-section shape minimal enum: RECT |
| DEC-S4B-0006 | Haunch seed key = `girder-${index}` matching MainGirder stable ID |

See sibling markdown files for details.
