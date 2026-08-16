# SPACER × site-context-prototype — Terrain 資産 PORT Map（Wave 1 Lane T-1）

- 作成日時: 2026-08-16 (JST)
- 担当 Lane: T（Wave 1）
- 対象リポジトリ: `~/Projects/spacer-clone-lane-t`（branch: `lane-t/sitecontext-terrain-port`）
- 参照リポジトリ（読み取りのみ）: `~/Projects/site-context-prototype`（変更しない）
- 上位文書: [parallel-lanes-wave0-readiness.md](parallel-lanes-wave0-readiness.md) /
  Lane B 成果 [site-context-spacer-field-mapping.md](../../../spacer-clone-lane-b/docs/development/site-context-spacer-field-mapping.md) /
  [site-context-spacer-data-contract.md](../../../spacer-clone-lane-b/docs/development/site-context-spacer-data-contract.md) /
  [site-context-spacer-adapter-interface.md](../../../spacer-clone-lane-b/docs/development/site-context-spacer-adapter-interface.md)

> Lane B（B-1〜B-3）は完了済み。本マップは Lane B の Field Mapping Freeze を前提とし、
> その owner=Lane T 項目（CRS / DEM / Heightfield / SCT1 / canonical / checksum）の
> source → destination 対応を確定する。

---

## 1. 目的と方針

site-context-prototype の Terrain 関連資産を棚卸しし、SPACER 側へ**選択 PORT** する。
方針（Wave 0 / 上位計画で確定）:

- 国土地理院地形機能をゼロから再実装しない（既存 site-context 実装を再利用・移植）。
- 座標変換式・軸方向・単位を推測で再実装しない（既存実装 + 既存 test を優先移植）。
- Lane A 所有領域（`frontend/src/types.ts` / `schemas/project.schema.json` /
  `frontend/src/projectMigration.ts` / canonical Save / Load / validation / migration /
  Persistence Guard）を変更しない。
- 本マップの調査時点（2026-08-16）で site-context の HEAD は `9e499c0` 相当の内容を参照。

## 2. 分類基準（A〜F）

| 分類 | 意味 | 本 Wave の扱い |
|---|---|---|
| **A** | そのまま PORT 可能（依存が無い、または自前定義に置換可能） | Wave 1 で移植 |
| **B** | 軽微な依存除去で PORT 可能（zod schema 依存の型を自前 type に置換等） | Wave 1 で移植 |
| **C** | SPACER 向け Adapter が必要 | I/F のみ確定（本実装は Wave 2 / Lane B-4 連携） |
| **D** | Viewer 専用 → Lane V へ渡す | I/F 明記のみ |
| **E** | Persistence 接続 → T-5 へ延期 | 明記のみ（本 Wave では接続しない） |
| **F** | 今回不要 | 記録のみ |

## 3. PORT 対象資産一覧（source → destination）

### 3.1 CRS / Coordinate Core（T-2）

| # | source file | source symbol | responsibility | SPACER destination 候補 | dependency | PORT 方法 | owner | 分類 |
|---|---|---|---|---|---|---|---|---|
| C1 | `packages/core/src/coordinate/transform.ts` | `JGD2011_ZONES` / `ZONE_BY_EPSG` / `latLonToPlane` / `planeToLatLon` | JGD2011 平面直角座標系（EPSG 6669-6687）横メルカトル（GRS80）正逆変換。原点基準 meter、x=easting / y=northing | `frontend/src/terrain/coordinate/transform.ts` | なし（pure TS） | ほぼそのまま移植（A） | T | A |
| C2 | `packages/core/src/coordinate/epsgClassifier.ts` | `EPSG_CLASSIFIER_VERSION` / `isPlaneRectangular` / `classifyCrs` / `classifyEpsg` | EPSG → projected/geographic 分類。geographic=4326/6668/4269/4612、projected=6669-6687。判定不能は `CRS-UNKNOWN-EPSG` throw | `frontend/src/terrain/coordinate/epsgClassifier.ts` | なし | ほぼそのまま移植（A） | T | A |
| C3 | `packages/core/src/coordinate/adapter.ts` | `RenderCoordinateAdapter` / `azimuthToDir` / `rightNormal` | **測量 canonical（x=easting, y=northing, z=up）↔ Three.js render（Y-up）** 表示専用変換 `three=(Cx−Lx, Cz−Lz, −(Cy−Ly))`。正本は書き換えない | `frontend/src/terrain/coordinate/renderAdapter.ts` | なし | ほぼそのまま移植（A） | T | A |
| C4 | `packages/core/src/schema/project.ts` | `GridSpec` / `Bounds` / `Point3` / `CoordinateContext`（type のみ） | Heightfield / DEM で使う最小型。zod 由来 | `frontend/src/terrain/types.ts`（自前 type 定義） | zod | zod 依存を除去し素の interface で再定義（B） | T | B |
| C5 | `docs/phase2/08_coordinate_contract.md` | — | 3 座標空間（source/canonical/render）・軸規約・datum の仕様 | `docs/development/site-context-terrain-port-map.md`（要約引用） | — | 仕様参照を記録 | T | A |
| C6 | `app/src/map/selection.ts` / `geocode.ts` / `store/terrainInfo.ts` | `geoToPlane` / `geocodePlaneXY` / `crsDisplayName` | ブラウザ UI 上の選択・geocode ヘルパ | — | app 依存 | **Viewer / UI 依存のため未移植**（Wave 2 で Lane V/U と調整） | V/U | D |

