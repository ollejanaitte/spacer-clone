# 09 Terrain / Existing / Binary / Resource 設計（P12）

> 大容量データを巨大 JSON に埋め込まない。`ImmutableResourceReference`（uri+checksum+mediaType）方式。
> 根拠: `contracts/immutableResourceReference.ts`, `roadDesignDocument.ts:107 attachments?: ImmutableResourceReference[]`,
> Step4-2 handoff §5「immutable-resource-reference 系」。

## 0. 原則

- **binary は永続 immutable**。`resources/<contentChecksum>.<ext>`。
- **path = location, checksum = identity**（内容が同じなら同 path / dedup）。
- マニフェスト/子docは binary の **by-value コピーをしない**（content-addressed referenceのみ）。
- Windows: path は小文字化しない（ファイル名は hex sha256で衝突なし）。

## 1. 配置

```
resources/
├─ <sha256>.tif          ← Terrain / heightfield / pointcloud (grid)
├─ <sha256>.laz           ← point cloud
├─ <sha256>.pdf           ← 元図PDF原本 / drawing
├─ <sha256>.stl           ← 3D mesh (frame/shape)
├─ <sha256>.csv           ← grid/section CSV
├─ <sha256>.dxf           ← CAD
├─ <sha256>.png / .svg    ← サムネイル/図
└─ ...
```

- ext は `mediaType` から逆引き（.tif→image/tiff, .laz→application/las, .pdf→application/pdf,
  .stl→model/stl, .csv→text/csv, .dxf→application/dxf）。
- ファイル名の sha256 は**内容の sha256**。write 時 `AtomicJsonStore`-相当（temp→fsync→replace）で
  保証（binary は AtomicJsonStoreのJSON化をskipしraw bytes publish）。

## 2. 参照：ImmutableResourceReference

```ts
{ uri: "../resources/<sha>.<ext>", contentChecksum: {algorithm:"sha256", hexDigest:"<sha>"}, mediaType?: string, fileSizeBytes?: number }
```

- `uri` は project-root 相対 path（portability）。
- `contentChecksum` 必須（missing/missing content 検知）。
- RoadDesignDocument.attachments[], shared/datasets/<id>.json の terrain refs, Deliverable artifact refs がこれを使う。

## 3. dataset descriptor (shared/datasets/<id>.json)

Terrain/Existing は **descriptor doc + binary** の2階層:

```jsonc
{
  "schemaId": "spacer.contracts.terrain-dataset",  // extension kind
  "documentKind": "terrain-dataset",
  "documentId": "<datasetId UUID>",
  "revisionId": 1,
  "contentChecksum": {...},
  "provenance": {...},
  "name": "○○立体地図",
  "coordinateContextRef": {documentReference: coordinate-context},
  "resources": [ { "role": "heightfield|imagery|pointcloud", ...ImmutableResourceReference } ],
  "grid": { "crs": "...", "cellSize": ..., "dims": [w,h] },
  "format": "geotiff|las|laz|... ",
}
```

- descriptor は canonical doc（manifest が `sharedDatasetRefs` で参照）。
- binary 本体は `resources/`。descriptor が壊れても binary は生存；
  binary が欠損しても descriptor は開ける（warn）。

## 4. 各種データ種別の分類（P6 と対応）

| データ | CANONICAL/RESULT/CACHE | 配置 | 参照 |
|--------|------------------------|------|------|
| Terrain heightfield (tif/laz) | A CANONICAL | resources/<sha> | dataset.resource |
| Existing structures/河川/鉄道/埋設物 | A CANONICAL | resources/<sha> | dataset.resource |
| 元図PDF原本 | A CANONICAL | resources/<sha> | Attachment / Deliverable.sourceRefs |
| imagery (orthophoto) | A CANONICAL | resources/<sha> | dataset.resource |
| STL (入力mesh) | A CANONICAL | resources/<sha> | resource |
| CSV/DXF/SVG/PNG (入力データ) | A CANONICAL | resources/<sha> | sourceRefs |
| 生成CSV (result) | B RESULT | resources/<sha> + persisted-result doc | deliverable/analysis result |
| 生成PDF/DXF/STL (deliverable) | B RESULT | resources/<sha> | deliverable.resourceRefs |
| viewer cache / thumbnail | C CACHE | .system/cache/ | — (regenerable) |
| temporary geometry | C CACHE | .system/cache/ or autosave | — |

## 5. 欠損・外部リンク・package

- **missing resource detection**: load 時 `resources/*.sha` が参照されているのに
  存在しない → **warn + fail-closed on that datum**。Project 全体を壊さず開く
  （Case 6）。UI: 欠損リストダイアログ。
- **immutable resource**: 同 sha256 なら上書きしない（content-addressed）。
  編集は**新しい binary = 新しい sha = 新しい path**（immutable）。
- **external linked resource**: 絶対 URI/ネットワーク `/abs/path` を許容（`uri` 欄）。
  - flag `external: true` 。
  - package 時に**インライン化**（copy into resources/<sha>）し、uri を相対にリライト
    → Case 8 portability。
  - external は portability/durability 非保証 → warn。
- **package**: `resources/` 含む（default）。immutable なので dedup/incremental 容易。
- **future**: pointcloud/mesh を大規模化 → `resources/<sha>.laz/.glb` で同様。

## 6. コード再利用

- `ImmutableResourceReference` + `validateImmutableResourceReference`（既存）再利用。
- binary write: `AtomicJsonStore` に **binary mode**（`atomic_publish_bytes(path, payload, io)` は
  bytes そのまま publish 可能 → JSON serialize を skipすれば binary にも使える）。
