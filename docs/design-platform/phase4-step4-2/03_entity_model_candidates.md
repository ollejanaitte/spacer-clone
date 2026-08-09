# 03 Entity 候補（候補比較・推奨）

> Phase 4 / Step 4-2（P3）

## 1. 最上位 Project の候補

| 候補 | 検討 |
|------|------|
| BusinessProject | 業務 1 件を表す最上位。実務上の「業務」と一致。**推奨** |
| WorkProject | BusinessProject と同義。名称の揺れを避けたい |
| DesignProject | 設計業務限定のニュアンス。維持・点検業務を含めるなら不適 |

→ **名称: BusinessProject**（業務 = 調査・設計・維持 等を含む最上位）。

## 2. Entity 候補一覧（推奨名称）

| Entity | ID | 所属先（親子） | source of truth | 参照先 | 可変/不変 | 複製可 | 単独削除可 | BridgeProject との関係 |
|--------|----|---------------|-----------------|--------|-----------|--------|------------|------------------------|
| BusinessProject | businessProjectId | —（最上位） | manifest（Step 4-3） | — | 可変 | 可 | — | Bridges[] を所有 |
| ProjectMetadata | — | BusinessProject 直下 | 同左 | — | 可変 | 可 | — | — |
| Road（Route） | roadId | BusinessProject 直下 | 道路系 doc | RoadSections[] | 可変 | 可 | 参照残が無ければ可 | 橋梁から alignmentRef |
| RoadSection | roadSectionId | Road 直下 | 同左 | alignments / bridges | 可変 | 可 | 参照残が無ければ可 | Bridge の所属先・参照先 |
| Alignment | alignmentId | RoadSection 直下（or Road 直下） | LINER draft / RDD | — | 可変 | 可 | 参照残が無ければ可 | BridgeProject → alignmentRef |
| BridgeProject（Protected Core） | bridgeProjectId | BusinessProject 直下 | CBDM + manifest | alignmentRef(s) / terrainRef | 可変 | 可（ID 再発行） | 参照残チェック必要 | **1 橋梁単位の Core** |
| Analysis（AnalysisProject/Case） | analysisId | BusinessProject 直下 | 解析 doc/結果 | subjectRef（road/bridge/member） | 可変 | 可 | 参照残が無ければ可 | ② の grillage 等 |
| TerrainDataset | terrainDatasetId | SharedDatasets 直下 | terrain データ | — | 可変 | 可（binary 分離） | 共有中は不可 | 複数 Bridge から共有 |
| ExistingConditionDataset | existingConditionId | SharedDatasets 直下 | 現況データ | — | 可変 | 可 | 共有中は不可 | 複数対象から共有 |
| Deliverable | deliverableId | BusinessProject 直下 | 成果物 doc | sourceRefs[] | 可変 | 可 | — | 複数設計対象を参照 |
| Attachment / SourceDocument | attachmentId | BusinessProject 直下 or Deliverable 直下 | 添付 | sourceRefs | 不変 | 可 | — | 参照のみ |
| CoordinateReference | coordinateRefId | ProjectMetadata 直下 | 座標系定義 | — | 可変 | 可 | 参照残が無ければ可 | BridgeProject の座標系 |
| ProjectSettings | settingsId | ProjectMetadata 直下 | 共通設定 | — | 可変 | 可 | — | 共通設定 |

## 3. 実務要件への対応（正規ケース）

| 要件 | Entity で表現 |
|------|---------------|
| 1 業務・複数道路 | BusinessProject → Roads[] |
| 複数離れ区間 | Road → RoadSections[]（非連続可） |
| 1 業務・複数橋梁 | BusinessProject → BridgeProjects[] |
| 道路線形と独立して扱う橋梁 | BridgeProject の alignmentRef 無し |
| 複数線形と関係する橋梁 | BridgeProject → alignmentRefs[]（複数） |
| 将来ランプ/分岐/Y字/JCT | RoadSection → Alignments[]（複数中心線）、BridgeProject → alignmentRefs[] |
| 複数解析 | BusinessProject → Analyses[] |
| 複数地形・現況 | SharedDatasets[] |
| 複数成果物 | Deliverables[] |
