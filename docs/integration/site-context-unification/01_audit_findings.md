# 01. 統合監査結果サマリ（site-context-prototype × spacer-clone）

> 2026-08-15 時点の両リポジトリ横断監査の結果を要約する。
> 監査は実コード・既存ドキュメント・Git履歴・テスト結果を根拠とした。

## 1. 現行構成

### site-context-prototype（main `b2c87ab`）
- **構造**: npm workspaces monorepo。`packages/core`（= `@scp/core`、zod/schema/persistence/coordinate/terrain/pkg）+ `app`（Electron + React 18 + three.js 0.169 + Vite）
- **Electron**: `app/electron/main.ts`（contextIsolation/sandbox/nodeIntegration無効・IPC 3本: project:create/open/save）+ `preload.ts`。レンダラーからは未使用（実動永続化はブラウザAPI）
- **App Shell**: `app/src/App.tsx`（view state切替・react-router不使用）。業務一覧 `pages/BusinessListPage.tsx`
- **Project**: `packages/core/src/schema/projectV2.ts` に ProjectV2 / coordinateContexts / SiteContext / SelectionArea / SourceDataset / SiteTerrain と `migrateProjectV1ToV2`・`validateProjectV2Invariants`（I-01〜I-04実装、設計I-01〜I-22）。**UIはProjectV1のまま**（App.tsx / businessStore.ts）
- **Save/Load**: 実動 = localStorage（businessStore）+ IndexedDB（terrainAsset SCT1 base64）。設計正本 = `packages/core/src/persistence/generation.ts`（current.json原子commit・revision・lock・全量checksum・backup）だが **UI未接続**
- **.sitecontext**: 実装2種が並存・不一致（ブラウザ実装 `app/src/store/packageExport.ts` = ExportEnvelope / Node実装 `packages/core/src/pkg/package.ts` = PackageManifestV1）
- **3D/地形**: `app/src/TerrainViewer.tsx`（OrbitControls・raycast pick）。canonical=(easting,northing,up)、`coordinate/adapter.ts` `(x,z,-y)` 変換。`coordinate/transform.ts` JGD2011平面直角 EPSG6669-6687。`terrain/heightfield.ts`（SCT1バイナリ双一次補間）
- **テスト**: vitest 19 files / 137 tests 全PASS（実測）。typecheck core+app PASS

### spacer-clone（main `294f324`）
- **構造**: root は workspace 無し・npm プロジェクトは `frontend/` のみ。`desktop/`（Electron）、`backend/`（FastAPI + scipy ソルバー）
- **Electron**: `desktop/electron/main.ts`（単一インスタンス・GPU mode解決・backend起動・CloseGuard）。preload `spacerDesktop`。IPC: dialog(open/save/save-spacerproj) / persistence(init/get-root/read-file/write-file/list-dirs/list-files/delete-dir/exists)
- **App Shell**: `frontend/src/next/NextApp.tsx`（`/app` production正・restore gate・SaveStatusIndicator）。`/pro`(legacy App) は参照用。手動routing（pushState + popstate）
- **Project Data Core**: `frontend/src/next/project/schema.ts`（PROJECT_SCHEMA_VERSION "1.0.0"・strictObject・modules 8キー）・`projectDataCore.ts`（parse/serialize/deserialize/migrate・`PROJECT_MIGRATIONS` は現状空）
- **Project Manager**: `projectManager.ts` + `persistentProjectManager.ts`（enqueueSave・backup・restoreFromPersistence・SaveState通知）。singleton `projectManagerInstance.ts`（IPC有無で FileSystem/Memory 切替）
- **Save/Load**: `filesystemProjectPersistence.ts`（project.json + `.backup/YYYYMMDD_HHMMSS_mmm.spacerbak` 世代5）。**atomic 書込ではない**（.tmp→final）
- **.spacerproj**: 単一JSONコンテナ（manifest + files・packageFormatVersion 1・sha256）。integrity check 5項目
- **3D/地形**: `SceneViewer.tsx`（共通Three host）+ `modules/renderCoordinate.ts`（domain→three: (x,z,-y)）。`modules/terrain/`（import/surface/TIN/LOD/referenceMountain）+ `terrainModule.ts`（TerrainDocument契約）
- **テスト**: vitest 4（多数）+ Playwright E2E。**jsdom + three 系で HTMLCanvasElement.getContext 未実装警告が大量**（warningでありfailureではない）
- **既知のdirty状態**: `docs/apollo/step4c_appurtenance_haunch/evidence/` JSON 3件 modified・`final_report.txt` deleted・新規 txt 1件（R1-04.5）。**保護対象・変更しない**

