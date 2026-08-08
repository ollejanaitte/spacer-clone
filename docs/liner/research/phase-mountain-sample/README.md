# Phase MOUNTAIN-SAMPLE — 山岳連続高架橋500m 公式ショーケースサンプル

## Status
IN_PROGRESS（P00実施中）

## 目的
ユーザーが機能の強さを一目で理解できる公式ショーケース用サンプル
「山岳連続高架橋500m」を、既存の正規経路
（sample → Project State → backend計算 → visual/geometry3d payload → 模式図/Three.js）
で追加する。

## 正規baseline
- origin/research/liner-r1-planning @ f63da572d13409367da2509f63a211b78d6cfca5

## 作業パス
- /home/masaharu/Projects/spacer-clone-liner-r1-planning

## 既存正本（再利用）
- BuildIntermediateInput（core/pipeline/pipeline.ts）+ createDefaultLinerDraft
- AlignmentElement: Straight / CircularArc / Clothoid（core/types.ts）
- BuiltInSampleDataset / createBuiltInSampleProject（既存sample機構）
- Bridge Geometry（frontend core + Step2 backend bridge_geometry）
- geometry3d payload（Step2 backend + frontend core/geometry3d TS）
- 模式図（frontend core/visual）+ Three.js（@react-three/fiber / drei / three）
