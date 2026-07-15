# 単一集中荷重・移動荷重包絡 設計書

<!-- DOC-AUTHORITY:START -->
> **Authority:** ACTIVE FRAME REFERENCE
> This is subordinate feature/design evidence. Current implementation facts are governed by [`../../scoping/stage5_frame_analysis_scope.md`](../../scoping/stage5_frame_analysis_scope.md), and target responsibilities and gaps by [`../../planning/stage6-10/stage6_target_architecture.md`](../../planning/stage6-10/stage6_target_architecture.md) and [`../../planning/stage6-10/stage10_gap_migration_sequence.md`](../../planning/stage6-10/stage10_gap_migration_sequence.md). Partial or absent capabilities are not promoted to complete.
<!-- DOC-AUTHORITY:END -->

## 1. 目的

本設計書は、既存の影響線解析 `/api/influence/run` と `backend/engine/influence.py` を土台として、単一集中荷重を走行させたときの移動荷重応答履歴および最大・最小包絡を出力する機能の実装方針を定義する。

本機能は、将来の道路橋示方書ベースの正式活荷重自動化、複数軸車両、複数車線、T荷重、L荷重、群集荷重へ拡張するための最小実装である。

本設計書では実装作業の手戻りを避けるため、以下を明確化する。

- 対象範囲と非対象範囲
- 既存影響線解析との接続方法
- API契約
- 入力データ構造
- 出力データ構造
- 計算処理フロー
- エラー処理
- CSV出力
- frontend 連携方針
- テスト・検証方針
- 実装タスク分解

## 2. 現状整理

### 2.1 既存実装

既に以下は実装済みである。

- `backend/engine/influence.py`
- `run_influence_analysis(project_data, request)`
- `solve_influence_model(model, request, started_at)`
- `/api/influence/run`
- frontend の `api.runInfluenceAnalysis(project)`
- 影響線グラフ表示
- 影響線CSV出力基盤

既存の影響線解析は、対象部材上に単位荷重を順次載荷し、各 station における対象応答を返す。

### 2.2 既存影響線結果の概略

既存レスポンスの主要構造は以下である。

```json
{
  "result": {
    "analysisSummary": {
      "analysisType": "influence_line",
      "status": "success"
    },
    "influenceResult": {
      "caseId": "influence-line-1",
      "line": {
        "id": "line-1",
        "memberId": "M1",
        "stationCount": 21,
        "loadDirection": { "x": 0, "y": -1, "z": 0 },
        "loadMagnitude": 1
      },
      "stations": [],
      "targets": [],
      "targetResults": []
    },
    "warnings": [],
    "errors": []
  }
}
```

### 2.3 現在不足しているもの

以下は未実装である。

- 移動荷重解析エンジン
- `/api/moving-load/run`
- 実荷重を用いた応答履歴
- 最大・最小包絡
- 最悪載荷位置
- 移動荷重結果CSV
- frontend の移動荷重実行UI
- 移動荷重結果表示UI

## 3. 基本方針

### 3.1 既存影響線解析を再利用する

本機能では、新しく剛性マトリクスを組み直す処理を作らない。まず既存の `run_influence_analysis` を呼び出し、得られた影響線値に実荷重倍率を掛けて移動荷重応答を作る。

単一集中荷重の基本式は以下である。

```text
moving_response[i, target] = influence_value[i, target] * load_magnitude
```

ここで、既存影響線解析の `line.magnitude` は原則として `1.0` とする。移動荷重側の `liveLoad.magnitude` が実荷重値である。

### 3.2 MVPは単一集中荷重に限定する

本設計の対象は以下のみである。

- 1本の走行ライン
- 1つの集中荷重
- 既存影響線解析で扱える部材上 station
- 線形静的解析ベース
- 影響線、移動履歴、最大・最小包絡

### 3.3 正式活荷重値は扱わない

道路橋示方書ベースの A活荷重、B活荷重、T荷重、L荷重、群集荷重、衝撃係数は本設計の対象外とする。

理由は以下である。

- 原典確認済みの数値管理が必要である。
- `live-load-preset.md` の方針どおり、正式活荷重値をコードへ直書きしない。
- 本機能は正式活荷重の前段階として、移動荷重包絡の仕組みだけを作る。

### 3.4 既存 project schema との互換性を維持する

