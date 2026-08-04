# 01 — Screen Inventory

**BASE_MAIN_SHA:** `98ad5be376223be03449da835aec9a60f40e1cd9`  
**Primary source:** `frontend/src/apollo/ApolloPhase1Shell.tsx`

## Modes

| Mode ID | State | Default | Description |
|---------|-------|---------|-------------|
| `guided` | `mode === "guided"` | YES | Beginner path: start → sample → basics → editor → validation |
| `list` | `mode === "list"` | NO | Expert list edit: full editor without stepbar / Guided / Workflow |

Guided sub-steps (`guidedStep`): `start` | `sample` | `sampleLoaded` | `basics` | `editor` | `validation`.

## Screen table

| screen_id | Entry | Key testids | Major regions |
|-----------|-------|-------------|----------------|
| `shell-chrome` | Always | `apollo-phase1-shell`, `apollo-shell-kicker`, `apollo-reload-project`, `apollo-save-project`, `apollo-return-to-pro` | Header actions (6 buttons, visually identical) |
| `provisional-banner` | `flags.showProvisionalStatus` (default true) | `apollo-provisional-banner` | Large「非数値入力モード」banner |
| `onboarding` | First visit / 「操作ガイド」 | `apollo-onboarding` | 4-slide onboarding |
| `guided-start` | guided + `start` | `apollo-start-screen`, `apollo-open-sample-selection`, `apollo-open-step5-guided-mode` | Start cards |
| `guided-sample` | From start | `apollo-sample-selection`, `apollo-load-standard-sample` | Sample picker |
| `guided-sample-loaded` | After sample load | `apollo-sample-loaded-guide`, `apollo-sample-guide-primary-next` | Post-load guide |
| `guided-basics` | From start「Step 5 ガイド」or sample next | `apollo-basics-screen`, `apollo-stepbar`, `apollo-guided-mode-shell`, `apollo-workflow-control-screen`, panel testids, `apollo-topology-view` | **6-step bar + G01–G15 + WF-01..15 + all input panels + Viewer3D** |
| `guided-editor` | From basics「次へ: 節点」or stepbar | `apollo-editor-screen`, node/member/support/material editors | Unit2 editor + visual panel |
| `guided-validation` | From editor / stepbar | `apollo-validation-screen`, `apollo-validation-shell`, `apollo-completion-card`, `apollo-workspace-shell` | Validation + workspace |
| `list-mode` | Header「一覧編集モード」 | `apollo-list-mode` | Project + workspace + full editor + validation (no Guided/WF/stepbar) |
| `developer-info` | Always (collapsed) | `apollo-flag-matrix` | Flag / guard matrix |

## Sub-surfaces co-mounted on `guided-basics`

On `mode === "guided" && guidedStep === "basics"` the left column mounts, in order:

1. Project form
2. `GuidedModeShell` (G01–G15)
3. `WorkflowControlScreen` (WF-01..WF-15 full vertical list)
4. `BridgeStructureInputPanel`
5. `PavementMarkingInputPanel`
6. `DeckAppurtenanceInputPanel`
7. `RcDeckHaunchInputPanel`
8. Analysis / Load / Demand / Quantity / Report / Drawing / GA / Output panels
9. Sample overview card
10. Workflow actions (前へ / 次へ / 保存)

Right column: `apollo-unit2-visual-panel` → `renderModelView()` → `Viewer3D`.

## Progress systems visible on basics

| System | Count | Location |
|--------|-------|----------|
| `STEP_DEFINITIONS` | 6 (開始方法…入力チェック) | `renderStepBar()` |
| G01–G15 | 15 slides | `GuidedModeShell` progress list |
| WF progress + cards | 15 steps | `WorkflowProgressSummary` + `WorkflowStepCard` list |

## Layout classes (no dedicated inspector)

- `apollo-unit2-layout`: ~1.4fr editor | ~0.95fr visual
- `apollo-unit2-editor` / `apollo-unit2-visual-panel`
- Technical info is **not** a dedicated right inspector; it appears as repeated `TechnicalDetails`, Guided aside diagnostics, and topology summary above the viewer.

## Known selector orphan

`ApolloPhase1Shell` and `workflow/navigation.ts` query `[data-testid="apollo-model-view-panel"]`, but the shell renders `apollo-topology-shell` / `apollo-topology-view` only. Viewer scroll-to from WF-11 / Guided escape may fail. Documented as open question for implementation (do not fix in P0).
