# site-context Reverse Compatibility Policy（Wave 2 Lane B-5）

> **Authority:** INTEGRATION CONTRACT（P0）
> **Status:** RECOMMENDED
> **Owner:** Lane B（Wave 2）
> **Baseline:** spacer-clone main `dc92346`（Wave 2 開始基準）
> **上位契約:** [統合契約](../integration/site-context-unification/README.md) / [データ契約](site-context-spacer-data-contract.md) / [Field Mapping](site-context-spacer-field-mapping.md) / [Adapter Interface](site-context-spacer-adapter-interface.md)

## 1. 目的

`.sitecontext`（site-context ProjectV2 相当）→ SPACER Project の **Import に加え、逆方向
（SPACER Project → `.sitecontext` Export）の互換性方針**を明文化する。

**重要な前提:** SPACER は `.sitecontext` の完全再構築（lossless 全量復元）を目的としない。
SPACER Project は `schemaVersion "1.0.0"`（PDC）であり、site-context ProjectV2 とは
**異なる永続化スキーマ**である。Export は「SPACER 側で意味を失わない必要最小限の
site-context 互換物」を生成することを方針とする。

## 2. 表記と原則

- **lossless**: site-context ProjectV2 の該当概念を、SPACER 側の格納値から一意に再構成できる。
- **lossy**: 変換により情報を欠落させる（不可逆）。SPACER 側で元概念が存在しない、または
  別概念へ正規化された場合。
- **unsupported**: SPACER 側に再現不能。export では省略し、診断一覧へ記録する。
- **deferred**: 現時点では実装しないが、将来版で対応可能なもの。省略＋診断記録。
- **export 可能条件**: その SPACER Project が site-context import 由来（`metadata.siteContext*` /
  `modules.terrain.data.siteContext` が存在）**または** 互換フィールドを保持する場合のみ。
  それ以外の SPACER ネイティブ Project からの `.sitecontext` 生成は行わない。

## 3. 分類表（SPACER → `.sitecontext` 逆方向）

| SPACER 格納先 | source（SPACER） | site-context 相当 | 分類 | 変換 / 注記 |
|---|---|---|---|---|
| `metadata.siteContextCoordinateContexts` | coordinateContexts（そのまま） | `coordinateContexts` | lossless | そのまま復元（V2形式で保持されているため） |
| `metadata.siteContextProjectCoordinateContextId` | projectCoordinateContextId | `projectCoordinateContextId` | lossless | そのまま復元 |
| `modules.terrain.data.siteContext` | SiteContext full payload | `siteContext` | lossless | site-context import 時に保持した V2 正本そのもの |
| `modules.terrain.data.selectionArea` | SelectionArea | `siteContext.selectionArea` | lossless | そのまま復元 |
| `metadata.siteContextSourceDatasets` | sourceDatasets | `siteContext.sourceDatasets` | lossless | そのまま復元 |
| `metadata.siteContextExternalIdentifiers` | externalIdentifiers | `project.externalIdentifiers` | lossless | そのまま復元 |
| `metadata.siteContextLayerMappings` | layerMappings | `layerMappings` | lossless | import 時 deferred 保持のため、保持されていれば復元 |
| `metadata.siteContextSettings` | settings | `settings` | lossless | 同上 |
| `metadata.existingConditions` | ExistingConditionsDocument | `existingConditions` | lossy | V2 個体化オブジェクト → assetRef 参照形式へ再変換が必要。既存 ID は保持、assetRef は SPACER 内 asset を再パッケージ |
| `modules.terrain.data.terrainDocument` | TerrainDocument | `siteContext.terrain`（active）+ `elevationResource` | lossy | SPACER TerrainDocument は SCT1 等の asset reference 形式。元の siteTerrain レコード形状とは異なるため、再構築時は変換を伴う |
| `projectId` / `name` / `createdAt` / `updatedAt` | Project 本体 | `project.*` | lossless | そのまま復元 |
| `metadata.businessNumber` | businessNumber | `project.businessNumber` | lossless | そのまま復元 |
| `metadata.designStage` (+customLabel) | designStage | `project.designStage` | lossy | `other`+customLabel は元の未知文字列を直接復元できない（customLabel を保持している場合は復元可） |
| SPACER ネイティブ module（road/bridgeLayout/superstructure/substructure/analysis/cim/deliverables） | — | — | unsupported | `.sitecontext` には存在しない概念。export 診断の unsupported 一覧へ記録 |
| SPACER ネイティブ metadata（siteContext* 以外） | — | — | unsupported / deferred | site-context 側に格納先がないものは unsupported。将来 .spacerproj 相互運用で対応可能なものは deferred |

## 4. Export が生成しないもの

- **完全復元保証**（`canonical-restorable` 保証はしない）。SPACER → `.sitecontext` export は
  `source-complete` 相当の **informational export** であり、再 import 時の完全一致は保証しない。
- **東京測地系 CRS を含む Project** の再構築（unsupported 30161-30179）。
- **SPACER ネイティブの道路・橋梁・解析モジュール**。これらは `.sitecontext` に載せない。

## 5. Export 時の warning / diagnostic

export を許可する場合も、以下を診断に記録する:

- `SC-WARN-EXPORT-LOSSY-<FIELD>`: lossy 変換を行った field。
- `SC-WARN-EXPORT-UNSUPPORTED-<FIELD>`: unsupported で省略した field。
- `SC-WARN-EXPORT-DEFERRED-<FIELD>`: deferred で省略した field。
- その他: 再 import で完全一致しない旨の informational warning。

## 6. 実装方針（B-4 との関係）

- B-4 Import Adapter は **Export を実装しない**。本ポリシーは「逆方向が存在しない」ことを
  契約として明示し、将来 Export を実装する際（Lane B or 後続 Wave）の根拠とする。
- 逆方向 export を実装する場合は、本ポリシーの分類表を単一の根拠として実装する。
- `.sitecontext` Import は canonical 化される唯一の方向。SPACER ネイティブ形式を
  `.sitecontext` へ「黙って canonical 扱い」にすることはない。