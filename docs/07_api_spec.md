# 07 API Specification

## 1. 目的

FastAPIバックエンドのMVP API契約を定義する。UI担当、API担当、Engine担当が同じ入出力仕様で実装できることを目的とする。

## 2. 対象範囲

MVP APIは以下に限定する。

- ヘルスチェック。
- `project.json` 検証。
- 線形静的解析実行。
- プロジェクト保存。
- プロジェクト読込。
- サンプルプロジェクト一覧取得。

## 3. 非対象範囲

- ユーザー認証、権限管理、ライセンス管理。
- クラウド永続化、共同編集。
- 影響線解析、移動荷重、固有値解析、応答スペクトル解析のAPI。
- DXF出力API。
- 外部解析ソフト連携API。

## 4. API仕様

### 共通

- Request/ResponseはJSON。
- 文字コードはUTF-8。
- エラーは `code` と `message` を含む構造化形式。
- APIは送信された `project` を暗黙に変更しない。

### GET /health

レスポンス:

```json
{
  "status": "ok",
  "version": "0.1.0"
}
```

### POST /api/projects/validate

リクエスト:

```json
{
  "project": {}
}
```

レスポンス:

```json
{
  "valid": true,
  "warnings": [],
  "errors": []
}
```

不正時:

```json
{
  "valid": false,
  "warnings": [],
  "errors": [
    {
      "code": "INVALID_REFERENCE",
      "message": "Member M1 references missing node N9.",
      "path": "/members/0/nodeJ",
      "entityType": "member",
      "entityId": "M1"
    }
  ]
}
```

### POST /api/analysis/run

リクエスト:

```json
{
  "project": {},
  "options": {
    "returnCsv": false
  }
}
```

成功レスポンス:

```json
{
  "result": {
    "analysisSummary": {
      "status": "success"
    },
    "displacements": [],
    "reactions": [],
    "memberEndForces": [],
    "warnings": [],
    "errors": []
  },
  "csv": null
}
```

解析失敗時:

```json
{
  "result": {
    "analysisSummary": {
      "status": "failed"
    },
    "displacements": [],
    "reactions": [],
    "memberEndForces": [],
    "warnings": [],
    "errors": [
      {
        "code": "MODEL_UNSTABLE",
        "message": "The model has insufficient support constraints."
      }
    ]
  },
  "csv": null
}
```

### POST /api/projects/save

リクエスト:

```json
{
  "fileName": "sample.project.json",
  "project": {}
}
```

レスポンス:

```json
{
  "saved": true,
  "fileName": "sample.project.json"
}
```

### POST /api/projects/load

リクエスト:

```json
{
  "fileName": "sample.project.json"
}
```

レスポンス:

```json
{
  "project": {}
}
```

### GET /api/examples

レスポンス:

```json
{
  "examples": [
    {
      "id": "cantilever_tip_load",
      "name": "Cantilever Tip Load",
      "description": "Fixed-free beam verification model.",
      "project": {}
    }
  ]
}
```

最低限含める例:

- 片持梁の先端集中荷重。
- 単純梁の中央集中荷重。
- 単純梁の等分布荷重。
- 3D片持梁のねじり。

## 5. エラー処理

- JSON parse失敗はHTTP 400。
- スキーマ不正はHTTP 200で `valid: false`、またはHTTP 422。実装時に統一する。
- 解析入力不正は解析を実行せず、構造化エラーを返す。
- save/loadのパストラバーサルはHTTP 400。
- 予期しないサーバー例外はHTTP 500。
- HTTP 500でも内部スタックトレースをレスポンスに出してはならない。

## 6. テスト観点

- `GET /health` が成功する。
- validな `project.json` が検証成功する。
- 不正参照が検証失敗する。
- 片持梁サンプルを解析できる。
- 支点不足モデルが失敗レスポンスを返す。
- save/loadで `../` を拒否する。
- `GET /api/examples` が必須例を返す。

## 7. 完了条件

- すべてのMVP APIがOpenAPIに表示される。
- APIテストが `docs/12_quality_gate.md` を満たす。
- APIが解析ロジックを直接持たず、Engineを呼び出す。
- UI担当がこの文書だけでAPI接続できる。
