# 04 — Workflow Master-Detail Design

**BASE_MAIN_SHA:** `7023cb61e7e2f7189e45b46dcb7edb0395320767`  
**UR:** UR-10, UR-11, UR-13

## Goal

Eliminate WF-01..WF-15 **full vertical card expansion** as the default view, while keeping all steps reachable and `buildWorkflowStateModel` unchanged.

## Pattern

**Master-detail** (preferred over pure slideshow):

1. **Navigator:** 15 compact rows — id, short label, status badge (symbol+text), recommended marker.
2. **Detail:** Selected step — full criterion, recommended action, primary/secondary CTAs, prioritized diagnostics.
3. **Default selection:** `currentRecommendedStepId` if present, else WF-01.

## Diagnostics priority in detail

| Priority | Show |
|----------|------|
| P1 | Blocking diagnostics (expanded) |
| P2 | Recommended action text |
| P3 | Non-blocking warnings (collapsed list) |
| P4 | L3 codes via TechnicalDetails |

## Testid strategy

- Keep `apollo-wf-step-WF-##` on navigator rows (or row + detail with stable testids).
- Keep `apollo-wf-step-list`, `apollo-wf-step-primary`, `apollo-wf-step-navigate`.
- Update unit tests that assumed 15 full card bodies visible simultaneously.

## Mounting

- WorkflowControlScreen becomes the body of **Workflow mode** (not embedded under Guided basics).
- Guided may deep-link: switch mode + select step id.

## Non-goals

- Changing evaluators/status enums
- Removing OUT_OF_SCOPE steps from the list
- Color-only status

## Verdict target

`WORKFLOW_REDESIGN_VERDICT: PASS` when UI-4 ships master-detail + Step4A E2E green.