初回実装では、`project.schema.json` に巨大な `loadingSurfaceModel` をいきなり追加しない。

MVPでは、APIリクエストに `movingLoadCase` を直接渡す方式を基本とする。将来、`analysisSettings.movingLoad` または `loadingSurfaceModel` に保存する拡張が可能な形にする。

## 4. 対象範囲

### 4.1 実装対象

- `backend/engine/moving_load.py` の新規追加
- `run_moving_load_analysis(project_data, request)` の追加
- `/api/moving-load/run` の追加
- 単一集中荷重の応答履歴作成
- 各 target の最大・最小包絡作成
- 最悪載荷位置の記録
- CSV出力構造の追加
- result schema の移動荷重結果定義追加
- frontend API client の追加
- frontend 最小UIの追加
- backend/frontend テスト追加

### 4.2 非対象

- 複数軸車両
- 複数車線
- 面載荷
- 分布移動荷重
- T荷重
- L荷重
- A活荷重
- B活荷重
- 群集荷重
- 衝撃係数
- 荷重組合せ
- concurrent section forces
- concurrent reactions
- 走行アニメーション
- 解析結果の永続保存API

## 5. 用語定義

### 5.1 InfluenceResult

単位荷重を各 station に載せたときの応答値群。

### 5.2 MovingLoadCase

どのラインに、どの荷重を、どの対象応答に対して走行させるかを表す解析ケース。

### 5.3 MovingLoadHistory

実荷重が各 station にあるときの応答履歴。

### 5.4 EnvelopeResult

各 target について、応答履歴の最大値・最小値・発生 station をまとめた結果。

### 5.5 WorstCaseLoadingPosition

各 target の最大または最小応答を生じる載荷位置情報。

## 6. 新規API設計

## 6.1 POST /api/moving-load/run

単一集中荷重の移動荷重解析を実行する。

### 6.1.1 Request

```json
{
  "project": {},
  "movingLoadCase": {
    "id": "mlc-1",
    "name": "Single point moving load",
    "influenceCaseId": "influence-line-1",
    "line": {
      "id": "line-M1",
      "memberId": "M1",
      "stationCount": 21,
      "direction": { "x": 0, "y": -1, "z": 0 }
    },
    "liveLoad": {
      "id": "P1",
      "type": "singlePoint",
      "name": "Point load P1",
      "magnitude": 100,
      "unit": "kN",
      "direction": { "x": 0, "y": -1, "z": 0 }
    },
    "targets": [
      {
        "id": "target-M1-Mz-i",
        "type": "memberEndForce",
        "memberId": "M1",
        "component": "Mz",
        "end": "i"
      }
    ],
    "options": {
      "includeInfluenceResult": true,
      "includeHistory": true,
      "returnCsv": false
    }
  }
}
```

### 6.1.2 Request項目

| 項目 | 必須 | 説明 |
|---|---:|---|
| `project` | 必須 | 既存 FEM project payload |
| `movingLoadCase.id` | 必須 | 移動荷重ケースID |
| `movingLoadCase.name` | 任意 | 表示名 |
| `movingLoadCase.influenceCaseId` | 任意 | 内部で生成する影響線ケースID |
| `movingLoadCase.line` | 必須 | 既存影響線解析へ渡す line |
| `movingLoadCase.line.memberId` | 必須 | 走行対象部材ID |
| `movingLoadCase.line.stationCount` | 必須 | station 数。既存仕様に合わせ 2～201 |
| `movingLoadCase.line.direction` | 必須 | 影響線作成時の単位荷重方向 |
| `movingLoadCase.liveLoad` | 必須 | 実荷重定義 |
| `movingLoadCase.liveLoad.type` | 必須 | MVPでは `singlePoint` のみ |
| `movingLoadCase.liveLoad.magnitude` | 必須 | 実荷重値 kN |
| `movingLoadCase.liveLoad.direction` | 必須 | 実荷重方向。MVPでは line.direction と同方向必須 |
| `movingLoadCase.targets` | 必須 | 影響線対象応答 |
| `movingLoadCase.options.includeInfluenceResult` | 任意 | 影響線結果をレスポンスに含める。既定 true |
| `movingLoadCase.options.includeHistory` | 任意 | 移動履歴をレスポンスに含める。既定 true |
| `movingLoadCase.options.returnCsv` | 任意 | CSVを返す。既定 false |

### 6.1.3 Response

