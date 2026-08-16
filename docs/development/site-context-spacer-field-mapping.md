# site-context → SPACER Field Mapping Freeze（Wave 1 Lane B-2）

> **Authority:** INTEGRATION CONTRACT（P0）
> **Status:** RECOMMENDED（Freeze 候補）
> **Owner:** Lane B（Wave 1）
> **Baseline:** site-context `9e499c0` / spacer-clone `31a1113`
> **上位契約:** [統合契約](../integration/site-context-unification/README.md) / [データ契約再確認](site-context-spacer-data-contract.md) / [Adapter Interface](site-context-spacer-adapter-interface.md)

## 1. 目的

`.sitecontext`（site-context ProjectV2相当）→ SPACER Project への **field mapping を正式に固定**する。
B-4 Import Adapter 実装が追加設計なしで実装へ入れるための単一の根拠となる。

## 2. 表記

- **source path**: site-context ProjectV2（schemaVersion `2`）のfield path
- **destination path**: SPACER PDC（schemaVersion `1.0.0`）の格納先
  - `metadata.*` … PDC `metadata`（Record<string,unknown>）
  - `modules.terrain.data.*` … terrain module payload
- **lossless**: source値を変更せずそのまま格納（逆変換で完全復元可能）
- **lossy**: 変換により情報を失う
- **transform**: Adapter（B-4）が行う変換
- **owner Lane**: このfieldの正本所有・最終判定Lane

## 3. Mapping 表

### 3.1 project identity / project metadata

| source path | source type | destination path | destination type | required | transform | unit | CRS | lossless | unsupported | notes | owner |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `schemaVersion` | `"1" \| "2"` | （PDC schemaVersionへ変換） | `"1.0.0"` | required | 照合のみ（1/2受容・他は拒否） | — | — | — | 3以上 | V1はmigrate後に取り込む | A |
| `dataVersion` | string | — | — | optional | 照合のみ | — | — | — | — | SPACERに保持しない | A |
| `fileFormatVersion` | string | packageFormatVersion相当 | `"1"` | optional | 対応付け | — | — | — | — | — | A |
| `project.projectId` | string | `projectId` | string(uuid) | required | ID検証（uuid形式以外は **import failure**） | — | — | lossy(形式) | 非uuid | asNew時は再採番 | A |
| `project.name` | string | `name` | string | required | そのまま | — | — | lossless | — | 非空必須 | A |
| `project.businessNumber` | string? | `metadata.businessNumber` | string | optional | そのまま | — | — | lossless | — | — | A |
| `project.designStage` | string? | `metadata.designStage` | enum | optional | SPACER enumへ変換（`other`含む） | — | — | lossy(未知値→other) | 未知値 | 未知値は `other`+customLabelへ | A |
| `project.createdAt` | string | `createdAt` | ISO string | required | そのまま | — | — | lossless | — | format検証 | A |
| `project.updatedAt` | string | `updatedAt` | ISO string | required | そのまま | — | — | lossless | — | format検証 | A |
| `project.externalIdentifiers` | Record | `metadata.siteContextExternalIdentifiers` | Record | optional | そのまま | — | — | lossless | — | — | A |

### 3.2 coordinateContexts / EPSG / JGD2011

| source path | source type | destination path | destination type | required | transform | unit | CRS | lossless | unsupported | notes | owner |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `coordinateContexts` | array | `metadata.siteContextCoordinateContexts` | array | required | そのまま | m | 保持 | lossless | — | **CRS変換しない** | A |
| `coordinateContexts[].id` | string | 同上 `.id` | string | required | そのまま | — | — | lossless | — | 一意性I-01 | A |
| `coordinateContexts[].crs` | union | 同上 `.crs` | union | required | そのまま | m/degree | 保持 | lossless | unknown-EPSG判定不能 | EPSG分類器で照合 | T |
| `coordinateContexts[].verticalDatum` | enum | 同上 `.verticalDatum` | enum | required | そのまま | m | — | lossless | — | tp/ellipsoid/local/unknown | T |
| `coordinateContexts[].verticalUnits` | `"m"` | 同上 `.verticalUnits` | `"m"` | required | そのまま | m | — | lossless | — | — | T |
| `coordinateContexts[].origin` | `{x,y,z}` | 同上 `.origin` | `{x,y,z}` | required | そのまま | m | — | lossless | — | — | T |
| `coordinateContexts[].epoch` | string? | 同上 `.epoch` | string? | optional | そのまま | — | — | lossless | — | — | T |
| `coordinateContexts[].heightEpoch` | string? | 同上 `.heightEpoch` | string? | optional | そのまま | — | — | lossless | — | JGD2024標高 | T |
| `coordinateContexts[].geoidModel` | string? | 同上 `.geoidModel` | string? | optional | そのまま | — | — | lossless | — | JPGEO2024等 | T |
| `coordinateContexts[].transformResidualM` | number? | 同上 `.transformResidualM` | number? | optional | そのまま | m | — | lossless | — | — | T |
| `projectCoordinateContextId` | string | `metadata.siteContextProjectCoordinateContextId` | string | required | そのまま | — | — | lossless | — | I-04整合検証 | A |
| `siteContext.coordinateContextId` | string | `modules.terrain.data.siteContext.coordinateContextId` | string | required | そのまま | — | — | lossless | — | projectCoordinateContextIdと一致必須 | A |

