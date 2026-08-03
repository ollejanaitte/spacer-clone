# 09 — Pavement Domain Model

## DEC-S5-0003 (DECIDED_DRAFT)
**Apollo draft owns pavement** for bridge deck surface solids/qty/load in Step 5. LINER `hoso` remains road SoR until Step 4-E binding; no silent dual write.

## Fields (development schema bump)
- `presence`: NOT_PROVIDED | EXPLICIT_NONE | PROVIDED
- `thickness_m`
- `unitWeight_kN_m3` + `unitWeightStatus: USER_PROVIDED_UNVERIFIED`
- `startStation_m` / `endStation_m` (default full bridge length)
- `transverse cover`: FULL_DECK_WIDTH (v1)

## Geometry
Solid box on deck top (DAT-DECK-TOP) with thickness; visibility group `pavement`.

## DEC-S5-0012 (DECIDED_DRAFT)
When PROVIDED, include pavement dead load in load model (separate category); quantity category PAVEMENT. When NOT_PROVIDED/EXPLICIT_NONE, invent nothing.
