# Phase 1 — 連続橋設計計算書の現状調査

> **Authority:** PHASE 1 INVESTIGATION RECORD (documentation-only)

## Phase 1 の目的

STEP 9 Phase 1 は、連続橋（continuous girder）の設計計算書をこれから整備するための**現状調査**を行うフェーズである。

- 実装を変更しない
- 数値計算式を追加しない
- 解析機能を変更しない
- UIを変更しない
- PDF出力機能を実装しない

既存実装・既存テスト・既存設計資料・既存出力機能を調査し、証拠をもとに現状を整理する。

## 調査対象

- `docs/apollo/continuous_girder/` 以下の既存設計資料
- `docs/apollo/` 以下の連続橋・計算書・出力関連の他資料
- `frontend/src/` 以下の連続桁・出力・プレビュー関連実装
- `backend/` 以下の解析・結果・レポート関連実装
- `frontend/tests/` および `frontend/src/**/__tests__/` の連続桁関連テスト
- 既存の数値設計ゲート（NUMERIC_RELEASE 等）の現状

## 非対象

- 曲線橋（STEP 9 Phase 6 以降）
- 実装・UI変更・PDF出力機能の実装
- 数値解析の実行
- 既存テストの期待値変更
- 依存関係の追加・更新

## 成果物一覧

| No. | ファイル | フェーズ |
|-----|----------|----------|
| 01 | `01_repository_baseline.md` | B |
| 02 | `02_existing_documents_inventory.md` | C |
| 03 | `03_existing_implementation_inventory.md` | D |
| 04 | `04_existing_test_inventory.md` | E |
| 05 | `05_current_output_capability.md` | F |
| 06 | `06_report_data_source_map.md` | G |
| 07 | `07_numeric_authorization_boundary.md` | H |
| 08 | `08_gap_analysis.md` | I |
| 09 | `09_phase2_recommendation.md` | J |
| 10 | `evidence_matrix.csv` | G |
| 11 | `completion_report.md` | K |

## 読み順

01 → 02 → 03 → 04 → 05 → 06 → 07 → 08 → 09 → (06 の evidence_matrix.csv は 06 と関連) → completion_report

## 調査判定語

| 判定語 | 意味 |
|--------|------|
| CONFIRMED | コード・テスト・資料で確認済み |
| PARTIALLY_CONFIRMED | 一部確認されているが不完全 |
| NOT_FOUND | 資料・コード・テストで確認できず |
| NOT_IMPLEMENTED | 仕様は存在するが未実装 |
| NOT_APPLICABLE | 対象外 |
| CONFLICTING_EVIDENCE | 資料間に矛盾 |
| HUMAN_CONFIRMATION_REQUIRED | 人間の判断が必要 |