### 3.2 GSI DEM（T-3）

| # | source file | source symbol | responsibility | SPACER destination 候補 | dependency | PORT 方法 | owner | 分類 |
|---|---|---|---|---|---|---|---|---|
| G1 | `packages/core/src/importer/gsi.ts` | `tileXY` / `tileRangeForBBox` / `GSI_DATASETS`（dem5a/dem5b/dem10b） / `DEM_FALLBACK_CHAIN` / `tileResolutionMeters` / `fetchDemTiles` / `GsiDemResult` | GSI DEM タイル範囲算定・fallback 連鎖（5A→5B→10B）・multi-tile 結合（先勝ち）・metadata / fallbackHistory | `frontend/src/terrain/gsi/gsi.ts` | `./png`・`../heightfield`（NO_DATA） | ほぼそのまま移植（A）。`Buffer.from(raw)` は Node 環境（vitest）前提。ブラウザ Canvas 版（`app/src/map/demFetch.ts`）は Lane U へ | T | A |
| G2 | `packages/core/src/importer/png.ts` | `decodePng` / `decodeDemTile` | 最小 PNG デコーダ（8bit RGB/RGBA・非インターレース）+ GSI 2^23 標高復号（no-data 含む） | `frontend/src/terrain/gsi/png.ts` | `node:zlib`（inflateSync） | ほぼそのまま移植（A）。test:fast は node 環境 | T | A |
| G3 | `packages/core/src/importer/dem10bMapping.ts` | `dem10bChildToParentPixel` / `DEM_TILE_SIZE` | DEM10B Z14 親タイル → Z15 子タイル画素マッピング（純関数） | `frontend/src/terrain/gsi/dem10bMapping.ts` | なし | ほぼそのまま移植（A） | T | A |
| G4 | `app/src/map/demFetch.ts` | `fetchDemTilesBrowser` / `decodeTileElevation` / `DATASETS` / `FALLBACK` | ブラウザ Canvas ベースのタイル取得（Lane U の実 UI 用） | — | Canvas / app | **ブラウザ専用のため未移植**（Wave 2 で Lane U と調整。コア部は G1〜G3 で共用可） | U | D/E |
| G5 | `app/src/components/DemWizard.tsx` | `run()`（grid 導出・origin snap・recipeHash） | DEM → Heightfield 生成 UI パイプライン | — | app / UI | **UI パイプラインのため未移植**。ただし `buildTerrainFromBounds` 相当の純関数化は T-5 で検討 | U/V | D/E |
| G6 | `packages/core/src/security/policy.ts` | `assertAllowedUrl` | GSI URL 許可（cyberjapandata.gsi.go.jp） | — | — | **security ポリシーは Wave 2 / Lane U で採用検討**（今回不要） | U | F |

### 3.3 Heightfield / SCT1 / checksum（T-4）

