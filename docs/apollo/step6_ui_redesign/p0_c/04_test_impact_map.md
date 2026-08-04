# 04 — Test Impact Map

**BASE_MAIN_SHA:** `ee045b353ade480a9d2a857c7f48215973274273`

## Likely update required (UI chrome)

| Test | Triggering UI PRs | What breaks | Protect |
|------|-------------------|-------------|---------|
| `ApolloPhase1Shell.test.tsx` | UI-1..5 | Header structure; mounting order | save/reload/return testids |
| `guidedMode.test.tsx` | UI-2 | Progress list / footer layout | G01–G15 adjacency |
| `WorkflowControlScreen.test.tsx` | UI-4 | Expectation of 15 full cards in list | Order of WF-01..15; NOT_GRANTED text |
| `catalog.test.tsx` (AuthorizationBanner) | UI-1 | Compact markup | L1 JA; L3 tokens |
| `apollo-step4a-workflow.spec.ts` | UI-4 UI-6 | Card vs list-row selectors | Status text not color-only |
| `apollo-step4b-*.spec.ts` | UI-4 (selectors) | WF step testids still present | STALE/COMPLETE |
| `apollo-step5-final-gui.spec.ts` | UI-2 UI-5 UI-6 | Guided jumps; auth chrome | Auth guards visible |
| `apollo-step5r-residual.spec.ts` | UI-2 UI-6 | Guided nav; mobile | **S5R-012 auth unchanged** |
| `apollo-step5-jp3a-*.spec.ts` | UI-6 | Scan paths | Residual English inventory |
| `apollo-step5-jp3c-*.spec.ts` | UI-2 UI-6 | G jump buttons | Allowlisted G##/WF |

## Unlikely update (protect by not editing sources)

| Test area | Why stable |
|-----------|------------|
| `workflow/__tests__/workflowState.test.ts` | evaluators untouched |
| `workflow/__tests__/workflowRegistry.test.ts` | registry untouched |
| visualization / STL / quantity / report unit tests | generation untouched |
| Panel SoR unit tests (Bridge/Haunch/…) | Only if AuthorizationBanner DOM asserted tightly |

## Critical testids to preserve or alias

`apollo-phase1-shell`, `apollo-save-project`, `apollo-reload-project`, `apollo-return-to-pro`, `apollo-basics-screen`, `apollo-guided-mode-shell`, `apollo-guided-jump-G##`, `apollo-guided-nav`, `apollo-guided-back`, `apollo-guided-save-next`, `apollo-workflow-control-screen`, `apollo-wf-step-list`, `apollo-wf-step-WF-##`, `apollo-wf-progress-summary`, panel testids (`apollo-bridge-structure-panel`, …), auth banner testids, `apollo-provisional-banner` (or successor with E2E update).

## Regression suite per implementation PR (minimum)

1. Targeted Vitest for touched components  
2. Full Apollo Vitest  
3. `tsc` / lint / production build  
4. Targeted Playwright for touched surface  
5. Step 4-A WF E2E if WF touched  
6. Step 5 Guided / 3D / reapply E2E if Guided/Viewer touched  
7. Auth unchanged assertion if auth chrome touched  
