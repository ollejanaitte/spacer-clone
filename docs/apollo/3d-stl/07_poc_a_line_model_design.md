APOLLO_3D_POC_A_EVIDENCE_VERDICT: PASS
APOLLO_3D_POC_A_ARCHITECTURE_VERDICT: FROZEN_WITH_PROVISIONAL_ITEMS
APOLLO_3D_POC_A_DATA_MAPPING_VERDICT: FROZEN
APOLLO_3D_POC_A_LIFECYCLE_VERDICT: FROZEN
APOLLO_3D_POC_A_IMPLEMENTATION_READINESS: READY_WITH_PROVISIONAL_POC_ASSUMPTIONS
RECOMMENDED_NEXT_STEP: STEP5_SELECTION_VALIDATION_DESIGN

# Apollo Phase 1 3D表示・STL出力 Step 4 PoC-A 3D骨組み表示設計

## 1. 目的

- 本書は、既存 Apollo データだけを使って node、member、support、label を 3D line-model として表示する PoC-A の実装設計を凍結する。
- 本書は本実装を含まない。実装開始後に scene ownership、再描画契約、fallback、selection 接続で迷わない状態を作る。

## 2. current implementation evidence

`CONFIRMED`:

- `ApolloPhase1Shell` は既存 `Viewer3D` を埋め込み、`viewProject` を read-only projection として渡している。`frontend/src/apollo/ApolloPhase1Shell.tsx`
- `buildApolloPhase1Unit2ViewProject()` は `apolloPhase1Unit2` draft から `ProjectModel` 互換の表示用 project を生成する precedent である。`frontend/src/apollo/unit2Draft.ts`
- `Viewer3D` は `ThreeViewport` と `Fallback2DViewport` を切り替える wrapper である。`frontend/src/viewer/Viewer3D.tsx`
- `ThreeViewport` は mount 時に renderer/scene/controls を構築し、structural prop 変更時は `safeRebuildModelScene()` で full rebuild する。`frontend/src/viewer/ThreeViewport.tsx`
- `SceneBuilder` は node/member/support/load/label group を持ち、各 rebuild で group 単位に置換する。`frontend/src/viewer/SceneBuilder.ts`
- `Fallback2DViewport` は 2D fallback で node/member/support/load/label と fit request を継承する。`frontend/src/viewer/Fallback2DViewport.tsx`
- existing 3D spec は label、selection、fit、camera preset、fallback 2D を要求している。`docs/frame/viewer/09_3d_view_spec.md`

## 3. PoC-A 表示対象 / 非表示対象

表示対象:

- nodes
- members
- supports
- node labels
- member labels
- grid
- axis helper
- camera presets
- fit-to-model

非表示対象:

- loads
- result overlays
- deformed shape
- bridge solids
- STL preview
- material / section / validation-specific 3D badges
- hover tooltip

`PROVISIONAL`:

- support label は Step 4 では非表示とし、必要なら Step 5 以降の validation/selection 設計で再評価する。

## 4. component diagram

```text
ApolloPhase1Shell
  -> buildApolloPhase1Unit2ViewProject(project)
  -> Viewer3D
      -> ThreeViewport
          -> SceneBuilder.createSceneGroups()
          -> SceneBuilder.rebuildModelScene()
              -> NodeRenderer
              -> MemberRenderer
              -> SupportRenderer
              -> Label renderers
      -> Fallback2DViewport
```

## 5. data flow

```text
ProjectModel
  + project.apolloPhase1Unit2
    -> buildApolloPhase1Unit2ViewProject()
    -> PoC-A viewProject
    -> Viewer3D props
    -> ThreeViewport / Fallback2DViewport
    -> ephemeral scene objects
```

禁止:

```text
Three.js object -> ProjectModel
Fallback view state -> ProjectModel
Viewer camera state -> apolloPhase1Unit2
```

## 6. scene ownership

