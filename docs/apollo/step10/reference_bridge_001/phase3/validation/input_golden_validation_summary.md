# Input Golden Validation Summary

> **Authority:** STEP 10 Reference Bridge 001 (RB-S10-001) — Phase 3
> **Validator:** `tools/validate_input_golden.py`
> **Validation date:** 2026-08-07

## Overall Result

**OVERALL: PASS** (17/17 checks)

## Check Results

| Check ID | Description | Status |
|----------|-------------|--------|
| CHK-001 | Golden ID uniqueness | PASS |
| CHK-002 | Field path presence | PASS |
| CHK-003 | Entity ID presence | PASS |
| CHK-004 | Source record resolution | PASS |
| CHK-005 | Candidate ID resolution | PASS |
| CHK-006 | Source locator presence | PASS |
| CHK-007 | Semantic class check | PASS |
| CHK-008 | Promotion status allowed | PASS |
| CHK-009 | Normalized value/unit consistency | PASS |
| CHK-010 | Normalization rule check | PASS |
| CHK-011 | Result leakage = 0 | PASS |
| CHK-012 | Formal Golden no HOLD/REJECTED | PASS |
| CHK-013 | Standard profile = H29_REFERENCE | PASS |
| CHK-014 | R7 compliance check | PASS |
| CHK-015 | JSON/CSV parity | PASS |
| CHK-016 | No source originals tracked | PASS |
| CHK-017 | Count parity deferred | PASS |

## Counts

| Item | Count |
|------|-------|
| Total Golden records | 141 |
| APPROVED_INPUT_GOLDEN | 139 |
| APPROVED_WITH_HUMAN_CONFIRMATION_TRACK | 2 |
| RESULT_LEAKAGE | 0 |
| Domain files | 9 |

## Exceptions

None. All 17 checks pass.