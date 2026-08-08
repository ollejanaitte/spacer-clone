# STEP-3 S3-UX00 — Preflight / UI Integration Freeze

## Baseline（再確認）
- origin/research/liner-r1-planning @ 676971272037c5634aeadc206c17f2fe77173469
- origin/main @ 32603ee（LINER系未統合。Step3はresearch側を正規baseline）
- backend 全体: 1074 passed（退行なし）
- frontend: vitest 個別 PASS（LinerGridPreview / CrossSectionPreview）

## 既存 frontend 構成（正本）
| レイヤ | 実体 |
|--------|------|
| 計算コア | core/pipeline (buildIntermediateResult), core/geometry/horizontal, core/verticalSampling, core/crossSection*, core/bridge, core/grid |
| アダプタ | adapters/linerPreviewAdapter, linerViewerAdapter, linerUiAdapter |
| 画面 | pages/LinerEditPage, LinerSetupTabs, LinerFormalDrawingWorkspacePage, LinerPreviewPage |
| 模式図 | components/LinerGridPreview(PLAN), CrossSectionPreview(SECTION), VerticalProfileChart(PROFILE), BridgeLayoutEditor |
| 出力 | exports/(roadReport, roadCsvExport, linerPlanDxf, linerProfileDxf), drawing/, dxf/ |
| 3D | exports/linerFrameStl, mapper/frameModelMapper |
| E2E | playwright, electron |

## Step3 結合方針（Freeze）
- **計算正本 = 既存 frontend core**。backend は検証・帳票・3D payload の正本（Project Replay で照合）。
- 模式図は既存 core の結果（CanonicalLinerIntermediateResult 等）を描画。
- **Step2 visual contract を TS 型として frontend に移植**（FieldToDiagramMapping /
  VisualState INPUT|VALIDATED|CALCULATED / VisualHighlight / VisualWarning / VisualError /
  DiagramPayload）。UI の mode 分離に使用。
- **geometry3d payload を TS 型 + 描画**（Step2 と同一の JSON 形状）。

## 実装順序（S3-UX01〜UX11 正本）
SVG共通基盤 → H-ALIGN → V-PROF → X-SECT → B-BRIDGE → O-OUTPUT/REPLAY →
LIVE PREVIEW → ナビゲーション → 3D → E2E → 最終gate

## 禁止事項
- backend数値計算をfrontendへコピー / UI独自solver / 符号規約の独自解釈 /
  FieldToDiagramMapping独自解釈 / INPUT|VALIDATED|CALCULATED混同 / JIP-LINER単純コピー /
  main直接変更 / reset / force push / 並行branch破壊

## Defeered（Step3で数値実装しない）
- widening算定式数値表 / 建築限界詳細条文 / GM-03〜05 / GM-01幅員の一部 / GM-02主要点X/Y
  → UIでは DEFERRED / NEEDS_RESEARCH を正しく表示

## Critical Uncommitted Data
- docs/liner/research/road-structure-ordinance/（untracked, 設計根拠）

## COLLISION / 保護対象
- Apollo STEP10 / substructure / Reference Bridge の並行作業を壊さない
- backend X4-A/B/C/D を壊さない（Step3はfrontend中心）