```json
{
  "result": {
    "projectId": "project-1",
    "schemaVersion": "1.0.0",
    "analysisSummary": {
      "analysisType": "moving_load",
      "status": "success",
      "startedAt": "2026-06-19T00:00:00Z",
      "finishedAt": "2026-06-19T00:00:01Z",
      "durationMs": 1000,
      "nodeCount": 10,
      "memberCount": 9,
      "loadCaseCount": 1,
      "totalDof": 60,
      "freeDof": 48,
      "constrainedDof": 12,
      "solver": "influence_line_reuse"
    },
    "movingLoadResult": {
      "caseId": "mlc-1",
      "caseName": "Single point moving load",
      "liveLoad": {
        "id": "P1",
        "type": "singlePoint",
        "magnitude": 100,
        "unit": "kN",
        "direction": { "x": 0, "y": -1, "z": 0 }
      },
      "line": {
        "id": "line-M1",
        "memberId": "M1",
        "stationCount": 21,
        "loadDirection": { "x": 0, "y": -1, "z": 0 }
      },
      "influenceResult": {},
      "movingLoadHistory": [],
      "envelopeResult": {
        "caseId": "mlc-1",
        "items": []
      },
      "worstCaseLoadingPositions": []
    },
    "warnings": [],
    "errors": []
  },
  "csv": null
}
```

## 7. 入力データ詳細

### 7.1 MovingLoadCase

MVP用 TypeScript 型の想定は以下である。

```ts
type MovingLoadCase = {
  id: string;
  name?: string;
  influenceCaseId?: string;
  line: MovingLoadLine;
  liveLoad: SinglePointLiveLoad;
  targets: InfluenceTarget[];
  options?: MovingLoadOptions;
};
```

### 7.2 MovingLoadLine

既存 `InfluenceLineSettings` と同等にする。

```ts
type MovingLoadLine = {
  id: string;
  memberId: string;
  stationCount: number;
  direction: Vector3;
};
```

`magnitude` は line 側に持たせない。影響線解析へ渡すときだけ内部で `magnitude: 1.0` を付与する。

理由：

- line は走行経路と単位荷重方向を表す。
- 実荷重値は `liveLoad.magnitude` が責任を持つ。
- line magnitude と liveLoad magnitude の二重管理を避ける。

### 7.3 SinglePointLiveLoad

```ts
type SinglePointLiveLoad = {
  id: string;
  type: "singlePoint";
  name?: string;
  magnitude: number;
  unit: "kN";
  direction: Vector3;
};
```

MVPでは、`line.direction` と `liveLoad.direction` は同じ向きであることを必須とする。

許容判定は、正規化後の内積で行う。

```text
dot(normalize(line.direction), normalize(liveLoad.direction)) >= 0.999999
```

異なる場合は `INVALID_VALUE` とする。

理由：

- 既存影響線は指定方向の単位荷重に対する応答である。
- 実荷重方向が異なる場合、影響線をそのまま倍率換算できない。
- 将来は方向ごとの影響線合成で拡張可能だが、MVPでは扱わない。

### 7.4 InfluenceTarget

既存影響線と同じ定義を使う。

```ts
type InfluenceTarget = {
  id: string;
  type: "displacement" | "reaction" | "memberEndForce";
  nodeId?: string;
  memberId?: string;
  component: string;
  end?: "i" | "j";
};
```

MVPで優先する target は以下である。

- `memberEndForce`
- `reaction`
- `displacement`

UIではまず `memberEndForce` と `reaction` を優先表示する。エンジン側は既存影響線が対応している3種類を受け付ける。

## 8. 出力データ詳細

### 8.1 MovingLoadResult

```ts
type MovingLoadResult = {
  caseId: string;
  caseName?: string;
  liveLoad: SinglePointLiveLoadSnapshot;
  line: MovingLoadLineSnapshot;
  influenceResult?: InfluenceResult;
  movingLoadHistory?: MovingLoadHistoryItem[];
  envelopeResult: EnvelopeResult;
  worstCaseLoadingPositions: WorstCaseLoadingPosition[];
};
```

### 8.2 MovingLoadHistoryItem

```ts
type MovingLoadHistoryItem = {
  station: number;
  ratio: number;
  position: Point3D;
  loadPositions: MovingLoadPosition[];
  responses: MovingLoadResponse[];
};
```

JSON例：