- `FROZEN`: React owner は `ApolloPhase1Shell` とし、Three.js owner は `ThreeViewport` とする。
- `FROZEN`: `ThreeViewport` は mount 時に renderer/scene/camera/controls/groups を構築し、unmount 時に dispose する。
- `FROZEN`: scene graph は `SceneGroups` を使い、`nodes`, `members`, `supports`, `labels` を主 group とする。
- `FROZEN`: PoC-A は full rebuild を採用し、incremental rebuild は採らない。

理由:

- current implementation は already full rebuild を採用している。
- selection、undo/redo、import/reload、invalid cleanup を deterministic に扱いやすい。
- bridge solid 追加前の line-model では object count が限定的で、設計コストより整合性を優先できる。

## 7. entity mapping table

| Source | 生成 object | sourceEntityId 保持 | selection | invalid data時 |
|---|---|---|---|---|
| node | point/sphere marker | `userData.type=node`, `userData.id=node.id` | yes | 非 finite 座標は skip |
| member | line / wide line | `userData.type=member`, `userData.id=member.id` | yes | missing node / zero length は skip |
| support | support glyph/block | `userData.type=support`, `userData.id=support.nodeId` または derived key | no direct pick in Step 4 | missing node は skip |
| node label | sprite | `userData.ownerType=node`, `userData.ownerId=node.id` | no | label omit |
| member label | sprite | `userData.ownerType=member`, `userData.ownerId=member.id` | no | label omit |

`PROVISIONAL`:

- support direct pick は Step 4 では非必須とし、Step 5 で viewer click model を node/member/support へ拡張する。

## 8. camera / control spec

- `CONFIRMED`: existing preset は `iso | xy | yz | xz`。`frontend/src/viewer/types.ts`, `frontend/src/viewer/ThreeViewport.tsx`
- `FROZEN`: PoC-A preset alias は以下とする。
  - `top` = `xy`
  - `front` = `xz`
  - `side` = `yz`
  - `isometric` = `iso`
- `CONFIRMED`: controls は existing `OrbitControls` を再利用する。
- `FROZEN`: orbit, zoom, pan, damping は existing viewer behavior を維持する。
- `FROZEN`: initial fit と resize fit は current `fitCameraToBox()` ベースとする。

## 9. fit-to-model / model bounding box

- `CONFIRMED`: `computeModelBox()` と `fitCameraToBox()` が既存 helper である。`frontend/src/viewer/threeUtils.ts`
- `FROZEN`: PoC-A の bounding box は node positions を唯一の authoritative source とする。
- `FROZEN`: invalid node を除いた finite node set から box を計算する。
- `FROZEN`: empty box 時は existing fallback box `[-1,1]` を継承する。

## 10. label 生成方式

- `CONFIRMED`: label は sprite として生成され、 camera facing で表示される。`frontend/src/viewer/threeUtils.ts`
- `CONFIRMED`: `labelSamplingStride()` と `cullOverlappingLabels()` による label 抑制 precedent がある。
- `FROZEN`: Step 4 では current label generation と collision avoidance を継承する。
- `FROZEN`: label text は `label ?? id` を優先する。

## 11. display-only coordinate transform

- `CONFIRMED`: display coordinate transform は `createNodeMap()` と `applyViewerDisplayTransform()` で適用される。`frontend/src/viewer/threeUtils.ts`
- `FROZEN`: PoC-A は Step 1 座標契約に反しない display-only transform として現行実装を利用する。
- `FROZEN`: source node 座標を mutation しない。

## 12. rebuild lifecycle

```text
Apollo draft change
  -> buildApolloPhase1Unit2ViewProject()
  -> Viewer3D props update
  -> ThreeViewport effect
  -> safeRebuildModelScene()
  -> replaceGroupContents()
  -> dispose old objects
```

再構築契約:

- draft 変更時: full rebuild
- undo/redo 時: full rebuild
- save/reload 後: full rebuild
- fit request 時: rebuild なし、camera fit のみ
- visibility toggle 時: rebuild なし、group visible 切替

## 13. empty / invalid data handling

