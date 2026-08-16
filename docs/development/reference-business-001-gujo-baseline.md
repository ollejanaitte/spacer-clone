# SPACER CLONE — Reference Business 001 郡上市八幡 Baseline (Lane S / S-2)

- 作成日時: 2026-08-16 (JST)
- 担当branch: `lane-s/reference-business-001`
- 参照リポジトリ: `~/Projects/site-context-prototype` (読み取りのみ・変更しない)
- 参照文書 (site-context 側): `docs/design/08_gifu_sample.md`・`docs/phase3/01_baseline.md`・`README.md`
- 本稿の位置づけ: Reference Business 001 の**実地形 Baseline** の正式確定。
  site-context-prototype の郡上市八幡サンプル (既存実装・既存 sample) を優先して利用条件を固定する。
  Wave 1 では terrain の production 実装を変更しない。

> **Authority:** OPERATIONAL / LANE S
> **Status:** DECIDED (Wave 1)

---

## 1. 対象地点

| 項目 | 値 | 根拠 |
|---|---|---|
| 正式地点名 | 岐阜県郡上市八幡 (Gujo Hachiman) | site-context 正式サンプル |
| 検索文字列 | `郡上市八幡` / `岐阜県郡上市八幡町` | Geolonia 住所API で確定 (35.7512N, 136.9567E) |
| 中心座標 (WGS84) | 北緯 35.7512° / 東経 136.9567° | site-context `docs/design/08` |
| 中心座標 (EPSG:6674) | X = 86,522.4 m / Y = -27,181.2 m | pyproj v3.7.1 実測 (site-context `coordinate.test.ts` で ±3m 以内検証) |
| 地形の特徴 | 長良川沿いの山間盆地。周囲を山地 (標高500〜1200m級) が囲む。盆地+河川+山稜のコントラストが明瞭 | site-context `docs/design/08` |

## 2. CRS (EPSG:6674)

| 項目 | 値 | 根拠 |
|---|---|---|
| CRS | **JGD2011 平面直角 第7系 (EPSG:6674)** | site-context `docs/design/08` §3-1 |
| 中央経線 | 137°00'E | 第7系 |
| 適用根拠 | 東経 136.9567° (第7系適用範囲 東経136.0〜137.5° 内) | pyproj 実測で妥当な座標 (X≈86,522 / Y≈-27,181) |
| verticalDatum | T.P. (東京湾平均海面) | site-context 仕様 |
| 単位 | m | site-context 仕様 |
| 誤変換注意 | 第8系 (EPSG:6675) に誤変換すると X≈-130,000m 級の不自然な値になるため不適切 | site-context 監査結果 |

※ site-context の `packages/core/src/coordinate/transform.ts` の zone テーブルは
`epsg:6674, zone:6, lon0:136.0` と表記する箇所があるが、変換値は pyproj 実測と一致しており、
`docs/design/08` の「第7系 (中央経線137°)」が正式仕様である。この表記揺れは確認対象として記録する
(座標変換値に影響しない)。

## 3. GSI DEM

| 項目 | 値 | 根拠 |
|---|---|---|
| 一次 | GSI標高タイル **DEM5A** (`dem5a_png`・航空レーザ5m) | site-context 実測 (HTTP 200) |
| フォールバック | DEM5B (`dem5b_png`) → DEM10B (`dem_png`) | site-context `DEM_FALLBACK_CHAIN` |
| ZL | 15 (DEM5A/5B)・14 (DEM10B) | site-context `GSI_DATASETS` |
| URL | `https://cyberjapandata.gsi.go.jp/xyz/{datasetId}/{z}/{x}/{y}.png` | site-context `gsi.ts` |
| 出力 cellSize | 5 m (既定) | site-context 仕様 |
| 出典表示 | 「出典: 国土地理院」 | 地理院タイルPDL1.0 |
| ライセンス | 地理院タイル PDL1.0 (出典明示で利用可。保存/再配布は測量法申請要否を確認・fail-closed) | site-context 仕様 |

