# 05 — Viewer Data Flow

**BASE_MAIN_SHA:** `98ad5be376223be03449da835aec9a60f40e1cd9`

## Single source of truth

```
ProjectModel
  └─ getApolloPhase1Unit2Draft / buildApolloPhase1Unit2ViewProject
       ├─ buildApolloVisualizationModel({ project, draft })
       │    └─ visualization/
       │         builder.ts
       │         bridgeStructureSolids.ts
       │         appurtenanceHaunchSolids.ts
       │         pavementMarkingSolids.ts
       │         designEntityBinding.ts
       │    └─ ApolloVisualizationBuildResult
       │         ├─ → Viewer3D (apolloVisualizationModel prop)
       │         └─ → STL export (apolloStlExport.ts) same model family
       └─ buildWorkflowStateModel(project)  [status only; not mesh]
            └─ selectors may call visualization readiness for WF-11
```

## Shell → Viewer3D props (evidence)

`renderModelView()` passes approximately:

- `apolloVisualizationModel`
- `apolloSelectionKeys`
- `apolloValidationHighlight`
- `project={viewProject}`
- `result={null}` (numeric results unpublished)
- `selectedSection`, `selection`
- `activeLoadCase=""`
- `onSelectionChange`, `onViewerError`
- `viewPanelOpen` / `onViewPanelToggle`
- `onVisibilityChange`

Rendered inside `apollo-topology-view` within `apollo-unit2-visual-panel`.

## Dependencies of 3D / STL / quantity / load / analysis

| Artifact | Depends on | UI note |
|----------|------------|---------|
| 3D scene | Visualization builder + solids | Layout may move Viewer; generation frozen |
| STL | Visualization / export path | Must remain same data source as Viewer |
| Quantity | `quantity/*` + bridgeStructure | Expert panels; not a second geometry model |
| Load | `loads/*` | Expert panels |
| Analysis | `analysis/*` adapters | NOT_GRANTED; fail-closed |
| Workflow WF-11 | selectors using viz readiness | Status only |

## Redesign constraints

1. Do **not** create an independent Viewer data store.
2. Do **not** change solids / builder / STL algorithms in UI PRs.
3. Do **not** feed Guided Mode a different project snapshot than Workflow / panels.
4. Viewer placement (sticky pane, tab on mobile, fullscreen toggle) is a **layout** concern only.
5. Fixing the orphan `apollo-model-view-panel` testid is an implementation follow-up (align testid or navigation selector) — out of P0 docs scope beyond recording.
