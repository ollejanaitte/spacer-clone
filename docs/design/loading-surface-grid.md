# LoadingSurface・LoadingGrid設計

## 1. 目的

移動荷重を構造モデルから独立して扱うため、載荷面、格子、ライン、車道、歩道、軌道、荷重分配、格子補間、保存形式を定義する。

## 2. LoadingSurface

`LoadingSurface` は載荷モデルのルート単位である。橋面、床版、軌道敷など、荷重を置く幾何領域を表す。

```json
{
  "id": "surface-1",
  "name": "Deck",
  "description": "",
  "grids": [],
  "lines": [],
  "carriageways": [],
  "sidewalks": [],
  "tracks": []
}
```

設計原則:

- 構造部材を所有しない。
- 構造節点を所有しない。
- 構造モデルへの変換は荷重分配規則で行う。

## 3. LoadingGrid

`LoadingGrid` は載荷点の集合と補間関係を持つ。

```json
{
  "id": "grid-1",
  "name": "Deck grid",
  "surfaceId": "surface-1",
  "points": [
    { "id": "gp-1", "x": 0.0, "y": 0.0, "z": 0.0 }
  ],
  "cells": [
    { "id": "cell-1", "pointIds": ["gp-1", "gp-2", "gp-3", "gp-4"] }
  ]
}
```

格子点は構造節点と一致してもよいが、一致を必須にしない。

## 4. LoadingLine

`LoadingLine` は移動荷重の一次元経路である。

```json
{
  "id": "line-1",
  "name": "Loading line",
  "surfaceId": "surface-1",
  "geometry": {
    "type": "polyline",
    "points": [
      { "x": 0.0, "y": 0.0, "z": 0.0 },
      { "x": 10.0, "y": 0.0, "z": 0.0 }
    ]
  },
  "stationRule": {
    "type": "fixedInterval",
    "interval": 0.5
  },
  "distributionRuleId": "dist-1"
}
```

MVPでは直線2点と固定間隔を扱う。

## 5. Carriageway

`Carriageway` は車道領域である。

```json
{
  "id": "cw-1",
  "surfaceId": "surface-1",
  "name": "Main carriageway",
  "boundary": {},
  "lanes": [],
  "applicablePresetCategories": ["roadBridgeLiveLoad"]
}
```

将来、車道から複数の `LoadingLine` を生成する。

## 6. Sidewalk

`Sidewalk` は歩道領域である。

```json
{
  "id": "sw-1",
  "surfaceId": "surface-1",
  "name": "Sidewalk",
  "boundary": {},
  "applicablePresetCategories": ["crowdLoad"]
}
```

将来、群集荷重の載荷範囲として使用する。

## 7. Track

`Track` は鉄道軌道である。

```json
{
  "id": "track-1",
  "surfaceId": "surface-1",
  "name": "Track",
  "centerLineId": "line-1",
  "gauge": null,
  "applicablePresetCategories": ["railwayTrainLoad"]
}
```

MVPでは未使用。

## 8. DistributionRule

`DistributionRule` は、載荷点から構造モデルの等価節点荷重へ変換する独立した設計対象である。単なる設定値ではなく、影響線精度と移動荷重の連続性を左右する責務を持つ。

MVP標準:

- `memberInterpolation`: 部材上の任意位置へ載荷し、Euler-Bernoulli梁要素の等価節点荷重としてI端/J端へ分配する。

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

処理方針:

```text
LoadingLine上のstation位置
  -> 対象部材を検索
  -> 部材局所座標上の位置 a/L を算出
  -> 等価節点荷重としてI端/J端へ分配
  -> 既存解析エンジンへ荷重ベクトルとして渡す
```

`nearestNode` と `explicitNode` はMVP候補から外す。載荷位置を節点へ吸着させる方式は影響線が階段状になり、移動荷重解析の位置依存性を損なうためである。

将来拡張:

- `gridInterpolation`
- `surfaceInterpolation`
- `laneDistribution`

これらはMVPでは未実装とする。

分配結果:

```json
[
  { "targetType": "node", "targetId": "N1", "dof": "UZ", "factor": -1.0 }
]
```

## 9. 格子補間

格子補間はPhase 2以降の将来拡張とする。`LoadingGrid` もMVPでは保存設計の枠にとどめ、解析標準にはしない。

候補:

- 線形補間。
- 双線形補間。
- 三角形セルの面積座標。
- 部材線上への投影。

設計上の注意:

- 補間係数の合計が荷重保存条件を満たす。
- 鉛直荷重だけでなく、将来の水平荷重にも拡張できる。
- 補間に失敗した場合はエラーにする。
- 許容距離を超える自動吸着は警告またはエラーにする。

## 10. ライン生成

車道、歩道、軌道から `LoadingLine` を生成する将来機能を想定する。

生成元:

- 車道中心線。
- 車線中心線。
- 歩道中心線。
- 軌道中心線。
- 任意ユーザー線。

MVPではユーザーが単一ラインを直接定義する。

## 11. 保存形式

`project.json` には、構造モデルと別のトップレベルキーとして保存する。

```json
{
  "structuralModel": {},
  "loadingSurfaceModel": {
    "surfaces": [],
    "distributionRules": [],
    "liveLoadModels": [],
    "movingLoadCases": []
  }
}
```

互換性:

- `loadingSurfaceModel` が存在しない既存プロジェクトは有効とする。
- 存在しない場合は空モデルとして扱う。
- 将来のschema versionを持たせる。

## 12. 実装フェーズ

### Phase 1

- `LoadingLine` 直接入力。
- station生成。
- `memberInterpolation` 分配。
- 単一集中荷重の影響線。

### Phase 2

- `LoadingGrid` 保存。
- 格子補間。
- 影響線精度のためのstation自動分割。

### Phase 3

- `Carriageway` から複数ライン生成。
- `Sidewalk` 面荷重。
- `Track` と連行荷重。

### Phase 4

- 格子補間。
- 複数車線同時載荷。
- 載荷領域のThree.js編集。
