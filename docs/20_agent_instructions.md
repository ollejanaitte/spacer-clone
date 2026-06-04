# 20 Agent Instructions

## 1. 目的

後続のCodex実装エージェントが、担当別に読むべき設計書、変更可能範囲、禁止事項、完了条件を迷わず判断できるようにする。

## 2. 対象範囲

対象担当:

- Engine担当。
- Test担当。
- API担当。
- UI担当。
- 3D担当。
- Report担当。
- Review担当。

## 3. 非対象範囲

- MVP外機能の実装指示。
- 影響線解析、移動荷重、固有値解析、応答スペクトル解析、温度荷重、プレストレス、DXF、ライセンス管理の実装。
- JIP-SPACER完全互換対応。
- 実装コードそのもの。

## 4. 担当別処理仕様

### 共通ルール

- 最初に `docs/README.md` と `docs/02_mvp_scope.md` を読む。
- 品質基準は `docs/12_quality_gate.md` に従う。
- MVP外機能を追加しない。
- 実装が設計と異なる場合は、同じPRで設計書を更新する。
- `SPACER操作マニュアル.pdf` は参考資料であり、MVP外機能を追加する根拠にしない。

### Engine担当

目的:

- Python解析エンジンを実装する。

読むべき設計書:

- `docs/02_mvp_scope.md`
- `docs/04_input_schema.md`
- `docs/05_analysis_engine_spec.md`
- `docs/06_result_schema.md`
- `docs/11_test_spec.md`
- `docs/12_quality_gate.md`

変更してよいファイル:

- `backend/engine/**`
- `backend/tests/**`
- `schemas/**`
- `examples/**`

変更してはいけないファイル:

- `frontend/**`
- APIルート。ただし明示指示がある場合を除く。
- `docs/requirements_extraction.md`

成果物:

- 自由度番号付け。
- 局所座標系。
- 12x12梁要素剛性。
- 全体剛性組立。
- 境界条件処理。
- 荷重ベクトル作成。
- SciPy sparse solve。
- 変位、反力、部材端力。

禁止事項:

- 非線形解析、固有値解析、応答スペクトル解析を実装しない。
- 影響線解析、移動荷重を実装しない。
- `NaN`、`Infinity` を結果へ出さない。

完了条件:

- 必須解析検証ケースが通る。
- 結果JSONへ変換可能。
- 構造化エラーを返せる。

PR作成時のチェックリスト:

- `pytest` 通過。
- Ruff通過。
- 型ヒントあり。
- 理論値誤差が許容内。

### Test担当

目的:

- MVP品質を保証する自動テストを作成する。

読むべき設計書:

- `docs/04_input_schema.md`
- `docs/05_analysis_engine_spec.md`
- `docs/06_result_schema.md`
- `docs/07_api_spec.md`
- `docs/11_test_spec.md`
- `docs/12_quality_gate.md`

変更してよいファイル:

- `backend/tests/**`
- `frontend/**/__tests__/**`
- `examples/**`
- `schemas/**`

変更してはいけないファイル:

- 本番コード。ただし明示指示がある場合を除く。
- `docs/requirements_extraction.md`

成果物:

- 7つの必須解析検証ケース。
- APIテスト。
- JSON Schemaテスト。
- UIビルドテスト。

禁止事項:

- 理由なく許容誤差を緩めない。
- バグを期待値として固定しない。
- エラー文言だけに依存しない。

完了条件:

- 正常系と異常系が両方検証されている。
- すべての必須ケースがCIで実行可能。

PR作成時のチェックリスト:

- テストが決定的。
- 単位がSI。
- 符号規約コメントあり。

### API担当

目的:

- FastAPIのMVP APIを実装する。

読むべき設計書:

- `docs/03_architecture.md`
- `docs/04_input_schema.md`
- `docs/06_result_schema.md`
- `docs/07_api_spec.md`
- `docs/12_quality_gate.md`

変更してよいファイル:

- `backend/app/**`
- `backend/tests/**`
- `schemas/**`
- `examples/**`

変更してはいけないファイル:

- `backend/engine/**`。ただしEngine連携修正を明示された場合を除く。
- `frontend/**`
- `docs/requirements_extraction.md`

成果物:

- `GET /health`
- `POST /api/projects/validate`
- `POST /api/analysis/run`
- `POST /api/projects/save`
- `POST /api/projects/load`
- `GET /api/examples`

禁止事項:

- APIルート内に数値解析を実装しない。
- パストラバーサルを許可しない。
- 受信projectを暗黙に変更しない。

完了条件:

- APIテストが通る。
- OpenAPIに全エンドポイントが表示される。
- エラー形式が安定している。

PR作成時のチェックリスト:

- 成功・失敗テストあり。
- 500で内部詳細を漏らさない。
- Engine呼び出し境界が明確。

