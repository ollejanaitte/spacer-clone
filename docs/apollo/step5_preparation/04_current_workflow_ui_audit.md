# 04 — Current Workflow UI Audit

## Registry (CODE_CONFIRMED)

WF-01..WF-15 fixed in `workflow/registry.ts`. Groups: geometry, loads, analysis, outputs, governance.

| Step | Label | Capability notes |
|------|-------|------------------|
| WF-01 | 道路線形 | PLANNED binding (4-E); LINER route exists |
| WF-02 | 橋梁基本条件 | IMPLEMENTED generate |
| WF-03 | 床版・橋面付属物 | IMPLEMENTED presence + 4-C downstream; 4-G pending warning |
| WF-04 | 主桁断面 | Tied to structure input |
| WF-05 | ハンチ | IMPLEMENTED; 4-G pending when PROVIDED |
| WF-06 | 添接 | PLANNED (4-D) → BLOCKED |
| WF-07 | 荷重 | IMPLEMENTED load confirmation (4-C4) |
| WF-08 | 構造解析 | PARTIAL development probe + closed-form hookup |
| WF-09 | 候補照査 | PARTIAL development |
| WF-10 | 数量 | IMPLEMENTED |
| WF-11 | 3D表示 | IMPLEMENTED solids; dimensions 4-F PLANNED |
| WF-12..14 | 計算書/図面/ZIP | IMPLEMENTED artifacts but 4-G reintegration pending for new entities |
| WF-15 | 確認 | Ack only |

## Information density (CODE_CONFIRMED + INFERRED)

| Observation | Tag |
|-------------|-----|
| Control screen lists all steps with status/badges/diagnostics | CODE_CONFIRMED |
| Diagnostic codes and technicalDetail exposed to UI | CODE_CONFIRMED |
| High scroll / dense developer text on one screen | INFERRED from layout + prior 4-A docs |
| 「戻る / 保存して次へ」紙芝居 Guided Mode | NOT present as Workflow-driven slides (CODE_CONFIRMED: only shell GuidedStep) |
| Recommended step + navigation targets | CODE_CONFIRMED |

## Guided Mode gap

Existing `mode === "guided"` in `ApolloPhase1Shell` is a coarse onboarding flow (`start|sample|basics|editor|validation`), **not** the REQ-S5-006 one-theme-per-slide Workflow Guided Mode. Detail panels and WorkflowStateModel share canonical draft — good ownership pattern to reuse (CODE_CONFIRMED).
