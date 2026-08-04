# 04 — Navigation Map

**BASE_MAIN_SHA:** `98ad5be376223be03449da835aec9a60f40e1cd9`

## Top-level mode

```
[Header]
  ガイド付きモード  → mode = guided
  一覧編集モード    → mode = list
  操作ガイド        → showOnboarding = true
  ファイルを開く    → openFromFile()
  保存              → saveToFile()
  メニューへ戻る    → onReturnToPro()
```

## Guided step graph

```
start
  ├─ サンプルを選ぶ          → sample
  ├─ Step 5 ガイド付きモード → basics (GuidedModeShell + Workflow + panels)
  ├─ ファイルを開く          → (file) then continue
  └─ 一覧編集へ              → mode=list

sample
  └─ 標準サンプル読込        → sampleLoaded

sampleLoaded
  ├─ 次へ（basics）          → basics
  └─ 一覧編集へ              → mode=list

basics
  ├─ Stepbar: start/basics/nodes/… → navigateStep / setGuidedStep
  ├─ G01–G15 internal jumps      → GuidedModeShell local state
  ├─ WF navigate / primary       → scroll/open panels or viewer
  ├─ 前へ                        → start
  └─ 次へ: 節点を確認            → editor (pane=nodes)

editor
  ├─ Stepbar navigation
  ├─ pane tabs: nodes/members/supports/materials
  └─ 次へ → validation (or previous → basics)

validation
  ├─ Workspace / completion cards
  └─ メニューへ戻る / 一覧編集
```

## List mode

```
mode=list
  → apollo-list-mode
  → project form + workspace + full editor + validation
  → NO stepbar, NO GuidedModeShell, NO WorkflowControlScreen
```

## Guided ↔ Detail escape

| Escape kind | Effect (shell) |
|-------------|----------------|
| `panel` | Scroll/focus target panel by `panelId` |
| `route` | External / pro route (e.g. liner) |
| viewer-related | Attempts scroll to `apollo-model-view-panel` (orphan testid — see open questions) |

## Workflow primary actions

`handleWorkflowPrimaryAction(stepId)` resolves registry definition and routes to generate / regenerate / review-3d / export / open panel — **control plane only**; work surfaces remain existing panels.

## Overlap note for redesign

On `basics`, beginners see **three** navigation systems at once (6-step bar, G01–G15, WF-01..15). Experts using list mode skip Guided/WF entirely. Redesign must clarify which navigator owns which journey without inventing a second data source.
