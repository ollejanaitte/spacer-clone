# 03 — CSS Impact Map

**BASE_MAIN_SHA:** `ee045b353ade480a9d2a857c7f48215973274273`  
**File:** `frontend/src/styles.css` (Apollo section ~L5744+)

## Regions likely edited

| CSS region | Approx lines | UR mapping | Notes |
|------------|--------------|------------|-------|
| `.apollo-unit2-header*` / `.apollo-unit2-header-actions button` | 5754–5811 | UR-01 UR-02 UR-03 | Split mode vs action styles; active mode |
| `.apollo-phase1-banner` | 5813–5816 | UR-04 | Compact provisional strip |
| `.apollo-authorization-banner*` | 6756–6771 | UR-04 | Compact density |
| `.apollo-unit2-layout` / editor / visual-panel | 5897–5910 | UR-07 | Sticky panes; min-heights |
| `.apollo-stepbar*` | 6029–6092 | UR-05 | Possibly hide/replace when integrated progress lands |
| `.apollo-guided-shell` / header / progress / body / side | 6610–6708 | UR-05 UR-12 | Progress redesign |
| `.apollo-guided-nav` | 6710–6720 | UR-06 | Add sticky/fixed + safe-area padding |
| `.apollo-wf-screen` / progress / step-list / step-card* | 6273–6597 | UR-10 UR-11 | List+detail layout |
| `@media (max-width: 1200px)` | 6234–6246 | UR-08 | Tablet policy refine |
| `@media (max-width: 900px)` guided | 6723–6726 | UR-08 | |
| `@media (max-width: 800px)` | 6248–6269; 6599–6607 | UR-09 | Mobile tabs; header wrap |
| New classes (proposed names in P0-D) | TBD | UR-01..09 | Prefer additive classes; deprecate gradually |

## CSS regions to avoid

| Region | Why |
|--------|-----|
| Non-`.apollo-*` Pro/LINER/wizard blocks earlier in file | Out of scope |
| WF badge color tokens that encode status without text | Keep text+symbol a11y; colors may stay as supplement |
| Print / export HTML styles outside Apollo shell | Untouched |

## Cross-impact

- `.apollo-unit2-header-actions button` currently shares rules with `.apollo-editor-card button`. Splitting selectors carefully avoids changing every panel button unintentionally.
- Sticky footer requires content `padding-bottom` on `.apollo-guided-shell` / layout wrappers.
- Mobile tabs need new classes; do not overload `.apollo-unit2-tabs` without checking editor pane tabs.

## Verification

Desktop / tablet / mobile screenshots after each CSS-touching PR; `git diff` limited to intended apollo regions.
