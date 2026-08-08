# Phase MAIN3D — 山岳500m → メイン3D Viewer統合

## Status
COMPLETE（P08完了, Release Readiness GO）

## 目的
山岳500mサンプルを既存のメイン3D Viewerへ正式統合し、
「深い谷を400m連続高架橋が跨ぐ」状態を共通3Dシーン
（terrain + road + superstructure + substructure + frame）として
製品機能で確認できるようにする。

## 正規baseline
- origin/research/liner-r1-planning @ 3288e1cc6f3def3674a5e2def58018fdb480d10b

## 成果物
- samples/mountain-viaduct-500/: terrain(深谷)/substructure/scene/viewerSwitch/selection/viewer
- pages/LinerMain3DPage + route liner.main3d + preview「統合3D表示」導線
- tests/e2e/mountain-main3d.spec.ts
- レポート: PHASE_MAIN3D_FINAL_REPORT.md / MAIN3D_RELEASE_GATE.md
