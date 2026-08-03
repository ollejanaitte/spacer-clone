# E2E Report — Apollo Step 4-A Workflow

Executed against the frozen E2E suite
`frontend/tests/e2e/apollo-step4a-workflow.spec.ts` (Playwright).

## Command

```
cd frontend && npx playwright test tests/e2e/apollo-step4a-workflow.spec.ts
```

Raw JSON: `evidence/e2e-step4a-20260803.json`.

## Result

**expected = 5, passed = 5, unexpected = 0, flaky = 0**

| Test | Result | Duration |
|------|--------|----------|
| E2E-S4A-001: initial empty project shows registry order, stubs and recommendation | passed | 4635 ms |
| E2E-S4A-002: valid existing project marks generated steps COMPLETE + NOT_AUTHORIZED | passed | 3424 ms |
| E2E-S4A-003: mutating input makes dependent steps STALE with regeneration CTA | passed | 3653 ms |
| E2E-S4A-004: future stubs are BLOCKED with reason and disabled CTA | passed | 2814 ms |
| E2E-S4A-005: status is conveyed by text label, not color only | passed | 2785 ms |

## WebServer config note

`frontend/playwright.config.ts` webServer was changed to
`npm run dev -- --mode apollo --host 127.0.0.1 --port 4173`
(`VITE_APOLLO_PHASE1_ENABLED` alone does not reach Vite dev; the Apollo route
stayed disabled). baseURL: `http://127.0.0.1:4173`.

## Known pre-existing failures (unrelated to Step 4-A, reproduced on `main`)

Recorded for traceability; **not** part of the Step 4-A gate.

- `src/contracts/runtime/__tests__/contractJsonSchema.test.ts` —
  bridge-superstructure-design-document semantic drift (also present on `main`;
  no work-tree contamination).
- E2E: `level0-navigation` (2), `p2-d06-viewer-vertical-z` (1),
  `th-analysis-revamp` (2) — same failures with the original config.
