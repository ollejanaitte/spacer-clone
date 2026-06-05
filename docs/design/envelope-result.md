# 包絡結果設計

## 1. 目的

影響線解析と移動荷重解析から得られる結果を、影響線結果、移動履歴、包絡結果、最不利載荷位置として保存・表示・出力するためのデータ構造を定義する。同時性断面力と同時性反力はPhase 2で扱う。

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
    "targetResults": []
  }
}
```

`targetResults` はtargetごとにstation順の値配列を保持する。

```json
{
  "targetId": "target-1",
  "values": [0.0, 1.2, 3.25]
}
```

この形式はグラフ表示、CSV出力、包絡処理を単純にし、targetごとの履歴管理を明確にする。`stationIndex` は配列アクセス用の補助情報であり、結果同定の基本キーは `lineId + station` とする。

## 3. 移動履歴

移動履歴は、実荷重を各位置へ移動させたときのレスポンス列である。

MVPでは単一集中荷重のため、荷重位置はstationと一致する。

```json
{
  "movingLoadHistory": [
    {
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
          "station": 6.0
        },
        "min": {
          "value": -4.1,
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
- `station`
- `loadPositions`
- `influenceValues`

将来の複数軸、複数車線では、最不利位置は単一stationではなく荷重配置全体になる。

## 6. 同時性断面力

同時性断面力はPhase 2で扱う。MVPの結果構造には含めない。

## 7. 同時性反力

同時性反力はPhase 2で扱う。MVPの結果構造には含めない。

## 8. 結果API

### POST /api/moving-load/run

移動荷重解析を実行し、影響線、履歴、包絡を返す。

オプション:

```json
{
  "includeInfluenceResult": true,
  "includeHistory": true,
  "returnCsv": false
}
```

履歴は大きくなるため、デフォルトはMVP実装時に性能を見て決める。同時性結果のオプションはPhase 2で追加する。

### GET /api/moving-load/results/{resultId}

将来の保存済み結果取得API。MVPでは未実装でもよい。

## 9. CSV出力

CSVは以下の複数セクション構成とする。

```text
[InfluenceLine]
caseId,lineId,targetId,station,x,y,z,value

[MovingLoadHistory]
caseId,station,targetId,value

[Envelope]
caseId,targetId,criterion,value,station
```

CSV出力時の原則:

- `NaN` と `Infinity` は出力しない。
- 単位はヘッダまたはメタ情報に含める。
- プリセットを使用した場合は `presetId`、`edition`、`revision` をメタ情報へ出す。
- MVPではInfluenceLine、MovingLoadHistory、Envelopeを優先する。
