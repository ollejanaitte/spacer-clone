# 03 Architecture

## 1. 目的

JIP-SPACERの「入力、実行、結果表示、帳票、描画」を分ける考え方を参考にしつつ、MVPに限定した独自3次元骨組解析システムの構成を定義する。後続のCodex実装エージェントが、責務境界を誤らずに実装できることを目的とする。

## 2. 対象範囲

- 3次元骨組モデルの入力、検証、線形静的解析、結果表示、CSV/JSON出力。
- Python解析エンジン。
- FastAPIバックエンド。
- React入力UI。
- Three.js線モデル表示。
- `project.json` と解析結果JSONを中心にしたデータ連携。

## 3. 非対象範囲

MVPでは以下を実装しない。

- 影響線解析、移動荷重、活荷重自動載荷。
- 固有値解析、応答スペクトル解析。
- 温度荷重、プレストレス、初期張力。
- 部材バネ、節点間バネ。
- 高度な荷重組合せ処理。
- DXF出力、外部解析ソフト連携。
- ライセンス管理。
- JIP-SPACER完全互換。

## 4. 処理仕様

### 全体レイヤ

- `frontend`: React UI。モデル入力、検証実行、解析実行、結果表示を担当する。
- `viewer`: Three.js表示。節点、部材、支点、荷重、変形図を表示する。
- `backend/app`: FastAPI。API契約、保存読込、解析エンジン呼び出しを担当する。
- `backend/engine`: Python解析エンジン。数値解析と結果算出のみを担当する。
- `schemas`: JSON Schema。`project.json` と結果JSONを検証する。
- `examples`: MVP検証用のサンプルモデル。
- `docs`: 設計書のみ。実装コードを置かない。

### データフロー

1. React UIで `project.json` 互換データを編集する。
2. UIが `POST /api/projects/validate` へ送信する。
3. FastAPIがJSON Schemaと参照整合性を検証する。
4. UIが `POST /api/analysis/run` へ送信する。
5. FastAPIがPython解析エンジンを呼び出す。
6. 解析エンジンが変位、反力、部材端力を計算する。
7. FastAPIが結果JSONを返す。
8. UIが結果表、Three.js変形図、CSV/JSON出力に利用する。

### 依存方向

- UIはAPI契約にのみ依存する。
- Three.js表示は `project.json` と結果JSONにのみ依存する。
- FastAPIは解析エンジンに依存する。
- 解析エンジンはFastAPI、React、Three.jsに依存しない。
- 解析エンジンはファイル保存やHTTPを知らない。

### 推奨ディレクトリ

```text
backend/
  app/
  engine/
  tests/
frontend/
  src/
    viewer/
schemas/
examples/
docs/
```

## 5. エラー処理

- UI入力エラーは、該当テーブル行・項目に紐付けて表示する。
- APIは構造化エラーを返す。
- 解析エンジンは例外を外へ漏らさず、エラーコード付きの失敗結果へ変換できるようにする。
- 主なエラーコードは以下とする。
  - `SCHEMA_ERROR`
  - `INVALID_REFERENCE`
  - `MODEL_UNSTABLE`
  - `SOLVER_ERROR`
  - `POSTPROCESS_ERROR`
  - `INTERNAL_ERROR`
- JSONに `NaN`、`Infinity` を出力してはならない。

## 6. テスト観点

- レイヤ間の責務が混ざっていないこと。
- UIが解析ロジックを持たないこと。
- APIが数値解析を直接実装しないこと。
- 解析エンジンがHTTPやUIに依存しないこと。
- `project.json` から結果JSONまで再現可能であること。
- `docs/12_quality_gate.md` の品質基準に反しないこと。

## 7. 完了条件

- 後続実装で必要な主要レイヤと責務境界が明確である。
- MVP外機能がアーキテクチャ上も実装対象外として明記されている。
- `docs/04_input_schema.md`、`docs/05_analysis_engine_spec.md`、`docs/06_result_schema.md`、`docs/07_api_spec.md` と矛盾しない。
