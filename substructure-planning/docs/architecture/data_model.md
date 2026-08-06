# データモデル案（Data Model）

区分: PROPOSED（今回提案）。一部 EXISTING_CODE_DERIVED（spacer-clone の流儀を踏襲）。

## 1. エンティティ一覧

| エンティティ | 説明 |
|---|---|
| Project | プロジェクト全体 |
| Bridge | 橋梁情報 |
| AlignmentReference | 線形参照（alignmentId, originStation） |
| Support | 支点（supportId, 座標, 構造種別, 斜角） |
| BearingSeat | 支承座（支承を載せる座） |
| Bearing | 支承（種類, 位置, 高さ, 寸法） |
| Pier | 橋脚（柱+梁+支承座） |
| PierCap | 橋脚梁 |
| PierColumn | 柱 |
| Abutment | 橋台 |
| WingWall | 翼壁 |
| Footing | フーチング |
| PileGroup | 杭群（本数, 間隔） |
| Pile | 杭 |
| GroundSurface | 地盤面 |
| SuperstructureEnvelope | 上部工簡易外形 |
| LoadCase | 荷重ケース |
| Reaction | 反力（表示用） |
| QuantitySummary | 概算数量 |
| ValidationIssue | 検証問題 |
| ExportRecord | 出力履歴 |

## 2. データモデル（簡略）

```text
Project
├── schemaVersion, projectId, bridgeId
├── name
├── sourceApplication / sourceVersion / sourceRevision
├── coordinateSystem
├── unitSystem
├── origin {x,y,z}
├── alignmentRefs[] : AlignmentReference
├── supports[] : Support
│     ├── supportId, supportType (pier/abutment)
│     ├── position {x,y,z}
│     ├── longitudinalAxis / transverseAxis / verticalAxis
│     ├── skewAngle
│     └── bearingSeats[] : BearingSeat
│           └── bearings[] : Bearing
├── piers[] : Pier
│     ├── id (P1)
│     ├── columns[] : PierColumn (id: P1-COLUMN-01)
│     └── caps[] : PierCap (id: P1-CAP)
├── abutments[] : Abutment
│     ├── id (A1)
│     └── wingWalls[] : WingWall (id: A1-WING-L)
├── footings[] : Footing (id: P1-FOOTING)
├── pileGroups[] : PileGroup (id: P1-PILES)
│     └── piles[] : Pile (id: P1-PILE-01)
├── groundSurface
├── superstructureEnvelope : SuperstructureEnvelope
├── loadCases[] : LoadCase
├── reactions[] : Reaction（任意）
├── quantitySummary : QuantitySummary
└── metadata { createdAt, updatedAt, ... }
```

## 3. 安定IDルール

PROPOSED:
- 再生成しても同一部材は同一IDを維持。
- ID形式:
  - 支点: `P1` / `P2` / `A1` / `A2`
  - 橋脚梁: `P1-CAP`
  - 柱: `P1-COLUMN-01`
  - フーチング: `P1-FOOTING`
  - 杭: `P1-PILE-01`
  - 支承: `P1-BEARING-01`（複数は 01,02,...）
  - 支承座: `P1-SEAT-01`
  - 翼壁: `A1-WING-L` / `A1-WING-R`
  - 橋台背壁: `A1-BACKWALL`
  - 杭群: `P1-PILEGROUP`
- 寸法変更・再生成ではIDを保持。部材追加で末尾連番が増える。

## 4. 座標・単位

- 右手系 Z-up。x-longitudinal-y-transverse-z-up（EXISTING_CODE_DERIVED）
- 単位: 長さ m、角度 deg（内部変換はrad）、力 kN
- origin はプロジェクト原点

## 5. 反力

- reactions[] は表示用。分類: permanent / liveLoad / braking / wind / seismicLevel1 / seismicLevel2
- 反力なしでも3D・概算数量は可能

## 6. 検証

- ValidationIssue: 入力値・状態の検証結果（負値/0/不明など）
- スキーマ（Phase4）で検証する

## 7. 数量

- QuantitySummary: 柱/梁/フーチング/杭体積、合計、杭総延長
- 幾何学的概算値（実務数量ではない）

## 8. エクスポート

- ExportRecord: 出力形式・部材ID保持可否・単位・座標
