# site-context × SPACER データ契約再確認（Wave 1 Lane B-1）

> **Authority:** INTEGRATION CONTRACT（P0）
> **Status:** RECOMMENDED
> **Owner:** Lane B（Wave 1） / Lane A（canonical field 変更判定）
> **Baseline:** site-context `9e499c0` / spacer-clone `31a1113`
> **上位契約:** [site-context × spacer-clone 統合契約](../integration/site-context-unification/README.md) / [field mapping freeze](site-context-spacer-field-mapping.md)

## 1. 目的

SPACER CLONE と site-context-prototype の現行データ構造を実コードで再確認し、
`.sitecontext` → SPACER Project への取り込み契約の前提を固定する。
site-context 側は読み取り参照のみ。SPACER 側の正本は変更しない。

## 2. 両リポジトリの現行正本

### 2.1 site-context-prototype（読み取り参照元）

| 資産 | パス | 役割 |
|---|---|---|
| ProjectV2 zod schema | `packages/core/src/schema/projectV2.ts` | 正本スキーマ（schemaVersion `2`）。Design Freeze対象 |
| ProjectV1 zod schema | `packages/core/src/schema/project.ts` | 実動UI（localStorage）が使用。V1→V2 migrationあり |
| SelectionArea | `packages/core/src/schema/selection.ts` | 一級データ（正本=type+vertices） |
| Heightfield | `packages/core/src/terrain/heightfield.ts` | cell-center規則・双一次補間 |
| SCT1 binary | `packages/core/src/terrain/serialize.ts` / `importer/heightfieldBinary.ts` | 標高バイナリ（magic `SCT1`・formatVersion=1） |
| CRS / JGD2011 | `packages/core/src/coordinate/transform.ts` / `epsgClassifier.ts` | 平面直角6669-6687・GRS80横メルカトル |
| パッケージ | `packages/core/src/pkg/package.ts` | .sitecontext zip（manifest + project.json + assets） |
| ExportEnvelope（app側実装） | `app/src/store/packageExport.ts` | ブラウザ実装のExportEnvelope（ProjectV1用） |
| Road Connector | `packages/core/src/rc/connector.ts` | 照会API（SPACERとは未接続・Phase 4以降） |

### 2.2 SPACER CLONE（正本・変更禁止）

| 資産 | パス | 役割 |
|---|---|---|
| PDC Schema | `frontend/src/next/project/schema.ts` | canonical Project（schemaVersion `1.0.0` strictObject・8 module registry） |
| Project Data Core | `frontend/src/next/project/projectDataCore.ts` | create/parse/serialize/hydrate |
| Terrain module | `frontend/src/next/modules/terrainModule.ts` | `TerrainDocument` 契約（松target） |
| Terrain adapter | `frontend/src/next/modules/terrainModuleAdapter.ts` | read/write terrainDocument |
| Existing conditions | `frontend/src/next/modules/existingConditions.ts` / `existingConditionsAdapter.ts` | `metadata.existingConditions` 格納 |
| .spacerproj package | `frontend/src/next/persistence/package/` | spacerproj-json-v1（manifest+files） |
| 統合契約 | `frontend/src/next/integration/siteContext/contract.ts` / `mappingManifest.ts` | 8概念マッピング正本（P0/P1済み） |

## 3. 項目別 契約再確認

### 3.1 project identity / project metadata

| 項目 | site-context正本 | SPACER格納先 | 判定 |
|---|---|---|---|
| schemaVersion | `projectV2.schemaVersion="2"`（V1は`"1"`） | PDC `schemaVersion="1.0.0"` | canonical / Adapterで変換（`2`/`1` → `1.0.0`） |
| dataVersion | `"2"` | （PDCには無し） | Adapterで照合のみ・保持しない |
| fileFormatVersion | `"2"` | packageFormatVersion=`"1"` | 別概念・Adapterで対応付け |
| projectId | `project.projectId`（string） | PDC `projectId`（uuid） | canonical / 互換性検証要（string id→uuid形式） |
| name | `project.name` | PDC `name` | canonical / そのまま |
| businessNumber | `project.businessNumber?` | `metadata.businessNumber` | canonical / そのまま |
| designStage | `project.designStage?` | `metadata.designStage` | canonical / enum整合をAdapterで確認 |
| createdAt / updatedAt | `project.createdAt/updatedAt`（ISO string） | PDC `createdAt/updatedAt` | canonical / そのまま（format検証） |
| externalIdentifiers | `project.externalIdentifiers?` | `metadata.siteContextExternalIdentifiers` | canonical / そのまま保持 |