### 3.3 project origin

| source path | source type | destination path | destination type | required | transform | unit | CRS | lossless | unsupported | notes | owner |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `coordinateContexts[projectCoordinateContextId].origin` | `{x,y,z}` | `modules.terrain.data.terrainDocument.coordinateContext.projectOrigin` | `{x,y,z}` | required（terrainあり時） | そのまま（primary contextのoriginをmirror） | m | 保持 | lossless | — | terrain moduleの正 | T |

### 3.4 selectionArea

| source path | source type | destination path | destination type | required | transform | unit | CRS | lossless | unsupported | notes | owner |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `siteContext.selectionArea` | union? | `modules.terrain.data.selectionArea` | union? | optional | そのまま（null許容） | m | 保持 | lossless | — | rect/polygon/viewport | B |
| `siteContext.selectionArea.vertices` | `MetricPoint[]` | 同上 `.vertices` | array | required(selectionAreaあり時) | そのまま | m | 保持 | lossless | — | 正本 | B |
| `siteContext.selectionArea.revisionHash` | string | 同上 `.revisionHash` | string | required | そのまま | — | — | lossless | — | 変更時は再計算（site-context側関数） | B |
| `siteContext.selectionTransformRecords` | array | `modules.terrain.data.selectionArea.transformRecords` | array | optional | そのまま | — | — | lossless | — | — | B |

### 3.5 terrain metadata / resource / heightfield

