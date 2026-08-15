# 02. 統合境界（Integration Boundaries）

> 正本決定（00章）・監査（01章）に基づき、一本化を安全に進めるための境界を確定する。

## 1. 領域別 正本・境界

| 領域 | 正本（spacer-clone側） | site-context側の扱い | 境界・Adapter |
|---|---|---|---|
| Project Schema | PDC `frontend/src/next/project/schema.ts`（v1.0.0・strictObject） | ProjectV2 → module payload | モジュール登録数は**増やさない**。`terrain` モジュール + `metadata` へマッピング |
| Project Manager | `persistentProjectManager.ts`（enqueueSave/backup/restore） | businessStore（localStorage）は廃止対象 | site-context UI は PDC 経由に置換 |
| Save/Load | FilesystemProjectPersistence（project.json + .backup 世代5） | generation方式の原子性・checksum検証は**改善パターンとしてPORT** | `.tmp→final` を atomic 化する際の参考とする（実施は別Phase） |
| Package | `.spacerproj`（spacerproj-json-v1・単一JSON） | `.sitecontext`（zip） | `.sitecontext` → `.spacerproj` の **Importer/Exporter Adapter** を実装 |
| Electron | `desktop/electron/`（single instance・backend起動・CloseGuard） | `app/electron/`（IPC 3本）は廃止 | — |
| App Shell | `NextApp.tsx`（`/app` production正） | `App.tsx` は吸収（BusinessList/2D/3D/Properties） | `modules/terrain` のUIとして再構成 |
| 3D / 地形 | `SceneViewer.tsx` + `renderCoordinate.ts` + `modules/terrain/` | `TerrainViewer.tsx`・Heightfield・DEM取得 | EPSG/平面直角/heightfield/SCT1 は**PORT候補** |
| Coordinate/CRS | R3-00（x-along/y-transverse/z-up・project/local） | canonical(easting,northing,up)・EPSG6669-6687 | 変換関数の移植時に R3-00 軸規約へ整合 |
| テスト | vitest + Playwright | vitest（node env） | パターン流用 |

## 2. 概念マッピング（site-context → spacer-clone）

| site-context概念 | マッピング先 | 根拠 |
|---|---|---|
| coordinateContexts | `metadata.siteContextCoordinateContexts`（primaryはterrain moduleのcoordinateContextへmirror） | terrainModule.ts `TerrainCoordinateContext` が正 |
| projectCoordinateContextId | `metadata.siteContextProjectCoordinateContextId` | 同上 |
| siteContext | `modules.terrain.data.siteContext` | モジュールpayloadは `Record<string, unknown>` で受容可能 |
| selectionArea | `modules.terrain.data.selectionArea` | 同上 |
| sourceDatasets | `metadata.siteContextSourceDatasets`（+ terrain document sourceへ） | 出典・provenanceはmetadataが妥当 |
| terrain（SiteTerrain） | `modules.terrain.data.terrainDocument` | terrainModule.ts `TerrainDocument` 契約へ |
| elevationResource | `modules.terrain.data.terrainDocument.surfaceReference` / `assetReferences` | バイナリは埋め込まず参照管理 |
| existingConditions | `metadata.existingConditions` | 既存 `existingConditionsAdapter.ts` の格納先と一致 |

> このマッピングは `frontend/src/next/integration/siteContext/mappingManifest.ts` としてコード化し、
> `contract.test.ts` で「既存 PDC slot のみを参照していること」を検証済み。

## 3. No-Change Zone（不変境界）

- **spacer-clone**:
  - Protected Core（BridgeProject canonical 4文書・validateBridgeProject・provenance/status/revision guard・Save/Load/Replay・Main3D・CalculationAdapter）
  - Phase 10/11 Design Freeze の FROZEN 境界（NOT_AUTHORIZED/HOLD_NOT_AVAILABLE/DEFER/SOURCE_NOT_AVAILABLE）
  - `/pro`（legacy App）は資産参照として非破壊維持・canonical書込みは新 `/app` 経由のみ
  - 8 module registry（`PROJECT_MODULE_KEYS`）にモジュールを**追加しない**
  - 既知のdirty状態（apollo evidence JSON 3件 / final_report.txt 削除 / R1-04.5 txt）を**変更しない**
- **site-context-prototype**: Design Freeze（SCP-DF-2026-08-15-1）を実吸収開始まで維持

## 4. 段階的吸収計画（Phased Plan）

| Phase | 内容 | 成果物 | 状態 |
|---|---|---|---|
| P0 | 統合監査・正本決定・境界確定 | 00/01/02/03章 + 共有interface | **本PRで実施** |
| P1 | shared interface / schema mapping契約 | `integration/siteContext/contract.ts` + `mappingManifest.ts` + テスト | **本PRで実施** |
| P2 | `.sitecontext` → `.spacerproj` Importer/Exporter Adapter（実データ読込不能化を防ぐ） | package層 adapter + 旧データ読込テスト | 次フェーズ |
| P3 | terrain モジュール強化（EPSG/平面直角/heightfield/SCT1/DEM取得のPORT） | `modules/terrain/` 拡張 + テスト | 次フェーズ |
| P4 | site-context UI（DemWizard/2D/3D/Properties）の `/app` への統合 | UI統合 + E2E | 次フェーズ |
| P5 | site-context リポジトリ運用終了（データmigration検証後） | 移行ガイド・アーカイブ | 次フェーズ |
| P6 | （任意）spacer-clone内 workspace 化による monorepo 化 | package分割 | 将来 |

- 各Phaseは小ステップで main へ commit/push し、必ず関連テスト・typecheck・build を通す。
- Project Schema・Save/Load・.spacerproj の後方互換を壊す変更は、migration と旧データ読込テストを**先に**実装する。

## 5. 互換性維持のための migration 要件

1. **旧 .sitecontext（zip）読込**: 読込専用Importerで `spacerproj-json-v1` へ変換（checksum照合・fail-closed）
2. **ProjectV2 → PDC**: `schemaVersion` を PDC へ整合させる Adapter（siteContext payload は module に保持）
3. **SCT1 バイナリ**: 埋め込み base64 → `surfaceReference`/`assetReferences` へ移行し、パッケージに同梱する方式を定義
4. **localStorage/IDB 実動データ**: 旧 site-context データの読込は P2 の Importer 経由で保証（破棄しない）
