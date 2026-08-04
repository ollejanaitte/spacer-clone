# 09 — Regression Test Plan

**BASE_MAIN_SHA:** `7023cb61e7e2f7189e45b46dcb7edb0395320767`

## Mandatory checks per implementation PR

| Check | Command / method | Notes |
|-------|------------------|-------|
| Targeted Vitest | `vitest` path(s) touched | Always |
| Apollo full Vitest | apollo test script / suite | Always |
| Typecheck | `tsc --noEmit` (project script) | Always |
| Lint | project lint script | Always |
| Production build | frontend build | Always |
| Targeted Playwright | changed surface specs | Always |
| Step 4-A WF E2E | `apollo-step4a-workflow.spec.ts` | If WF/chrome navigation touched |
| Step 5 Guided/3D/reapply | `apollo-step5-final-gui` + `apollo-step5r-residual` | If Guided/Viewer/sample touched |
| JP residual English | JP3A/JP3C or equivalent scan | If copy/DOM structure touched |
| Screenshots | desktop / tablet / mobile | UI-1+ visual PRs; required UI-6 |
| Keyboard + focus | manual or Playwright | UI-1..5 |
| Color-only status | assert text/symbol | WF/Guided status |
| Canonical before/after | serialize golden sample | If save wiring touched; recommended UI-6 |
| Serialize/reload compare | load saved file | UI-1/UI-6 |
| Checksum / STALE | existing unit/E2E | Must remain green; no algorithm change |
| Viewer=STL source | evidence note / unit | UI-3/UI-6 |
| Formal auth unchanged | S5R-012 + banner tokens | Any auth chrome PR |

## Testid preservation preference

Prefer **preserving** critical testids (P0-C list). If DOM moves, update specs in the **same** PR; do not leave red E2E on main.

## UI-6 dedicated regression

Broad sweep: all apollo E2E, full Vitest, screenshot audit, residual English, auth gates, serialize/checksum, Viewer/STL note.

## Verdict target

`REGRESSION_PLAN_VERDICT: PASS` (this document frozen for implementation use).