```json
{
  "station": 5.0,
  "ratio": 0.5,
  "position": { "x": 5.0, "y": 0.0, "z": 0.0 },
  "loadPositions": [
    {
      "loadId": "P1",
      "station": 5.0,
      "ratio": 0.5,
      "position": { "x": 5.0, "y": 0.0, "z": 0.0 },
      "magnitude": 100.0,
      "unit": "kN"
    }
  ],
  "responses": [
    {
      "targetId": "target-M1-Mz-i",
      "value": 250.0
    }
  ]
}
```

MVPでは `loadPositions` は常に1件である。

### 8.3 EnvelopeResult

```ts
type EnvelopeResult = {
  caseId: string;
  items: EnvelopeItem[];
};
```

```ts
type EnvelopeItem = {
  targetId: string;
  target: InfluenceTarget;
  max: EnvelopeExtreme;
  min: EnvelopeExtreme;
  absMax: EnvelopeExtreme;
};
```

```ts
type EnvelopeExtreme = {
  value: number;
  station: number;
  ratio: number;
  position: Point3D;
  stationIndex: number;
  loadPositions: MovingLoadPosition[];
};
```

`absMax` は最大絶対値である。実務上、正負最大とは別に絶対最大が欲しいため、MVPから含める。

`absMax` の選定基準：

```text
absMax = item with max(abs(value))
```

同値の場合は、先に出現した station を採用する。

### 8.4 WorstCaseLoadingPosition

```ts
type WorstCaseLoadingPosition = {
  targetId: string;
  criterion: "max" | "min" | "absMax";
  value: number;
  station: number;
  ratio: number;
  position: Point3D;
  stationIndex: number;
  loadPositions: MovingLoadPosition[];
  influenceValue: number;
};
```

`WorstCaseLoadingPosition` は `EnvelopeResult` と一部重複するが、UIや帳票で「この部材力を最大にする載荷位置」を直接扱いやすくするために保持する。

## 9. 計算処理フロー

### 9.1 全体フロー

```text
POST /api/moving-load/run
  -> request validation
  -> influence request を組み立て
  -> run_influence_analysis(project, influenceRequest)
  -> influence result status check
  -> movingLoadHistory 作成
  -> envelopeResult 作成
  -> worstCaseLoadingPositions 作成
  -> CSV作成 optional
  -> response
```

### 9.2 influence request の作成

`movingLoadCase` から既存影響線解析へ渡す request を作る。

```python
influence_request = {
    "caseId": moving_case.get("influenceCaseId") or f"{case_id}-influence",
    "line": {
        "id": moving_case["line"]["id"],
        "memberId": moving_case["line"]["memberId"],
        "stationCount": moving_case["line"]["stationCount"],
        "direction": moving_case["line"]["direction"],
        "magnitude": 1.0,
    },
    "targets": moving_case["targets"],
}
```

### 9.3 影響線エラー時

`run_influence_analysis` の結果に `errors` がある、または `analysisSummary.status == "failed"` の場合、移動荷重解析も失敗とする。

返却する `analysisSummary.analysisType` は `moving_load` とし、`errors` には影響線側のエラーを引き継ぐ。

### 9.4 movingLoadHistory 作成

影響線結果の station と targetResults を走査する。

疑似コード：

```python
for station_index, station in enumerate(influence.stations):
    responses = []
    for target_result in influence.targetResults:
        influence_value = target_result.values[station_index]
        response_value = influence_value * live_load_magnitude
        responses.append({
            "targetId": target_result["targetId"],
            "value": clean(response_value),
        })

    history.append({
        "station": station["station"],
        "ratio": station["ratio"],
        "position": station["position"],
        "loadPositions": [build_load_position(station)],
        "responses": responses,
    })
```

### 9.5 envelopeResult 作成

target ごとに、history の response を集計する。

疑似コード：

```python
for target in targets:
    values = []
    for station_index, history_item in enumerate(history):
        response = find_response(history_item.responses, target.id)
        values.append((station_index, response.value, history_item))

    max_item = max(values, key=lambda row: row.value)
    min_item = min(values, key=lambda row: row.value)
    abs_item = max(values, key=lambda row: abs(row.value))

    envelope.items.append({
        "targetId": target.id,
        "target": target,
        "max": to_extreme(max_item),
        "min": to_extreme(min_item),
        "absMax": to_extreme(abs_item),
    })
```

