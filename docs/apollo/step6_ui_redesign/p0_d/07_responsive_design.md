# 07 — Responsive Design

**BASE_MAIN_SHA:** `7023cb61e7e2f7189e45b46dcb7edb0395320767`  
**UR:** UR-07, UR-08, UR-09  
**Implements:** P0-B `07_responsive_policy.md`

## Breakpoint table

| Name | Width | Layout contract |
|------|-------|-----------------|
| Desktop | ≥1200px | 2-pane Guided/List; Workflow list\|detail side-by-side |
| Tablet | 800–1199px | Stacked panes; Workflow navigator above detail |
| Mobile | ≤799px | Tabs Input/3D; Workflow list→detail drill-in |

## Implementation notes (UI-5)

1. Refine `@media` rules in `styles.css` apollo section; avoid changing unrelated media queries.
2. Ensure sticky footer + tab bar do not overlap (stack order defined).
3. Preserve min touch height ≥34px (current header button min-height).
4. Screenshot matrix required (desktop/tablet/mobile × Guided/Workflow).

## Verdict target

`RESPONSIVE_POLICY_VERDICT: PASS` when UI-5 completes with screenshot + mobile E2E evidence.
