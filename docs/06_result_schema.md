# 06 Result Schema

## 1. 目的

解析エンジンおよびAPIが返す結果JSONの構造を定義する。UI、CSV出力、回帰テストはこの結果形式に依存する。

## 2. 基本方針

- 結果JSON内に単位フィールドは追加しない。
- 単位は仕様書本文で固定定義する。
- solverはMVPで `scipy.sparse.linalg.spsolve` 固定だが、結果JSONには出力しない。
- 結果側のケース識別子は `resultCaseId` とする。
- MVPでは `resultCaseId` は既存の `loadCases[].id` と同じ値でよい。

## 3. 固定単位

| 種別 | 単位 |
|---|---|
| 並進変位 | m |
| 回転変位 | rad |
| 力 | kN |
| モーメント | kN*m |

## 4. トップレベル構造

必須トップレベル項目:

```json
{
  "projectId": "project-001",
  "schemaVersion": "1.0.0",
  "analysisSummary": {},
  "displacements": [],
  "reactions": [],
  "memberEndForces": [],
  "warnings": [],
  "errors": []
}
```

## 5. analysisSummary

```json
{
  "analysisType": "linear_static",
  "analysisVersion": "0.1.0",
  "status": "success",
  "startedAt": "2026-01-01T00:00:00Z",
  "finishedAt": "2026-01-01T00:00:01Z",
  "durationMs": 1000.0,
  "nodeCount": 2,
  "memberCount": 1,
  "loadCaseCount": 1,
  "totalDof": 12,
  "freeDof": 6,
  "constrainedDof": 6
}
```

- `analysisType`: MVPでは `linear_static`。
- `analysisVersion`: 解析エンジン仕様変更時の結果比較・回帰テストに利用する。
- `status`: `success`、`warning`、`failed` の3値のみ許可する。
- `startedAt`, `finishedAt`: ISO 8601文字列。
- `durationMs`: 解析処理時間。単位はms。

状態判定ルール:

- `errors.length > 0` の場合は `failed`。
- `errors.length === 0` かつ `warnings.length > 0` の場合は `warning`。
- `errors.length === 0` かつ `warnings.length === 0` の場合は `success`。

## 6. displacements

```json
{
  "resultCaseId": "LC1",
  "nodeId": "N2",
  "ux": 0.0,
  "uy": -0.001,
  "uz": 0.0,
  "rx": 0.0,
  "ry": 0.0,
  "rz": -0.0001
}
```

- `resultCaseId`: 結果ケースID。MVPでは `loadCases[].id` と同じ値。
- `nodeId`: 節点ID。
- `ux`, `uy`, `uz`: 並進変位。単位はm。
- `rx`, `ry`, `rz`: 回転変位。単位はrad。
- 全節点、全結果ケースについて出力する。

## 7. reactions

```json
{
  "resultCaseId": "LC1",
  "nodeId": "N1",
  "fx": 0.0,
  "fy": 10.0,
  "fz": 0.0,
  "mx": 0.0,
  "my": 0.0,
  "mz": 20.0,
  "constrainedDofs": ["ux", "uy", "uz", "rx", "ry", "rz"]
}
```

- `resultCaseId`: 結果ケースID。MVPでは `loadCases[].id` と同じ値。
- `nodeId`: 支点節点ID。
- `fx`, `fy`, `fz`: 反力。単位はkN。
- `mx`, `my`, `mz`: 反モーメント。単位はkN*m。
- `constrainedDofs`: 拘束されている自由度名。
- 支点定義がある節点ごとに出力する。

## 8. memberEndForces

```json
{
  "resultCaseId": "LC1",
  "memberId": "M1",
  "coordinateSystem": "local",
  "i": {
    "fx": 0.0,
    "fy": 10.0,
    "fz": 0.0,
    "mx": 0.0,
    "my": 0.0,
    "mz": 20.0
  },
  "j": {
    "fx": 0.0,
    "fy": -10.0,
    "fz": 0.0,
    "mx": 0.0,
    "my": 0.0,
    "mz": 0.0
  }
}
```

- `resultCaseId`: 結果ケースID。MVPでは `loadCases[].id` と同じ値。
- `memberId`: 部材ID。
- `coordinateSystem`: MVPでは `local` 固定。
- `i`: I端の部材端力。
- `j`: J端の部材端力。
- `fx`, `fy`, `fz`: 局所座標系の力。単位はkN。
- `mx`, `my`, `mz`: 局所座標系のモーメント。単位はkN*m。
- 符号規約は解析エンジン仕様とテストに従う。

## 9. warnings

```json
{
  "code": "DISCONNECTED_NODE",
  "severity": "warning",
  "message": "Node N9 is not connected to any member.",
  "path": "/nodes/8",
  "entityType": "node",
  "entityId": "N9"
}
```

- `severity`: MVPでは `warning` 固定。将来 `info` 等に拡張可能。
- 警告は解析成功を妨げないが、`analysisSummary.status` を `warning` にする。

## 10. errors

```json
{
  "code": "MODEL_UNSTABLE",
  "message": "The model has insufficient support constraints.",
  "path": "/supports",
  "entityType": "support",
  "entityId": null
}
```

- エラーが1件以上ある場合、`analysisSummary.status` は必ず `failed`。
- エラー結果を成功結果として扱ってはならない。

## 11. エラー処理

- APIはエラー時も可能な限り同じ結果構造を返す。
- 数値に `NaN`、`Infinity`、文字列数値を入れてはならない。
- 後処理中に欠損した値が発生した場合は `POSTPROCESS_ERROR` とする。
- 解析失敗時は、変位、反力、部材端力を成功データとして返してはならない。

## 12. テスト観点

- 成功結果がJSON Schemaに適合する。
- `status` が `errors` と `warnings` の件数から一意に決まる。
- 失敗結果が `errors` を含み、結果配列を空にできる。
- 変位、反力、部材端力の全成分が数値である。
- CSV出力へ変換できる。
- UIが `resultCaseId`、`nodeId`、`memberId` でフィルタできる。

## 13. 完了条件

- API、UI、Report担当がこの文書だけで結果データを扱える。
- 必須項目 `analysisSummary`、`displacements`、`reactions`、`memberEndForces`、`warnings`、`errors` が定義済み。
- 結果配列のケース識別子が `resultCaseId` に統一されている。
- `docs/05_analysis_engine_spec.md` と `docs/07_api_spec.md` と矛盾しない。
