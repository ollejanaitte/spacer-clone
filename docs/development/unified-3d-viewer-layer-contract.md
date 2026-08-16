# SPACER — Unified 3D Viewer Layer Contract (V-2)

- 作成日時: 2026-08-16 (JST)
- Lane / Wave: Lane V / Wave 1 (V-2)
- 対象 worktree: `~/Projects/spacer-clone-lane-v` (branch `lane-v/unified-3d-viewer`)
- 実装: `frontend/src/viewer/layers/layerContract.ts` (+ `renderCoordinate.ts`)
- 上位計画: [unified-3d-viewer-boundary.md](unified-3d-viewer-boundary.md) (V-1)

---

## 1. 目的

統合 3D Viewer が受け取る「描画レイヤ」の共通契約を確定する。

- **ProjectModel を Viewer の描画 I/F にしない。**
- データ源 (ProjectModel / module document / site-context import / Lane T terrain) は
  Viewer 向け **adapter / render model** を介してのみ流入させる。
- 各レイヤは canonical 世界座標で表現され、Viewer は単一の
  canonical→render 変換だけを持つ (CRS 変換は Lane T 境界)。

## 2. 責務の分離

```
データ源 (ProjectModel / modules / site-context / Lane T)
        │  producer adapter (V-2 は mock / 後続で T/B の Adapter)
        ▼
UnifiedViewerModel (Layer Contract, frontend/src/viewer/layers)
  - worldBasis (canonical 世界座標)
  - renderTransform (canonical → three)
  - layers[] (6 種の ViewerLayer)
        │  viewer scene builder (buildLayerScene.ts)
        ▼
UnifiedViewer (three.js: renderer / camera / orbit / fit / visibility / selection)
```

- `layerContract.ts` はデータと描画の **境界契約** のみ。three.js / データ源には依存しない。
- 描画変換は `renderCoordinate.ts` の既定実装が `domainToThree` 規約 (単一正本) に従う。
- CRS (EPSG / 平面直角 / ジオイド) 変換は実装しない。WorldBasis に identifier を保持するのみ。

## 3. 座標系ルール (Wave 1 凍結)

| 項目 | 値 | 根拠 |
|---|---|---|
| canonical world coordinate | `X=沿方向 / Y=横断 / Z=標高(up)`、右手系 | 既存 renderCoordinate / Phase 3-A freeze と一致 |
| render local coordinate | three.js `(x, elevation, -y)` (`domainToThree`) | 単一正本 `frontend/src/next/modules/renderCoordinate.ts` |
| origin | 各レイヤは canonical 世界座標で提供。Viewer は `worldBasis.renderOrigin` を引いてから描画 | render local origin |
| unit | meter (`m`) | — |
| elevation convention | `z-up-tp` / `z-up-ellipsoidal` / `z-up-local` を `elevationConvention` で明示 | — |
| transform 責務 | canonical→render は Lane V の表示変換。CRS 変換は Lane T 所有 | V-1 監査 §1.2 |
| Lane T 境界 | Terrain 実 I/F 未確定部分は mock adapter (`viewer/layers/mock`) で切離し | — |

## 4. ViewerLayer 契約 (共通フィールド)

| フィールド | 型 | 意味 |
|---|---|---|
| `id` | `string` | シーン内で一意なレイヤ id |
| `kind` | `UnifiedLayerKind` | レイヤ種別 (data の discriminator から導出) |
| `visible` | `boolean` | 表示 ON/OFF (Viewer が保持・変更) |
| `selectable` | `boolean` | 選択対象か |
| `bounds` | `LayerBounds` | canonical 世界座標でのレイヤフットプリント |
| `data` | レイヤ種別ごとの payload | 幾何 / データ参照 |
| `metadata` | `Record<string, unknown>` | 自由メタ (表示ヒント等) |
| `properties` | `Record<string, unknown>` (任意) | 選択時プロパティ用の事前集約 |
| `status` | `LayerStatus` | `loading / ready / empty / error` |
| `source` | `LayerSource` | 供給元 Lane / module / format / revision |

## 5. レイヤ種別と data payload (最低 6 種)

