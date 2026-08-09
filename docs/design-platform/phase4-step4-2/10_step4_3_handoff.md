# 10 Step 4-3 保存システムへの引き継ぎ

> Phase 4 / Step 4-2（P12）

## 1. 保存単位（保存対象の候補）

| Entity | 保存単位 | 独立ファイル候補 |
|--------|----------|------------------|
| BusinessProject | manifest（共通 manifest） | `business-project.json` 相当 |
| ProjectMetadata / Settings | manifest 内 or 子 doc | 共通 manifest に内包 |
| Road / RoadSection / Alignment | 道路系 doc（区間単位 or 路線単位） | road 系 doc |
| BridgeProject（CBDM + manifest） | **既存 canonical JSON を維持** | 既存 2 文書（CBDM / manifest） |
| BridgeProject.Superstructure | 既存 sidecar | ProjectModel 内 sidecar |
| Analysis | 解析 doc / 結果 resource | 独立 doc |
| Terrain / Existing | binary 分離 | 大容量データは外部 resource（URI + checksum） |
| Deliverable | 成果物 doc + 参照 | 独立 doc |

## 2. 共通 manifest に必要なもの

- schemaVersion / revisionId / contentChecksum / provenance（既存 contract 方針を踏襲）
- businessProjectId / 件番 / 名称 / 設計段階 / 作成・更新日時
- 子 Entity の参照一覧（roadId / bridgeProjectId / analysisId / deliverableId…）
- SharedDataset 参照
- status / history / revision metadata

## 3. ID / Reference の永続化

- internal stable ID（UUID 等）を primary key にし、件番・名称は表示用。
- 参照は「kind + id + revision」で永続化（dangling 検知のため）。
- 既存 document-reference / stable-entity-id 契約を再利用可能。

## 4. 分離・対象

| 観点 | 対象 |
|------|------|
| large binary / terrain / 3D | 外部 resource（immutable-resource-reference 系）に分離 |
| autosave | BusinessProject manifest + 編集中の子 doc |
| backup | manifest + 子 doc 一式（canonical JSON） |
| export | 業務一括 export（manifest + 子 doc） |
| migration | schemaVersion ベース（既存 contract の migration-record 系） |

## 5. BridgeProject との関係

- BridgeProject は**子 Entity として保存単位を維持**。既存 CBDM/manifest の保存方式を置き換えない。