## 2. 重複機能一覧

| 機能 | site-context | spacer-clone | 一本化後の正本 |
|---|---|---|---|
| 業務一覧 | `pages/BusinessListPage.tsx` | `pages/BusinessListPage.tsx`（`/app/business`） | spacer-clone（NextApp） |
| Project Manager | businessStore + autosave debounce | `projectManager.ts` + `persistentProjectManager.ts` | spacer-clone（PDC接続） |
| Save/Load | localStorage/IDB（実動）・generation方式（設計） | FilesystemProjectPersistence（project.json + .backup） | spacer-clone（generation方式のパターンは将来改善に流用） |
| Persistence抽象 | `persistence/fs.ts` FsLayer/NodeFs | `ipcFileSystemGateway.ts` / MemoryFileSystemGateway | spacer-clone |
| Electron Shell | `app/electron/`（IPC 3本） | `desktop/electron/`（IPC多本） | spacer-clone |
| Routing | view state切替 | 手動routing（pushState） | spacer-clone |
| 3D Viewer | `TerrainViewer.tsx` | `SceneViewer.tsx` + 各Viewer | spacer-clone（UXパターン流用） |
| Terrain | Heightfield + elevationResource + DemWizard | `terrainModule.ts` + `modules/terrain/` | spacer-clone（site-contextの質の高いprimitiveはPORT候補） |
| Coordinate/CRS | EPSG分類器 + 平面直角変換（テスト済み） | R3-00（x-along/y-transverse/z-up・project/local分離） | spacer-clone（site-contextのCRS変換はPORT候補） |
| Importer/Exporter | GSI/PNG/XYZ/GeoTIFF 取込・.sitecontext | .spacerproj 単一JSON | spacer-clone（.sitecontext→.spacerproj Adapter） |
| Package形式 | .sitecontext zip（2実装並存） | .spacerproj JSON v1 | .spacerproj |
| 既存データ再読込 | localStorage/IDB復元 | restoreFromPersistence | spacer-clone |
| テスト基盤 | vitest（node env） | vitest（jsdom・多数）+ Playwright | spacer-clone |

## 3. Project正本比較

| 観点 | site-context | spacer-clone | 結論 |
|---|---|---|---|
| スキーマ | ProjectV2（zod・invariant I-01〜I-22設計） | PDC schemaVersion 1.0.0（strictObject・8 module） | **spacer-clone PDCを正本**。ProjectV2概念はmodule payloadへ |
| modules | coordinateContexts / siteContext / selectionArea / sourceDatasets / terrain | road / terrain / bridgeLayout / superstructure / substructure / analysis / cim / deliverables | **spacer-clone 8キー維持**（追加しない） |
| migration | V1→V2 実装済み（core）・UI未接続 | `PROJECT_MIGRATIONS` 空 | spacer-clone側は将来migration登録で対応 |
| Save/Load | generation方式（設計）vs localStorage（実動） | project.json + .backup | **spacer-clone方式を正本**、generation方式の原子性は改善候補 |
| Package | .sitecontext zip | .spacerproj JSON v1 | **.spacerprojを正本**、.sitecontext→.spacerproj Adapter |

## 4. 一本化後の残す機能（正本決定の根拠は 00章）

- 正本（spacer-clone 側として存続）: PDC・Project Manager・FilesystemProjectPersistence・Electron Shell・NextApp・3D/地形module・道路/橋梁/解析/CIM/成果品・backend・.spacerproj
- 移植（site-context の質の高い資産を選択PORT）: EPSG分類器・平面直角変換・Heightfield/SCT1・generation方式の原子commit/checksum検証パターン・DEM取得（GSI）・ExportEnvelopeの設計契約
- 廃止（吸収完了後）: site-context の独立 Electron（IPC 3本）・localStorage/IDB実動パス・独自業務一覧・.sitecontext Node実装（PackageManifestV1）
- 非互換（Adapter必須）: .sitecontext(zip) ↔ .spacerproj(JSON)・ProjectV2 ↔ PDC module payload・SCT1 base64 ↔ assetReference
