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
- CSV出力専用API。
- DXF出力API。
- 外部解析ソフト連携API。

## 4. 共通仕様

- Request/ResponseはJSON。
- 文字コードはUTF-8。
- エラーは `code` と `message` を含む構造化形式。
- APIは送信された `project` を暗黙に変更しない。
- project検証エラーはUIの通常フローとして扱うため、HTTP 200で構造化エラーを返す。

### HTTPステータス方針

| ケース | HTTP | レスポンス方針 |
|---|---:|---|
| JSON parse失敗 | 400 | 構造化エラー |
| APIリクエスト形式不正 | 422 | FastAPI標準または構造化エラー |
| `project.json` のスキーマ不正・参照不正 | 200 | `valid: false` |
| 解析入力不正 | 200 | `analysisSummary.status: "failed"` |
| 予期しないサーバー例外 | 500 | 内部詳細を伏せた構造化エラー |

## 5. GET /health

レスポンス:

```json
{
  "status": "ok",
  "version": "0.1.0"
}
```

## 6. POST /api/projects/validate

リクエスト:

```json
{
  "project": {}
}
```

正常レスポンス:

```json
{
  "valid": true,
  "warnings": [],
  "errors": []
}
```

project不正時もHTTP 200で返す。

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

## 7. POST /api/analysis/run

解析APIは結果JSONのみ返す。CSV出力はReport/Export層の責務とし、MVPではUIが結果JSONからCSVを生成してよい。将来は別Report APIで扱ってよいが、この仕様では新APIを定義しない。

リクエスト:

```json
{
  "project": {}
}
```

成功レスポンス:

```json
{
  "projectId": "project-001",
  "schemaVersion": "1.0.0",
  "analysisSummary": {
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
  },
  "displacements": [
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
  ],
  "reactions": [],
  "memberEndForces": [],
  "warnings": [],
  "errors": []
}
```

解析失敗時もHTTP 200で結果JSONを返す。

```json
{
  "projectId": "project-001",
  "schemaVersion": "1.0.0",
  "analysisSummary": {
    "analysisType": "linear_static",
    "analysisVersion": "0.1.0",
    "status": "failed",
    "startedAt": "2026-01-01T00:00:00Z",
    "finishedAt": "2026-01-01T00:00:00Z",
    "durationMs": 0.0,
    "nodeCount": 2,
    "memberCount": 1,
    "loadCaseCount": 1,
    "totalDof": 12,
    "freeDof": 12,
    "constrainedDof": 0
  },
  "displacements": [],
  "reactions": [],
  "memberEndForces": [],
  "warnings": [],
  "errors": [
    {
      "code": "MODEL_UNSTABLE",
      "message": "The model has insufficient support constraints.",
      "path": "/supports",
      "entityType": "support",
      "entityId": null
    }
  ]
}
```

結果配列のケース識別子は `loadCaseId` ではなく `resultCaseId` を使う。MVPでは `resultCaseId = loadCaseId` とする。

## 8. POST /api/projects/save

MVPではクラウド保存ではなく、ローカルWebアプリ向けのアプリ管理下保存を想定する。保存対象は `project.json` である。

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

保存ルール:

- 保存可能なディレクトリはアプリ管理下のみ。
- `../` を含むパスは禁止。
- 絶対パスは禁止。
- ファイル名は英数字、ハイフン、アンダースコア、ドットなどの安全な文字のみ許可する。
- 拡張子は `.json` または `.project.json` を推奨する。

## 9. POST /api/projects/load

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

読込ルールは保存ルールと同じとする。アプリ管理下以外のファイル、`../` を含むパス、絶対パスは禁止する。

## 10. GET /api/examples

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

## 11. エラー処理

- JSON parse失敗はHTTP 400。
- APIリクエスト形式不正はHTTP 422。
- `project.json` のスキーマ不正・参照不正はHTTP 200 + `valid: false`。
- 解析入力不正はHTTP 200 + `analysisSummary.status: "failed"`。
- save/loadのパストラバーサル、絶対パス、不正ファイル名はHTTP 400。
- 予期しないサーバー例外はHTTP 500。
- HTTP 500でも内部スタックトレースをレスポンスに出してはならない。

## 12. テスト観点

- `GET /health` が成功する。
- validな `project.json` が検証成功する。
- 不正参照がHTTP 200 + `valid: false` で返る。
- 片持梁サンプルを解析できる。
- 支点不足モデルがHTTP 200 + `status: "failed"` を返す。
- 解析結果が `docs/06_result_schema.md` と一致する。
- save/loadで `../` と絶対パスを拒否する。
- `GET /api/examples` が必須例を返す。

## 13. 完了条件

- すべてのMVP APIがOpenAPIに表示される。
- APIテストが `docs/12_quality_gate.md` を満たす。
- APIが解析ロジックを直接持たず、Engineを呼び出す。
- UI担当がこの文書だけでAPI接続できる。
- `docs/06_result_schema.md` と矛盾しない。
