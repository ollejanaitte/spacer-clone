# 影響線エンジン設計

## 1. 目的

既存の3次元骨組解析エンジンを利用し、影響線生成と移動荷重解析を行うエンジン設計を定義する。MVPでは単一 `LoadingLine`、鉛直単位荷重、単一集中荷重に限定する。

## 2. 基本方針

影響線エンジンは既存解析エンジンの上位に位置する。

```text
LoadingLine
  -> StationGenerator
  -> StationPoint[]
  -> DistributionRule
  -> unit load vector
  -> solve with reused K
  -> response extraction
  -> InfluenceResult
  -> moving load convolution
  -> envelope result
```

構造モデル側には移動荷重用の知識を追加しない。

## 3. station管理

stationは `LoadingLine` 上の位置を表す。

保持項目:

- `station`: 始点からの距離。
- `ratio`: ライン全長に対する正規化位置。
- `position`: 三次元座標。
- `segmentIndex`: 折れ線ラインでの所属区間。
- `isEnd`: 端点フラグ。

MVPでは直線ラインを前提に、始点、終点、固定間隔からstationを生成する。

生成ルール:

- station 0を必ず含む。
- 終点を必ず含む。
- 丸め誤差により終点直前の重複stationを作らない。
- `StationPoint` は永続ドメインエンティティではなく、解析時に生成される派生データとする。
- 結果同定の基本キーは `lineId + station` とする。
- `stationIndex` は配列アクセス用の補助情報として扱い、主キーにはしない。

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

## 4. K行列再利用

影響線生成では構造剛性は変わらず、荷重ベクトルだけが変わる。したがって全体剛性行列と境界条件処理後の `Kff` を再利用する。

設計:

- 解析前に構造モデルを一度だけ組み立てる。
- `freeDofs`、`fixedDofs`、`Kff` をキャッシュする。
- SciPy sparse solverでは、可能であれば分解済みsolverを再利用する。
- 荷重ベクトル `Ff` だけをstationごとに更新する。

キャッシュキー:

```text
structuralModelHash
boundaryConditionHash
memberPropertyHash
solverOptionsHash
```

荷重ケースはキャッシュキーに含めない。

## 5. 単位荷重法

各stationに単位荷重を置き、対象レスポンスを抽出して影響値とする。

MVP:

- 単位荷重の大きさは `1.0`。
- 方向は `LiveLoadModel` または `MovingLoadCase` の荷重方向に従う。MVPではグローバル鉛直下向きを想定する。
- 荷重分配は `memberInterpolation` を標準とする。
- 対象レスポンスは変位、反力、部材端力の既存抽出ロジックを再利用する。

符号:

- 単位荷重方向は `LiveLoadModel` または `MovingLoadCase` で定義する。
- 影響値はその単位荷重を載荷したときのレスポンス値である。
- 活荷重の正負は `LiveLoadModel` の荷重大きさと方向で決まる。

`nearestNode` と `explicitNode` はMVP候補から外す。これらは載荷位置を構造節点へ吸着させるため、影響線が階段状になり、移動荷重解析の位置依存性を表現しにくい。既存のEuler-Bernoulli梁要素を利用し、部材上任意位置の集中荷重を等価節点荷重へ分配する `memberInterpolation` を初期標準とする。

## 6. 影響線生成

入力:

- `StructuralModel`
- `LoadingLine`
- `InfluenceTarget[]`
- `DistributionRule`

出力:

```json
{
  "lineId": "line-1",
  "stations": [
    { "station": 0.0, "position": { "x": 0, "y": 0, "z": 0 } }
  ],
  "targets": [
    { "id": "target-1", "type": "memberEndForce", "memberId": "M1", "component": "MzI" }
  ],
  "targetResults": [
    {
      "targetId": "target-1",
      "values": [0.0]
    }
  ]
}
```

処理:

1. stationを生成する。
2. `StationPoint[]` を生成する。
3. `memberInterpolation` により、対象部材、部材局所座標上の位置 `a/L`、等価節点荷重を算出する。
4. 再利用済み `Kff` で変位を解く。
5. 反力、部材端力を復元する。
6. `InfluenceTarget` ごとの値を抽出する。

## 7. 移動荷重解析

影響線値に実荷重を乗じ、荷重位置ごとのレスポンス履歴を作る。

MVPの単一集中荷重:

```text
response(station i) = influenceValue(station i) * loadMagnitude
```

将来の複数軸:

```text
response(position p) = sum(influenceValue(p + axleOffset[j]) * axleLoad[j])
```

将来の分布荷重:

```text
response(position p) = integral(influenceValue(s) * q(s - p) ds)
```

## 8. データ構造

### InfluenceTarget

```json
{
  "id": "target-1",
  "type": "memberEndForce",
  "memberId": "M1",
  "component": "MzI"
}
```

対象候補:

- `displacement`
- `reaction`
- `memberEndForce`

MVPでは部材端力と反力を優先し、変位は同じ構造で扱えるようにする。

### MovingLoadHistory

```json
{
  "station": 0.0,
  "loadPositions": [
    { "loadId": "P1", "station": 0.0 }
  ],
  "responses": [
    { "targetId": "target-1", "value": 0.0 }
  ]
}
```

### Envelope

最大値、最小値、最不利載荷位置を保持する。断面力や反力の同時性結果はPhase 2で扱う。

## 9. キャッシュ

キャッシュ階層:

- `StructuralSolveCache`: `Kff`、solver、DOF対応。
- `InfluenceLineCache`: line、station、targetごとの影響値。
- `DistributionCache`: stationから構造DOFへの分配係数。

無効化条件:

- 構造モデルが変わった。
- 支点条件が変わった。
- 断面、材料、部材が変わった。
- LoadingLineのstationまたは分配規則が変わった。
- InfluenceTargetが変わった。

## 10. 性能設計

影響線解析の計算量は `station数 x target抽出コスト` ではなく、実際には `station数 x 線形方程式解法` が支配的になる。

性能方針:

- K行列組立を1回にする。
- 分解済みsolverを再利用する。
- stationごとの荷重ベクトルは疎な表現で作る。
- 複数targetは1回のsolve結果からまとめて抽出する。
- CSVや履歴出力はオプションで絞れるようにする。

MVPでの目標:

- station数が数百程度ならUI操作として待てる時間内に完了する。
- station数が増えた場合は進捗表示とキャンセルを将来実装する。

## 11. 検証方法

単体検証:

- 単純梁中央集中荷重の影響線形状。
- 片持ち梁先端反力または曲げモーメントの符号。
- station端点の値。
- 荷重倍率に対する線形性。
- station間隔を細かくしたときの収束。

統合検証:

- 既存静的解析で同じ位置に集中荷重を置いた結果と、影響線の同station値を比較する。
- 移動荷重履歴の最大値が影響線最大値と荷重大きさの積になることを確認する。
- CSV出力とJSON出力の値が一致する。

異常系:

- 不安定構造。
- 存在しない `lineId`。
- 存在しない `targetId`。
- stationゼロ件。
- 荷重分配先が見つからない。
