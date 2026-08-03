# E2E Report — Step 4-B

| ID | Scenario | Result |
|----|----------|--------|
| E2E-S4B-001 | Legacy/sample NOT_PROVIDED, no auto entities | PASS (see evidence/) |
| E2E-S4B-002 | Explicit none → COMPLETE + NOT_AUTHORIZED | PASS |
| E2E-S4B-003 | Appurtenance PROVIDED curbs | PASS |
| E2E-S4B-004 | Haunch apply-all RECT → BSSD | PASS |
| E2E-S4B-005 | Invalid station → BLOCKED | PASS |
| E2E-S4B-006 | Change after COMPLETE → STALE | PASS |
| E2E-S4B-007 | Scope guard WF-06 PLANNED, Step 4-C pending | PASS |

Playwright: `frontend/tests/e2e/apollo-step4b-appurtenance-haunch.spec.ts`
Screenshots: `evidence/e2e-s4b-*.png`
