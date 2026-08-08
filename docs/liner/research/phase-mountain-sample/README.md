# Phase MOUNTAIN-SAMPLE — 山岳連続高架橋500m 公式ショーケースサンプル

## Status
COMPLETE（P10完了, Release Readiness GO）

## 目的
ユーザーが機能の強さを一目で理解できる公式ショーケース用サンプル
「山岳連続高架橋500m」を、既存の正規経路
（sample → Project State → backend計算 → visual/geometry3d payload → 模式図/Three.js）
で追加する。

## 正規baseline
- origin/research/liner-r1-planning @ f63da572d13409367da2509f63a211b78d6cfca5

## 成果物
- frontend/src/liner/samples/mountain-viaduct-500/（schema/fixture/terrain/camera 等）
- App.tsx sample導線 / LinerLauncherPage sample card
- tests/e2e/mountain-sample-workflow.spec.ts
- レポート: PHASE_MOUNTAIN_SAMPLE_FINAL_REPORT.md / MOUNTAIN_RELEASE_GATE.md