### UI担当

目的:

- React MVP UIを実装する。

読むべき設計書:

- `docs/02_mvp_scope.md`
- `docs/04_input_schema.md`
- `docs/06_result_schema.md`
- `docs/07_api_spec.md`
- `docs/08_ui_spec.md`
- `docs/12_quality_gate.md`

変更してよいファイル:

- `frontend/src/**`
- `frontend/tests/**`
- frontend設定ファイル。

変更してはいけないファイル:

- `backend/engine/**`
- `backend/app/**`
- `docs/requirements_extraction.md`

成果物:

- 上部ツールバー。
- 左側モデルツリー。
- 中央3Dビュー領域。
- 右側プロパティパネル。
- 下部結果・エラー・ログパネル。
- MVP入力表。
- 解析実行画面。
- 結果表示画面。

禁止事項:

- UI内に解析ロジックを実装しない。
- MVP外機能の有効な操作を作らない。
- エラーをconsoleのみに出さない。

完了条件:

- UIビルド成功。
- 入力、検証、解析実行、結果表示がAPIと接続されている。

PR作成時のチェックリスト:

- UIビルド通過。
- API契約と一致。
- エラー表示あり。

### 3D担当

目的:

- Three.jsのMVP表示を実装する。

読むべき設計書:

- `docs/04_input_schema.md`
- `docs/06_result_schema.md`
- `docs/08_ui_spec.md`
- `docs/09_3d_view_spec.md`

変更してよいファイル:

- `frontend/src/viewer/**`
- viewer関連テスト。

変更してはいけないファイル:

- `backend/**`
- `docs/requirements_extraction.md`

成果物:

- 節点表示。
- 部材線表示。
- 支点記号。
- 荷重矢印。
- ラベル。
- 変形図。
- カメラ操作。
- 選択ハイライト。

禁止事項:

- CAD編集を実装しない。
- viewer内でprojectを変更しない。
- DXF対応を実装しない。

完了条件:

- サンプルモデルを表示できる。
- 選択がUI状態と同期する。
- 結果JSONから変形図を表示できる。

PR作成時のチェックリスト:

- 空モデルでクラッシュしない。
- 結果なしでも表示可能。
- 表示倍率が機能する。

### Report担当

目的:

- JSON/CSV/HTML帳票出力を実装する。

読むべき設計書:

- `docs/06_result_schema.md`
- `docs/10_report_spec.md`
- `docs/12_quality_gate.md`

変更してよいファイル:

- report/export関連モジュール。
- report関連テスト。

変更してはいけないファイル:

- 解析アルゴリズム。
- 3D viewer。
- `docs/requirements_extraction.md`

成果物:

- 結果JSON出力。
- 変位CSV。
- 反力CSV。
- 部材端力CSV。
- 最小HTML帳票。

禁止事項:

- JSON数値を文字列化しない。
- 帳票テンプレート編集を実装しない。
- DXF出力を実装しない。

完了条件:

- CSVヘッダーが仕様通り。
- エラー結果でも帳票出力可能。

PR作成時のチェックリスト:

- CSVテスト通過。
- 単位表示あり。
- 空結果を扱える。

### Review担当

目的:

- PRがMVP範囲、品質基準、設計書と整合しているか確認する。

読むべき設計書:

- `docs/README.md` の読む順序に従い全設計書を確認する。

変更してよいファイル:

- 原則なし。レビューコメントを成果物とする。

変更してはいけないファイル:

- 実装ファイル。修正依頼がある場合を除く。

成果物:

- 重要度順の指摘。
- ファイル・行番号。
- 影響説明。
- 指摘なしの場合は残リスク。

禁止事項:

- MVP外機能の混入を見逃さない。
- 数値誤差や符号規約変更を軽視しない。
- テスト不足を承認しない。

完了条件:

- スキーマ、エンジン、API、UI、3D、帳票、テスト、品質ゲートを確認済み。

PR作成時のチェックリスト:

- MVP範囲内。
- 品質ゲート通過。
- 設計書と実装が一致。
- 結果が `project.json` から再現可能。

## 5. エラー処理

担当者は、実装中に設計の不足や矛盾を見つけた場合、推測で実装せず以下のいずれかを行う。

- 設計書を同じPRで更新する。
- ブロッカーとして質問する。
- MVP外として実装しない判断を明記する。

## 6. テスト観点

- 担当範囲の成果物が `docs/12_quality_gate.md` を満たす。
- MVP外機能を誤って有効化していない。
- 変更可能ファイル以外を変更していない。
- エラーが構造化されている。

## 7. 完了条件

- 各担当がこの文書だけで作業範囲を判断できる。
- 禁止事項とPRチェックリストが明確である。
- `docs/02_mvp_scope.md` のMVP範囲と矛盾しない。
