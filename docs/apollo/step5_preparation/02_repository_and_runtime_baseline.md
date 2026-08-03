# 02 — Repository and Runtime Baseline

| Field | Value | Evidence |
|-------|-------|----------|
| WORKING_PATH | `/home/masaharu/Projects/spacer-clone` | CODE_CONFIRMED |
| START_MAIN_SHA | `ad4906ab76f167d8ba9313abcaf41440b72234f7` | CODE_CONFIRMED (preflight) |
| ORIGIN_MAIN_SHA | `ad4906ab76f167d8ba9313abcaf41440b72234f7` | CODE_CONFIRMED |
| LOCAL_EQUALS_ORIGIN | YES | CODE_CONFIRMED |
| WORKTREE_CLEAN | YES | CODE_CONFIRMED |
| STEP_4C_VERDICT | COMPLETE | CODE_CONFIRMED (`final_report.txt`) |
| PR335_MERGED | YES | CODE_CONFIRMED |
| PR335_MERGE_SHA | `ad4906ab76f167d8ba9313abcaf41440b72234f7` | CODE_CONFIRMED |

## Key sources

| Concern | Path |
|---------|------|
| Sample inputs | `frontend/src/apollo/bridgeStructure/sampleInputs.ts` |
| Bridge input draft | `frontend/src/apollo/bridgeStructure/types.ts` / `generateBsdd.ts` |
| Solids | `frontend/src/apollo/visualization/bridgeStructureSolids.ts` |
| App/haunch solids | `frontend/src/apollo/visualization/appurtenanceHaunchSolids.ts` |
| STL | `frontend/src/apollo/export/apolloStlExport.ts` |
| Workflow registry | `frontend/src/apollo/workflow/registry.ts` |
| Shell / guided | `frontend/src/apollo/ApolloPhase1Shell.tsx` |
| Quantity | `frontend/src/apollo/quantity/quantityModel.ts` |
| Loads | `frontend/src/apollo/loads/appurtenanceHaunchLoadModel.ts` |

## Baseline verification (S5-1A)

| Check | Result |
|-------|--------|
| vitest geometryKernel + step4b + workflowState | 54 passed |
| `tsc --noEmit` | PASS |
| lint / full Playwright matrix | NOT_VERIFIED this substep (prior Step 4-C green on main) |
| APPLICATION_CODE_CHANGED | NO |