## 4. DEM5A タイル・取得範囲

| 項目 | 値 | 根拠 |
|---|---|---|
| 取得範囲形式 | 矩形 (rect)・軸平行 | site-context `docs/design/08` |
| 大きさ | 約 5km × 5km (25 km²) | 同上 |
| 中心 | 郡上市八幡中心 | 同上 |
| bounds (WGS84) | lon 136.929〜136.9844 / lat 35.7287〜35.7737 | 同上・`terrain-mapping.test.ts` |
| bounds (EPSG:6674) | X 83,996〜89,050 / Y -29,697〜-24,665 | pyproj 実測 |
| タイル数 (ZL15・dem5a) | **36タイル (x 28847-28852 × y 12892-12897)・全タイル HTTP 200 実測確認** | site-context 実測 |
| 想定セル数 (cellSize 5m) | 約 1000×1000 = 100万セル | 同上 |
| 標高範囲 (目安) | 200〜1,200 m (盆地→山稜) | 同上 |

代表タイル (site-context 実測):
- 中心: `dem5a_png/15/28850/12895` (200)
- 西: `15/28849/12895` (200) / 北: `15/28850/12894` (200) / 南: `15/28850/12896` (200)
- 背景: `std` (標準地図)・`pale` (淡色) とも `15/28850/12895` で 200

## 5. selection area

| 項目 | 値 | 根拠 |
|---|---|---|
| 形式 | rect 5km×5km | site-context サンプル |
| selectionAreaId | 例: `sel-<projectId>` (revisionHash 生成) | site-context ProjectV2 |
| revisionHash | 決定論的 `canonicalHash({type, coordinateContextId, vertices})` | site-context `projectV2.ts` |
| 頂点 (EPSG:6674) | 4隅 (bounds X 83,996〜89,050 / Y -29,697〜-24,665) | 上記 bounds |

## 6. terrain bounds / origin / elevation

| 項目 | 値 | 根拠 |
|---|---|---|
| grid | cellSize 5m・約1000×1000・cell-center 規則 | site-context Heightfield |
| origin | 領域左下 (EPSG:6674) を基準。実行時取得により確定 | site-context `DemWizard` |
| bounds (TerrainDocument) | min/max X・Y・標高 (terrain 生成後に確定) | site-context SiteTerrain.bounds |
| 標高帯 | 約 200〜1,200 m | site-context `docs/design/08` |
| noData | -9999 (既定) | site-context Heightfield |
| 決定性 | `{level:"semantic", criterion:"tolerance-m", excludes:[]}` | site-context ProjectV2 既定 |

> 実行時の実際の terrain 生成は Lane T の成果 (GSI DEM PORT / Heightfield / SCT1) を利用する。
> Wave 1 では実地形の「利用条件 (CRS・bounds・source・セルサイズ・タイル範囲)」を本稿で固定する。

## 7. source metadata

| 項目 | 値 |
|---|---|
| sourceDatasetId | 例: `gsi-dem-gujo-hachiman-5km` |
| sourceType | dem |
| sourceName | 国土地理院 標高タイル |
| datasetId | `dem5a_png` |
| provider | 国土地理院 (GSI) |
| attributionText | 「出典: 国土地理院」 |
| tileUrls | `https://cyberjapandata.gsi.go.jp/xyz/dem5a_png/15/{x}/{y}.png` (x 28847-28852 / y 12892-12897) |
| tiles | 36タイル (ZL15) |
| resolution | cellSize 5m・単位 m |
| license | attribution: 「出典: 国土地理院」 / offlineOk: unknown / redistributeOk: unknown (fail-closed) |
| provenance | provider: gsi / method: gsi-dem-tile / tileCount: 36 / zoom: 15 / geoBounds: 上記 |

## 8. fixture / sample の保存場所

