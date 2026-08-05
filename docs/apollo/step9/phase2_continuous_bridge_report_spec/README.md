# Phase 2 — 連続橋設計計算書の仕様凍結

> **Authority:** STEP 9 — Phase 2 (specification freeze, documentation-only)
> **Phase 1 正本入力:** `docs/apollo/step9/phase1_continuous_bridge_report_inventory/`

## Phase 2 の目的

STEP 9 / Phase 1 の現状調査成果を正本入力として、**連続橋（continuous girder）の設計計算書**について、現時点で出力してよい情報、出力してはいけない情報、帳票種別（サマリー版／詳細版）、警告文、データ出典、証跡・追跡性、そして将来の **Report Model** 実装への境界を**仕様として凍結**する。

- ** production code、解析 code、UI、PDF/HTML 生成、Report Model 実装は行わない。**
- あらゆる値の**生データと表示用文字列を区別し**、数値未承認状態を**絶対的に維持**する。
- 将来 Phase 3（Report Model 実装）が、ここで凍結した契約・境界・受入条件をそのまま下に実装できること。

## 適用範囲

- 対象ブリッジ System: `BridgeSystem.CONTINUOUS`（2–5 spans）。
- 帳票種別: **非数値帳票**（入力条件確認／構造モデル確認）を中心とし、**将来の数値設計計算書**の枠組みを定義する。
- データソース: `frontend/src/apollo/` (`apolloBridgeStructureInput`, `apolloBsdd`, `apolloPhase1Unit2`, visualization/STL) および `backend/` (linear IF3 result export) の**現行実装**を正本とする。

## 非対象

- 曲線橋・ skew / curve（STEP 9 Phase 6 以降）。
- production code, 解析 code, UI, PDF/HTML 実装。
- 数値結果の新規生成、解析ロジックの変更。
- 既存テストの期待値変更、依存関係追加/更新、lockfile 変更。
- Phase 1 成果物の根拠なき上書き（Phase 1 誤記は Phase 2 側に確認事項として記録）。
- `BridgeSystem.SIMPLE_SINGLE` / `SIMPLE_MULTIPLE` の帳票仕様（別ケース）。

## 成果物一覧

| No. | ファイル | フェーズ |
|-----|----------|----------|
| 00 | `README.md` | A |
| 01 | `01_phase1_input_review.md` | A |
| 02 | `02_report_purpose_and_classification.md` | B |
| 03 | `03_report_chapter_structure.md` | C |
| 04 | `chapter_matrix.csv` | C |
| 05 | `04_summary_report_spec.md` | D |
| 06 | `05_detailed_report_spec.md` | E |
| 07 | `06_output_permission_matrix.md` | F |
| 08 | `output_permission_matrix.csv` | F |
| 09 | `07_warning_and_status_message_spec.md` | G |
| 10 | `08_report_data_contract_boundary.md` | H |
| 11 | `09_traceability_and_evidence_spec.md` | I |
| 12 | `10_acceptance_criteria.md` | J |
| 13 | `11_phase3_handoff.md` | K |
| 14 | `completion_report.md` | L |

## 読み順

00 → 01 → 02 → 03(+04 csv) → 05 → 06 → 07(+08 csv) → 09 → 10 → 11 → 12 → completion_report

## 仕様凍結の意味

- **freeze** = 仕様として記述・相互整合を取り、今後 **変更はドキュメントレビューでのみ** 行う（コード実装による裏からけはない）。
- 章構成・出力可否・警告文・データ境界・証跡要件は **Phase 2 で決定した値を Phase 3 実装の正本**とする。
- 数値未承認状態 (`NOT_AUTHORIZED`, `NOT_GRANTED`, `PROHIBITED`, `NOT_IMPLEMENTED`) は**凍結対象に含まれない**。常に未承認のまま維持する。

## 変更管理方針

- すべて `main` ブランチ直push。`git add` は対象ファイルのみ明示。
- 1 機能/1 章 ごとに **1 commit / 1 push**（複数サブステップの複合コミットは禁止）。
- `git diff --check` を各コミット前に実施。local main と origin/main の一致を各コミット後に確認。
- Phase 1 成果物は原則変更しない。Phase 1 誤記は `01_phase1_input_review.md` の「Phase 1 誤記（そのまま記録）」欄に転記する。

## 数値設計未承認状態の維持

- 帳票に掲載するすべての数値は `NOT_AUTHORIZED` / `NOT_GRANTED` / `UNVERIFIED` / `NOT_AVAILABLE` / `NOT_IMPLEMENTED` のいずれかとする。
- `ADOPTED` または `AUTHORIZED` といった承認済み数値を**新規作成・入力・表示しない**。
- `07_warning_and_status_message_spec.md` で凍結する警告文により、帳票利用者が「非数値確認帳票」であることを**見間違えない**ようにする。
