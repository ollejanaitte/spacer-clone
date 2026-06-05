# 影響線・移動荷重設計

## 1. 目的

三次元立体骨組解析ソフトに、影響線生成と移動荷重解析を追加するためのドメイン、UI、API、実装フェーズを定義する。今回は設計のみであり、既存コード変更は行わない。

基本思想:

```text
StructuralModel
!=
LoadingSurfaceModel
```

`StructuralModel` は節点、部材、支点、材料、断面、固定荷重を扱う。`LoadingSurfaceModel` は載荷面、格子、ライン、車道、歩道、軌道、活荷重、移動荷重ケースを扱う。

## 2. MVP範囲

MVPで実装する範囲:

- 単一 `LoadingLine`
- グローバル鉛直方向
- 単一集中荷重
- 影響線生成
- 移動荷重解析
- 包絡結果

対象外:

- T荷重
- L荷重
- 群集荷重
- A活荷重
- B活荷重
- 鉄道連行荷重
- 衝撃係数
- 複数車線

## 3. ドメイン設計

### LoadingSurface

載荷対象となる面または領域のルートエンティティ。

責務:

- `LoadingGrid`、`LoadingLine`、`Carriageway`、`Sidewalk`、`Track` を束ねる。
- 構造モデルとの紐付け方針を保持する。
- 載荷面に属する点群、格子、ラインの管理単位となる。

保持項目:

```json
{
  "id": "surface-1",
  "name": "Main deck",
  "grids": [],
  "lines": [],
  "carriageways": [],
  "sidewalks": [],
  "tracks": []
}
```

### LoadingGrid

載荷用格子。構造節点とは独立した荷重配置用の格子点集合。

責務:

- 載荷点候補を保持する。
- 格子点間の補間関係を保持する。
- 荷重を構造モデルへ分配するための参照を保持する。

MVPでは直接使わず、`LoadingLine.stations` が一次元格子として機能する。

### LoadingLine

移動荷重が進行するライン。

責務:

- station列を保持する。
- stationごとの三次元座標を提供する。
- 移動荷重の経路幾何とstation生成規則を定義する。

MVP構造:

```json
{
  "id": "line-1",
  "name": "Line 1",
  "surfaceId": "surface-1",
  "points": [
    { "x": 0.0, "y": 0.0, "z": 0.0 },
    { "x": 10.0, "y": 0.0, "z": 0.0 }
  ],
  "stationRule": {
    "type": "fixedInterval",
    "interval": 0.5
  },
  "distributionRuleId": "dist-1"
}
```

`LoadingLine` は経路だけを持つ。荷重方向は `LiveLoadModel` または `MovingLoadCase` が保持し、構造モデルへの荷重分配は独立した `DistributionRule` が担当する。

### Carriageway

車道を表す将来拡張エンティティ。

責務:

- 車道範囲、車線、幅員、適用活荷重種別を保持する。
- 複数 `LoadingLine` を生成するルールを保持する。

MVPでは保存可能な設計枠のみで、解析対象外。

### Sidewalk

歩道を表す将来拡張エンティティ。

責務:

- 歩道領域を保持する。
- 群集荷重などの面荷重適用範囲を保持する。

MVPでは解析対象外。

### Track

鉄道軌道を表す将来拡張エンティティ。

責務:

- 軌道中心線、軌間、連行荷重プリセット参照を保持する。
- 軸列を `LoadingLine` 上へ展開する。

MVPでは解析対象外。

### StationPoint

`StationPoint` は `StationGenerator` が `LoadingLine` から生成する派生データである。永続ドメインエンティティではなく、影響線解析時の入力スナップショットとして扱う。

責務:

- station、正規化位置、三次元座標、折れ線区間を保持する。
- `DistributionRule` へ渡す載荷位置を表す。
- 影響線結果では `lineId + station` を基本キーとして同定する。

```ts
type StationPoint = {
  lineId: string
  station: number
  ratio?: number
  position: Point3D
  segmentIndex?: number
  isEnd?: boolean
}
```

処理の流れ:

```text
LoadingLine
  -> StationGenerator
  -> StationPoint[]
  -> DistributionRule
  -> InfluenceSolver
  -> InfluenceResult
```

### DistributionRule

`DistributionRule` は載荷位置から構造モデルの等価節点荷重を生成する独立した設計対象である。

MVPでは `memberInterpolation` を標準とする。

```ts
type DistributionRule = MemberInterpolationRule

type MemberInterpolationRule = {
  id: string
  type: "memberInterpolation"
  searchTolerance: number
  targetMembers?: string[]
  allowOutOfRange: false
}
```

`memberInterpolation` は `StationPoint.position` から対象部材を検索し、部材局所座標上の位置 `a/L` を算出して、Euler-Bernoulli梁要素の等価節点荷重としてI端/J端へ分配する。`nearestNode` と `explicitNode` は載荷位置を節点へ吸着させ、影響線を階段状にしやすいため、MVP候補から外す。

