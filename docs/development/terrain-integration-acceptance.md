# SPACER — T-08 Terrain Integration Acceptance Report（Wave 3）

- 作成日時: 2026-08-17 06:2x (JST)
- 担当 Lane: T（Wave 3）
- 対象リポジトリ: `~/Projects/spacer-clone-lane-t`（branch: `lane-t/sitecontext-terrain-port`）
- 基準 SHA: `05d300e`（Wave 3 開始時 origin/main）
- 上位文書: [site-context-terrain-port-map.md](site-context-terrain-port-map.md) /
  [reference-business-001-gujo-baseline.md](reference-business-001-gujo-baseline.md) /
  [unified-3d-viewer-layer-contract.md](unified-3d-viewer-layer-contract.md)

> **Authority:** OPERATIONAL
> **Status:** ACCEPTED（Wave 3 T-08）

---

## 1. 目的

Wave 2 までに成立済みの Terrain 資産（CRS/JGD2011・GSI DEM・Heightfield・SCT1・
checksum・generation・persistence・Gujo sample・IndexedDB正本・Save/Load/Reopen）が
**単一の統合フロー**として成立することを Acceptance する。
新規 Terrain システムの構築ではない。

## 2. Acceptance 20項目 結果

| # | 項目 | 結果 | 検証方法 |
|---|---|---|---|
| 1 | 実GSI DEM5A取得 | **PASS** | live fetch: `dem5a_png` ZL15・36タイル・HTTP 200・fallbackなし |
| 2 | 郡上市八幡 center 35.7512 / 136.9567 / EPSG:6674 | **PASS** | `latLonToPlane` が pyproj 実測 ±3m 以内 |
| 3 | 実Terrain生成 | **PASS** | `buildTerrainDocument`（fixture） + live 1536×1536 グリッド |
| 4 | Heightfield生成 | **PASS** | fixture 32×32 / live 1536×1536 とも成立 |
| 5 | SCT1資産化 | **PASS** | `serializeHeightfieldBinary` + base64 コミット定数 |
| 6 | IndexedDBへ保存 | **PASS** | `saveTerrainElevation`（store が実行時正本） |
| 7 | Project保存 | **PASS** | `persistTerrain` + `parseProject` 合格 |
| 8 | Close | **PASS** | store 保持（memory store 維持） |
| 9 | Reopen | **PASS** | `loadTerrainElevation` で復元 |
| 10 | IndexedDBからTerrain復元 | **PASS** | `verifyReopenedTerrain` ok |
| 11 | CRS一致 | **PASS** | coordinateContext（project/metric/x-along） |
| 12 | bounds一致 | **PASS** | fixture: minX 83993.5 / maxY -29539.5 等 |
| 13 | origin一致 | **PASS** | projectOrigin (0,0,0) |
| 14 | elevation合理性 | **PASS** | fixture 200-1200m / live 191-685m（盆地-山稜） |
| 15 | checksum一致 | **PASS** | `verifyTerrainAssetChecksum` / `verifyReopenedTerrain` |
| 16 | assetReference一致 | **PASS** | surfaceReference / assetReferences 一致 |
| 17 | Roadと同一座標 | **PASS** | RB001_ORIGIN (85000,-26900) が Gujo bounds 内 |
| 18 | Bridgeと同一座標 | **PASS** | RB001 橋梁 candidate STA.1200-1500 が同一 EPSG:6674 |
| 19 | Unified Viewerへ入力可能 | **PASS** | `heightfieldToTerrainLayer`（V-3 adapter） |
| 20 | 二重正本なし | **PASS** | IndexedDB が実行時正本・assetManifest は導出ビュー |

## 3. live GSI DEM5A 検証（第1段ライブ確認）

- URL: `https://cyberjapandata.gsi.go.jp/xyz/dem5a_png/15/{x}/{y}.png`
- 取得: GUJO_BOUNDS_WGS84 / ZL15 / 36タイル（x 28847-28852 / y 12892-12897）
- 結果: 36タイル全取得・fallback履歴なし・全タイル `dem5a_png`
- 出力グリッド: 1536×1536・cellSize 4.78m（tileResolutionMeters）
- 標高: 191〜685m（郡上市八幡 盆地+山稜と整合）
- SCT1資産化: assetSize 9,437,226 bytes・`verifyTerrainAssetChecksum` PASS
- 生成 Project: `persistTerrain` → `parseProject` ok・docBounds 成立

## 4. IndexedDB 正本検証

- 実行時正本 = IndexedDB store（`scp-terrain/elevations/projectId`・site-context と同一）。
- Save → `saveTerrainElevation` / Reopen → `loadTerrainElevation`。
- `modules.terrain.data.assetManifest` は `.spacerproj` 自己完結用の直列化ビュー（導出・非正本）。
- 二重正本なし: `terrainIntegrationAcceptance.test.ts` で base64 同一性も確認。

## 5. テスト

- 新規: `frontend/src/terrain/__tests__/terrainIntegrationAcceptance.test.ts`（7件）
- 既存: terrain 全73件 + viewer terrainAdapter + workflow SiteContextPage（FAST/UI）
- 検証: `npx vitest run src/terrain` PASS / `npm run typecheck` PASS

## 6. 判定

**Terrain Integration Acceptance PASS。**
実 GSI DEM5A 取得 → 生成 → 検証 → 保存 → 終了 → 再起動 → 再読込 の一連が成立。
site-context-prototype の Terrain フローと同一の Save→Close→Reopen 循環を維持。