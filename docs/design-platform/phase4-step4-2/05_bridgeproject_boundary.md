# 05 BridgeProject の位置づけ（Protected Core 維持）

> Phase 4 / Step 4-2（P4）

## 1. 結論

- **BridgeProject を「1 橋梁単位の共有設計モデル」として維持する。**
- 業務 Project から **BridgeProjects[] を所有する**構造を推奨。
- **業務全体情報を BridgeProject に押し込まない。** 逆も然り（BridgeProject に業務情報を入れない）。

## 2. 維持すべき Core（Phase 3-9）

- CASE A（①→②→③）/ CASE B（②sample→①復元→③）
- Alignment / BridgeGeometry / Superstructure / Substructure binding
- provenance / status / revision / cycle guard
- NOT_AUTHORIZED / fail-closed
- Save/Load/Replay（canonical JSON round-trip）
- Main3D（integratedScene3d）
- Calculation Adapter（A-01）

**これらの破壊的変更を前提にしない。** 必要になった変更は「将来 extension」として記録する。

## 3. BridgeProject と上位 Project の接続

| 接続 | 方式 |
|------|------|
| BusinessProject → BridgeProjects[] | 親子所有（BridgeProject は子 Entity） |
| BridgeProject → alignmentRef(s) | 安定 ID 参照（roadId/sectionId/alignmentId） |
| BridgeProject → terrainRef | SharedDatasets への参照 |
| BridgeProject 単独保存 | 既存 CBDM + manifest（canonical JSON）を維持 |

## 4. 将来 extension（現時点で変更しない・記録のみ）

- alignmentRefs を配列化（複数線形）→ Phase 3-9 の `reconstruction` 等で「複数 alignment 参照」が将来必要になった場合に追加。
- BridgeProject 間の関連（bridgeRelation）。
- ただし現行 Core は単一 alignment 前提で成立しているため、**現時点では schema 変更しない**。