- `FROZEN`: `draft.nodes.length === 0` の場合、`ApolloPhase1Shell` 側で empty state を表示し、viewer mount 自体を行わない。
- `FROZEN`: invalid member reference や zero-length member は renderer 側で skip する。
- `FROZEN`: missing node reference は validation issue として別途扱い、PoC-A viewer はクラッシュしない。
- `FROZEN`: WebGL 初期化失敗または render failure 時は `Fallback2DViewport` または line-only fallback を継承する。

## 14. error / fallback design

- `CONFIRMED`: `Viewer3D` は `onViewerError` を受け、error banner を表示できる。
- `CONFIRMED`: `ThreeViewport` は renderer 初期化失敗時に `onInitializationError` を呼ぶ。
- `CONFIRMED`: `activateViewerFallback()` は line-only degrade を行う。
- `FROZEN`: PoC-A は以下の順で degrade する。
  1. WebGL 初期化失敗: `Fallback2DViewport`
  2. render 途中失敗: `activateViewerFallback()` による line-only degrade
  3. zero nodes: shell empty state

## 15. browser / Electron 差異

- `CONFIRMED`: browser と Electron は同じ renderer path を共有する。
- `CONFIRMED`: Electron では GPU mode 表示と既存 dialog bridge はあるが、Step 4 では save dialog を使わない。
- `PROVISIONAL`: Electron Linux 環境では WebGL fallback 依存がありうるため、PoC-A completion gate に fallback acceptance を含める。

## 16. performance considerations

- 計測点:
  - `buildApolloPhase1Unit2ViewProject()` 実行時間
  - `safeRebuildModelScene()` 実行時間
  - label collision avoidance 実行時間
  - first fit / resize fit 実行時間
- `PROVISIONAL`: line-model PoC-A では full rebuild を継続し、object count が増えた時点で incremental を再評価する。

## 17. file change forecast

実装候補:

- `frontend/src/apollo/visualization/*`
- `frontend/src/apollo/ApolloPhase1Shell.tsx`
- `frontend/src/viewer/types.ts`
- `frontend/src/viewer/Viewer3D.tsx`
- `frontend/src/viewer/ThreeViewport.tsx`
- `frontend/src/viewer/SceneBuilder.ts`
- `frontend/src/apollo/__tests__/*`

変更禁止:

- backend
- solver / numeric
- LINER 計算ロジック
- unrelated Unit 3 editing flow

## 18. implementation PR entry gate

- Step 0〜Step 4 docs が `main` に merge 済み
- Step 1 visualization contract と Step 2 ownership freeze を変更しない
- `ProjectModel` / `apolloPhase1Unit2` schema を変更しない
- package 追加不要

## 19. implementation completion gate

- node 表示
- member 表示
- support 表示
- node/member label
- rotation
- zoom
- pan
- fit
- top/front/side/isometric
- draft 変更反映
- undo/redo 反映
- save/reload 後の再生成前提
- empty/invalid data handling
- viewer mesh が SoR へ混入しない
- Unit 3 編集機能へ副作用なし

## 20. unresolved items

- support direct pick を Step 4 で扱うか Step 5 へ繰り越すか
- line-model 節点 marker の最終 geometry をどこまで既存 viewer に寄せるか
- very large label count での throttle 要否

分類:

- `NON_BLOCKING_FOR_IMPLEMENTATION`: support direct pick
- `NON_BLOCKING_FOR_IMPLEMENTATION`: label throttle 微調整

## 21. verdict labels

- `APOLLO_3D_POC_A_EVIDENCE_VERDICT: PASS`
- `APOLLO_3D_POC_A_ARCHITECTURE_VERDICT: FROZEN_WITH_PROVISIONAL_ITEMS`
- `APOLLO_3D_POC_A_DATA_MAPPING_VERDICT: FROZEN`
- `APOLLO_3D_POC_A_LIFECYCLE_VERDICT: FROZEN`
- `APOLLO_3D_POC_A_IMPLEMENTATION_READINESS: READY_WITH_PROVISIONAL_POC_ASSUMPTIONS`
- `RECOMMENDED_NEXT_STEP: STEP5_SELECTION_VALIDATION_DESIGN`