| # | source file | source symbol | responsibility | SPACER destination 候補 | dependency | PORT 方法 | owner | 分類 |
|---|---|---|---|---|---|---|---|---|
| H1 | `packages/core/src/terrain/heightfield.ts` | `NO_DATA`（-9999）/ `Heightfield` / `ElevationResult` | canonical Heightfield。cell-center 規則・双一次補間（最終行/列は縮退 FN-F04）・no-data sentinel・bounds | `frontend/src/terrain/heightfield.ts` | `GridSpec` / `Bounds`（→ 自前 type） | 型依存を自前定義へ置換して移植（B） | T | B |
| H2 | `packages/core/src/importer/heightfieldBinary.ts` | `serializeHeightfieldBinary` / `deserializeHeightfieldBinary` / `heightfieldToBase64` / `base64ToHeightfield` | SCT1 バイナリ（Uint8Array/DataView 版・ブラウザ安全）encode/decode + base64 | `frontend/src/terrain/sct1.ts` | `Heightfield` / `GridSpec` | ほぼそのまま移植（A）。バイト互換のため Node Buffer 版（`terrain/serialize.ts`）は一本化し、DataView 版を正とする | T | A |
| H3 | `packages/core/src/terrain/serialize.ts` | `serializeHeightfield` / `deserializeHeightfield`（Buffer 版） | SCT1 バイナリ（Node Buffer 版・H2 と同一フォーマット） | `frontend/src/terrain/sct1.ts`（H2 と統合） | `node:Buffer` | **H2 と統合**（DataView 版を正、フォーマット同一） | T | A |
| H4 | `packages/core/src/util/canonicalize.ts` | `canonicalize` / `sha256Hex` / `canonicalHash` | 決定性正規化 + sha256（checksum / recipeHash / revisionHash の正本手段） | `frontend/src/terrain/canonicalize.ts` | `node:crypto`（fallback） | ほぼそのまま移植（A）。Lane B §3.9 の checksum 2 系統のうち canonicalHash 側に対応 | T | A |
| H5 | `app/src/store/terrainAsset.ts` | `saveTerrainElevation` / `loadTerrainElevation` / `heightfieldToAsset` | IndexedDB 保存（base64 + checksum） | — | IndexedDB / app | **Persistence 接続 → T-5 へ延期**（Wave 1 では接続しない） | T | E |
| H6 | `packages/core/src/schema/project.ts` | `terrainDocumentSchema` / `sourceRecordSchema.gsiMeta` / `gridSpecSchema` | Terrain metadata / source metadata の zod schema | `frontend/src/terrain/types.ts`（type のみ）+ metadata は `modules.terrain.data.siteContext` へ保持（Lane B mapping 準拠） | zod | 型のみ自前定義へ移植。full payload 保持は Lane B Adapter（B-4）の役割 | T/B | C/E |
| H7 | `packages/core/src/schema/projectV2.ts` | `v2CrsSchema` / `v2CoordinateContextSchema` / `siteTerrainSchema` / `v2TransformRecordSchema` | V2 CRS / terrain スキーマ（Discriminated union + superRefine） | 型のみ確認。payload は `modules.terrain.data.siteContext` へ（Lane B） | zod | 型参照のみ（full 移植は Wave 2）。CRS 分類は C2 で照合 | T/B | C |

### 3.4 Viewer / sample / その他

