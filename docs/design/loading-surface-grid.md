# LoadingSurface・LoadingGrid設計

## 1. 目的

移動荷重を構造モデルから独立して扱うため、載荷面、格子、ライン、車道、歩道、軌道、荷重分配、格子補間、保存形式を定義する。

## 2. LoadingSurface

`LoadingSurface` は載荷モデルのルート単位である。橋面、床版、軌道敷など、荷重を置く幾何領域を表す。

```json
{
  "id": "surface-1",
  "name": "Deck",
  "coordinateSystem": "global",
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

## 8. 荷重分配

荷重分配は、載荷点から構造モデルのDOFへ荷重を変換する規則である。

方式:

- `nearestNode`: 最も近い構造節点へ載荷する。MVP候補。
- `explicitNode`: ユーザーが指定した構造節点へ載荷する。MVP候補。
- `memberInterpolation`: 部材上の位置へ載荷し、等価節点荷重へ変換する。将来。
- `gridInterpolation`: 格子点と構造節点の対応から補間する。将来。

```json
{
  "id": "dist-1",
  "type": "nearestNode",
  "searchTolerance": 0.1,
  "targetDof": "UZ"
}
```

分配結果:

```json
[
  { "targetType": "node", "targetId": "N1", "dof": "UZ", "factor": -1.0 }
]
```

## 9. 格子補間

格子補間は将来拡張とする。

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
- `explicitNode` または `nearestNode` 分配。
- station生成。
- 単一集中荷重の影響線。

### Phase 2

- `LoadingGrid` 保存。
- `memberInterpolation`。
- 影響線精度のためのstation自動分割。

### Phase 3

- `Carriageway` から複数ライン生成。
- `Sidewalk` 面荷重。
- `Track` と連行荷重。

### Phase 4

- 格子補間。
- 複数車線同時載荷。
- 載荷領域のThree.js編集。

