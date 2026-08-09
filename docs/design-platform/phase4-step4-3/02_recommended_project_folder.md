# 02 推奨 Working Project 構造（P2）

> 1 BusinessProject = 1 Folder。`business-project.json` は manifest/ToC。
> 子は canonical document / immutable resource として配置。

## 0. 基本原則（P2 検証結果）

- **manifest は全データ JSON ではない**。子 Entity の location（path）と identity（Stable ID）と
  content checksum を列挙する ToC。（Step 4-2 P5『manifest は参照だけ持つ』）
- **path = location、ID = identity を分離**。リネーム/移動しても参照は壊れない。
  → 禁止事項「ファイルパスを identity として使う」を回避。
- **BridgeProject は Protected Core の canonical 3/4 文書をそのまま配置**するだけ。
  Core 内部の schema/validator/serialize を**無根拠に置き換えない**。
- **binary は JSON に埋め込まない**。Terrain/imagery/PDF/STL/成果物は `resources/` へ。

## 1. 推奨フォルダ構造

```
H620164A_○○道路設計業務/              ← BusinessProject root (= businessProjectId ディレクトリ名)
├─ business-project.json              ← manifest (engineering-project canonical doc)
├─ roads/
│   └─ <roadId>.road.json             ← road-design document (canonical)  [1 Road = 1 doc]
├─ bridges/
│   └─ <bridgeId>/                    ← BridgeProject = Protected Core folder
│       ├─ cbdm.json                  ← common-bridge-data-model (canonical, CBDM)
│       ├─ manifest.json              ← bridge-project manifest  (canonical, PROTECTED)
│       ├─ superstructure.json        ← bridge-superstructure-design (BSDD) (canonical, PROTECTED)
│       └─ substructure.json          ← substructure project  (canonical, PROTECTED)
├─ analyses/
│   └─ <analysisId>/
│       ├─ document.json              ← bridge-frame-analysis document (canonical)
│       ├─ results/
│       │   └─ <resultId>.persisted-result.json   ← persisted-result resource (canonical)
│       └─ ... （結果バイナリは resources/ へ）
├─ shared/
│   └─ datasets/
│       └─ <datasetId>.json           ← TerrainDataset / ExistingConditionDataset descriptor (canonical)
├─ resources/                         ← immutable binary blobs  [content-addressed]
│   ├─ <sha256>.tif                   ← Terrain heightfield etc.
│   ├─ <sha256>.pdf                   ← 元図PDF原本
│   └─ <sha256>.<ext>                 ← STL/CSV/DXF/SVG/PNG/IMG ...
├─ deliverables/
│   └─ <deliverableId>/
│       └─ deliverable.json           ← deliverable doc (canonical; resource refs → resources/)
└─ .system/                           ← runtime bookkeeping (non-canonical, regenerable)
    ├─ autosave/                      ← autosave candidate (manifest+children のステージング)
    ├─ recovery/                      ← crash journal (intent log)
    ├─ history/                       ← revision log entries (canonical log lines)
    └── cache/                         ← viewer cache / thumbnail / preview (regenerable)
```

## 2. 構造判断の根拠

| 項目 | 判断 | 根拠 |
|------|------|------|
| manifest は親doc | `business-project.json`（ToC）| Step4-2 P5「manifest は参照だけ持つ」；contract `EngineeringProject` は roadDesignRef/frameAnalysisRefs 参照の ToC 型（`engineeringProject.ts`） |
| Road の粒度 | `roads/<roadId>.road.json` 1本 | 既存 `RoadDesignDocument`（`roadDesignDocument.ts:85-114`）が canonical road unit。road-design は複数 coordinateContext / alignment / bridges を配列で保持 → 離れ区間・複数中心線に対応。RoadSection/Alignment は doc 内の stable entity |
| RoadSection / Alignment | doc 内エンティティ（別ファイル化しない） | `RoadAlignmentEntry`（entityId/stableId）が road-design に含まれる。ID 参照で橋梁から参照。Step4-2案1「1 Road=1 JSON」と一致 |
| results/ の位置 | `analyses/<id>/results/` | P4検証：results を Entity 配下に置く（source = Analysis）。トップレベル results/ は撤廃 |
| shared/ vs resources/ | shared/ = データセット descriptor doc；resources/ = immutable binary | Step4-2 `ownership_matrix` は Terrain/Existingを SharedDataset 所有。P12 binary 分離と統一。1か所にバイナリ集約 |
| deliverables/ | `deliverables/<id>/deliverable.json` + resource refs | 生成 artifact バイトは resources/ へ（dedup）。deliverable.json は設計意図+出典引用を canonical doc として保持 |
| .system/ | autosave/recovery/history/cache | autosave≠正本直接破壊（P10）；history=append-only log（P11）；cache=regenerable |
| BridgeProject folder | 4 canonical docs をそのまま配置 | `cbdmDocument.ts` の serialize/parse＋`validateBridgeProject` をそのまま利用。Core 変更ゼロ |

## 3. ファイル命名・path 規則

- 子 doc ファイル名は **identity ではない**（`<documentId>.road-design.json` は可読性のエイリアス）。
  identity は doc 内 `documentId`（UUID）+ `revisionId`。
- `business-project.json` は決め打ちファイル名（manifest）。他の doc は `<documentId>.<suffix>.json` 推奨
  （documentId が UUID で衝突しないため）。suffix は documentKind の human-readable エイリアス。
- `resources/` は `<sha256 hex>.<ext>`（content-addressed）。ext は mediaType 由来。

## 4. Protected Core 確認（P5）

- `bridges/<bridgeId>/{cbdm,manifest,superstructure,substructure}.json` の各ファイルは、
  既存 `serializeCommonBridgeModel` / `serializeBridgeProjectManifest` /
  `serializeBridgeProjectSuperstructure` / `serializeSubstructureProject` の出力そのまま。
  → CASE A/B Save/Load/Replay, provenance/status/revision/cycle guard, NOT_AUTHORIZED/fail-closed を**不変**。