### 9.6 符号規約

符号は既存影響線解析の応答値に従う。

- 影響線値が正で、荷重 magnitude が正なら応答は正
- 影響線値が負で、荷重 magnitude が正なら応答は負
- 実荷重方向は `line.direction` と同方向に限定する
- `liveLoad.magnitude` は正値を原則とする

`liveLoad.magnitude <= 0` は `INVALID_VALUE` とする。

理由：

- 荷重方向は direction で表現する。
- magnitude に負値を許すと方向と符号の二重表現になる。

## 10. バリデーション

### 10.1 必須チェック

以下をチェックする。

- `movingLoadCase` が object である
- `movingLoadCase.id` が空でない
- `movingLoadCase.line.memberId` が空でない
- `movingLoadCase.line.stationCount` が 2～201
- `movingLoadCase.line.direction` がゼロベクトルでない
- `movingLoadCase.liveLoad.type == "singlePoint"`
- `movingLoadCase.liveLoad.magnitude > 0`
- `movingLoadCase.liveLoad.unit == "kN"`
- `movingLoadCase.liveLoad.direction` がゼロベクトルでない
- `line.direction` と `liveLoad.direction` が同方向
- `targets` が1件以上

### 10.2 target チェック

既存影響線解析側でも検証されるが、移動荷重側でも最低限以下を見る。

- `type` が `displacement`, `reaction`, `memberEndForce` のいずれか
- `displacement` と `reaction` は `nodeId` 必須
- `memberEndForce` は `memberId` と `end` 必須
- `component` が空でない

### 10.3 エラーコード

既存の `AnalysisError` 方針に合わせる。

| code | 条件 |
|---|---|
| `INVALID_VALUE` | 不正な数値、ゼロ方向、負の荷重、方向不一致 |
| `INVALID_REFERENCE` | 存在しない memberId / nodeId |
| `SCHEMA_ERROR` | リクエスト構造不正 |
| `SOLVER_ERROR` | 影響線解析で予期しない失敗 |
| `MODEL_UNSTABLE` | 影響線解析で不安定 |

### 10.4 NaN / Infinity

既存APIと同様、入力に `NaN` または `Infinity` が含まれる場合は失敗とする。

出力時も `clean()` 相当の処理を通し、非有限値をJSONへ出さない。

## 11. backend 実装設計

### 11.1 新規ファイル

```text
backend/engine/moving_load.py
```

### 11.2 公開関数

```python
def run_moving_load_analysis(project_data: dict[str, Any], request: dict[str, Any]) -> dict[str, Any]:
    ...
```

### 11.3 内部関数案

```python
def parse_moving_load_case(request: dict[str, Any]) -> dict[str, Any]:
    ...

def build_influence_request(case: dict[str, Any]) -> dict[str, Any]:
    ...

def validate_direction_compatibility(line_direction: dict[str, float], load_direction: dict[str, float]) -> None:
    ...

def build_moving_load_history(influence: dict[str, Any], live_load: dict[str, Any]) -> list[dict[str, Any]]:
    ...

def build_envelope_result(case_id: str, targets: list[dict[str, Any]], history: list[dict[str, Any]]) -> dict[str, Any]:
    ...

def build_worst_case_positions(envelope: dict[str, Any], influence: dict[str, Any]) -> list[dict[str, Any]]:
    ...

def moving_load_error_result(project_data: dict[str, Any], started_at: str, error: dict[str, Any]) -> dict[str, Any]:
    ...
```

### 11.4 既存 `backend/engine/__init__.py`

以下を export する。

```python
from .moving_load import run_moving_load_analysis
```

### 11.5 FastAPI endpoint

`backend/app/main.py` に追加する。

```python
@app.post("/api/moving-load/run")
def run_moving_load_analysis_endpoint(payload: dict[str, Any]) -> JSONResponse:
    project = extract_project(payload)
    moving_case = payload.get("movingLoadCase")
    request = {"movingLoadCase": moving_case}
    finite_error = find_non_finite(project)
    if finite_error is not None:
        result = moving_load_failed_result(...)
    else:
        result = run_moving_load_analysis(copy.deepcopy(project), request)
    return safe_json_response({"result": result, "csv": csv_exports})
```

### 11.6 既存影響線解析との関係

`moving_load.py` は `run_influence_analysis` を呼び出す。