| # | source file | source symbol | responsibility | SPACER destination 候補 | dependency | PORT 方法 | owner | 分類 |
|---|---|---|---|---|---|---|---|---|
| V1 | `app/src/TerrainViewer.tsx` | `buildTerrainMesh` / `frameCamera` / `ViewerProps` | Three.js 地形メッシュ生成・カメラ制御 | — | three / app | **Viewer 専用 → Lane V へ渡す**。Terrain data shape（H1/H2）は本 Wave で確定 | V | D |
| S1 | `app/src/App.tsx` | `SAMPLE_CTX`（EPSG:6674, 郡上市八幡）/ `DEFAULT_CTX`（EPSG:6677） | サンプル座標 context | `docs/development/site-context-terrain-port-map.md`（baseline 記録） | app | **baseline 値のみ確認・記録**（sample 本格化は T-6 / Lane S） | S | E |
| S2 | `docs/design/08_gifu_sample.md` | — | 郡上市八幡 5km×5km 仕様（中心 35.7512N/136.9567E, EPSG:6674, DEM5A ZL15 36 tiles） | baseline 記録（本マップ §5） | — | 仕様参照を記録 | S | A |
| S3 | `packages/core/src/importer/__tests__/terrain-mapping.test.ts` | `buildTerrainFromBounds` | DEM→Terrain グリッド導出（Gujo 5km）の純ロジック検証 | `frontend/src/terrain/__tests__/terrainMapping.test.ts`（T-5 候補） | — | 純ロジックは T-5（Terrain Generation）で移植。本 Wave では対象外 | T | E |
| F1 | `packages/core/src/importer/geotiff.ts` / `grid.ts` / `xyz.ts` | `readGeoTiff` / `gridSpecFromBounds` / `binToGrid` / `binPoints` | GeoTIFF / XYZ binning | — | — | **今回不要（対象外）**。既存 SPACER `terrainImport.ts` に XYZ/CSV パーサあり | T | F |

## 4. Wave 1 で移植するファイル（destination 一覧）

```
frontend/src/terrain/
  index.ts                     … 公開 re-export（他 Lane 用）
  types.ts                     … GridSpec / Bounds / Point3 / Vec3 / LocalOrigin / ElevationResult（C4）
  coordinate/
    transform.ts               … JGD2011 平面直角（C1）
    epsgClassifier.ts          … EPSG 分類（C2）
    renderAdapter.ts           … RenderCoordinateAdapter / azimuthToDir / rightNormal（C3）
  heightfield.ts               … Heightfield / NO_DATA（H1）
  sct1.ts                      … SCT1 binary encode/decode + base64（H2/H3 統合）
  canonicalize.ts              … canonicalize / sha256Hex / canonicalHash（H4）
  gsi/
    png.ts                     … decodePng / decodeDemTile（G2）
    gsi.ts                     … fetchDemTiles / tileRangeForBBox / fallback（G1）
    dem10bMapping.ts           … dem10bChildToParentPixel（G3）
  __tests__/
    transform.test.ts          … C1
    epsgClassifier.test.ts     … C2
    renderAdapter.test.ts      … C3
    heightfield.test.ts        … H1
    sct1.test.ts               … H2/H3
    canonicalize.test.ts       … H4
    png.test.ts                … G2
    gsi.test.ts                … G1
    dem10bMapping.test.ts      … G3
```

- 全て `src/**/*.test.ts` かつ jsdom 不使用 → `test:fast`（FAST）に自動分類される。
- Lane A 所有ファイル・既存 `next/modules/terrain/`・`contracts/coordinateContext.ts`・
  `next/modules/renderCoordinate.ts` は**変更しない**（既存 SPACER のドメイン座標規約
  x-along/y-transverse/z-up とは別系統として独立移植）。

## 5. 郡上市八幡 baseline（T-1 確認・Wave 1 は記録のみ）

Lane B Adapter Interface §7 の Lane S 記載と site-context `docs/design/08_gifu_sample.md` から確定:

- 対象地点: 郡上市八幡 中心 **35.7512°N / 136.9567°E**（WGS84）
- EPSG: **6674**（JGD2011 平面直角第 6 系・中央経線 137°E）。pyproj 参照値
  X=86,522.4m / Y=−27,181.2m（Snyder 級数近似との差 ±3m 以内、C1 の test で検証）
- 範囲: 5km×5km（WGS84 lon 136.929〜136.9844 / lat 35.7287〜35.7737）
- DEM: DEM5A `dem5a_png` ZL15・36 tiles（x 28847–28852 × y 12892–12897）・fallback 5B→10B
- terrain fixture / sample metadata: `terrain[].grid`（SCT1 ヘッダ）・`sourceDatasets[].gsiMeta`・
  `recipe` / `inputHashes` は Lane B mapping（§3.5/§3.6）で `modules.terrain.data.siteContext` /
  `metadata.siteContextSourceDatasets` へ保持
- 再現性: `recipeHash` / `revisionHash` = `canonicalHash`（H4）で保証

Wave 1 では完成 sample を作り込まず、baseline 確認のみ。本格 Persistence 接続・完成 Project 化は後続 Wave（T-6 / Lane S）。