| kind | payload | 主フィールド | 供給元 Lane (予定) |
|---|---|---|---|
| `terrain` | `TerrainLayerData` | `width/height/cellSize/originX/originY/heights` (heightfield) | T (site-context PORT) |
| `road` | `RoadLayerData` | `alignment[]` (centerline), `width`, `halfWidth` | A/B 経由 (liner/road module) |
| `superstructure` | `SuperstructureLayerData` | `girders[]`, `deck`, `crossBeams[]` (OrientedBox3D) | A (bridgeProject / apollo) |
| `bearing` | `BearingLayerData` | `bearings[]` (OrientedBox3D) | A (bridgeProject) |
| `substructure` | `SubstructureLayerData` | `supports[]` (column / cap / foundation) | A (substructure) |
| `existingConditions` | `ExistingConditionsLayerData` | `entities[]` (river/road/railway/bridge/building/pipe) | B (site-context adapter) |

- 共通幾何プリミティブ: `Point3D` / `OrientedBox3D` (center + size + yawDeg) / `LayerBounds`。
- 既存 CIM レイヤ (`integrated3dScene.ts` の 18 CimLayerId) とは ID を整合
  (`terrain/existing/roadPavement/superstructure/bearing/substructure`) させつつ、
  本契約は「Viewer が直接受け取る描画モデル」として独立させる。

## 6. mock / fixture (V-2 補助・Wave 1)

`frontend/src/viewer/layers/mock/` が最小統合描画骨格のデータを供給する。

- `mockTerrain.ts` — 谷地形の決定論的 heightfield (51×21 grid, cell 5m)。
- `mockRoad.ts` — アプローチ→橋梁上→アプローチの道路 centerline strip (幅 8m)。
- `mockBridge.ts` — 5 径間 (4 span / 5 支持) の上部工: 主桁 2 本・床版・横桁・支承。
- `mockSubstructure.ts` — A1/A2 橋台 + P1..P3 橋脚 (柱・キャップ・フーチング)。
- `mockExistingConditions.ts` — 橋梁直下の河川・既設道路・鉄道・建物。
- `mockScene.ts` — `createMockUnifiedScene()` が 6 レイヤを 1 つの
  `UnifiedViewerModel` にまとめる (共通 worldBasis + default renderTransform)。

目的は「本物らしい完成モデル」ではなく、
**複数レイヤ同時表示 / 共通座標 / visibility 切替 / camera 全体確認** の骨格成立。

## 7. Viewer 側 (Wave 1 実装)

| ファイル | 役割 |
|---|---|
| `viewer/layers/buildLayerScene.ts` | UnifiedViewerModel → THREE groups (レイヤ別 Group + bounds) |
| `viewer/unified/UnifiedViewer.tsx` | three.js viewer (renderer/camera/orbit/fit/raycast 選択) |
| `viewer/unified/LayerVisibilityPanel.tsx` | レイヤ ON/OFF toggle + fit |
| `viewer/unified/UnifiedViewerDemo.tsx` | mock モデルを表示する demo harness (Lane U が後続で route へ) |

## 8. 他 Lane への引渡し

### Lane T へ (TerrainLayer 要求)
- 受入 data shape: `TerrainLayerData` (heightfield: `width/height/cellSize/originX/originY/heights`)。
- 必要: 世界座標での bounds / origin / elevation、canonical→render 境界 (Lane V が持つ)。
- Lane T が Heightfield/SCT1/CRS を提供した場合、`TerrainLayerData` への adapter を V 側 mock と差替え。

### Lane B へ
- Viewer が必要とする site-context 由来 field: `existingConditions` entity (type/geometry)、
  `coordinateContext` / CRS identifier、terrain 参照。
- 受入形式: `ExistingConditionsLayerData` / `TerrainLayerData` (B の Adapter が出力)。

### Lane U へ
- 入口: `UnifiedViewer` / `UnifiedViewerDemo` component。
- 渡す props: `UnifiedViewerModel` (id / worldBasis / renderTransform / layers / selection)。
- loading / warning / error I/F: `LayerStatus` (loading/ready/empty/error) + `onRenderError`。

### Lane S へ
- Reference Business 001 の sample fixture は `TerrainLayerData` / `RoadLayerData` /
  `ExistingConditionsLayerData` の形状で受入可 (mock と同型)。

## 9. 契約の不変条件 (Wave 1)

1. Viewer は `UnifiedViewerModel` しか解釈しない (ProjectModel 非依存)。
2. レイヤは canonical 世界座標のみ。CRS 変換は Viewer 内に置かない。
3. `status.state === "ready"` かつ `visible` のときだけ描画する。
4. mock は Wave 1 のみ。実 Terrain (V-3) は Lane T 成果に差し替え。
5. 契約破壊時は `LAYER_CONTRACT_VERSION` を上げる。

→ **mock / fixture 最小統合描画骨格 (V-2 補助) へ進める。**