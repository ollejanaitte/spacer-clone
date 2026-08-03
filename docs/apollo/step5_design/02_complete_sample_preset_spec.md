# 02 — Complete Sample Preset Spec

## Intent
One sample selection fills all fields required for development pipeline readiness (PRESET_SELECTED → path to THREED_READY), remaining USER_EDITABLE with safety labels.

## Sample IDs (retain)
- `SIMPLE_SINGLE_SPAN` — existing
- `CONTINUOUS_GIRDER` — existing [30,35,30]

## Complete preset must set (development)
- Bridge basics (existing)
- Appurtenance slots: PROVIDED with UNVERIFIED catalog items for curb L/R + wall railing L/R; median/barrier EXPLICIT_NONE unless catalog says otherwise (DEC catalog)
- Haunch: PROVIDED RECT per girder with UNVERIFIED dims
- Lateral flags: upper+lower **enabled** for complete sample (simple single)
- Pavement: thickness + unit weight UNVERIFIED
- Road markings: center + lane + edge layout UNVERIFIED
- Road alignment: document dependency on Step 4-E; sample may ship LINER stub pointer or “unbound acknowledged” flag — do not fake CRS bind

## Labels (REQ-S5-014)
Every apply surfaces SAMPLE_PRESET / UNVERIFIED_DEVELOPMENT_ONLY / NOT_GRANTED / PROHIBITED.

## Non-goals
Inventing national-standard dimensions as ADOPTED truth.