## 6. Wave 1 / Wave 2 区分

| 区分 | 内容 |
|---|---|
| **Wave 1（今回）** | C1〜C4 / G1〜G3 / H1〜H4 の移植 + unit test（T-2/T-3/T-4）。canonical Project への正式 Persistence 接続は**しない** |
| **Wave 2 T-5** | Terrain Generation / Persistence 接続（H5 IndexedDB 化・`terrainDocument.surfaceReference` 実アセット化・`buildTerrainFromBounds` 純関数化 G5/S3） |
| **Wave 2 T-6 / Lane S** | 郡上市八幡 完成 sample / fixture 本格化 |
| **他 Lane** | V: V1（mesh 生成・viewer） / U: G4/G6（ブラウザ fetch・URL policy） / B: H6/H7（Adapter で full payload 保持） |

## 7. 他 Lane への引渡し I/F（Wave 1 終了時点）

### Lane B へ
- Terrain primitive の正式 I/F: `frontend/src/terrain/index.ts`（Heightfield / SCT1 / CRS / EPSG / canonicalize）。
- CRS metadata: `frontend/src/terrain/types.ts` の `GridSpec` / `Bounds`（zod 非依存・素の interface）。
- sourceDataset に必要な field: `coordinateContextId` / `epsg`（`classifyEpsg` で照合）/
  `gsiMeta`（datasetId / tiles / fallbackHistory / bbox / zoom）— Lane B mapping §3.5/§3.6 準拠。
- Lane A への field 追加要求: **なし**（全 field が既存 loose slot `metadata.*` / `modules.terrain.data.*` に収まる。Lane B §5 と同一結論）。

### Lane V へ
- Viewer へ渡す Terrain data shape: `Heightfield`（width / height / cellSize / originX / originY /
  data: Float32Array / noDataValue）+ `GridSpec` / `Bounds`。
- canonical/render 座標: `RenderCoordinateAdapter`（測量 canonical ↔ Three.js render 表示専用変換）。
- bounds / origin / Z: `bounds()`（cell-center 規則）、`originX/originY`、Z=標高（m）。
- mock/fixture 置換可能な I/F: TileFetcher 注入型 `fetchDemTiles(opts)`（ネットワーク非依存 test 済み）。

### Lane U へ
- DEM 取得開始に必要な input: `GsiFetchOptions`（bbox / zoom / preferred / fetcher / maxTiles / signal）。
- progress / warning / error の返却候補: `GsiDemResult.tiles` / `fallbackHistory`・throw
  `GSI-TOO-MANY-TILES` / `GSI-EMPTY-RANGE` / `CRS-UNKNOWN-EPSG`。

### Lane S へ
- 郡上市八幡 terrain baseline: §5（EPSG:6674・中心・範囲・DEM5A tile 範囲・参照値）。
- fixture / sample 利用方法: `Heightfield` + `sct1.ts`（base64）で fixture 化可能。完成 sample は T-6。

## 8. 変更ファイル（本 Wave 全体・計画値）

- 新規: `frontend/src/terrain/**`（上記 §4）
- 新規: `docs/development/site-context-terrain-port-map.md`（本マップ）
- 変更: `docs/development/README.md`（インデックス登録）
- Lane A / B / V / U / S 所有ファイル: 変更なし

## 9. Wave 1 で「PORT 済み」と「未 PORT」の境界（明示）

**PORT 済み（本 Wave）**: JGD2011 平面直角（EPSG 6669-6687）/ EPSG 分類 / canonical-render 変換 /
DEM5A / DEM5B / DEM10B fallback / DEM PNG 標高復号 / DEM tile 取得 / Heightfield / SCT1 /
canonicalize（checksum）。

**未 PORT（Wave 2 以降 / 他 Lane）**:
- T-5: Terrain Generation / Persistence 接続（H5 / S3 / G5 純関数化）
- Lane V: 地形メッシュ生成・viewer 統合（V1）
- Lane U: ブラウザ Canvas DEM 取得・URL policy・progress UI（G4 / G6）
- Lane B-4: site-context → SPACER Import Adapter 本実装（H6 / H7 full payload 保持）
- T-6 / Lane S: 郡上市八幡 完成 sample / fixture