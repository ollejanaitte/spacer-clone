# bridge-viewer-interaction.md

橋梁ウィザードの Step 4「ライン設定 3D」で用いる Three.js ビューアの仕様。

## 1. レイヤ構造

```
Scene
 ├ NodeLayer        (FEM 節点, SphereGeometry)
 ├ ElementLayer     (FEM 部材, LineSegments)
 ├ LineLayer        (BridgeLine, 3D ライン)
 ├ LoadLayer        (ArrowHelper)
 ├ InteractionLayer (クリック当たり判定用 invisible mesh)
 └ Grid + Axes
```

すべて `THREE.Group` でまとめ、Step6 で生成された FEM モデル節点・部材を再表示する用途にも共用する。

## 2. 描画モード

- `view`: 視点操作のみ（OrbitControls）
- `draw_line`: クリック 1 回目で始点、2 回目で終点 → `BridgeLine` 追加
- `select`: 既存ライン／節点を選択（ハイライト）
- `delete`: 選択対象を削除

## 3. ライン種別カラー

| type | color | hex |
|------|------|-----|
| traffic | 緑 | `#22a06b` |
| load | 赤 | `#c0392b` |
| reference | 灰 | `#7f8c8d` |
| selected | 黄 | `#f1c40f` |

## 4. Snap

```pseudo
threshold = 0.5  // m
candidates = []
for node in fem_nodes:
    candidates.append(node.position)
for p in candidates:
    if distance(click_point, p) < threshold:
        snap_target = p
        break
```

FEM 節点がまだ生成されていない Step 4 では、グリッド点
`(x_grid, 0, z_grid)` を候補とする（5m ピッチ）。

## 5. Camera / Controls

- `PerspectiveCamera(fov=45, near=0.01, far=10000)`
- `OrbitControls`: `enableDamping=true`, `dampingFactor=0.08`
- フィット: 全節点を包む Box を compute して `fitCameraToBox`

## 6. Raycaster

- `pointermove` で `pointer.x/y` を更新
- `click` で `raycaster.intersectObjects([LineLayer, NodeLayer])`
- ヒットしたオブジェクトの `userData.lineId` / `userData.nodeId` を返す

## 7. Step 6 での FEM 描画

- 生成された `nodes / members / supports` を `NodeLayer / ElementLayer / SupportLayer` に表示
- LineLayer に既存の BridgeLine を再描画
- カメラフィットと凡例を表示
