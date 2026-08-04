# 05 — Viewer Layout Design

**BASE_MAIN_SHA:** `7023cb61e7e2f7189e45b46dcb7edb0395320767`  
**UR:** UR-07, UR-08, UR-09

## Goal

Make 3D Viewer the **primary visual pane**, not a scrolled-away side column under a tall left stack.

## Data (unchanged)

```
ProjectModel → buildApolloVisualizationModel → Viewer3D
                 ↘ STL export (same family)
```

## Layout

| Breakpoint | Behavior |
|------------|----------|
| Desktop | `ApolloWorkspaceLayout` 2-pane; Viewer pane sticky within viewport height where feasible |
| Tablet | Stacked under inspector; min-height ≥360–420px |
| Mobile | Tab「3D」full width; preserve existing viewer controls |

## Shell responsibilities vs Viewer3D

| Change in shell/CSS | Prefer |
|---------------------|--------|
| Pane sizing, sticky, tabs, fullscreen overlay chrome | YES |
| SceneBuilder / solids / selection protocols | NO |
| Viewer3D.tsx internals | Only if shell cannot achieve layout; then smoke App/Liner/Compare |

## Testid alignment (UI-3)

- Render/alias `data-testid="apollo-model-view-panel"` on the topology/viewer wrapper **or** update `navigation.ts` to `apollo-topology-view`.
- Prefer adding alias on wrapper to minimize E2E churn while fixing scroll targets.

## Fullscreen / focus

- Optional toggle to expand Viewer within shell (not a new route).
- Must not disable sticky Guided actions permanently; restore on exit.

## Verdict target

`VIEWER_LAYOUT_VERDICT: PASS` when UI-3 completes desktop 2-pane + testid fix + same-source check.