| 場所 | 内容 | 状態 |
|---|---|---|
| site-context-prototype `docs/design/08_gifu_sample.md` | 郡上市八幡サンプル仕様の正本 | 参照 (変更しない) |
| site-context-prototype `app/src/components/MapPanel.tsx` | プリセット `SAMPLE_CENTER` / `SAMPLE_SIZE_KM` / `handleGifuPreset()` | 参照 |
| site-context-prototype `app/src/App.tsx` | `SAMPLE_CTX` (EPSG:6674) / `handleCreateSample()` | 参照 |
| site-context-prototype テスト | `coordinate.test.ts` / `terrain-mapping.test.ts` / `heightfieldBinary.test.ts` | 参照 |
| site-context-prototype スクリーンショット | `app/screenshots/phase2/*.png` (郡上検索・5km範囲・terrain結果) | 参照 |
| **SPACER CLONE (本リポジトリ)** | Reference Business 001 fixture は Lane S の sample/fixture 領域に配置 (S-3 以降) | 今後整備 |

> site-context-prototype には実 terrain バイナリ (.sct1/.bin) は git 管理されていない。
> 実データは実行時に GSI タイルから生成される。再現には GSI DEM5A タイルの取得 (ネットワーク) が必要。

## 9. 再現方法

1. GSI DEM5A タイル (ZL15・x 28847-28852 × y 12892-12897・36枚) を取得
2. 選択範囲 4隅を EPSG:6674 へ変換
3. 5m グリッドで経緯度補間 → タイル画素サンプル → Heightfield 生成
4. SCT1 (serializeHeightfield) 形式で保存 (将来: `modules.terrain` へ)
5. site-context 既定の決定性ポリシー (semantic / tolerance-m) に従う

既存実装:
- ブラウザ: site-context `app/src/map/demFetch.ts` (`fetchDemTilesBrowser`)
- Node: site-context `packages/core/src/importer/gsi.ts` (`fetchDemTiles` / `tileRangeForBBox`)
- Terrain生成: site-context `app/src/components/DemWizard.tsx` `run()`
- 保存形式: site-context `packages/core/src/terrain/serialize.ts` (SCT1)

## 10. 確定ルール (Freeze)

1. 正式地点は**郡上市八幡** (検索文字列 `郡上市八幡` / `岐阜県郡上市八幡町`)。
2. 中心は 35.7512N / 136.9567E (WGS84)。
3. CRS は **EPSG:6674** (JGD2011 平面直角第7系)・T.P.・m。
4. DEM Source は **dem5a_png (ZL15)**・フォールバック 5B→10B。
5. 取得範囲は 5km×5km rect (36タイル検証済み・100万セル)。
6. 標高帯は約 200〜1200 m。
7. 出典「国土地理院」明示・規約 fail-closed を遵守。
8. 実データの生成・保存は Lane T の成果を利用し、本リポジトリの terrain production 実装は変更しない。

## 11. 確認済み・未確認

### 確認済み (確定)
- 対象地点・検索文字列・中心座標 (WGS84 / EPSG:6674)
- CRS (EPSG:6674・第7系・T.P.)
- GSI DEM (DEM5A・ZL15・36タイル HTTP 200 実測)
- bounds (WGS84 / EPSG:6674)・cellSize 5m・標高帯
- selection area (rect 5km×5km)
- source metadata (datasetId / attribution / license / provenance)
- site-context 側の fixture / sample 保存場所
- 再現方法 (GSI タイル取得 → EPSG:6674 → Heightfield → SCT1)

### 確認対象 (記録)
- site-context `transform.ts` の EPSG:6674 zone 表記揺れ (zone:6/lon0:136.0 表記) —
  変換値は pyproj 実測と一致しており、正式仕様 (第7系・中央経線137°) には影響しないが、
  Lane T の PORT 時に正本表記へ統一する。

## Related Documents

- [reference-business-001-spec.md](reference-business-001-spec.md) — S-1 仕様
- [reference-business-001-road-sample.md](reference-business-001-road-sample.md) — S-3 道路線形 Sample