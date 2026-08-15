# 03. Adapter / 共有interface 契約

> 統合境界（02章）のコード化。実際のコードは
> `frontend/src/next/integration/siteContext/`（contract.ts / mappingManifest.ts / __tests__/contract.test.ts）。

## 1. 目的

site-context-prototype のデータ概念を spacer-clone（正本リポジトリ）へ吸収する際の
**共有interfaceと schema mapping を、実行コードとテストで固定する**。

- 実行経路には一切配線しない（frozen な module registry / PDC / `/app` shell を変更しない）
- 既存 schema の検証のみをテストで担保する（strictObject 等の現実と整合すること）

## 2. 構成

| ファイル | 役割 |
|---|---|
| `contract.ts` | 境界の共有型定義（PdcTargetSlot / SiteContextMappingEntry / SiteContextUnificationContract / SiteContextImportEnvelope）と type guard |
| `mappingManifest.ts` | 実際のマッピング表（P0/P1 の正本決定をデータ化） |
| `__tests__/contract.test.ts` | 14件のvitest（slot存在検証・概念カバー検証・PDC互換性の実証） |

## 3. contract.ts の主要型

- `PDC_MODULE_SLOTS` / `PDC_METADATA_SLOT` → `PdcTargetSlot`
  - マッピング先が **既存の PDC module キーまたは metadata のみ**であることを型で制約
- `SITE_CONTEXT_SOURCE_CONCEPTS`（8概念）→ `SiteContextSourceConcept`
- `SiteContextMappingEntry`: `{ sourceConcept, targetSlot, targetLocation, required, notes }`
- `SiteContextUnificationContract`: 正本repo・吸収repo・決定文・packageFormat・mapKey・entries
- `SiteContextImportEnvelope`: 境界を越えるデータ形状の最小記述

## 4. mappingManifest.ts（実データ）

- canonicalRepository: `spacer-clone`
- absorbedRepository: `site-context-prototype`
- packageFormat: `spacerproj-json-v1`
- 8概念のマッピング:
  - `coordinateContexts` / `projectCoordinateContextId` / `sourceDatasets` / `existingConditions` → `metadata`
  - `siteContext` / `selectionArea` / `terrain` / `elevationResource` → `terrain` モジュール
- required: `coordinateContexts` / `projectCoordinateContextId` / `siteContext` の3つ

## 5. テスト担保事項（contract.test.ts・14件）

1. 契約バージョン・正本repo・packageFormat の固定
2. 全 entry の targetSlot が PDC slot（module key / metadata）であること
3. 8概念を重複なく全カバー
4. required が core 3概念と一致
5. 宣言 slot が実 registry（`PROJECT_MODULE_KEYS`）に存在
6. `PDC_MODULE_SLOTS` と `PROJECT_MODULE_KEYS` の同期
7. site-context payload が既存 terrain module の loose slot に収まる（実証）
8. site-context metadata payload が strict project schema の metadata slot に収まる（実証）
9. TerrainDocument 契約（surfaceReference 等）が module に格納可能（実証）
10. type guard の正当性

## 6. 次Phase（P2）でこの契約を実装に接続する場所

- `.sitecontext` Importer/Exporter: `frontend/src/next/persistence/package/` に追加（spacerproj 側の integrity check 5項目を踏襲）
- terrain モジュールの coordinateContext 受け入れ: `modules/terrainModule.ts` / `modules/terrain/terrainCoordinate.ts`
- existingConditions への site-context existingConditions 変換: `modules/existingConditionsAdapter.ts`
- metadata キー（`siteContextCoordinateContexts` 等）の読み書きは PDC metadata（`Record<string, unknown>`）経由