### 3.2 coordinate system / EPSG

| 項目 | site-context正本 | SPACER格納先 | 判定 |
|---|---|---|---|
| coordinateContexts | `coordinateContexts[]`（V2 CRS discriminated union） | `metadata.siteContextCoordinateContexts`（full） + terrain moduleの`coordinateContext`（primary mirror） | canonical / そのまま保持 |
| projectCoordinateContextId | `projectCoordinateContextId` | `metadata.siteContextProjectCoordinateContextId` | canonical / そのまま |
| EPSG分類 | `epsgClassifier.ts`（geographic: 4326/6668/4269/4612・projected: 6669-6687） | terrain coordinateContext `coordinateSystem:"project"` | canonical / **CRS変換は行わない**（変換はLane T） |
| JGD2011 平面直角 | EPSG 6669-6687（GRS80・横メルカトル） | `metadata.siteContextCoordinateContexts` にそのまま | canonical / 変換不要・照合のみ |
| 東京測地系 | 30161-30179（08章はsourceのみ許容） | （未対応） | **unsupported** / EPSG分類器がthrow（`CRS-UNKNOWN-EPSG`） |
| 軸規約 | x=easting, y=northing, z=up | ドメイン x-along/y-transverse/z-up（R3-00） | Adapterで `coordinateContext.axisConvention` 宣言のみ・**座標自体は書き換えない** |

### 3.3 project origin

| 項目 | site-context正本 | SPACER格納先 | 判定 |
|---|---|---|---|
| origin | `coordinateContext.origin {x,y,z}` | terrain `coordinateContext.projectOrigin` | canonical / そのまま保持 |

### 3.4 selection area

| 項目 | site-context正本 | SPACER格納先 | 判定 |
|---|---|---|---|
| selectionArea | `siteContext.selectionArea?`（rect/polygon/viewport・正本=vertices） | `modules.terrain.data.selectionArea` | canonical / そのまま（null許容） |
| selectionTransformRecords | `siteContext.selectionTransformRecords[]` | `modules.terrain.data.selectionArea.transformRecords`（V2では不typed） | canonical / そのまま |

### 3.5 terrain metadata

| 項目 | site-context正本 | SPACER格納先 | 判定 |
|---|---|---|---|
| terrain | `siteContext.terrain[]`（SiteTerrain） | `modules.terrain.data.terrainDocument`（正規）+ `modules.terrain.data.siteContext`（full payload） | canonical / そのまま + 正規化 |
| activeTerrainId | `siteContext.activeTerrainId?` | `modules.terrain.data.siteContext.activeTerrainId` | canonical / そのまま |
| determinism | `siteContext.determinism` | `modules.terrain.data.siteContext.determinism` | canonical / そのまま |
| status/staleReason | `terrain[].status` / `staleReason?` | terrain module には無し（siteContext payloadで保持） | canonical / そのまま（exceptional: staleはwarning化） |

### 3.6 terrain resource / heightfield

| 項目 | site-context正本 | SPACER格納先 | 判定 |
|---|---|---|---|
| grid | `terrain[].grid`（GridSpec） | `terrainDocument.surfaceReference` が指すアセットに内包 + `modules.terrain.data.siteContext` | canonical / SCT1内で保持 |
| noDataValue | `terrain[].noDataValue`（既定-9999） | SCT1ヘッダ内 | canonical / そのまま |
| elevationResource | `terrain[].elevationResource`（assetReference） | `terrainDocument.surfaceReference` + `assetReferences` | canonical / アセット参照へ変換 |
| meshResource | `terrain[].meshResource?` | （なし） | **deferred** / SPACER側に受け口なし（Lane T） |
| recipe / transformRecords | `terrain[].recipe{payload,recipeHash}` / `transformRecords[]` | `modules.terrain.data.siteContext`（full payload） | canonical / そのまま |
| inputHashes | `terrain[].inputHashes[]` | `modules.terrain.data.siteContext` | canonical / そのまま |
| quality | `terrain[].quality` | `modules.terrain.data.siteContext` | canonical / そのまま |

