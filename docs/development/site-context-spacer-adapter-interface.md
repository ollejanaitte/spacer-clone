# `.sitecontext` → SPACER Project Adapter Interface（Wave 1 Lane B-3）

> **Authority:** INTEGRATION CONTRACT（P0）
> **Status:** RECOMMENDED
> **Owner:** Lane B（Wave 1）
> **Baseline:** site-context `9e499c0` / spacer-clone `31a1113`
> **上位契約:** [統合契約](../integration/site-context-unification/README.md) / [データ契約再確認](site-context-spacer-data-contract.md) / [Field Mapping Freeze](site-context-spacer-field-mapping.md)

## 1. 目的

`.sitecontext`（site-context ProjectV2相当）→ SPACER Project の **Import Adapter の正式入出力契約**を確定する。
B-4 実装担当AIがこの文書だけで実装へ入れる状態を目指す。本Adapterの**本実装は B-4 で行い、今回は I/F のみ**確定する。

## 2. 配置方針

- 実装先（B-4）: `frontend/src/next/persistence/package/`（.spacerproj の integrity check 5項目を踏襲）
- I/F 型: `frontend/src/next/integration/siteContext/adapterContract.ts`（本作業で骨格を作成）
- Contract test: `frontend/src/next/integration/siteContext/__tests__/adapterContract.test.ts`（本作業で skeleton を作成）

## 3. 入力（Input）

```ts
interface SiteContextImportInput {
  /** .sitecontext パッケージ全体（zip ではなく展開済みか、または zip buffer） */
  package: SiteContextPackage; // { envelope, files }
  options?: SiteContextImportOptions;
  sourceMetadata?: Record<string, unknown>;
}

interface SiteContextPackage {
  envelope: SiteContextExportEnvelope;   // package-manifest.json（ExportEnvelope）
  files: PackageFile[];                  // project.json + assets/*
}

interface SiteContextExportEnvelope {
  format: 'sitecontext-package';
  version: '1';
  exportProfile: 'sitecontext-v2';
  exportedAt: string;
  revision: number;
  projectId: string;
  schemaVersion: string;                 // '1' | '2'
  project: ProjectV1OrV2;
  files: { path: string; checksum: string; size: number }[];
  guaranteeLevel?: 'canonical-restorable' | 'source-complete';
  excludedSources?: { sourceDatasetId: string; reason: 'license-prohibited' | 'license-unknown' | 'external' }[];
}

interface SiteContextImportOptions {
  asNew?: boolean;                       // import-as-new（ID再採番）
  targetProjectName?: string;            // name override（未指定ならsource name）
  includeSource?: boolean;               // license許容のsourceアセットを収録
  availableBytes?: number;               // capacity検証用
  strict?: boolean;                      // default true（fail-closed）
}
```

### 入力元（正本）

- **app側 ExportEnvelope**（`app/src/store/packageExport.ts`）: `format=sitecontext-package` / `version=1` / `exportProfile=sitecontext-v2`
- **Node側 PackageManifestV1**（`pkg/package.ts`）: `formatVersion=1`（旧19章・互換対応）
- **ProjectV2相当オブジェクト**: 直接渡す場合

## 4. 出力（Output）

```ts
type SiteContextImportResult =
  | { ok: true; projectId: string; report: SiteContextImportReport }
  | { ok: false; errorCode: SiteContextImportErrorCode; message: string; report?: SiteContextImportReport };

interface SiteContextImportReport {
  projectId: string;
  projectName: string;
  schemaVersion: string;                 // 出力PDC schemaVersion（'1.0.0'）
  sourceSchemaVersion: string;           // source側 schemaVersion（'1' | '2'）
  warnings: SiteContextWarning[];
  unsupportedFields: SiteContextUnsupportedField[];
  diagnostics: SiteContextConversionDiagnostics;
  crsImport: SiteContextCrsImportResult;
  terrainImport: SiteContextTerrainImportResult;
  version: SiteContextVersionInfo;
}

interface SiteContextWarning {
  code: string;                          // 'SC-WARN-*' で統一
  message: string;
  path?: string;
}

interface SiteContextUnsupportedField {
  path: string;                          // source field path
  reason: 'unsupported' | 'deferred';
  notes: string;
}

interface SiteContextConversionDiagnostics {
  migratedV1ToV2: boolean;               // V1入力をV2正規化したか
  selectionAreaMigrated: boolean;        // V1 extent → V2 selectionArea変換
  sourceCrsUnknownCount: number;         // unknown CRS source 数
  staleTerrainCount: number;             // status=stale の terrain 数
  excludedSources: { sourceId: string; reason: string }[];
}

interface SiteContextCrsImportResult {
  projectCoordinateContextId: string;
  epsg: number | null;                   // primary contextのEPSG（local/unknownは null）
  crsKind: 'known' | 'local' | 'unknown';
  horizontalUnits: 'm' | 'degree';
  supported: boolean;                    // false なら import失敗
}

interface SiteContextTerrainImportResult {
  terrainCount: number;
  importedTerrainIds: string[];
  sct1Count: number;                     // 収録SCT1アセット数
  missingAssetCount: number;             // 参照欠落アセット数（>0 は失敗）
  checksumVerifiedCount: number;
}

interface SiteContextVersionInfo {
  packageFormat: string;                 // 'sitecontext-package'
  packageVersion: string;                // '1'
  exportProfile: string;                 // 'sitecontext-v2'
  sourceSchemaVersion: string;
  targetSchemaVersion: string;           // '1.0.0'
  targetPackageFormatVersion: string;    // '1'（spacerproj-json-v1）
}
```

