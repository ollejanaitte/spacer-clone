# Workflow Master-Detail Design — UI-4

## Current Problem

WorkflowControlScreen renders all 15 WF steps as vertical mega-cards.
Each card is large, scroll burden is extreme, visual scan is difficult.

## Target: Master-Detail

### Master Panel (Navigation List)

Compact list of WF-01 to WF-15:

```
[WF-01]  計画条件                 ✓ 完了
[WF-02]  上部工断面設定           ✓ 完了
[WF-03]  付属物                   ▶ 実行中
[WF-04]  床版                     ○ 未着手
...       ...                     ...
```

- Each row: WF code, short label, status badge (icon + text + color)
- Current/recommended step highlighted with distinct background
- Recommended step: first incomplete step with all prereqs met (= suggested initial selection)
- Click any row to view detail
- Current detail step's row shows expanded indicator

### Detail Panel (Selected Step)

Single card showing detail for selected WF step:

```
┌─────────────────────────────────────────────┐
│ WF-04: 床版 (FLOOR_SLAB)                     │
│ Status: ○ 未着手                              │
│                                              │
│ 完了条件:                                     │
│ - 床版タイプが選択されている                    │
│ - 床版厚が入力されている                       │
│                                              │
│ 主要診断:                                     │
│ ✓ 入力項目は全て空です (can start)             │
│                                              │
│ [ 工程を開始 ]  [ 詳細診断 ▼ ]                 │
│                                              │
│ × 詳細診断 (展開)                             │
│   - Dependency: WF-02 完了が必要               │
│   - Capability: WF_CAPABILITY_PLANNED         │
│   (capability stubs show planned status,      │
│    never block downstream)                    │
└─────────────────────────────────────────────┘
```

- Show: state badge, completion conditions, primary diagnostics, CTA button
- "詳細診断" expandable section for detailed evaluator output
- CTA: "工程を開始" (if actionable), "View" (if complete), "ブロック中" (if BLOCKED with reason)
- Navigation: ◀ prev | next ▶ buttons at bottom of detail
- Direct step selection: always available via master panel

### Recommended Step

- Determined by: first WF step whose status is PENDING and all BINDING_PREREQUISITES are COMPLETE
- On initial load, detail panel opens to recommended step
- User can freely navigate away

### Data Model Invariants

- WorkflowStateModel: NOT MODIFIED
- WF-01–WF-15 meanings: NOT MODIFIED
- Evaluators, selectors, capability registry: NOT MODIFIED
- Status derivation logic: NOT MODIFIED
- WF-15 ack persistence: NOT MODIFIED

### Implementation

- New: `frontend/src/apollo/workflow/WorkflowNavigator.tsx` — master panel
- New: `frontend/src/apollo/workflow/WorkflowDetailCard.tsx` — detail panel
- New: `frontend/src/apollo/workflow/WorkflowStepBadge.tsx` — step status badge
- New: `frontend/src/apollo/workflow/WorkflowDiagnosticsSection.tsx` — collapsible diagnostics
- New: `frontend/src/apollo/workflow/WorkflowRecommendedSelector.ts` — recommended step logic
- Update: `WorkflowControlScreen.tsx` — switch to master-detail layout
- CSS: workflow-* rules
- Recomputation: Workflow state is derived; no new state storage