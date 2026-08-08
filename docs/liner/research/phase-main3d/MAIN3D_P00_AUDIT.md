# MAIN3D P00 — Preflight / 3D Contract Audit / Freeze

## Baseline
- origin/research/liner-r1-planning @ 3288e1cc6f3def3674a5e2def58018fdb480d10b
- frontend 972 / backend 1074 / E2E 5 PASS（山岳サンプル P11 時点）

## 現状3D契約の監査

### 既存の3D表示（再確認）
| 画面 | Viewer | 表示 |
|------|--------|------|
| LinerPreviewPage | MountainViaduct3dViewer（r3f） | terrain + centerline + 橋脚/橋台マーカー + camera presets |
| LinerMappingReviewPage | Viewer3D（frame） | 骨組みモデル（frame nodes/members） |

### 現行geometry3d / builders
- Step2 backend: BridgeGeometry3dPayload（centerline/edges/sections/piers/girders/nodes）
- frontend core/geometry3d: polylinePositions/indices, centerline/edges/pier/girder/node builders
- 山岳サンプル独自: terrain heightfield + markers（SupportMarker3d）

### ギャップ（本Phaseで解消）
1. **terrain の谷が深くない**（現在は幅広い緩やかな谷。STA.180〜320中心の深い谷へ改修）
2. **下部工 mesh が未統合**（マーカーはあるが column/cap/support zone の3D形状なし）
3. **Unified 3D scene contract が未定義**（terrain/road/bridge/frame を1sceneに統合する型）
4. **メイン3Dへの導線が未整備**（「メイン3Dで開く」ボタンなし）
5. **model/layer switch 未実装**（フレーム/道路/橋梁/地形/統合の切替）
6. **選択/ハイライト連携 未実装**

## Implementation Freeze（P01〜P08）
- P01 terrain 深谷改修
- P02 Abutment/Pier 3D builders（column/cap/support）
- P03 Unified3DScene contract（terrain/road/bridge/frame/metadata/bounds/camera）
- P04 メイン3D Viewer 統合 scene（r3f）
- P05 Model switch / Layer switch
- P06 Camera presets / sample-to-main3D navigation
- P07 Selection/highlight / Save-Reload
- P08 UI E2E / Electron E2E / full regression / final freeze

## 禁止
Three.js側で線形再計算 / frontendでstation→XYZ再実装 / pier手置き /
terrainでroad Z改変 / random terrain / existing frame viewer破壊 /
backend numerical contract無断変更

## Critical Uncommitted Data
- docs/liner/research/road-structure-ordinance/（untracked）
- apollo step4c evidence（並行lane, 触らない）