```python
from .influence import run_influence_analysis
```

ただし、将来的に性能改善する場合は `solve_influence_model` を直接呼び出す選択肢もある。MVPではAPI互換と安全性を優先し、公開関数 `run_influence_analysis` を使う。

## 12. result schema 設計

`schemas/result.schema.json` に `movingLoadResult` を追加する。

### 12.1 analysisType

許容値に以下を追加する。

```json
"moving_load"
```

### 12.2 top-level result

移動荷重結果では以下を持つ。

```json
{
  "movingLoadResult": {
    "$ref": "#/$defs/movingLoadResult"
  }
}
```

既存結果との互換性を保つため、`influenceResult` は top-level に置かず、`movingLoadResult.influenceResult` に含める。

理由：

- `/api/influence/run` の結果と `/api/moving-load/run` の結果を区別する。
- 移動荷重解析は影響線を内部利用する上位解析である。

### 12.3 schema defs

追加候補：

- `movingLoadResult`
- `movingLoadHistoryItem`
- `movingLoadPosition`
- `movingLoadResponse`
- `envelopeResult`
- `envelopeItem`
- `envelopeExtreme`
- `worstCaseLoadingPosition`
- `singlePointLiveLoadSnapshot`

## 13. CSV出力設計

### 13.1 CSV構成

移動荷重CSVは複数セクション形式とする。

```text
[MovingLoadSummary]
caseId,caseName,loadId,loadMagnitude,unit,lineId,memberId,stationCount

[MovingLoadHistory]
caseId,stationIndex,station,ratio,x,y,z,targetId,value

[Envelope]
caseId,targetId,criterion,value,stationIndex,station,ratio,x,y,z

[WorstCaseLoadingPosition]
caseId,targetId,criterion,value,loadId,stationIndex,station,ratio,x,y,z,influenceValue
```

### 13.2 returnCsv

`options.returnCsv == true` の場合、レスポンスの `csv` に以下を返す。

```json
{
  "moving_load.csv": "..."
}
```

### 13.3 CSV出力時の注意

- `NaN` と `Infinity` は出力しない。
- UTF-8 BOM は既存CSV出力方針に合わせる。
- 数値丸めは既存 `clean()` の結果を使う。
- 単位は summary に含める。

## 14. frontend 設計

### 14.1 TypeScript 型追加

`frontend/src/types.ts` に以下を追加する。

- `MovingLoadCase`
- `SinglePointLiveLoad`
- `MovingLoadResult`
- `MovingLoadHistoryItem`
- `EnvelopeResult`
- `EnvelopeItem`
- `EnvelopeExtreme`
- `WorstCaseLoadingPosition`
- `MovingLoadRunResponse`

### 14.2 API client

`frontend/src/api/client.ts` に追加する。

```ts
runMovingLoadAnalysis(project: ProjectModel, movingLoadCase: MovingLoadCase): Promise<MovingLoadRunResponse> {
  return postJson<MovingLoadRunResponse>("/api/moving-load/run", {
    project: buildBackendProject(project),
    movingLoadCase,
  });
}
```

### 14.3 初期UI

MVP UIは簡素でよい。

必要項目：

- 走行対象部材 `memberId`
- station数
- 荷重方向
- 集中荷重値 kN
- target選択
- 実行ボタン
- 結果表示

### 14.4 結果表示

優先表示は以下。

1. Envelope table
2. Worst-case loading position table
3. Moving load history graph
4. Influence line graph

初回実装では、既存 `ResultsPanel` に `movingLoad` view を追加する。

### 14.5 表示ラベル

日本語ラベル案：

| キー | 表示 |
|---|---|
| movingLoad | 移動荷重 |
| movingLoadResult | 移動荷重結果 |
| envelope | 包絡結果 |
| max | 最大 |
| min | 最小 |
| absMax | 絶対最大 |
| worstCasePosition | 最悪載荷位置 |
| loadMagnitude | 荷重値 |
| station | 載荷位置 |

## 15. 既存橋梁ウィザードとの関係

現在の橋梁ウィザードの `vehicle` は、FEM生成時に代表節点へ静的節点荷重として変換される。

本移動荷重MVPでは、それとは別に `/api/moving-load/run` を使う。

理由：

