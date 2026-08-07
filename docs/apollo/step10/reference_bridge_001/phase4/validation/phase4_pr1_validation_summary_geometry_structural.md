# Phase 4 Model Golden Validation Summary

> **Authority:** STEP 10 Reference Bridge 001 (RB-S10-001) — Phase 4 (PR-1)
> **Validator:** `tools/validate_phase4_golden.py`
> **Date:** VALIDATION_SUMMARY

## Overall Result

**OVERALL: PASS** (16/16 checks)

## Scope

Phase 4 PR-1 promotes Phase 2-II **geometry** and **structural_model**
candidates to the Model Golden layer.

## Check Results

| Check ID | Description | Status |
|----------|-------------|--------|
| CHK-001 | Golden ID uniqueness | PASS |
| CHK-002 | Field path presence | PASS |
| CHK-003 | Entity ID presence | PASS |
| CHK-004 | Source record resolution | PASS |
| CHK-005 | Candidate ID resolution | PASS |
| CHK-006 | Source locator presence | PASS |
| CHK-007 | Semantic class present | PASS |
| CHK-008 | Promotion status allowed | PASS |
| CHK-009 | Normalized value/unit consistency | PASS |
| CHK-010 | Domain in allowed set | PASS |
| CHK-011 | Result leakage = 0 | PASS |
| CHK-012 | No HOLD/REJECTED in formal golden | PASS |
| CHK-013 | Standard profile = H29_REFERENCE | PASS |
| CHK-014 | JSON/CSV parity | PASS |
| CHK-015 | Domain CSV total parity | PASS |
| CHK-016 | No source originals tracked | PASS |

## Counts

| Item | Count |
|------|-------|
| Total Model Golden records | 67 |
| APPROVED_GOLDEN_MODEL | 65 |
| APPROVED_WITH_HUMAN_CONFIRMATION_TRACK | 2 |
| Residual leakage | 0 |
| Geometry records | 33 |
| Structural model records | 34 |

## Exceptions

None. All 16 checks pass.

## Notes

- Panel-point coordinates for intermediate nodes (1002–1026, 2002–2026) were
  not extracted in Phase 2; they remain `HOLD_INSUFFICIENT_SOURCE` in
  `review/non_promoted_register.csv`. This is the carried-forward known gap.
- GN region: flange width conflict `CONF-P2II-001` (680 vs 700 mm) held as
  `HOLD_CONFLICT`, not promoted.