### 3.7 Heightfield / SCT1

| 項目 | site-context正本 | SPACER格納先 | 判定 |
|---|---|---|---|
| SCT1 バイナリ | `serializeHeightfieldBinary`（magic `SCT1`・formatVersion 1・float32 LE row-major） | packageアセット（`assets/canonical/terrain/*.sct1`）を `surfaceReference` で参照 | canonical / **バイナリはそのまま保持**・base64変換のみ（package JSON化のため） |
| bounds導出 | doc 2系統（03章=半セル拡張 / 09章=半セルなし） | terrain module `bounds` | **既知差分** / AdapterはSCT1ヘッダ+gridから導出する式を**固定**（B-4で確定） |

### 3.8 source datasets

| 項目 | site-context正本 | SPACER格納先 | 判定 |
|---|---|---|---|
| sourceDatasets | `siteContext.sourceDatasets[]` | `metadata.siteContextSourceDatasets` + terrain document source | canonical / そのまま |
| license | `sourceDatasets[].license` | `metadata.siteContextSourceDatasets` | canonical / redistributeOk制御はpackage生成で適用（B-4） |
| location | `copied` / `copiedMulti` / `external` / `transient` | `metadata.siteContextSourceDatasets` | canonical / transient/externalはpackage対象外 |
| datasetContentHash | `sourceDatasets[].datasetContentHash?` | そのまま | canonical / checksum照合に使用 |
| gsiMeta | `sourceDatasets[].gsiMeta?` | そのまま | canonical / そのまま |

### 3.9 existing structures / existing conditions

| 項目 | site-context正本 | SPACER格納先 | 判定 |
|---|---|---|---|
| existingConditions | `existingConditions[]`（V2: 不typed / V1: `existingConditionRef[]`） | `metadata.existingConditions`（existingConditionsAdapter互換） | canonical / **変換**（ExistingCondition → ExistingConditionsDocument） |
| 参照形式 | V1: `{id, assetRef}`（個体は `assets/canonical/existing/<id>.json`） | SPACER `ExistingConditionsDocument`（entity内蔵） | **変換** / meshRef等の個体アセット参照は **deferred** |

### 3.10 road / alignment への接続点

- site-context `RoadConnector`（20章）は「将来の道路設計システムへ現況地形を渡す照会API」であり、
  **SPACER road / alignment とは未接続**（Phase 4以降）。
- SPACER側の接続点は `bridgeLayout` の `terrainReference.surfaceReference` / `existingConditionsReference`、
  `substructure` の `getProjectTerrainGrid` / `lookupTerrainElevation` 経由。
- **結論: Adapterは road alignment との直接接続を持たない。** terrain/sourceDatasetsの供給のみ。

### 3.11 bridge / substructure への接続点

| 項目 | site-context正本 | SPACER格納先 | 判定 |
|---|---|---|---|
| terrainReference | （直接接続なし） | bridgeLayout `terrainReference.surfaceReference` | Adapterが `terrainDocument.surfaceReference` を設定することで解決 |
| existingConditionsReference | （直接接続なし） | bridgeLayout `existingConditionsReference.documentReferenceId` | Adapterが `metadata.existingConditions` を設定することで解決 |

### 3.12 viewer 用 metadata

| 項目 | site-context正本 | SPACER格納先 | 判定 |
|---|---|---|---|
| presentation | `siteContext.presentation`（viewState/display/searchHistory/dataWarnings） | `modules.terrain.data.siteContext.presentation` | **非正本（UI便宜）** / そのまま保持 |
| searchLocation | `siteContext.searchLocation?` | `modules.terrain.data.siteContext` | canonical（一級） / そのまま |
| imagery / vectorLayers | `siteContext.imagery[]` / `vectorLayers[]` | `modules.terrain.data.siteContext` | canonical / そのまま（Viewer Lane V用） |

