# Apollo Phase A — 設計基準・計算ロジック統合凍結

**Authority:** CURRENT INTEGRATION AUTHORITY (Phase A)
**Status:** IN_PROGRESS (Step A0 〜 A8 を各Step毎に main へマージ)
**Start:** 2026-08-02
**Repository:** /home/masaharu/Projects/spacer-clone
**Model:** DeepSeek V4 Flash (SINGLE_MODEL_FULL_EXECUTION)
**Initial main SHA:** `e540a38c06e3a9360c0cac4a632f8f1a599c8656`

## 目的

GitHub リポジトリを正本として、Phase A（設計基準・計算ロジック統合凍結）を実施する。アプリ実装は行わない。今後の正式計算実装（Phase B）に必要な以下を整理・凍結する。

- 設計基準・版・正誤表
- 適用橋種・設計法・適用範囲
- 単位系
- 材料規格、材料強度、許容値、部分係数
- 荷重、荷重係数、荷重組合せ
- 解析モデル化ルール
- 主桁、RC床版、横桁、対傾構、横構、補剛材、添接、たわみ、疲労の照査ロジック
- 式ID、入力、中間値、出力、単位、適用条件、例外
- 数値検証ケース
- 計算書出力仕様
- Phase B の数値実装許可ゲート

## 正本方針

Phase A は既存の DS-00〜DS-09 ガバナンス体系（`docs/apollo/design-standards/`）、EA エビデンス収集体系（`docs/apollo/evidence-collection/`）、POST-EA-01（`docs/apollo/post-ea-01/`）、`phase1_design_expansion_refreeze/`、AP-DX-01、VVS01/02 を**統合・再凍結**する。既存の決定を書き換えず、参照整合を保持する。

数値・式・係数の採択状態は次を使用する（DS-00 `adoption_status_model.md` と同一語彙）。

- `ADOPTED`
- `ADOPTED_WITH_CONDITION`
- `CANDIDATE`
- `BLOCKED` / `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT`
- `DEFERRED`
- `NOT_APPLICABLE`
- `OUT_OF_SCOPE`
- `REFERENCE_ONLY`

数値実装許可は部材・照査単位で管理する。未採択項目は `NOT_AUTHORIZED`。一部だけ揃っても全体を一括 `GRANTED` にしない。

## 対象範囲

対象: 直橋・単純桁・等桁高・非合成RC床版鋼鈑桁橋・多主桁・固定/可動支承・RC床版/舗装/ハンチ・横桁/対傾構/横構/斜材・主桁補剛材・主桁添接・鋼重/たわみ/疲労・標準断面/配置図/計算書。

対象外: 合成桁、床版を主桁剛性へ加算、曲線/斜橋/拡幅/変桁高、箱桁/鋼床版/PC床版、複数径間連続桁、製作詳細図完全自動化、根拠未採択の数値照査、旧Apolloとの数値同値保証。

非合成規則:

```text
compositeAction = false
compositeShearConnector = 禁止
DeckAnchorage = 合成作用とは独立
```

## 成果物

| ファイル | 内容 | Step |
|----------|------|------|
| README.md | 本ファイル | A0 |
| 00_source_inventory.csv | 資料インベントリ | A0 |
| 01_standard_scope_freeze.md | 基準・版・適用範囲 | A1 |
| 02_materials_units_factors.md | 材料・単位・係数 | A2 |
| 03_loads_and_combinations.md | 荷重・組合せ | A3 |
| 04_analysis_model_rules.md | 解析モデル化ルール | A4 |
| 05_member_check_logic.md | 部材照査ロジック | A5/A6 |
| 06_formula_registry.csv | 式レジストリ | A2〜A7 |
| 07_validation_cases.csv | 数値検証ケース | A3〜A7 |
| 08_numeric_authorization_gate.md | Phase B 数値実装許可ゲート | A7 |
| 09_report_output_spec.md | 計算書出力仕様 | A7 |
| decision_log.md | 決定記録 | A0〜A8 |
| open_questions_and_blockers.md | 未決事項・ブロッカー | A0〜A8 |
| phase_a_completion_report.md | 完了報告 | A8 |

## Step 一覧

| Step | ブランチ | 内容 |
|------|----------|------|
| A0 | docs/phase-a-a0-source-inventory | 資料インベントリ・作業枠 |
| A1 | docs/phase-a-a1-standard-scope | 基準・版・適用範囲 |
| A2 | docs/phase-a-a2-materials-units | 材料・単位・係数 |
| A3 | docs/phase-a-a3-loads-combinations | 荷重・組合せ |
| A4 | docs/phase-a-a4-analysis-model | 解析モデル化ルール |
| A5 | docs/phase-a-a5-main-girder-fatigue | 主桁・たわみ・疲労 |
| A6 | docs/phase-a-a6-deck-secondary-connections | RC床版・床組・補剛材・添接 |
| A7 | docs/phase-a-a7-validation-authorization | 検証・計算書・許可ゲート |
| A8 | docs/phase-a-a8-final-integration | 統合レビュー・完了判定 |

## 根拠資料の優先順位

1. リポジトリ内の正式設計基準本文
2. 正式改定資料・正誤表
3. プロジェクト承認済み決定記録
4. 正式設計計算例
5. 旧Apolloマニュアル
6. JIP-SPACER / JIP-LINER マニュアル
7. 既存コード
8. 一般知識・推測

- 旧Apolloマニュアルは機能構成・処理順の参考に限定
- 画面例やサンプル値を正式値にしない
- JIPマニュアルを数値設計の正式根拠に自動昇格しない
- 既存コード中の値も出典不明なら採択しない
- ウェブは公式一次資料の所在・版確認のみに使用し、URLと確認日を記録
- ブログ・二次資料から数値採択しない
- 著作権資料を長文転載しない

## 変更許可範囲

- `docs/apollo/phase_a_integrated_freeze/`
- `docs/apollo/phase1_design_expansion_refreeze/manual_traceability.csv`（A8 のみ）
- `final_report.txt`

原則変更禁止: `frontend/` `backend/` `desktop/` `schemas/` `scripts/` `package.json` `package-lock.json`
