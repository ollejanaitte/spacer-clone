# Stage 5A Traceability Scope Report

## Verdict
```text
APOLLO_STAGE5A_TRACEABILITY_SCOPE_VERDICT: COMPLETE
```

## Counts
| Metric | Value |
|---|---|
| Stage4 features | 281 |
| Features needing external lookup | 160 |
| Traceability rows | 408 |
| Handoff rows | 273 |
| Classification | {'SOFTWARE_SPECIFIC': 129, 'MANUAL_DEFINED': 5, 'STANDARD_TRACEABILITY_REQUIRED': 144, 'PROJECT_DECISION': 22, 'DESIGN_PRACTICE_TRACEABILITY_REQUIRED': 47, 'JIS_TRACEABILITY_REQUIRED': 23, 'MULTIPLE_SOURCES_REQUIRED': 23, 'UNKNOWN': 15} |
| External source types | {'APOLLO_MANUAL_ONLY': 156, 'RBS_COMMON': 16, 'RBS_SUBSTRUCTURE': 5, 'DESIGN_DATA_BOOK': 46, 'RBS_STEEL': 119, 'RBS_CONCRETE': 16, 'JIS_REBAR': 6, 'DESIGN_MANUAL': 1, 'JIS_BOLT': 26, 'JIS_STEEL': 2, 'UNKNOWN': 15} |
| Priority | {'P2': 108, 'P1': 124, 'P0': 159, 'P3': 17} |
| numeric_value_present=YES | 119 |
| formula_present=YES | 46 |
| table_present=YES | 44 |
| blocking_for_design=YES | 148 |
| Explicit standard name stated | 2 |
| historical edition known | 0 (names may be stated; editions UNKNOWN) |
| target_edition NOT_SELECTED | 408 |
| UNKNOWN class rows | 15 |

## Separation checks
- RBS / JIS / Design practice roles separated in `external_source_type`
- SOFTWARE_SPECIFIC / PROJECT_DECISION separated from standard requirements
- Historical vs Target: editions not guessed
- APOLLO defaults not equated to code minima
- No Stage 5B content matching performed

## Re-verification
25/25 Evidence OK across RC床版5 / 主桁5 / 添接5 / 床組3 / 荷重解析5 / 帳票図面材料2

## Process
- MiMo: candidate extraction only; no final classification
- Unauthorized MiMo files: none
- Originals unchanged; OSS/Git untouched