### 3.13 import/export metadata

| 項目 | site-context正本 | SPACER格納先 | 判定 |
|---|---|---|---|
| ExportEnvelope | `app/src/store/packageExport.ts`（format `sitecontext-package`・version `1`・exportProfile `sitecontext-v2`） | — | **参照元** / Adapterはこの形式を読み取る |
| package-manifest | `pkg/package.ts` PackageManifestV1（formatVersion `1`） | spacerproj-json-v1（manifest + files） | **別形式** / Adapterで変換 |
| guaranteeLevel | `canonical-restorable` / `source-complete` | — | Adapterが再算出（license制御） |
| excludedSources | `excludedSources[]` | — | Adapterが再算出 |

### 3.14 schemaVersion / formatVersion

- site-context: `schemaVersion` / `dataVersion` / `fileFormatVersion`（V2=`2`、V1=`1`）
- SPACER: PDC `schemaVersion="1.0.0"` / package `packageFormatVersion="1"`
- **Adapter規則:** `.sitecontext` は `schemaVersion ∈ {1,2}` を受容。V1は site-context の
  `migrateProjectV1ToV2` 相当でV2へ正規化してから取り込む（**migrationは site-context 側の正規関数をそのまま利用**、再解釈しない）。

### 3.15 asset参照

| 項目 | site-context正本 | SPACER格納先 | 判定 |
|---|---|---|---|
| assetReference | `{path, checksum, size}`（sha256） | package files `{path, checksum, size}` | canonical / **checksum照合**で取り込み（fail-closed） |
| elevation base64 | `.sitecontext` 内 `assets/terrain/<id>.bin.b64` | package `assets/canonical/terrain/*` | canonical / base64 → バイナリ→package |

### 3.16 checksum

- site-context: sha256（`assetReference.checksum`）・`datasetContentHash`・`canonicalHash`（recipeHash/revisionHash）
- SPACER: sha256（package files）
- **規則:** Adapterは package 側 sha256 を再計算し、site-context 側 `assetReference.checksum` と照合。
  不一致は **import失敗（fail-closed）**。

## 4. canonical / exceptional 区分 まとめ

| 区分 | 内容 |
|---|---|
| **canonical（そのまま保持）** | coordinateContexts / projectCoordinateContextId / selectionArea / terrain（full payload）/ sourceDatasets / searchLocation / activeTerrainId / determinism / imagery / vectorLayers / existingConditions(変換後) / SCT1バイナリ |
| **exceptional（warning化）** | unknown CRS由来のsource / `status:"stale"` terrain / `selectionAreaId:"migrated-unbound"` / `location.mode:"transient"` / `license.redistributeOk≠allowed` |
| **deferred（SPACERに受け口なし）** | `meshResource` / meshRef existing個体 / 東京測地系30161-30179 / 新旧bounds導出差分の決定（B-4） |
| **unsupported（import失敗）** | EPSG分類器判定不能（`CRS-UNKNOWN-EPSG`）/ project CRSがgeographic / 参照先source欠落 / checksum不一致 |

## 5. 既知の注意点（実コード確認済み）

1. **ExportEnvelope は app 側のみ実装**（`packageExport.ts`）。`pkg/package.ts` の
   PackageManifestV1 と形式が異なる。Adapterは **app側ExportEnvelope** を正本入力とし、
   Node側manifestは互換対応（B-4で確認）。
2. **V2 persistence は未統合**。実動UIは ProjectV1。AdapterはV1入力をV2正規化後に取り込む。
3. **bounds導出が2系統**（03章=半セル拡張 / 09章=半セルなし）。B-4実装時に1系統へ固定し、
   Field Mapping Freeze へ追記する。
4. SPACER `getProjectTerrainGrid`（bridgeLayoutPlacement.ts:99）は現状 referenceMountain を
   返す **stub**。本Adapterの `terrainDocument.surfaceReference` 設定後は Lane T が
   実アセット読込へ置換する。

## 6. 次工程

- B-2: [Field Mapping Freeze](site-context-spacer-field-mapping.md)
- B-3: [Adapter Interface](site-context-spacer-adapter-interface.md)