| source path | source type | destination path | destination type | required | transform | unit | CRS | lossless | unsupported | notes | owner |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `siteContext.terrain` | array | `modules.terrain.data.terrainDocument`（activeのみ） + `modules.terrain.data.siteContext.terrain`（full） | object | optional | active=activeTerrainId対応を正規化 | — | — | lossless(full) | — | full payloadを保持 | T |
| `siteContext.terrain[].terrainId` | string | `terrainDocument.terrainId` | string | required(terrainあり時) | そのまま | — | — | lossless | — | — | T |
| `siteContext.terrain[].name` | string | `terrainDocument.source.sourceName` | string | optional | そのまま | — | — | lossless | — | — | T |
| `siteContext.terrain[].sourceDatasetIds` | string[] | `terrainDocument.source.sourceType`へ変換 + `metadata.siteContextSourceDatasets`参照 | enum | optional | sourceType変換（dem/survey/cad/...） | — | — | lossy | — | SPACER enum: csv/xyz/landxml/dem/geotiff/pointcloud | T |
| `siteContext.terrain[].coordinateContextId` | string | `terrainDocument.coordinateContext.coordinateSystem:"project"` | string | required | CRS整合検証（=projectCoordinateContextId） | — | 保持 | lossless | CRS不一致 | I-14 | T |
| `siteContext.terrain[].bounds` | `{minX,minY,maxX,maxY}` | `terrainDocument.bounds`（+minElevation/maxElevation） | object | required | bounds導出式を**固定**（B-4で1系統へ） | m | 保持 | lossy(式依存) | — | 既知差分あり（§6.3） | T |
| `siteContext.terrain[].grid` | GridSpec | SCT1ヘッダ + `modules.terrain.data.siteContext` | — | required | SCT1内で保持 | m | 保持 | lossless | — | width/height/cellSize/origin | T |
| `siteContext.terrain[].noDataValue` | number | SCT1ヘッダ | number | required | そのまま（既定-9999） | m | — | lossless | — | — | T |
| `siteContext.terrain[].elevationResource` | assetRef | `terrainDocument.surfaceReference` + `assetReferences` | string[] | required(terrainあり時) | アセット収録→参照pathへ変換 | — | — | lossy(参照化) | アセット欠落は失敗 | checksum照合 | B |
| `siteContext.terrain[].meshResource` | assetRef? | — | — | optional | — | — | — | — | **deferred** | SPACER受け口なし（Lane T） | T |
| `siteContext.terrain[].recipe` | object | `modules.terrain.data.siteContext` | object | required | そのまま | — | — | lossless | — | payload+recipeHash | T |
| `siteContext.terrain[].transformRecords` | array | `modules.terrain.data.siteContext` | array | optional | そのまま | — | — | lossless | — | — | T |
| `siteContext.terrain[].status` | `"ready"\|"stale"` | `modules.terrain.data.siteContext` | enum | required | そのまま | — | — | lossless | — | staleはwarning化 | T |
| `siteContext.terrain[].staleReason` | string? | `modules.terrain.data.siteContext` | string? | optional | そのまま | — | — | lossless | — | — | T |
| `siteContext.terrain[].quality` | object | `modules.terrain.data.siteContext` | object | optional | そのまま | m | — | lossless | — | verticalM/horizontalM | T |
| `siteContext.terrain[].inputHashes` | string[] | `modules.terrain.data.siteContext` | string[] | optional | そのまま | — | — | lossless | — | — | T |
| `siteContext.terrain[].createdAt/updatedAt/generatedAt` | string | `modules.terrain.data.siteContext` | string | optional | そのまま | — | — | lossless | — | — | T |
| `siteContext.activeTerrainId` | string? | `modules.terrain.data.siteContext.activeTerrainId` | string? | optional | そのまま | — | — | lossless | 参照欠落 | 参照存在検証（I-02） | T |

### 3.6 sourceDatasets

| source path | source type | destination path | destination type | required | transform | unit | CRS | lossless | unsupported | notes | owner |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `siteContext.sourceDatasets` | array | `metadata.siteContextSourceDatasets` | array | optional | そのまま | — | 保持 | lossless | — | — | B |
| `siteContext.sourceDatasets[].sourceDatasetId` | string | 同上 `.sourceDatasetId` | string | required | そのまま | — | — | lossless | — | 一意性 | B |
| `siteContext.sourceDatasets[].sourceType` | enum | 同上 `.sourceType` | enum | required | そのまま | — | — | lossless | — | dem/basemap/aerial/survey/cad/other | B |
| `siteContext.sourceDatasets[].legacyKind` | string? | 同上 `.legacyKind` | string? | optional | そのまま | — | — | lossless | — | gsi-dem等 | B |
| `siteContext.sourceDatasets[].sourceName` | string | 同上 `.sourceName` | string | required | そのまま | — | — | lossless | — | — | B |
| `siteContext.sourceDatasets[].originalSource` | string | 同上 `.originalSource` | string | required | そのまま | — | — | lossless | — | — | B |
| `siteContext.sourceDatasets[].coordinateContextId` | string | 同上 `.coordinateContextId` | string | required | そのまま | — | — | lossless | 参照欠落 | I-02 | B |
| `siteContext.sourceDatasets[].bounds` | bounds? | 同上 `.bounds` | bounds? | optional | そのまま | m | — | lossless | — | — | B |
| `siteContext.sourceDatasets[].acquiredAt` | string | 同上 `.acquiredAt` | string | required | そのまま | — | — | lossless | — | — | B |
| `siteContext.sourceDatasets[].provider/url` | string? | 同上 | string? | optional | そのまま | — | — | lossless | — | — | B |
| `siteContext.sourceDatasets[].license` | object | 同上 `.license` | object | required | そのまま | — | — | lossless | — | redistributeOk制御 | B |
| `siteContext.sourceDatasets[].cachePolicy` | enum | 同上 `.cachePolicy` | enum | required | そのまま | — | — | lossless | — | — | B |
| `siteContext.sourceDatasets[].location` | union | 同上 `.location` | union | required | そのまま | — | — | lossless | — | copied/copiedMulti/external/transient | B |
| `siteContext.sourceDatasets[].resolution` | object? | 同上 `.resolution` | object? | optional | そのまま | m | — | lossless | — | — | B |
| `siteContext.sourceDatasets[].quality` | object? | 同上 `.quality` | object? | optional | そのまま | m | — | lossless | — | — | B |
| `siteContext.sourceDatasets[].datasetContentHash` | string? | 同上 `.datasetContentHash` | string? | optional | そのまま | — | — | lossless | — | checksum照合に使用 | B |
| `siteContext.sourceDatasets[].gsiMeta` | object? | 同上 `.gsiMeta` | object? | optional | そのまま | — | — | lossless | — | — | B |
| `siteContext.sourceDatasets[].provenance` | object | 同上 `.provenance` | object | required | そのまま | — | — | lossless | — | — | B |