## 5. 失敗条件（fail-closed）

| errorCode | 条件 |
|---|---|
| `SC-ERR-UNSUPPORTED-CRS` | primary（project）CRSが geographic / EPSG分類不能 / 東京測地系30161-30179 |
| `SC-ERR-CORRUPT-SOURCE` | zip展開失敗 / project.json 不正JSON / checksum・size不一致 / manifest不正 |
| `SC-ERR-MISSING-REQUIRED` | coordinateContexts / projectCoordinateContextId / siteContext 欠落 |
| `SC-ERR-INCOMPATIBLE-VERSION` | schemaVersion ∉ {1,2} / envelope.version ≠ 1 / format ≠ sitecontext-package |
| `SC-ERR-INVALID-TERRAIN-REF` | elevationResource 参照アセット欠落 / sourceDatasetId 参照欠落（MIG-SOURCE-MISSING相当） |
| `SC-ERR-SCHEMA-FAILED` | V1→V2 正規化失敗（MIG-* 系） / ProjectV2 invariant 違反（I-01〜I-04） |
| `SC-ERR-TARGET-INVALID` | 生成した PDC Project が `parseProject` 検証NG |

## 6. 変換フロー（B-4 実装範囲）

```
.sitecontext (zip)
  → envelope解析（ExportEnvelope / PackageManifestV1 識別）
  → project.json 読取（schemaVersion検証）
  → [V1] migrateProjectV1ToV2（site-context 正規関数を利用）
  → ProjectV2 invariant 検証（I-01〜I-04）
  → Field Mapping Freeze 表に従い PDC Project 生成
      - metadata.siteContextCoordinateContexts
      - metadata.siteContextProjectCoordinateContextId
      - metadata.siteContextSourceDatasets
      - metadata.existingConditions（変換）
      - modules.terrain.data.siteContext（full payload）
      - modules.terrain.data.selectionArea
      - modules.terrain.data.terrainDocument（activeのみ正規化）
  → アセット収録（SCT1 → assets/canonical/terrain/*・checksum照合）
  → license制御（redistributeOk で source 収録判定）
  → parseProject で最終検証 → report 生成
```

## 7. 公開I/F（他Laneが利用）

### Lane T（terrain/CRS）

```ts
// 受入I/F: terrainDocument の coordinateContext と surfaceReference が正
// Lane T は modules.terrain.data.terrainDocument を読む
readTerrainDocument(manager, projectId): TerrainDocument | undefined;
// sourceDatasetの扱い: metadata.siteContextSourceDatasets から参照
// Heightfield/SCT1格納先: package 内 assets/canonical/terrain/<id>.sct1
```

### Lane V（viewer）

```ts
// terrain / existingConditions の公開I/F
readTerrainDocument(manager, projectId);          // modules.terrain.data.terrainDocument
readExistingConditions(manager, projectId);       // metadata.existingConditions
// viewer用: modules.terrain.data.siteContext（searchLocation/imagery/vectorLayers/presentation）
```

### Lane U（Site Context import UI）

```ts
// import UI から呼ぶ Adapter I/F
inspectSiteContextPackage(pkg): { ok, report, ... };   // 事前検証（inspect）
importSiteContext(pkg, options): SiteContextImportResult; // 本import
// warning/error 返却形式: SiteContextImportReport.warnings / .unsupportedFields
//   + { ok:false, errorCode, message }（fail-closed）
```

### Lane S（Reference Business 001 / 郡上市八幡 sample）

```ts
// site-context由来field: metadata.siteContext* キー + modules.terrain.data.*
// 郡上市八幡 sample の必要metadata:
//   - coordinateContexts: EPSG 6677（第7系）・origin・JGD2011
//   - selectionArea: 5km×5km（東経136.9567° / 北緯35.7512°）
//   - terrain: DEM5A ZL15 約1000×1000セル・SCT1
//   - sourceDatasets: gsiMeta（datasetId=dem5a_png 等）
```

## 8. Contract test skeleton（本作業で作成）

- ファイル: `frontend/src/next/integration/siteContext/__tests__/adapterContract.test.ts`
- 検証対象（B-4前に固定）:
  1. I/F 型が存在し `SiteContextImportResult` が union 型であること
  2. errorCode 列挙が freeze 済み（`SC_IMPORT_ERROR_CODES` 定数と一致）
  3. warning code prefix `SC-WARN-*` の規約
  4. mappingManifest の8概念と errorCode / report 型の整合
  5. 配置先（`.sitecontext` → PDC）が既存 PDC slot に収まること（既存 contract.test.ts と整合）

> 本テストは **型・定数の契約検証のみ**。実Adapterの動作テストは B-4 で追加する。

## 9. 他Lane境界の明確化

- **Lane A**: PDC schema / types.ts / projectMigration / canonical serializer 等の正本所有。本Adapterは
  既存 loose slot へ書き込むため schema 変更不要（変更要求は [field-mapping §5](site-context-spacer-field-mapping.md) に記載）。
- **Lane T**: CRS / SCT1 / terrain の受け口。本Adapterはアセット参照（surfaceReference）と
  CRS保持のみ。実際の座標変換・DEM取得・Heightfield生成は Lane T。
- **Lane V / U / S**: 本Adapterの `SiteContextImportReport` が返す warning/unsupported を
  それぞれのUI / sample で利用。