- 既存 `vehicle` は静的荷重であり、移動履歴を持たない。
- 移動荷重は影響線を使う上位解析であり、FEM project の `nodalLoads` へ展開して保存しない。
- 将来的に橋梁ウィザードの load line から `movingLoadCase` を生成することは可能。

初回実装では連携しない。次段階で以下を追加する。

```text
BridgeLine(type=traffic/load)
  -> MovingLoadLine
BridgeLoad(type=vehicle)
  -> SinglePointLiveLoad
```

## 16. 性能方針

MVPでは既存影響線解析をそのまま呼び出す。

既存影響線解析は station ごとに solve するが、K行列は既に1回組み立てられている。station数は既存仕様どおり最大201に制限する。

性能上の制限：

- `stationCount <= 201`
- `targetCount` はUI側で過大にならないよう制限する。目安は初期UIで 1～20 件。
- `includeHistory == false` の場合は envelope 作成後、history をレスポンスから省略できる。ただし内部計算には履歴相当の値を使う。

将来改善：

- factorized solver の再利用
- target extraction の最適化
- influence result cache
- CSVダウンロード専用API

## 17. テスト設計

### 17.1 backend unit tests

新規テストファイル：

```text
backend/tests/test_moving_load_analysis.py
backend/tests/test_moving_load_api.py
```

### 17.2 テストケース

#### Case 1: 単純梁中央曲げの包絡

目的：移動荷重により中央付近で曲げ最大となることを確認する。

確認：

- status success
- movingLoadHistory 件数 = stationCount
- envelope.items 件数 = target数
- max.value が有限
- max.station が妥当

#### Case 2: 荷重倍率の線形性

同じ影響線に対し、荷重を 100 kN と 200 kN に変えたとき、応答値が2倍になること。

確認：

```text
envelope_200.max.value ≒ envelope_100.max.value * 2
```

#### Case 3: includeHistory false

`includeHistory == false` の場合：

- `movingLoadHistory` は省略または空
- `envelopeResult` は存在
- `worstCaseLoadingPositions` は存在

仕様としては「省略」を推奨する。

#### Case 4: 方向不一致

`line.direction = {0,-1,0}`、`liveLoad.direction = {1,0,0}` の場合、`INVALID_VALUE` で失敗する。

#### Case 5: 荷重値不正

`liveLoad.magnitude <= 0` で `INVALID_VALUE`。

#### Case 6: 影響線解析エラーの伝播

不安定モデル等で影響線解析が失敗した場合、移動荷重解析も failed になり、エラー情報を保持する。

#### Case 7: CSV出力

`returnCsv == true` の場合：

- `moving_load.csv` が存在
- `[Envelope]` セクションが存在
- 非有限値が出ない

### 17.3 frontend tests

追加候補：

```text
frontend/src/api/client.test.ts
frontend/src/components/ResultsPanel.test.tsx
frontend/src/results/resultViewModel.test.ts
frontend/src/exports/resultCsvExport.test.ts
```

確認内容：

- `/api/moving-load/run` に正しい payload を送る
- movingLoadResult を ViewModel 化できる
- envelope table を表示できる
- history がない場合もクラッシュしない
- CSV出力ボタンが動作する

## 18. 実装タスク分解

### Phase ML-1: backend 最小エンジン

- `backend/engine/moving_load.py` 追加
- `run_moving_load_analysis` 実装
- 影響線解析呼び出し
- 履歴作成
- 包絡作成
- エラー結果作成
- unit test 追加

完了条件：backend test で単一集中荷重包絡が成功する。

### Phase ML-2: API追加

- `backend/engine/__init__.py` export
- `backend/app/main.py` に `/api/moving-load/run` 追加
- API test 追加

完了条件：FastAPI TestClient で結果が返る。

### Phase ML-3: schema追加

- `schemas/result.schema.json` に moving load result 追加
- 必要なら `schemas/project.schema.json` に保存用 optional 設定追加

MVPでは project schema への保存項目追加は任意。API request schema を明文化するだけでもよい。

完了条件：既存 project schema test が壊れない。

### Phase ML-4: CSV追加

- backend CSV export に `moving_load.csv` 追加
- frontend export 側と整合

完了条件：CSV test が通る。

### Phase ML-5: frontend API・型追加

- `frontend/src/types.ts` 追加
- `frontend/src/api/client.ts` 追加
- client test 追加

完了条件：型エラーなし。

### Phase ML-6: frontend UI追加