### 3.7 existingConditions

| source path | source type | destination path | destination type | required | transform | unit | CRS | lossless | unsupported | notes | owner |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `existingConditions` | array | `metadata.existingConditions` | ExistingConditionsDocument | optional | **変換**（個体化） | m | 保持 | lossy | meshRef個体 | V2: 不typed / V1: ref+asset | B |
| `existingConditions[].id` | string | `.entities[].entityId` | string | required | そのまま | — | — | lossless | — | — | B |
| `existingConditions[].type` | enum | `.entities[].type` | enum | required | そのまま（12種一致） | — | — | lossless | — | road/river/railway/existingBridge/building/seawall/pond/underground/pipe/tunnel/utility/other | B |
| `existingConditions[].label` | string | `.entities[].label` | string | required | そのまま | — | — | lossless | — | — | B |
| `existingConditions[].geometry` | union | `.entities[].geometry` | union | required | 変換（point/line/polygon/pipe） | m | 保持 | lossy | **meshRef** | meshRefは **deferred** | B |
| `existingConditions[].layer` | enum | `.entities[].layer` | enum | required | そのまま | — | — | lossless | — | surface/underground/water | B |
| `existingConditions[].coordinateContextId` | string | `.entities[].coordinateContextId` | string | required | そのまま | — | — | lossless | 参照欠落 | — | B |
| `existingConditions[].sourceId` | string? | `.entities[].sourceReference` | string? | optional | そのまま | — | — | lossless | — | — | B |
| `existingConditions[].quality` | object? | `.entities[].metadata.quality` | object? | optional | metadata内包 | m | — | lossless | — | — | B |
| `existingConditions[].metadata` | object | `.entities[].metadata` | object | optional | そのまま | — | — | lossless | — | — | B |
| `existingConditions[].styleRef` | string? | `.entities[].styleReference` | string? | optional | そのまま | — | — | lossless | — | — | B |

### 3.8 viewer用metadata / presentation

| source path | source type | destination path | destination type | required | transform | unit | CRS | lossless | unsupported | notes | owner |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `siteContext.searchLocation` | object? | `modules.terrain.data.siteContext.searchLocation` | object? | optional | そのまま | — | 保持 | lossless | — | — | V |
| `siteContext.imagery` | array | `modules.terrain.data.siteContext.imagery` | array | optional | そのまま | — | — | lossless | — | — | V |
| `siteContext.vectorLayers` | array | `modules.terrain.data.siteContext.vectorLayers` | array | optional | そのまま | — | — | lossless | — | — | V |
| `siteContext.presentation` | object | `modules.terrain.data.siteContext.presentation` | object | optional | そのまま | — | — | lossless | — | 非正本（UI便宜） | V |
| `siteContext.determinism` | object | `modules.terrain.data.siteContext.determinism` | object | required | そのまま | — | — | lossless | — | — | A |

### 3.9 asset references / checksum

| source path | source type | destination path | destination type | required | transform | unit | CRS | lossless | unsupported | notes | owner |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `terrain[].elevationResource`（assetRef） | assetRef | package `assets/canonical/terrain/<id>.sct1` | file | required(terrainあり時) | base64→バイナリ→package収録 | — | — | lossy(参照化) | 欠落=失敗 | checksum照合（sha256） | B |
| `existingConditions` ref.assetRef | assetRef | `metadata.existingConditions`（entity内蔵） | — | optional | 個体JSONは entity内蔵化 | — | — | lossy | meshRef | — | B |
| checksum | sha256 | package files `checksum` | sha256 | required | 再計算+照合 | — | — | — | 不一致=失敗 | fail-closed | B |

