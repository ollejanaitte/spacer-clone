# 02 — Dependency Graph (UI redesign relevant)

**BASE_MAIN_SHA:** `ee045b353ade480a9d2a857c7f48215973274273`  
Evidence: import scan of `frontend/src/apollo` + `frontend/src/viewer` on this SHA.

## Control / presentation plane

```
ApolloRouteHost
  └─ ApolloPhase1Shell  (outbound ~37)
        ├─ header chrome / mode / file / banner / stepbar / layout
        ├─ GuidedModeShell ← guided/index
        │     ├─ slides.ts / chrome.ts / types
        │     ├─ buildWorkflowStateModel (workflow/index) [read-only status]
        │     ├─ AuthorizationBanner → TechnicalDetails
        │     └─ i18n getters
        ├─ WorkflowControlScreen
        │     ├─ buildWorkflowStateModel
        │     ├─ WorkflowProgressSummary
        │     └─ WorkflowStepCard
        │           ├─ WorkflowStatusBadge
        │           └─ WorkflowDiagnosticsPanel → TechnicalDetails
        ├─ work-surface panels (Bridge/Pavement/Appurtenance/Haunch/…)
        │     └─ AuthorizationBanner (many) + domain models
        ├─ scrollWorkflowTargetIntoView (workflow/navigation.ts)
        ├─ buildApolloVisualizationModel (visualization/*)  [PROTECTED generation]
        └─ Viewer3D (viewer/*)  [shared with App/Liner/Compare]
```

## Workflow SoR (do not edit for UI)

```
workflow/index.buildWorkflowStateModel
  ├─ registry.ts          (WF-01..15)
  ├─ dependencies.ts
  ├─ capabilityRegistry.ts
  ├─ evaluators.ts
  │     └─ selectors.ts ──→ may read visualization readiness
  ├─ diagnostics / recommendedAction
  └─ authorizationSummary (NOT_GRANTED)
```

UI components **consume** `buildWorkflowStateModel`; they must not fork evaluation.

## Viewer / STL (single source)

```
ProjectModel + Unit2 draft
  → buildApolloVisualizationModel
       → Viewer3D.apolloVisualizationModel
       → export/apolloStlExport (same family)
```

## Blast radius notes

| Node | Inbound | Risk if edited carelessly |
|------|---------|---------------------------|
| `AuthorizationBanner` | 17 | Many panels + E2E auth |
| `TechnicalDetails` | 19 | L3 disclosure pattern |
| `Viewer3D` | 7 incl non-Apollo | App/Liner/Compare regressions |
| `viewer/types.ts` | 28 | Broad type churn |
| `workflow/registry.ts` | 7 SoR | Status/order breakage |
| `ApolloPhase1Shell` | 2 | Entire Apollo UX + most E2E |

## Graph implication for PR slicing

1. **UI-1** can touch shell header + AuthorizationBanner presentation + CSS without Workflow master-detail.
2. **UI-2** GuidedModeShell + CSS sticky + guided tests — avoid WF restructure same PR.
3. **UI-3** shell layout / navigation selector — avoid Viewer3D internals if wrapper CSS suffices.
4. **UI-4** WorkflowControlScreen + StepCard + WF tests — avoid Guided progress redesign same PR.
5. **Do not** open a PR that edits Shell + Guided + WF + Viewer3D + all CSS together.
