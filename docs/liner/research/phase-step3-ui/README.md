# Phase STEP-3 — 模式図UI完全結合・E2E検証

## Status
IN_PROGRESS（S3-UX00実施中）

## 目的
Step2 で完成した backend / domain / 模式図データ契約を、既存 frontend/src/liner の実UIへ正式に結合する。

## 正規baseline
- origin/research/liner-r1-planning @ 676971272037c5634aeadc206c17f2fe77173469

## 作業パス
- /home/masaharu/Projects/spacer-clone-liner-r1-planning

## 関連リポジトリ
- https://github.com/ollejanaitte/spacer-clone.git（origin）

## 正本設計書
- docs/liner/research/phase-ux-reaudit/（UX_P01〜P09）
- docs/liner/research/phase-step2-implementation/（PHASE_STEP2_FINAL_REPORT / STEP3_GATE）
- UX_P09_PLAN_REVISION.md（S3-UX01〜UX11）

## Step3 結合アーキテクチャ（S3-UX00 確定）
- 計算正本: 既存 frontend core（buildIntermediateResult / buildLinerPreviewFromDraft）。
  UI で backend を直接呼ぶのではなく、既存 core を正本として UI を完成させる。
  （UI 独自の geometry solver 禁止、Step2 backend 計算の再実装禁止）
- 模式図データ契約: Step2 backend/rule_engine/visual の契約
  （VisualObject / FieldToDiagramMapping / VisualState / Highlight / Warning / Error）を
  frontend の TS 型 + adapter として実装。
- 3D: Step2 backend/rule_engine/geometry3d の payload を TS 型 + Three.js 描画。
