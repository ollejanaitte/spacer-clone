# 04 Entity 保存単位（P4）

> 原則: **1 Entity = 1 canonical document file**（+ immutable binary in resources/）。
> 保存粒度は既存 canonical contract に可能な限り準拠。

## 1. 比較表

| Entity | Proposed Unit | 既存 canonical doc 対応 | 根拠 |
|--------|---------------|------------------------|------|
| BusinessProject | `business-project.json` (manifest) | `engineering-project`（`engineeringProject.ts`） | ToC 型そのまま extend |
| ProjectMetadata | manifest 内（別ファイル化しない） | manifest `projectId/projectNumber/name/designStage/coordinateReference/status` | 小規模・正本1つ。Step4-2 P5「manifest 内包」 |
| Road | `roads/<roadId>.road.json` | `road-design`（`roadDesignDocument.ts`） | canonical road unit。複数 alignment/section/bridges 配列対応 |
| RoadSection | road-design doc 内 stable entity（別ファイル化しない） | `RoadAlignmentEntry`/coordinateContext/stationing（in-doc entity） | doc 内 stable entity ID で参照。案1=1Road=1JSON |
| Alignment | road-design doc 内 stable entity（別ファイル化しない） | `RoadAlignmentEntry.entityId` | 路線・区間・中心線を doc 内 entities で表現 |
| BridgeProject | `bridges/<bridgeId>/{cbdm,manifest,superstructure,substructure}.json` | CBDM+manifest+BSDD+substructure（`cbdmDocument.ts`） | **Protected Core、そのまま配置** |
| Superstructure | bridges/<bridgeId>/superstructure.json | BSDD（`superstructureAdapter.ts`） | 子 doc / canonical |
| Substructure | bridges/<bridgeId>/substructure.json | substructure project | 子 doc / canonical |
| Analysis | `analyses/<analysisId>/document.json` | `bridge-frame-analysis`（`contracts/bridgeFrameAnalysisDocument.ts`） | canonical analysis doc |
| AnalysisResult | `analyses/<analysisId>/results/<resultId>.persisted-result.json` + `resources/<sha>.<ext>` | `persisted-result` DocumentKind | 検証結果・反力・member force 等 |
| TerrainDataset | `shared/datasets/<datasetId>.json` | extensions で terrain-dataset kind | descriptor doc → binary refs |
| ExistingConditionDataset | `shared/datasets/<datasetId>.json` | extensions で existing-condition-dataset kind | descriptor doc |
| Deliverable | `deliverables/<deliverableId>/deliverable.json` | `persisted-result` または dedicated kind | canonical doc + resource refs |
| Attachment/SourceDocument | `attachments/<attachmentId>.json` | manifest `attachmentRefs` or dedicated doc | 大きい場合は resources/ |
| Resource(binary) | `resources/<sha256>.<ext>` | `ImmutableResourceReference` | content-addressed immutable |

## 2. Road 粒度の検証（P4 命題比較）

- **案1: 1 Road = 1 road-design doc** → 推奨
  1 road-design doc が alignments / coordinateContexts / profiles / crossSections / bridges[] を配列保持。
  離れ区間 = coordinateContext 複数 / stationing 区間指定；複数中心線 = alignments[]。
  Step 4-2「Road→RoadSections[]（非連続可）」「RoadSection→Alignments[]」を**doc 内 entities**として表現。
  → ファイル数最小・canonical round-trip 既存コントラクトに準拠。
- **案2: 1 RoadSection = 1 doc** → 却下
  road-design コントラクトが 1 road に 1 doc を想定（RoadAlignmentEntry/coordinateContext は doc 内）。
  RoadSection を別 doc にすると Cross-section/Profile がどの doc に属するか曖昧化し、
  BridgeProject.alignmentRef（road-design doc → entity）の再設計を余儀許まず、
  canonical contract と食す。
- **案3: Alignment を独立 JSON** → 却下
  Alignment は road-design doc 内 `alignments[]` entity。独立化すると road-design doc が
  断片化し、CASE A/B の alignment reconstruction / cycle guard（`alignmentReconstruction.ts`）
  の前提（road-design が alignment を所有）を破壊。

> 結論: Road = road-design doc（canonical）。RoadSection/Alignment = その**stable entity**
> （UUID + entityKind + displayAlias in road-design stableIdRegistry）。BridgeProject は
> road-design doc の entityId を `alignmentRef` で参照。（破綻なし）

## 3. BridgeProject 保存単位（Protected Core）

- `bridges/<bridgeId>/` に **既存 canonical 4 文書**をそのまま配置:
  - `cbdm.json` — `serializeCommonBridgeModel(commonModel)`
  - `manifest.json` — `serializeBridgeProjectManifest(manifest)`（`bridge-project` kind, PROTECTED）
  - `superstructure.json` — BSDD
  - `substructure.json` — substructure project
- BusinessProject manifest は `bridges/<bridgeId>/manifest.json` を `DocumentReference` で参照。
- 保存/読込/再生は**既存関数**をそのまま使用。Core 内部 schema/validator を**変更しない**。
- extension 提案（未実装）: BridgeProject `references.alignmentRefs[]` 配列化（複数線形）。

## 4. Analysis 保存単位

- `analyses/<analysisId>/document.json` — bridge-frame-analysis document（canonical, envelope）。
- `analyses/<analysisId>/results/<resultId>.persisted-result.json` — 結果メタ（displacement/reaction/force/quantity/audit）。
- 結果バイト（CSV/HTML/PDF/DXF/STL 等）は `resources/<sha256>.<ext>` へ。
- Analysis document は `subjectRef` で bridge/road/member を Stable ID 参照。

## 5. shared / resources 構造（P12 と統一）

- `shared/datasets/<datasetId>.json`: TerrainDataset/ExistingConditionDataset descriptor。
  本体は `resources/` へ（heightfield/imagery/pointcloud）。descriptor は ImmutableResourceReference[] を保持。
- `resources/<sha256>.<ext>`: immutable binary。sha256 = content checksum。
  同内容→同 path（dedup）。missing を検知して project 全体を壊さず警告。

## 6. Inventory（CSV 参照）

個別の doc 種ごとに `documentKind / envelope? / canonical? / protectedCore? / 所有者` を整理。
詳細は `inventories/persistence_units.csv` 参照。