### MovingLoadCase

移動荷重解析ケース。

責務:

- 使用する `LoadingLine` と `LiveLoadModel` を指定する。
- 解析対象レスポンスを指定する。
- 影響線生成結果を使って移動履歴と包絡結果を作る。

```json
{
  "id": "mlc-1",
  "name": "Single vertical point load",
  "lineId": "line-1",
  "liveLoadModelId": "llm-1",
  "distributionRuleId": "dist-1",
  "targets": [
    { "type": "memberEndForce", "memberId": "M1", "component": "MzI" }
  ],
  "options": {
    "includeHistory": true
  }
}
```

### LiveLoadModel

解析ケースで使用する活荷重インスタンス。

責務:

- `LiveLoadPreset` またはユーザー定義荷重を参照する。
- 倍率、方向、載荷範囲、軸列を保持する。

MVP:

```json
{
  "id": "llm-1",
  "type": "singlePoint",
  "magnitude": {
    "source": "userInput",
    "value": 1.0,
    "unit": "kN"
  },
  "direction": { "x": 0.0, "y": 0.0, "z": -1.0 }
}
```

将来は `presetId` を必須化できるが、MVPの検証用単一集中荷重はユーザー入力値を許可する。

## 4. 依存関係

許可する参照:

```text
MovingLoadCase -> LoadingLine
MovingLoadCase -> LiveLoadModel
LoadingLine -> LoadingSurface
LoadingSurfaceModel -> StructuralModel adapter setting
InfluenceResult -> StructuralModel result target
```

禁止する参照:

```text
StructuralModel -> LoadingSurfaceModel
StructuralNode -> LoadingGridPoint
Member -> LoadingLine
LiveLoadPreset -> Project specific entity
```

構造モデルは移動荷重モデルの存在を知らない。移動荷重エンジンが既存解析エンジンを呼び出す。

## 5. UIツリー

UIは統合するが、内部ツリーでは固定載荷と移動荷重を分ける。

```text
Project
  Structural Model
    Nodes
    Members
    Supports
    Materials
    Sections
    Static Load Cases
  Loading Surface Model
    Loading Surfaces
      Loading Grids
      Loading Lines
      Carriageways
      Sidewalks
      Tracks
    Live Load Models
    Moving Load Cases
  Results
    Static Analysis
    Influence Lines
    Moving Load Envelopes
```

MVP UI:

- `Loading Lines`: 単一ラインの始点、終点、station間隔、荷重方向。
- `Live Load Models`: 単一集中荷重の名称と大きさ。
- `Moving Load Cases`: 対象ライン、対象荷重、出力対象。
- `Results`: 影響線グラフ、移動履歴、最大最小包絡。

## 6. API設計

既存解析APIとは分離する。

### POST /api/influence/run

影響線を生成する。

Request:

```json
{
  "project": {},
  "loadingSurfaceModel": {},
  "case": {
    "lineId": "line-1",
    "targets": []
  }
}
```

Response:

```json
{
  "influenceResult": {
    "caseId": "influence-line-1",
    "stations": [],
    "targets": [],
    "targetResults": [],
    "warnings": [],
    "errors": []
  }
}
```

### POST /api/moving-load/run

影響線生成と移動荷重解析をまとめて実行する。MVPではこのAPIから内部で影響線を作成してもよいが、結果構造では影響線と移動荷重を分離する。

Request:

```json
{
  "project": {},
  "loadingSurfaceModel": {},
  "movingLoadCaseId": "mlc-1",
  "options": {
    "returnCsv": false
  }
}
```

Response:

```json
{
  "result": {
    "influenceResult": {},
    "movingLoadHistory": [],
    "envelopeResult": {},
    "warnings": [],
    "errors": []
  },
  "csv": null
}
```

### GET /api/live-load-presets

将来のプリセット取得API。MVPでは未実装でもよい。

## 7. 実装フェーズ

### Phase 1: MVP

- `LoadingLine` 入力。
- station生成。
- `memberInterpolation` による部材上任意位置の集中荷重分配。
- 鉛直単位荷重をstationごとに等価節点荷重へ変換。
- K行列再利用による影響線生成。
- 単一集中荷重の移動解析。
- 最大最小包絡と最不利載荷位置。
- CSV出力。

### Phase 2: 載荷モデル拡張

- `LoadingGrid`。
- 格子補間。
- 複数 `LoadingLine`。
- 車道、歩道の保存。

### Phase 3: 活荷重プリセット

- R7道路橋示方書対応プリセット。
- T荷重、L荷重、群集荷重。
- A活、B活の適用条件。
- 出典情報、版管理、監査ログ。

### Phase 4: 高度な移動荷重

- 複数車線。
- 連行荷重。
- 衝撃係数。
- 載荷組合せ。
- 同時性断面力と同時性反力の詳細出力。
