# 03 Architecture

## 1. 目的

JIP-SPACERを参考にした独自3次元立体骨組解析ソフトのMVPアーキテクチャを定義する。後続の実装担当が、責務境界を誤らずに作業できることを目的とする。

## 2. 設計原則

- SI単位固定。
- 単位変換機能なし。
- Solverは `scipy.sparse.linalg.spsolve` 固定。
- EngineはMaterialの `elasticModulus` と `poissonRatio` から `G = E / (2(1+ν))` を計算する。
- Engineは部材方向定義として `orientationVector` のみ対応する。
- UI、API、Engine、3D Viewer、Reportの責務を分離する。
- `project.json` と結果JSONを中心にデータを受け渡す。
- MVP外機能の入口を有効化しない。

## 3. 対象範囲

- 3次元骨組モデルの入力、検証、線形静的解析、結果表示。
- Python解析エンジン。
- FastAPIバックエンド。
- React UI。
- Three.js線モデル表示。
- JSON/CSV出力。

## 4. 非対象範囲

- 影響線解析、移動荷重、活荷重自動載荷。
- 固有値解析、応答スペクトル解析。
- 温度荷重、プレストレス、初期張力。
- 部材バネ、節点間バネ、面要素。
- DXF出力、外部解析ソフト連携。
- PDF帳票生成。
- ライセンス管理。
- JIP-SPACER完全互換。

## 5. レイヤ構成

- `frontend`: React UI。入力表、検証実行、解析実行、結果表、出力操作を担当する。
- `frontend/src/viewer`: Three.js表示。節点、部材、支点、荷重、変形図を描画する。
- `backend/app`: FastAPI。API契約、保存、読込、検証、解析エンジン呼び出しを担当する。
- `backend/engine`: Python解析エンジン。数値解析と結果計算のみを担当する。
- `schemas`: `project.json` と結果JSONのJSON Schemaを置く。
- `examples`: MVP検証用サンプルモデルを置く。
- `docs`: 設計書のみを置く。実装コードを置かない。

## 6. データフロー

1. React UIで `project.json` 互換データを編集する。
2. UIが `POST /api/projects/validate` へ送信する。
3. FastAPIがJSON Schemaと参照整合性を検証する。
4. UIが `POST /api/analysis/run` へ送信する。
5. FastAPIがPython解析エンジンを呼び出す。
6. 解析エンジンが変位、反力、部材端力を計算する。
7. FastAPIが結果JSONを返す。
8. UIが結果表、Three.js変形図、CSV/JSON出力に利用する。

## 7. 依存方向

- UIはAPI契約のみに依存する。
- Three.js表示は `project.json` と結果JSONにのみ依存する。
- FastAPIは解析エンジンに依存する。
- 解析エンジンはFastAPI、React、Three.jsに依存しない。
- 解析エンジンはファイル保存やHTTPを知らない。

## 8. エラー処理

- UI入力エラーは、該当テーブル行と項目に紐付けて表示する。
- APIは構造化エラーを返す。
- 解析エンジンは例外を外へ漏らさず、エラーコード付きの失敗結果へ変換できるようにする。
- 主なエラーコードは以下とする。
  - `SCHEMA_ERROR`
  - `DUPLICATE_ID`
  - `INVALID_REFERENCE`
  - `INVALID_VALUE`
  - `ZERO_LENGTH_MEMBER`
  - `INVALID_ORIENTATION`
  - `MODEL_UNSTABLE`
  - `SOLVER_ERROR`
  - `POSTPROCESS_ERROR`
  - `INTERNAL_ERROR`
- JSONに `NaN`、`Infinity` を出力してはならない。

## 9. テスト観点

- レイヤ間の責務が混ざっていないこと。
- UIが解析ロジックを持たないこと。
- APIが数値解析を直接実装しないこと。
- EngineがHTTPやUIに依存しないこと。
- `project.json` から結果JSONまで再現可能であること。
- `docs/12_quality_gate.md` の品質基準に反しないこと。

## 10. 完了条件

- 後続実装で必要な主要レイヤと責務境界が明確である。
- MVP外機能がアーキテクチャ上も実装対象外として明記されている。
- `docs/04_input_schema.md`、`docs/05_analysis_engine_spec.md`、`docs/06_result_schema.md`、`docs/07_api_spec.md` と矛盾しない。
