# Design Documents README

## 1. 目的

JIP-SPACERを参考にした独自3次元骨組解析システムの設計書一覧と読む順序をまとめる。後続のCodex実装エージェントは、このREADMEを入口として設計書を確認する。

## 2. 対象範囲

- MVP設計書の読む順序。
- 各文書の役割。
- MVP判断時の優先順位。
- 実装前に確認すべき品質基準。

## 3. 非対象範囲

- 実装コード。
- 詳細な数式導出。
- JIP-SPACER完全互換仕様。
- MVP外機能の実装計画詳細。

## 4. 設計書一覧と読む順序

1. `docs/requirements_extraction.md`
   - SPACER操作マニュアルから抽出した広範な要求。
   - MVP外機能も含む参考資料。
   - この文書は実装指示書ではない。
   - この文書の記載だけを根拠にMVP外機能を実装してはならない。
2. `docs/02_mvp_scope.md`
   - MVP範囲の最上位判断基準。
   - 実装前に必ず読む。
3. `docs/12_quality_gate.md`
   - PR受入基準。
   - テスト、Ruff、型ヒント、JSON Schema、数値誤差、API、UIビルド基準を定義する。
4. `docs/03_architecture.md`
   - システム全体構成、責務境界、データフロー。
5. `docs/04_input_schema.md`
   - `project.json` の入力構造。
6. `docs/05_analysis_engine_spec.md`
   - Python解析エンジンの処理仕様。
7. `docs/06_result_schema.md`
   - 解析結果JSONの構造。
8. `docs/07_api_spec.md`
   - FastAPIエンドポイント仕様。
9. `docs/08_ui_spec.md`
   - React UI画面構成。
10. `docs/09_3d_view_spec.md`
    - Three.js表示仕様。
11. `docs/10_report_spec.md`
    - JSON/CSV出力仕様。
12. `docs/11_test_spec.md`
    - 必須検証ケースとテスト観点。
13. `docs/20_agent_instructions.md`
    - Codex担当別の実装指示テンプレート。

### 優先順位

文書間で迷った場合は以下を優先する。

1. `docs/02_mvp_scope.md`
2. `docs/12_quality_gate.md`
3. `docs/04_input_schema.md`
4. `docs/05_analysis_engine_spec.md`
5. `docs/06_result_schema.md`
6. `docs/07_api_spec.md`
7. 個別UI/3D/帳票/テスト仕様
8. `docs/requirements_extraction.md`

`docs/requirements_extraction.md` は参考資料であり、MVP範囲を拡張する根拠にはしない。

`docs/requirements_extraction.md` に機能が記載されていても、MVP判断では `docs/02_mvp_scope.md` を優先する。`docs/02_mvp_scope.md` でMVP外とされた機能は実装しない。

## 5. エラー処理

設計書間に矛盾がある場合:

- 実装を進める前に該当設計書を更新する。
- MVP外機能が混入しそうな場合は `docs/02_mvp_scope.md` を優先する。
- 品質基準に関わる判断は `docs/12_quality_gate.md` を優先する。
- 影響線解析、移動荷重、固有値解析、応答スペクトル解析、温度荷重、プレストレス、DXF、ライセンス管理がMVPに混入しそうな場合は、実装せず設計を確認する。

## 6. テスト観点

実装PRでは以下を確認する。

- `docs/11_test_spec.md` の必須検証ケースに対応している。
- `docs/12_quality_gate.md` のPR受入基準を満たしている。
- 入力・結果・API・UIが各設計書と整合している。
- MVP外機能を実装していない。

## 7. 完了条件

- すべての設計書の役割が明確である。
- 読む順序が明確である。
- 後続Codex実装エージェントが、担当別に参照すべき文書へ到達できる。
