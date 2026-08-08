# Phase MAIN3D — 山岳500m → メイン3D Viewer統合

## Status
IN_PROGRESS（P00実施中）

## 目的
山岳500mサンプルを既存のメイン3D Viewerへ正式統合し、
「深い谷を400m連続高架橋が跨ぐ」状態を共通3Dシーン
（terrain + road + superstructure + substructure + frame）として
製品機能で確認できるようにする。

## 正規baseline
- origin/research/liner-r1-planning @ 3288e1cc6f3def3674a5e2def58018fdb480d10b

## 作業パス
- /home/masaharu/Projects/spacer-clone-liner-r1-planning

## 既存正本（再利用）
- mountain sample: samples/mountain-viaduct-500/（P00-P11: terrain/markers/viewer/fixture）
- main 3D: viewer/Viewer3D.tsx + ThreeViewport.tsx（frame表示, LinerMappingReviewPage で使用）
- geometry3d: core/geometry3d/（TS builders）
- 既存frame: mapper/frameModelMapper.ts
