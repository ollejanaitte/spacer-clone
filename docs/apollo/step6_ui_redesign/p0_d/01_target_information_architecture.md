# 01 — Target Information Architecture

**STEP_ID:** `APOLLO_STEP_6_UI_P0_D`  
**BASE_MAIN_SHA:** `7023cb61e7e2f7189e45b46dcb7edb0395320767`  
**Depends on:** P0-A..C on main

## IA principles

1. One composition per mode first viewport (not a dashboard of everything).
2. Shared `ProjectModel` everywhere — no Guided/Viewer forks.
3. Beginner path (Guided) optimized for decide → confirm in 3D → next.
4. Expert path (一覧 / Workflow) optimized for status scan → one detail → panel.
5. L1 Japanese first; L3 technical folded.

## Top-level IA

```
ApolloPhase1Shell
├─ ApolloAppHeader
│   ├─ brand/kicker
│   ├─ ApolloModeSwitcher (guided | list | workflow*)
│   ├─ ApolloFileActions (open / save + dirty)
│   ├─ Help (onboarding)
│   ├─ Return to menu
│   └─ ApolloAuthorizationStatus (compact + disclosure)
├─ Mode body
│   ├─ Guided workspace (default)
│   ├─ List edit workspace
│   └─ Workflow workspace (expert control plane)
└─ Developer details (collapsed)
```

\* `workflow` may be a third mode **or** a route within list/expert chrome. **Decision (P0-D): expose Workflow as a third header mode** to stop co-mounting 15 cards inside Guided basics. Guided retains “詳細工程へ” escape to Workflow mode with recommended step selected.

## Guided workspace IA

```
ApolloProgressNavigator (chapters + G01–G15)
ApolloWorkspaceLayout
  ├─ ApolloInspectorPane (slide content + focused panel region)
  └─ ApolloViewerPane (Viewer3D primary)
ApolloStickyActionBar (戻る / 保存して次へ [/ 保存])
```

## Workflow workspace IA

```
WorkflowProgressSummary (compact)
ApolloWorkflowNavigator (15 compact rows)
ApolloWorkflowDetail (selected step: status, CTA, prioritized diagnostics)
```

## List workspace IA

```
Existing Unit2 editors + validation + workspace
ApolloWorkspaceLayout with Viewer when nodes exist
No Guided progress; Workflow available via mode switch
```

## Resolved open questions (from P0-B)

| OQ | Decision |
|----|----------|
| OQ-UI-01 | Retire **visual primacy** of legacy 6-step bar in Guided workspace; map start/sample/basics/editor/validation as **chapter labels** above G navigator where still needed for shell routing. G01–G15 become the primary progress UI. |
| OQ-UI-02 | Workflow is **not** co-mounted on Guided basics after UI-4; reachable via mode switch + Guided detail escape. |
| OQ-UI-03 | One global compact auth status in header; high-risk export/analysis panels keep compact banner until UI-6 confirms E2E coverage. |
| OQ-UI-04 | Tablet band: 800–1199px stacked; consider 1024px as documentation midpoint; implement with existing 1200/800 plus refined rules in UI-5. |
| OQ-UI-05 | Fix orphan viewer testid in **UI-3** (align `apollo-topology-view` / add alias `apollo-model-view-panel`). |

## Remaining open questions (non-blocking)

| OQ | Topic | Owner stage |
|----|-------|-------------|
| OQ-UI-06 | Exact chapter↔G slide mapping labels | UI-2 design tweak |
| OQ-UI-07 | Whether list mode shows a mini Viewer tab on mobile identical to Guided | UI-5 |
| OQ-UI-08 | Fullscreen Viewer toggle affordance copy | UI-3 |
