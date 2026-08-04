# 10 — Implementation PR Plan

**BASE_MAIN_SHA:** `7023cb61e7e2f7189e45b46dcb7edb0395320767`

## Rules

1. One theme per PR; no Shell+Guided+WF+Viewer+all-CSS mega-PR.
2. Each PR publishes a **narrow allowlist** subset of P0-C upper bound.
3. Docs-only P0 complete before UI-1 starts.
4. Do not start UI-N+1 until UI-N merged to main (unless emergency fix).
5. Application PRs still keep formal authorization NOT_GRANTED.

## PR sequence

| Step | Title theme | Primary files (expected) | Must not touch | Key verification |
|------|-------------|--------------------------|----------------|------------------|
| **6-UI-1** | Header mode/action split + compact auth | `ApolloPhase1Shell.tsx`, header extract components, `AuthorizationBanner.tsx`, `TechnicalDetails.tsx`, `styles.css` (header/banner), i18n keys, shell/catalog tests, targeted E2E | workflow evaluators; Guided progress redesign; WF list restructure; Viewer3D internals | Header visual; auth E2E; dirty/save |
| **6-UI-2** | Guided progress integrate + sticky footer | `GuidedModeShell.tsx`, progress/sticky components, `styles.css` guided, `chrome.ts` if needed, guided tests, S5 E2E | WorkflowControlScreen master-detail; Viewer3D internals | G jumps; sticky; UT-GUIDED |
| **6-UI-3** | Input + Viewer layout | shell layout mounting, `styles.css` layout, navigation testid fix, optional ViewerPane wrapper; avoid Viewer3D unless required | WF master-detail; auth semantics | Desktop 2-pane; scroll-to-viewer; STL same-source note |
| **6-UI-4** | Workflow master-detail | `WorkflowControlScreen.tsx`, StepCard/Navigator/Detail, WF CSS, WF unit + Step4A E2E; shell mode switch wiring | Guided progress; evaluators/registry meanings | 15 reachable; recommended selection; a11y badges |
| **6-UI-5** | Responsive / mobile tabs / a11y | `styles.css` media, `ApolloMobileWorkspaceTabs`, shell wiring, mobile E2E, screenshots | domain models | Tablet/mobile matrix; keyboard |
| **6-UI-6** | Full regression + residual EN + screenshots | tests/docs evidence only preferably; tiny chrome fixes if scan finds issues | schema/canonical/auth grant | Full suite PASS |
| **6-UI-CLOSEOUT** | final_report + completion gate | docs + `final_report.txt` | application (unless tiny stamp) | STEP_6_UI verdict |

## Why this split (overlap control)

| Conflict pair | Mitigation |
|---------------|------------|
| UI-1 vs UI-2 both edit shell | UI-1 only header/auth region; UI-2 only Guided mount/footer |
| UI-3 vs UI-4 both edit shell mounting | UI-3 layout panes; UI-4 mode=workflow body + remove Guided co-mount |
| UI-5 vs earlier CSS | Additive media/tab classes; rebase on main |

## IMPLEMENTATION_PR_COUNT

**7** (UI-1..UI-6 + CLOSEOUT). CLOSEOUT may fold into UI-6 if evidence already recorded — avoid empty seal PRs.

## Start readiness

`STEP_6_UI_1_START_READINESS: GO` after this P0-D PR merges and main sync is clean.