### 3.10 export/import version

| source path | source type | destination path | destination type | required | transform | unit | CRS | lossless | unsupported | notes | owner |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ExportEnvelope.format | `"sitecontext-package"` | — | — | required | 検証 | — | — | — | 他形式=失敗 | 読取識別用 | B |
| ExportEnvelope.version | `"1"` | — | — | required | 検証 | — | — | — | 2以上=失敗 | — | B |
| exportProfile | `"sitecontext-v2"` | — | — | required | 検証 | — | — | — | — | — | B |
| schemaVersion（envelope.project） | `"1"\|"2"` | PDC `schemaVersion` | `"1.0.0"` | required | V1→V2正規化→`1.0.0` | — | — | — | 3以上=失敗 | — | A |
| package-manifest.formatVersion | `"1"` | — | — | optional | 互換対応 | — | — | — | — | Node側manifest（旧19章） | B |
| guaranteeLevel / excludedSources | enum / array | — | — | optional | 再算出 | — | — | — | — | license制御 | B |

## 4. 未対応 field 一覧（削除せず明示）

| field（source） | 扱い | 理由 | 将来 |
|---|---|---|---|
| `terrain[].meshResource` | **deferred** | SPACER terrain moduleに受け口なし | Lane T が `meshResource` 受け口追加後に取り込み |
| existingConditions `geometry.kind:"meshRef"` | **deferred** | SPACER geometry に meshRef なし | Lane V 等の3Dニーズに応じて拡張 |
| 東京測地系 30161-30179 | **unsupported** | EPSG分類器が throw | Lane T のCRS拡張時に対応 |
| `schemaVersion=3` 以降 | **unsupported** | 現行契約外 | site-context側 freeze 更新時 |
| `terrain.bounds` 導出の2系統差分 | **未決定（OPEN）** | doc 03章と09章で半セル分の差 | B-4 で1系統へ固定し本表へ追記 |

## 5. Lane A への変更要求（新規field候補）

現状 **PDC schema 変更は不要**（metadata / terrain module payload は `Record<string,unknown>` で受容）。
ただし以下は Lane A の判定が必要：

| field | 型 | optional/required | persisted先 | source | mapping元 | 利用Lane | 必要理由 |
|---|---|---|---|---|---|---|---|
| `metadata.siteContextCoordinateContexts` | array | required（import時） | PDC metadata | ProjectV2.coordinateContexts | — | B/T/V | CRS正本保持（そのまま） |
| `metadata.siteContextProjectCoordinateContextId` | string | required（import時） | PDC metadata | ProjectV2.projectCoordinateContextId | — | B/T/V | primary CRS識別 |
| `metadata.siteContextSourceDatasets` | array | optional | PDC metadata | ProjectV2.sourceDatasets | — | B/V/S | provenance保持 |
| `metadata.existingConditions` | object | optional | PDC metadata | ProjectV2.existingConditions | ExistingConditionsDocument | B/V | 既存格納先と一致 |
| `modules.terrain.data.siteContext` | object | required（import時） | terrain module | ProjectV2.siteContext | — | T/V/U/S | full payload保持 |
| `modules.terrain.data.selectionArea` | object? | optional | terrain module | ProjectV2.selectionArea | — | B/V | selection保持 |

> 上記はすべて **既存の loose slot** へ収まるため、**Lane A の schema 変更要求は発生しない**。
> 万一 strict 化する場合は本表を変更要求として発行する。

## 6. 特記事項

1. **CRS変換は行わない。** Adapter は座標を書き換えず、`coordinateSystem:"project"` の宣言と
   CRS保持のみ行う。実際のEPSG間変換は Lane T の担当。
2. **V1 → V2 正規化は site-context の `migrateProjectV1ToV2` をそのまま利用**（再解釈しない）。
3. **bounds 導出式の2系統** は B-4 で固定し、本表の「未決定（OPEN）」を解決する。
4. **existingConditions** は site-context の参照形式（V1: ref+asset / V2: 不typed）を
   SPACER の `ExistingConditionsDocument`（entity内蔵）へ変換する。
5. **unsupported/deferred は黙って捨てない。** Adapter の `unsupportedFields` に列挙し、
   import 結果に warning として返す。

## 7. 次工程

- B-3: [Adapter Interface](site-context-spacer-adapter-interface.md)