- 移動荷重設定UI
- 実行ボタン
- 結果state管理
- ResultsPanel表示

完了条件：手動で実行し、包絡表が見える。

### Phase ML-7: 表示・出力強化

- envelope table
- worst-case table
- history graph
- CSV保存

完了条件：ユーザーが最大・最小・絶対最大と発生位置を確認できる。

## 19. 実装時の注意点

### 19.1 line.magnitude と liveLoad.magnitude の混同禁止

影響線解析に渡す line magnitude は常に `1.0` とする。

実荷重値は `liveLoad.magnitude` のみを使う。

### 19.2 direction の二重表現に注意

MVPでは `line.direction` と `liveLoad.direction` を同方向必須とする。

将来、方向合成をする場合は、X/Y/Z各方向の影響線を別々に作り、荷重ベクトル成分で合成する。

### 19.3 history省略時も envelope は必ず返す

UIや帳票では包絡が主結果であるため、`includeHistory == false` でも envelope は必須とする。

### 19.4 result shape は固定する

成功時・失敗時ともに、top-level には以下を必ず持たせる。

```text
projectId
schemaVersion
analysisSummary
movingLoadResult
warnings
errors
```

失敗時の `movingLoadResult` は空構造を返す。

### 19.5 既存影響線レスポンスを破壊しない

`/api/influence/run` のレスポンス構造は変更しない。

移動荷重機能は上位APIとして追加する。

## 20. 将来拡張ポイント

### 20.1 複数軸車両

将来は `liveLoad.type = "axleTrain"` を追加する。

```json
{
  "type": "axleTrain",
  "axles": [
    { "id": "A1", "offset": 0.0, "magnitude": 50.0 },
    { "id": "A2", "offset": 4.0, "magnitude": 50.0 }
  ]
}
```

応答式：

```text
response(p) = Σ influence(p + axle_offset[j]) * axle_load[j]
```

### 20.2 分布荷重

将来は影響線を数値積分する。

```text
response(p) = ∫ influence(s) q(s - p) ds
```

### 20.3 複数車線

`MovingLoadCase` に `lanes` を追加する。

### 20.4 正式活荷重プリセット

`LiveLoadPreset` から `liveLoad` を生成する。

必ず以下を結果に保存する。

- `presetId`
- `edition`
- `revision`
- `source`
- `checksum`

### 20.5 衝撃係数

衝撃係数は `liveLoad.magnitude` へ事前に掛けるのではなく、結果へ以下のように明示する。

```json
{
  "impactFactor": {
    "enabled": true,
    "value": 0.3,
    "appliedMultiplier": 1.3,
    "source": {}
  }
}
```

## 21. 受け入れ基準

本機能のMVP完了条件は以下である。

- `/api/moving-load/run` が実行できる
- 既存影響線解析を内部利用している
- 単一集中荷重の応答履歴を返せる
- targetごとの最大・最小・絶対最大包絡を返せる
- 最悪載荷位置を返せる
- `includeHistory` で履歴の有無を制御できる
- `returnCsv` でCSVを返せる
- 不正入力で適切に failed result を返す
- 既存 `/api/influence/run` は変更されない
- 既存テストが壊れない
- backend に移動荷重専用テストが追加される
- frontend から実行して包絡結果を確認できる

## 22. 推奨する最初の実装順

最初の実装者は以下の順に進める。

```text
1. backend/engine/moving_load.py を作る
2. 既存 run_influence_analysis を呼ぶ
3. influenceResult から history を作る
4. history から envelope を作る
5. backend unit test を通す
6. /api/moving-load/run を追加する
7. API test を通す
8. result schema を追加する
9. frontend API client と型を追加する
10. ResultsPanel に envelope 表示を追加する
```

この順序で進めると、設計・API・UIの手戻りが最も少ない。

## 23. まとめ

本設計の要点は、既存影響線解析を壊さず、その上位処理として単一集中荷重の移動履歴と包絡を作ることである。

MVPでは正式活荷重値や複数車線を扱わず、まず以下に集中する。

```text
影響線 × 実荷重 = 移動荷重応答履歴
移動荷重応答履歴 -> 最大・最小・絶対最大包絡
```

この土台が完成すれば、次段階で複数軸車両、道路橋示方書プリセット、T荷重、L荷重、群集荷重、衝撃係数へ安全に拡張できる。
