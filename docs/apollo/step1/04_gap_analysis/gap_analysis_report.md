# Gap Analysis Report — P04

**Authority:** DESIGN PLANNING / STEP 1  
**Date:** 2026-07-27  
**Base commit:** `563c4c705eb26899a7fecfd49f65541aa2ae3d15`  
**Branch:** `docs/apollo-step1-p04-gap-analysis`

## Methodology

Full-coverage classification of all 69 READY requirements and 281 catalog features against P03 capability inventory (`existing_capability_matrix.csv`, 42 CAP-* rows). Phase 1 scope is intentionally narrow: straight bridge, equal girder depth, non-composite RC slab on steel plate girder, simple single span, static linear analysis. Target Standard numerics are not invented (DEC-S1-0004). Analyzer physical I/O remains UNKNOWN (CAP-EXT-001; ISS-S1-007).

### Inputs (read-only)

- Handoff: `ready_requirements.csv`, `feature_catalog.csv`, `feature_aliases.csv`
- Unresolved: `open_items.csv` (32), `jis_source_gaps.csv` (34), `apollo_return_remaining.csv` (4), `unknown_items.csv` (15), `conflicts.csv` (2)
- P03: `03_existing_capability/*`
- P02: `standards_blocker_register.csv`

## Summary tallies

### READY 69 — gap_bucket

- **BLOCKED_BY_ANALYZER_BOUNDARY:** 1
- **BLOCKED_BY_STANDARD:** 5
- **DUPLICATE_OR_ALIAS:** 3
- **EXISTING_PARTIAL:** 1
- **MINOR_EXTENSION:** 3
- **NEW_MODULE:** 12
- **OUT_OF_PHASE1:** 44

### Feature 281 — disposition

- **BLOCKED:** 5
- **DUPLICATE_ALIAS:** 23
- **LATER_PHASE:** 88
- **OUT_OF_PRODUCT_SCOPE:** 26
- **PHASE1_REQUIRED:** 101
- **PHASE1_SUPPORTING:** 13
- **UNKNOWN:** 25

### Unresolved mapping (85 rows)

- **DEFER_TO_IMPLEMENTATION:** 13
- **NEEDS_RUNTIME_CONFIRMATION:** 4
- **OUT_OF_PHASE1:** 19
- **PRIMARY_SOURCE_MISSING:** 34
- **RESOLVABLE_BY_STEP1_DESIGN:** 15

## Key findings

1. **Phase 1 core** clusters on alignment/road input (CAP-RDD-*), frame analysis (CAP-FRM-001), loads, and RC slab/haunch NEW_MODULE work — not APOLLO Girder/Section/Splice programs.
2. **44 READY rows** are OUT_OF_PHASE1 (splice, bracing, stiffener families) under narrow scope; 3 DDB rows are DUPLICATE_OR_ALIAS (REQ-5C-0098/0099/0100).
3. **Analyzer boundary** blocks legacy SuperDesigner↔Analyzer file workflow; internal solver + IF3 path is EXISTING_PARTIAL (CAP-FRM-001, CAP-IF3-001) with client binding gap (CAP-IF3-005).
4. **Standards blockers** (BLK-S1-001, BLK-S1-002) affect all numeric/material READY rows; no Target Standard numerics adopted.
5. **Feature catalog vs scope:** 88 features LATER_PHASE + 26 OUT_OF_PRODUCT_SCOPE (legacy MS-Word/AutoCAD/RCCAD/y-Mater/MS-Access) despite many `Phase1_required` labels — CFL-003 scope-narrowing conflict.

## Relation to Phase 1

P04 does not authorize implementation. It defines which handoff requirements map to existing OSS capabilities, which need new modules, and which are deferred. Phase 1 delivery path: road/alignment → BFAD/ProjectModel → static analysis → RC slab design shell → IF3-gated reports. Member design, splice, bracing, stiffener, and CAD-drawing parity are explicitly later phase.

## Programmatic verification

```json
{
  "ready_count": 69,
  "feature_count": 281,
  "ready_dup": 0,
  "feature_dup": 0,
  "ready_unclassified": 0,
  "feature_unclassified": 0,
  "ready_bucket_tally": {
    "MINOR_EXTENSION": 3,
    "NEW_MODULE": 12,
    "BLOCKED_BY_STANDARD": 5,
    "OUT_OF_PHASE1": 44,
    "EXISTING_PARTIAL": 1,
    "BLOCKED_BY_ANALYZER_BOUNDARY": 1,
    "DUPLICATE_OR_ALIAS": 3
  },
  "feature_disp_tally": {
    "PHASE1_REQUIRED": 101,
    "PHASE1_SUPPORTING": 13,
    "OUT_OF_PRODUCT_SCOPE": 26,
    "DUPLICATE_ALIAS": 23,
    "UNKNOWN": 25,
    "LATER_PHASE": 88,
    "BLOCKED": 5
  },
  "ok": true
}
```

**Verification:** PASS — ready_rows=69, feature_rows=281, duplicate_ids=0, unclassified=0

