# 09 推奨 Project 概念モデル（候補比較 + 推奨）

> Phase 4 / Step 4-2（P10・P11）

## 1. 候補比較

| 軸 | 案A: BusinessProject 直下に Roads[]/Bridges[]/Analyses[] | 案B: BusinessProject → DesignAreas/Sections → Roads/Bridges | 案C: BusinessProject → Entity Registry（参照中心） | **案D（推奨）: BusinessProject 直下所有 + Stable-ID 参照** |
|----|----|----|----|----|
| 現行 Phase 3 互換 | ○ | △（Section 中間層が BridgeProject に絡む） | △ | **○（BridgeProject を 1 子として所有）** |
| 実務の分かりやすさ | ○ | ○ | △（抽象度高） | **○** |
| 複数路線 | ○ | ○ | ○ | **○** |
| 複数離れ区間 | △（区間を Road 内に持つ） | ○ | ○ | **○（Road→RoadSections[] 非連続可）** |
| 複数橋梁 | ○ | ○ | ○ | **○（BridgeProjects[]）** |
| 複数 Alignment | △ | ○ | ○ | **○（RoadSection→Alignments[] + BridgeProject→alignmentRefs[]）** |
| 将来 Y字/JCT | △ | ○ | ○ | **○（複数中心線を Alignment の集合で表現）** |
| Save/Load 設計 | ○（子は独立ファイル候補） | ○ | ○ | **○** |
| migration しやすさ | ○（現行 ProjectModel から増やすだけ） | △ | △ | **○** |
| UI 整合 | ○ | ○ | △ | **○（業務一覧→Workspace の 2 階層と一致）** |
| dependency 管理 | ○ | ○ | ○ | **○（incoming reference を ID で追跡）** |
| 拡張性 | ○ | ○ | ○ | **○** |
| 過剰設計リスク | ○（最小） | △（中間層） | △（registry が重い） | **○** |

## 2. 推奨：案D

**BusinessProject が子 Entity を直接所有し、Entity 間は安定 ID 参照。**

- 現行 Phase 3 との互換が最良（BridgeProject を子として包むだけ）。
- 実務（業務→道路→区間→線形→橋梁）と 1:1 に対応。
- 中間層（DesignAreas）を導入しないため過剰設計リスクが低い。
- 将来 Y字/JCT は「複数 Alignment の集合」と「BridgeProject の複数 alignmentRef」で拡張可。

## 3. 全体概念図

```mermaid
flowchart TD
  BP["BusinessProject (最上位)"]
  BP --> M["ProjectMetadata<br/>(件番/名称/段階/座標系/基準/荷重/発注者)"]
  BP --> R1["Road A"] --> S1["RoadSection A-1"] --> AL1["Alignment 01"]
  R1 --> S2["RoadSection A-2"] --> AL2["Alignment 02"]
  BP --> R2["Road B"] --> S3["RoadSection B-1"] --> AL3["Alignment 03"]
  BP --> BR1["BridgeProject 001 (Protected Core)"]
  BP --> BR2["BridgeProject 002"]
  BP --> AN["Analyses[]（業務解析 / subjectRef）"]
  BP --> SD["SharedDatasets[Terrain / Existing]"]
  BP --> DV["Deliverables[]（sourceRefs）"]
  BR1 -->|alignmentRef| AL1
  BR2 -->|alignmentRefs[]| AL2
  BR2 -->|alignmentRefs[]| AL3
  BR1 -->|terrainRef| SD
  AN -->|subjectRef| BR1
  DV -->|sourceRefs| BR1
  DV -->|sourceRefs| AN
```

## 4. Entity / 親子 / 参照

- **親子所有**: BusinessProject が Roads / BridgeProjects / Analyses / SharedDatasets / Deliverables を所有。
- **参照**: BridgeProject→alignmentRef(s)・terrainRef、Analysis→subjectRef、Deliverable→sourceRefs。

## 5. source of truth

| 領域 | source of truth |
|------|-----------------|
| BusinessProject 全体 | manifest（Step 4-3 で設計） |
| BridgeProject（1 橋梁） | CBDM + manifest（**既存 Protected Core を維持**） |
| Road / Section / Alignment | 道路系 doc（LINER draft / RDD 系） |
| Analysis | 解析 doc / 結果 resource |
| SharedDataset / Deliverable | 各 doc + 参照 |

## 6. Protected Core への影響

- BridgeProject は 1 子 Entity として所有・参照されるだけ。**Core 内部は無変更。**
- 将来必要な extension（複数 alignmentRef 等）は 05 に記録。
