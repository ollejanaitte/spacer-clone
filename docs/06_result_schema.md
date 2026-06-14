# 06 Result Schema

## 1. 目的

解析エンジンおよびAPIが返す結果JSONの構造を定義する。UI、帳票、CSV出力、回帰テストはこの結果形式に依存する。

## 2. 対象範囲

- 線形静的解析の概要。
- 節点変位。
- 支点反力。
- 部材端力。
- 警告。
- エラー。

## 3. 非対象範囲

- 影響線結果。
- 移動荷重結果。
- 温度荷重、プレストレス、初期張力由来の専用結果。
- DXF、図面ファイル、帳票テンプレート。

固有値・応答スペクトル結果は Phase E 拡張として第 8 節、`schemas/result.schema.json`、[eigen-analysis.md](design/eigen-analysis.md)、[response-spectrum-analysis.md](design/response-spectrum-analysis.md) を参照する。本書第 4 節は線形静的 MVP 基準を示す。

## 4. データ構造

### トップレベル

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

### analysisSummary

```json
{
  "analysisType": "linear_static",
  "status": "success",
  "startedAt": "2026-01-01T00:00:00Z",
  "finishedAt": "2026-01-01T00:00:01Z",
  "durationMs": 1000.0,
  "nodeCount": 2,
  "memberCount": 1,
  "loadCaseCount": 1,
  "totalDof": 12,
  "freeDof": 6,
  "constrainedDof": 6,
  "solver": "scipy_sparse"
}
```

`status` は `success`、`warning`、`failed` のいずれか。

### displacements

```json
{
  "loadCaseId": "LC1",
  "nodeId": "N2",
  "ux": 0.0,
  "uy": -0.001,
  "uz": 0.0,
  "rx": 0.0,
  "ry": 0.0,
  "rz": -0.0001
}
```

- 並進変位はm。
- 回転変位はrad。
- 全節点、全荷重ケースについて出力する。

### reactions

```json
{
  "loadCaseId": "LC1",
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

- 力はkN。
- モーメントはkN_m。
- 支点定義がある節点ごとに出力する。

### memberEndForces

```json
{
  "loadCaseId": "LC1",
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

- 部材端力は局所座標系。
- I端、J端を分けて保持する。
- 符号規約は解析エンジン仕様とテストに従う。

### warnings

```json
{
  "code": "DISCONNECTED_NODE",
  "message": "Node N9 is not connected to any member.",
  "path": "/nodes/8",
  "entityType": "node",
  "entityId": "N9"
}
```

警告は解析成功を妨げない。

### errors

```json
{
  "code": "MODEL_UNSTABLE",
  "message": "The model has insufficient support constraints.",
  "path": "/supports",
  "entityType": "support",
  "entityId": null
}
```

エラーがある場合、`analysisSummary.status` は `failed`。

## 5. エラー処理

- `errors` が空でない結果を成功として扱ってはならない。
- APIはエラー時も可能な限り同じ結果構造を返す。
- 数値に `NaN`、`Infinity`、文字列数値を入れてはならない。
- 後処理中に欠損した値が発生した場合は `POSTPROCESS_ERROR` とする。

## 6. テスト観点

- 成功結果がJSON Schemaに適合する。
- 失敗結果が `errors` を含み、結果配列を空にできる。
- 変位、反力、部材端力の全成分が数値である。
- CSV出力へ変換できる。
- UIがloadCaseId、nodeId、memberIdでフィルタできる。

## 7. 完了条件

- API、UI、Report担当がこの文書だけで結果データを扱える。
- 必須項目 `displacements`、`reactions`、`memberEndForces`、`analysisSummary`、`warnings`、`errors` が定義済み。
- `docs/10_report_spec.md` のCSV仕様と矛盾しない。

## 8. Phase E 拡張（固有値・応答スペクトル）

正本は `schemas/result.schema.json` である。固有値結果の意味付けは [eigen-analysis.md](design/eigen-analysis.md)、応答スペクトル結果は [response-spectrum-analysis.md](design/response-spectrum-analysis.md) を参照する。

### 共通

- トップレベルの `displacements`、`reactions`、`memberEndForces` は空配列とする。
- `analysisSummary.analysisType` は `"eigen"` または `"response_spectrum"` とする。

### eigenResult

固有値解析成功時に付与する。

```json
{
  "massCaseId": "mass-1",
  "normalization": "mass",
  "totalMassByDirection": [
    { "direction": "X", "value": 0.0 }
  ],
  "modes": [
    {
      "modeNo": 1,
      "eigenvalue": 0.0,
      "circularFrequency": 0.0,
      "frequency": 0.0,
      "period": 0.0,
      "modalMass": 0.0,
      "participationFactors": [],
      "effectiveMassRatios": [],
      "effectiveMasses": [],
      "cumulativeEffectiveMassRatios": [],
      "shape": []
    }
  ]
}
```

`totalMassByDirection`、`effectiveMasses`、`cumulativeEffectiveMassRatios` は Phase E-1b 以降の optional 拡張である。

### responseSpectrumResult

応答スペクトル解析成功時に付与する。同一 result に `eigenResult` も含める。

```json
{
  "spectrumCaseId": "spec-1",
  "direction": "X",
  "dampingRatio": 0.05,
  "combinationMethod": "SRSS",
  "interpolationMethod": "linear",
  "targetCumulativeMassRatio": 0.9,
  "usedModes": [1],
  "modalResults": [],
  "combinedResult": {
    "method": "SRSS",
    "displacements": [],
    "reactions": [],
    "memberSectionForces": []
  },
  "directionResults": []
}
```

各フィールドの意味:

- `combinationMethod`: `SRSS` または `CQC`。MVP の既定は `SRSS`。
- `interpolationMethod`: `linear` または `logLog`。既定は `linear`。
- `usedModes`: 解析に使用されたモード番号の配列。
- `combinedResult.reactions` / `combinedResult.memberSectionForces`: 合成された動的反力 / 動的部材力。
- `directionResults`: 方向別の解析結果。単一方向実行でも 1 要素を返す。
