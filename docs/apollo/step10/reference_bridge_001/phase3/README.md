# Phase 3 — Reference Bridge 001 Input Golden

> **Authority:** STEP 10 Reference Bridge 001 (RB-S10-001)
> **Phase 3 Objective:** Promote Phase 2-II Candidate Layer to formal Input Golden
> **Development approach:** documentation-only / data-only (no production code changes)
> **Numeric analysis performed:** NO (recalculation prohibited)
> **PDF / DWG / image originals committed:** NO
> **Standard profile:** H29_REFERENCE (R7 compliance not verified)

## Directory Structure

```
phase3/
├── README.md               ← This file
├── contracts/              ← Golden promotion rules, schema, enums, normalization
├── golden/                 ← Formal Input Golden (CSV + JSON, domain-specific CSVs)
├── review/                 ← Promotion/rejection registers, conflict resolution, audits
├── validation/             ← Validation summary, golden manifest
├── tools/                  ← Build, validate, and manifest generation scripts
├── 08_phase4_handoff.md    ← Handoff to Phase 4 (Geometry/Structural Model Golden)
└── completion_report.md    ← Phase 3 completion report
```

## Golden Record Counts

| Status | Count |
|--------|-------|
| APPROVED_INPUT_GOLDEN | 139 |
| APPROVED_WITH_HUMAN_CONFIRMATION_TRACK | 2 |
| HOLD_CONFLICT | 2 |
| REJECTED_DERIVED_VALUE | 3 |
| REJECTED_RESULT | 0 |
| EXCLUDED_OTHER | 113 |
| **Total Golden Records** | **141** |

## Domain Distribution

| Domain | Records | File |
|--------|---------|------|
| Bridge Identity | 7 | `golden/bridge_identity.csv` |
| Geometry Inputs | 26 | `golden/geometry_inputs.csv` |
| Girder Inputs | 22 | `golden/girder_inputs.csv` |
| Deck Inputs | 4 | `golden/deck_inputs.csv` |
| Material Inputs | 9 | `golden/material_inputs.csv` |
| Cross Member Inputs | 10 | `golden/cross_member_inputs.csv` |
| Support/Bearing Inputs | 12 | `golden/support_bearing_inputs.csv` |
| Load Inputs | 45 | `golden/load_inputs.csv` |
| Member/Section Inputs | 6 | `golden/member_section_inputs.csv` |

## Source Priority Distribution

| Priority | Count |
|----------|-------|
| BOTH (calc + drawing) | 18 |
| CALCULATION only | 90 |
| DRAWING only | 33 |
| UNKNOWN | 0 |

## Key Constraints

- `NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED`
- `DESIGN_OR_CONSTRUCTION_USE: PROHIBITED`
- `FORMAL_RELEASE_READINESS: NO_GO_PENDING_HUMAN_VALIDATION`
- No result leakage (ANALYSIS_RESULT, DESIGN_RESULT, etc.) into Golden
- No derived values promoted
- All records traceable to Phase 2-II candidate IDs and source records
- All records carry `H29_REFERENCE` standard profile