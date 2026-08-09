# 02 業務Project（BusinessProject）の責任

> Phase 4 / Step 4-2（P1）

## 1. 定義

**BusinessProject = 道路・橋梁設計業務 1 件を表す最上位コンテナ。**

- 実務前提を正規ケースとして扱う：1 業務に複数道路 / 複数離れ区間 / 複数橋梁 / 複数解析 / 複数地形・成果物。
- **1 業務 = 1 橋梁 という前提を置かない。**
- BridgeProject は「1 橋梁単位の Protected Core」として、BusinessProject に所有/参照される子単位。

## 2. 最上位に持つべき情報（BusinessProject 直下）

| 情報 | 備考 |
|------|------|
| businessProjectId（internal stable ID） | primary key は件番にしない |
| 業務件番（human-readable・rename 可） | 表示用 |
| 業務名 | 表示用 |
| 設計段階（stage） | 概念/予備/詳細/竣工 etc |
| 作成日時 / 更新日時 | metadata |
| 発注者等の業務情報 | metadata |
| 座標系 / 共通設定 | 共有設定（子が override 可能） |
| Roads[] / RoadSections[] / BridgeProjects[] / Analyses[] / SharedDatasets[] / Deliverables[] | 子集合（親子関係） |
| Project status / references / history / revision metadata | 業務全体の状態・参照・改訂 |

## 3. 子 Entity へ持たせるべき情報

- 道路の線形実データ → **Road / Alignment**（親に持たせない）
- 橋梁の設計モデル → **BridgeProject**（親に持たせない）
- 解析モデル → **Analysis**（親に持たせない）
- 地形・現況 → **SharedDataset / Terrain**（親に持たせない）

## 4. 参照だけ持つべき情報

- BridgeProject → alignmentRef(s)（**親子関係と参照関係を分離**）
- BridgeProject → terrainRef
- Analysis → subjectRef（road/bridge/member のいずれか）
- Deliverable → sourceRefs（複数設計対象）
- Terrain → 複数設計対象から共有（複製しない）

## 5. 原則

1. **親子関係**（BusinessProject が子を所有）と **関連参照**（alignmentRef / terrainRef 等の安定 ID）を混同しない。
2. **共有される可能性が高いデータは複製せず、独立 Dataset として参照**する。
3. **最上位に何でも押し込まない。** BusinessProject は「どの子を持つか・子同士がどう関係するか」を統括し、実データは子へ。
