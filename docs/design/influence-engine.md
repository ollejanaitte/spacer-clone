# 影響線エンジン設計

## 1. 目的

既存の3次元骨組解析エンジンを利用し、影響線生成と移動荷重解析を行うエンジン設計を定義する。MVPでは単一 `LoadingLine`、鉛直単位荷重、単一集中荷重に限定する。

## 2. 基本方針

影響線エンジンは既存解析エンジンの上位に位置する。

```text
LoadingLine stations
  -> InfluenceLoadPoint
  -> unit load vector
  -> solve with reused K
  -> response extraction
  -> influence values
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
- station IDは `lineId + stationIndex` で安定化する。

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
- 方向はグローバル鉛直下向き。
- 荷重分配は最初は `nearestNode` または明示された構造節点への直接載荷とする。
- 対象レスポンスは変位、反力、部材端力の既存抽出ロジックを再利用する。

符号:

- 単位荷重方向は `InfluenceLoadPoint.direction` で定義する。
- 影響値はその単位荷重を載荷したときのレスポンス値である。
- 活荷重の正負は `LiveLoadModel` の荷重大きさと方向で決まる。

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
    { "index": 0, "station": 0.0, "position": { "x": 0, "y": 0, "z": 0 } }
  ],
  "targets": [
    { "id": "target-1", "type": "memberEndForce", "memberId": "M1", "component": "MzI" }
  ],
  "values": [
    { "targetId": "target-1", "stationIndex": 0, "value": 0.0 }
  ]
}
```

処理:

1. stationを生成する。
2. stationごとに `InfluenceLoadPoint` を作成する。
3. 荷重分配規則により全体荷重ベクトルを作る。
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
  "positionIndex": 0,
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

最大値、最小値、最不利載荷位置、同時性結果を保持する。

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

