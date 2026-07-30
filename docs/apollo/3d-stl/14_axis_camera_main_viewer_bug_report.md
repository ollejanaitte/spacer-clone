APOLLO_3D_AXIS_BUG_REPORT_VERDICT: CONFIRMED_MULTIPLE_CAUSES
APOLLO_3D_MAIN_VIEWER_SOLID_REPORT_VERDICT: PARTIAL_NOT_PROP_FLOW
APOLLO_3D_FIT_REPORT_VERDICT: CONFIRMED
RECOMMENDED_NEXT_STEP: FIX_PR_B_AXIS_CAMERA_FIT_AND_MAIN_VIEWER_PRESENTATION

# 14. Apollo 3D Axis / Camera / Main Viewer Bug Report

## 1. 目的

本書は、Thursday, July 30, 2026 時点の `origin/main` で確認した Apollo 3D viewer の軸方向、camera preset、fit-to-model、main viewer solid presentation の不具合を、実装修正前の根拠資料として固定する。

## 2. 症状分類

| 症状 | 判定 | 要約 |
|---|---|---|
| bridge が縦向き/斜め向きで見づらい | `CONFIRMED` | default / iso view の見え方が Apollo 橋梁 viewer として不自然 |
| XY / YZ / XZ と見え方が一致しない | `CONFIRMED` | world plane 表示と Apollo user expectation の対応が UI に明示されていない |
| simple solid が main viewer に表示されない | `PARTIAL` | solid 自体は描画されているが、fit/camera により視認しづらい |
| fit-to-model 後に橋が小さい/遠い | `CONFIRMED` | bbox 対象が広すぎる可能性が高い |

## 3. Browser Reproduction

- route: `http://127.0.0.1:5173/pro/apollo`
- evidence:
  - `tmp/apollo-browser-viewer/02_viewport_default.png`
  - `tmp/apollo-browser-viewer/view_iso.png`
  - `tmp/apollo-browser-viewer/view_xy.png`
  - `tmp/apollo-browser-viewer/view_xz.png`
  - `tmp/apollo-browser-viewer/view_yz.png`
- confirmed facts:
  - simple solid は描画されている
  - default / iso view は橋梁全体が斜めで小さく見える
  - `view_xy.png` は相対的に自然だが、他 preset は user-facing 名称と対応が不明瞭

## 4. Electron Reproduction

- environment:
  - headless shell では `Missing X server or $DISPLAY`
  - `xvfb-run` 上では Apollo shell までは起動できた
- evidence:
  - `tmp/apollo-electron-repro/00_root.png`
  - `tmp/apollo-electron-repro/01_apollo_shell.png`
  - `tmp/apollo-electron-repro/trace.log`
- status:
  - `PARTIAL`
- note:
  - Electron 仮想 X repro は `apollo-topology-view` 可視化待ちで停止したため、post-fix smoke で再試行する

## 5. Root Cause Classification

### 5.1 CAMERA_UP_BUG

- evidence:
  - shared viewer helper は Y-up 前提
  - Apollo contract は `x-longitudinal-y-transverse-z-up`
- consequence:
  - preset direction が完全に誤っていなくても、scene 全体の視覚手掛かりが Apollo Z-up と衝突する

### 5.2 CAMERA_PRESET_BUG

- evidence:
  - existing preset names は `XY / YZ / XZ`
  - Apollo user expectation は `平面 / 側面 / 正面`
- consequence:
  - `XY / YZ / XZ` が internal plane 名としては正しくても、橋梁 viewer の操作語彙として曖昧

### 5.3 BBOX_FIT_BUG

- evidence:
  - Apollo fit は line/solid/label/marker を広く union している
  - markers と labels が橋梁本体よりも fit distance を押し広げる
- consequence:
  - bridge 本体が過小表示される

### 5.4 MAIN_VIEWER_PROP_FLOW_BUG

- evidence:
  - 現時点では不支持
  - `ApolloPhase1Shell -> buildApolloVisualizationModel -> Viewer3D -> ThreeViewport -> SceneBuilder -> ApolloVisualizationRenderer` の path は確認できた
- conclusion:
  - 現象 3 の主因としては採用しない

## 6. Required Design Changes

- Apollo path の `camera.up` を `Z-up = (0, 0, 1)` に固定
- user-facing preset 名称を `全体 / アイソメ / 平面 / 側面 / 正面` へ整理
- Apollo path の fit bbox 既定対象から labels / helper / markers を除外
- Apollo line-model / solid-model / support / label / bbox / raycaster で同一座標規約を使用
- main viewer solid default visibility を維持し、initial presentation を壊さない

## 7. Out Of Scope

- STL export
- manifest
- Electron save/export IPC
- Apollo persistence schema change
- BridgeDefinition 正式 SoR 拡張
