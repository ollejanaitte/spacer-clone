# 包絡結果設計

## 1. 目的

影響線解析と移動荷重解析から得られる結果を、影響線結果、移動履歴、包絡結果、最不利載荷位置、同時性結果として保存・表示・出力するためのデータ構造を定義する。

## 2. 影響線結果

影響線結果は、単位荷重を各stationに置いたときの対象レスポンス値である。

```json
{
  "influenceResult": {
    "id": "inf-1",
    "lineId": "line-1",
    "unitLoad": {
      "magnitude": 1.0,
      "direction": { "x": 0.0, "y": 0.0, "z": -1.0 }
    },
    "stations": [],
    "targets": [],
    "values": []
  }
}
```

`values` は次の形式とする。

```json
{
  "targetId": "target-1",
  "stationIndex": 12,
  "value": 3.25
}
```

## 3. 移動履歴

移動履歴は、実荷重を各位置へ移動させたときのレスポンス列である。

MVPでは単一集中荷重のため、荷重位置はstationと一致する。

```json
{
  "movingLoadHistory": [
    {
      "positionIndex": 12,
      "station": 6.0,
      "loadPositions": [
        {
          "loadId": "P1",
          "station": 6.0,
          "position": { "x": 6.0, "y": 0.0, "z": 0.0 },
          "magnitude": 10.0,
          "unit": "kN"
        }
      ],
      "responses": [
        {
          "targetId": "target-1",
          "value": 32.5
        }
      ]
    }
  ]
}
```

履歴は出力サイズが大きくなるため、APIオプションで省略可能にする。

## 4. 包絡結果

包絡結果は、対象レスポンスごとの最大値、最小値、その発生位置を持つ。

```json
{
  "envelopeResult": {
    "caseId": "mlc-1",
    "items": [
      {
        "targetId": "target-1",
        "max": {
          "value": 32.5,
          "positionIndex": 12,
          "station": 6.0
        },
        "min": {
          "value": -4.1,
          "positionIndex": 3,
          "station": 1.5
        }
      }
    ]
  }
}
```

最大最小は符号付き値で判定する。絶対値最大は別フィールドとして将来追加できる。

## 5. 最不利載荷位置

最不利載荷位置は、対象レスポンスに対して最大または最小を発生させる荷重配置である。

保持項目:

- `targetId`
- `criterion`: `max` または `min`
- `value`
- `positionIndex`
- `station`
- `loadPositions`
- `influenceValues`

将来の複数軸、複数車線では、最不利位置は単一stationではなく荷重配置全体になる。

## 6. 同時性断面力

同時性断面力は、ある対象の最不利載荷位置で、他の部材端力成分が同時にどの値になるかを示す。

例:

```json
{
  "concurrentMemberEndForces": [
    {
      "governingTargetId": "target-1",
      "criterion": "max",
      "positionIndex": 12,
      "memberId": "M1",
      "end": "I",
      "forces": {
        "Fx": 0.0,
        "Fy": 0.0,
        "Fz": 0.0,
        "Mx": 0.0,
        "My": 0.0,
        "Mz": 32.5
      }
    }
  ]
}
```

MVPでは対象レスポンスの同時性だけでもよいが、データ構造は全部材端力へ拡張可能にする。

## 7. 同時性反力

同時性反力は、最不利載荷位置で支点反力が同時にどの値になるかを示す。

```json
{
  "concurrentReactions": [
    {
      "governingTargetId": "target-1",
      "criterion": "max",
      "positionIndex": 12,
      "nodeId": "N1",
      "reaction": {
        "Fx": 0.0,
        "Fy": 0.0,
        "Fz": 12.0,
        "Mx": 0.0,
        "My": 0.0,
        "Mz": 0.0
      }
    }
  ]
}
```

反力は支点自由度の拘束状態に依存するため、対象DOFが拘束されていない場合は値を出さない。

## 8. 結果API

### POST /api/moving-load/run

移動荷重解析を実行し、影響線、履歴、包絡を返す。

オプション:

```json
{
  "includeInfluenceResult": true,
  "includeHistory": true,
  "includeConcurrentMemberEndForces": true,
  "includeConcurrentReactions": true,
  "returnCsv": false
}
```

履歴や同時性結果は大きくなるため、デフォルトはMVP実装時に性能を見て決める。

### GET /api/moving-load/results/{resultId}

将来の保存済み結果取得API。MVPでは未実装でもよい。

## 9. CSV出力

CSVは以下の複数セクション構成とする。

```text
[InfluenceLine]
caseId,lineId,targetId,stationIndex,station,x,y,z,value

[MovingLoadHistory]
caseId,positionIndex,station,targetId,value

[Envelope]
caseId,targetId,criterion,value,positionIndex,station

[ConcurrentMemberEndForces]
caseId,governingTargetId,criterion,positionIndex,memberId,end,Fx,Fy,Fz,Mx,My,Mz

[ConcurrentReactions]
caseId,governingTargetId,criterion,positionIndex,nodeId,Fx,Fy,Fz,Mx,My,Mz
```

CSV出力時の原則:

- `NaN` と `Infinity` は出力しない。
- 単位はヘッダまたはメタ情報に含める。
- プリセットを使用した場合は `presetId`、`edition`、`revision` をメタ情報へ出す。
- MVPではInfluenceLine、MovingLoadHistory、Envelopeを優先する。

