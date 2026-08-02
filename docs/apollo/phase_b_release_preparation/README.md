# Apollo Phase A+ — Phase B 数値実装許可ゲート解除準備

**Authority:** CURRENT INTEGRATION AUTHORITY (Phase A+)
**Status:** COMPLETE (P0 〜 P6 を各Step毎に main へマージ済み)
**Start:** 2026-08-02
**Repository:** /home/masaharu/Projects/spacer-clone
**Model:** DeepSeek V4 Flash (SINGLE_MODEL_FULL_EXECUTION)
**Initial main SHA:** `8137c7a5f0c24c57dc9f0fb7ac5c90adea8ee3ea`（Phase A 最終 main）
**Final main SHA:** `a78e1641d5877d6372a1acc0b1f6ee0913e2652e`（P5 マージ後、P6 で更新予定）

## 目的

Phase A（設計基準・計算ロジック統合凍結）は PR #250〜#258 で main へマージ済み。本 Phase A+ では **Phase B の数値コードは実装せず**、以下を実施する。

- Phase A で残ったブロッカー（PA-OQ-001..010、GATE-NR-02/03 等）をレジスタ化し、可能なものを解除する
- 人間確認・独立検証が必要な項目を具体化する（確認票・取得計画・実行計画）
- 最初に数値実装を許可すべき**最小セルを 1 つ選定**する
- Phase B 開始可否を明記する（証拠不足なら正常に `NO_GO_PENDING_HUMAN_EVIDENCE`）

## 正本方針

Phase A+ は Phase A の成果物（`docs/apollo/phase_a_integrated_freeze/`）と既存 DS-00..DS-09 ガバナンスを**上書きせず**、参照整合を保持する。状態変更には新しい decision ID と証拠を付ける。

- 数値・式・係数・許容値の採択状態は DS-00 `adoption_status_model.md` と同一語彙を使用する
- 画像スキャン PDF・ライセンス資料・第三者独立計算など、モデル単体で確認不能な作業は**捏造しない**
- 人間作業が必要な項目は対象ファイル・ページ・確認項目・記入欄・判定方法・再開条件を文書化する
- 数値実装許可は部材・照査単位（08_numeric_authorization_gate.md）で管理し、一括 GRANTED にしない

## 対象ブロッカー

| ID | 内容 | Phase A+ での扱い |
|----|------|-------------------|
| PA-OQ-001 | 道示 R7 条文・表・式の目視未確認 | P2 人間確認票 |
| PA-OQ-002 | ライセンス PDF 参照パス不整合 | P1 実在パス確認 |
| PA-OQ-003 | JIS 番号未確定 | P2 取得計画 |
| PA-OQ-004 | 2026-03-31 正誤表未確認 | P2 確認票 |
| PA-OQ-005 | 非合成鋼鈑桁 R7 正式計算例なし | P4 Golden 計画 |
| PA-OQ-006 | 独立計算結果なし | P4 独立検証計画 |
| PA-OQ-007 | 再凍結の decision/open questions 不足 | P1 状態確認 |
| PA-OQ-009 | 解析方式・解析器物理契約未確定 | P3 solver 契約 |
| PA-OQ-010 | 旧Apollo 版不明 | P1 REFERENCE_ONLY 維持 |
| GATE-NR-02 | 解析器機械証跡不足 | P3 solver 契約 |
| GATE-NR-03 | Golden 未承認 | P4 実行計画 |

## 成果物

| ファイル | 内容 | Step |
|----------|------|------|
| README.md | 本ファイル | P0 |
| 00_baseline_and_gate_matrix.md | 基準・ゲート整合表 | P0 |
| 01_blocker_resolution_register.csv | ブロッカー解除レジスタ | P0〜P6 |
| 02_standard_visual_review_workbook.md | 道示・正誤表・JIS 人間確認票 | P2 |
| 03_errata_and_jis_acquisition_plan.md | 正誤表・JIS 取得計画 | P2 |
| 04_solver_identity_and_physical_contract.md | 解析器同一性・物理契約 | P3 |
| 05_golden_validation_execution_plan.md | Golden 独立検証計画 | P4 |
| 06_first_numeric_release_candidate.md | 最初の数値実装候補選定 | P5 |
| 07_user_action_required.md | 人間作業指示書 | P1〜P6 |
| decision_log.md | 決定記録（DEC-PB-xxxx） | P0〜P6 |
| phase_b_release_preparation_report.md | 完了報告 | P6 |

## Step 一覧

| Step | ブランチ | PR | 内容 |
|------|----------|-----|------|
| P0 | docs/phase-b-prep-p0-baseline | #259 | Phase A 後処理・baseline |
| P1 | docs/phase-b-prep-p1-repository-blockers | #260 | リポジトリ内で整理可能なブロッカー |
| P2 | docs/phase-b-prep-p2-standard-review | #261 | 道示 R7・正誤表・JIS 人間確認票 |
| P3 | docs/phase-b-prep-p3-solver-contract | #262 | 解析器同一性・物理契約 |
| P4 | docs/phase-b-prep-p4-golden-plan | #263 | Golden・独立検証計画 |
| P5 | docs/phase-b-prep-p5-first-candidate | #264 | 最初の数値実装候補選定 |
| P6 | docs/phase-b-prep-p6-final | #265 | 統合判定・完了報告 |

## 統合判定（P6）

```
NUMERIC_RELEASE_READINESS_VERDICT: BLOCKED
PHASE_B_IMPLEMENTATION_START_VERDICT: NO_GO_PENDING_HUMAN_EVIDENCE
FIRST_RELEASE_CANDIDATE: A — 主桁断面諸量（純幾何）
CURRENT_AUTHORIZATION: NOT_AUTHORIZED
```

詳細は [phase_b_release_preparation_report.md](phase_b_release_preparation_report.md) と [final_report.txt](../../../final_report.txt) を参照。人間作業は [07_user_action_required.md](07_user_action_required.md) に引き継ぎ、セル単位 GRANTED の DEC-ID を条件に Phase B 開始可否を再評価する。

## 変更許可範囲

許可:
- `docs/apollo/phase_b_release_preparation/`
- `docs/apollo/phase_a_integrated_freeze/open_questions_and_blockers.md`
- `docs/apollo/phase_a_integrated_freeze/08_numeric_authorization_gate.md`
- `docs/apollo/phase1_design_expansion_refreeze/`
- `final_report.txt`

原則禁止: `frontend/` `backend/` `desktop/` `schemas/` `scripts/` `package.json` `package-lock.json`

## 停止条件

画像 PDF を読めない / ライセンス資料の人間確認が必要 / 正誤表・JIS 一次資料がない / 正式計算例がない / 独立ツール・実行者がいない / 解析器契約を確認できない / application code 変更が必要 等。停止時も final_report.txt と 07_user_action_required.md を更新し、安全な成果を commit/push して停止理由・人間操作・再開条件を記録する。
