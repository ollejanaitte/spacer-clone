# Step 4-C5 — Analysis Adapter

## FE solver audit

| Capability | Status |
|------------|--------|
| ANALYSIS_SUPPORTS_FULL_SPAN_UDL | YES (`memberLoads.type=uniform`) |
| ANALYSIS_SUPPORTS_PARTIAL_UDL | NO on FE path |
| ANALYSIS_SUPPORTS_MULTIPLE_SEGMENTS | NO on FE path |
| ANALYSIS_SUPPORTS_PER_GIRDER | via development distribution shares |
| ANALYSIS_INPUT_CHECKSUM | YES (load model checksum) |
| ANALYSIS_RESULT_PROVENANCE | YES |

## Adapter strategy

Because FE member loads cannot carry station ranges, Step 4-C connects loads through a **closed-form simply-supported beam adapter** per girder:

- Retains segment `startStation`/`endStation`
- Never silently converts partial UDL → full-span UDL
- Reactions/moment bound via statics
- Deflection: `NOT_AVAILABLE`
- Missing unit weight → `BLOCKED`
- EXPLICIT_NONE → no loads

Label: `ASSUMED_DEVELOPMENT_ONLY` / `NOT_AUTHORIZED` / `UNVERIFIED_DEVELOPMENT_ONLY`
