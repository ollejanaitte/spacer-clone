# Evidence Index — Apollo Step 4-A

All evidence captured 2026-08-03 on branch `feat/apollo-step4a-workflow-state`,
baseline `main` `5c10af7`.

## Test results (raw)

| File | Contents | Pass/Fail |
|------|----------|-----------|
| `evidence/vitest-workflow-20260803.json` | `npx vitest run src/apollo/workflow src/apollo/__tests__/WorkflowControlScreen.test.tsx` (3 files) | 3/3 pass |
| `evidence/e2e-step4a-20260803.json` | `npx playwright test tests/e2e/apollo-step4a-workflow.spec.ts` | 5/5 pass (expected=5) |

## Full-suite runs (recorded in final_report.txt)

- `npx vitest run src/apollo` — 51 files, 383 tests, all pass.
- `npx vitest run src` — 287 files, 286 pass, 2 fail
  (contract schema drift only, pre-existing on `main`).
- `npx tsc -b --pretty false` — OK.
- `npm run lint` — exit 0.
- Playwright E2E — Step 4-A suite 5/5; pre-existing unrelated failures on
  `main` (level0-navigation 2, p2-d06-viewer-vertical-z 1, th-analysis-revamp 2).

## Commit record (local, `feat/apollo-step4a-workflow-state`)

| Commit | Message |
|--------|---------|
| `9620b69` | feat(apollo): add workflow control and derived status evaluation |
| `cd35221` | test(apollo): register drawingSetModel and artifactBundle modules in AP-00 suite |
| `bc07f27` | feat(apollo): add workflow control screen UI and navigation |
| `4bb1b33` | test(apollo): add workflow control screen component tests |
| `e003085` | test(apollo): add Step 4A workflow E2E (S4A-001..005) |

## Files covered

Core + UI + tests enumerated in `README.md` (implementation file map).
Assertion/guard checks shipped with the code:

- `assertWorkflowRegistryShape()` — 15 steps, unique IDs, 6 groups.
- `assertNoDependencyCycles()` — DAG, no self-references.
- `assertEdgesMatchRegistry()` — every edge target exists in registry.
- `BINDING_PREREQUISITE_GUARD` / `activePrerequisitesOf()` — PLANNED stubs never
  block downstream.
- `corruptedEvidence()` — safe evidence under persisted-data corruption.
