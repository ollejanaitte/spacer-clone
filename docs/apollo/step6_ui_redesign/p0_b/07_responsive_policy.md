# 07 — Responsive Policy

**BASE_MAIN_SHA:** `ed14922aa9f1745df1ccd44d58f847d4d1574047`

## Current breakpoints (P0-A evidence)

| Width | Current Apollo behavior |
|-------|-------------------------|
| default (desktop) | `apollo-unit2-layout` 2-column (~1.4fr / 0.95fr) |
| ≤1200px | Layout grids → 1 column |
| ≤900px | Guided body → 1 column |
| ≤800px | Header stacks; topology min-height 360 |

## Target policy

| Class | Width guidance | Layout |
|-------|----------------|--------|
| **Desktop** | ≥1200px (keep current wide) | 2-pane: inspector (input/progress) \| Viewer primary; sticky Guided footer |
| **Tablet** | 800px–1199px (propose explicit **1024px** split in P0-D if needed) | Stacked: progress + input above; Viewer below with min-height; sticky footer |
| **Mobile** | ≤799px | Tabs:「入力」/「3D」; header actions wrap; sticky Guided footer; Workflow list+detail stacked |

## Rules

1. Do not keep desktop 2-pane below the tablet threshold if columns become unusable (< ~360px each).
2. Viewer must remain reachable in ≤2 taps/clicks on mobile (tab or jump control).
3. Sticky footer must not cover primary inputs without scroll padding (`padding-bottom` on content).
4. Touch targets ≥ existing Apollo min-heights; do not regress JP3 mobile a11y.
5. Status must not be color-only at any breakpoint (symbol + text).
6. Japanese L1 labels; do not truncate into English abbreviations.

## Screenshot matrix (implementation verification)

| Mode | Desktop | Tablet | Mobile |
|------|---------|--------|--------|
| Guided (mid slide) | required | required | required |
| Workflow master-detail | required | required | required |
| List edit + viewer | required | optional | required (tabs) |

## Accessibility (carried from Step 5 JP)

- Focus visible on mode switch, sticky actions, WF list, tabs
- Keyboard: mode → progress → input → viewer toggle → sticky actions
- `aria-current` for active mode / slide / WF selection / mobile tab
