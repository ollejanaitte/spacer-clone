# Phase A+ — 00 Baseline and Gate Matrix

**Authority:** Phase A+ (P0)
**Date:** 2026-08-02
**Integration base:** Phase A（PR #250..#258）・DS-09 `numeric_release_gate.md`・08_numeric_authorization_gate.md

本ファイルは Phase A+ 開始時の baseline（実状態）と、Phase B 数値実装許可に至るゲート整合表を凍結する。既存の決定を書き換えない。

## 1. Phase A 完了状態（baseline）

```text
MODEL: DeepSeek V4 Flash
ROLE_MODE: SINGLE_MODEL_FULL_EXECUTION
STEP_PR_LIST: PR #250, #251, #252, #253, #254, #255, #256, #257, #258
SOURCE_COUNT: 49
ADOPTED_COUNT: 23（ADOPTED 14 + ADOPTED_WITH_CONDITION 9）
NUMERIC_ADOPTED_COUNT: 0
DOCUMENT_FREEZE_VERDICT: COMPLETE
NUMERIC_RELEASE_READINESS_VERDICT: BLOCKED
OVERALL_VERDICT: COMPLETE（文書凍結。数値実装は Phase B 許可ゲート未開放）
```

- Phase A の 9 Step（A0..A8）はすべて main へマージ済み（PR #250..#258）。
- 数値・照査式・係数・許容値は全 BLOCKED を維持、08 許可テーブルは全セル NOT_AUTHORIZED。
- Phase A 完了の「正式成果」は文書凍結であり、数値実装の自動許可ではない（fail-closed）。

## 2. ブロッカー一覧（Phase A 時点 → Phase A+ 対象）

| ID | カテゴリ | 内容 | Phase A 状態 | Phase A+ Step |
|----|----------|------|--------------|----------------|
| PA-OQ-001 | 道示条文 | R7 条文・表・式の目視未確認 | BLOCKED | P2 |
| PA-OQ-002 | ライセンスPDF所在 | 参照パス不整合 | BLOCKED | P1 |
| PA-OQ-003 | JIS | JIS 番号未確定（JIS-001..034） | BLOCKED | P2 |
| PA-OQ-004 | 正誤表 | 2026-03-31 正誤表未確認 | BLOCKED | P2 |
| PA-OQ-005 | 設計計算例 | 非合成鋼鈑桁 R7 計算例なし | BLOCKED | P4 |
| PA-OQ-006 | 独立計算結果 | 独立計算結果なし | BLOCKED | P4 |
| PA-OQ-007 | 再凍結 | refreeze の decision/open questions 不足 | BLOCKED | P1 |
| PA-OQ-008 | 単位体積重量 | ユーザー入力単位重量の正式値昇格禁止 | DEFERRED | P2（材料確認票の一部） |
| PA-OQ-009 | 解析方式 | 解析モデル化方式・解析器物理契約未確定 | BLOCKED | P3 |
| PA-OQ-010 | 旧Apollo版 | 旧Apollo マニュアル版不明 | BLOCKED(REFERENCE_ONLY) | P1 |
| GATE-NR-02 | 解析器機械証跡 | 同一性・物理 I/O・再現性の機械証跡なし | BLOCKED | P3 |
| GATE-NR-03 | Golden 未承認 | 必須 Goldens の独立誘導・承認なし | BLOCKED | P4 |
| GATE-NR-04 | SPACER パリティ | 固定版 SPACER の実パリティなし | BLOCKED | P4（計画のみ） |

## 3. Phase B 数値実装許可ゲート整合表（08 との一致）

08_numeric_authorization_gate.md §2 の許可テーブルを baseline として参照する。現状は全セル NOT_AUTHORIZED。

| 部材 / 照査 | 曲げ | せん断 | 軸力・安定 | たわみ | 疲労 | 連結・支承 |
|-------------|------|--------|------------|--------|------|-----------|
| 主桁 main_girder | NOT_AUTHORIZED | NOT_AUTHORIZED | NOT_AUTHORIZED | NOT_AUTHORIZED | OUT_OF_SCOPE | — |
| RC床版 rc_deck | NOT_AUTHORIZED | NOT_AUTHORIZED | — | NOT_AUTHORIZED | — | — |
| 横桁 cross_girder | NOT_AUTHORIZED | NOT_AUTHORIZED | NOT_AUTHORIZED | — | OUT_OF_SCOPE | — |
| 対傾構 sway_bracing | — | — | NOT_AUTHORIZED | — | — | NOT_AUTHORIZED |
| 横構 lateral_bracing | — | — | NOT_AUTHORIZED | — | — | NOT_AUTHORIZED |
| 補剛材 stiffener | — | NOT_AUTHORIZED | NOT_AUTHORIZED | — | — | — |
| 添接 splice | — | — | — | — | — | NOT_AUTHORIZED |
| 支承 bearing | — | — | — | — | — | NOT_AUTHORIZED |

GRANTED の成立条件（08 §3）: 基準採択・式採択・限界値採択・解析連携・検証ケース PASS・決定記録。**どれか一つでも欠けたまま昇格しない。**

## 4. Phase A+ の最終判定ターゲット（P6 で確定）

```text
NUMERIC_RELEASE_READINESS_VERDICT: BLOCKED（証拠不足なら維持）
PHASE_B_IMPLEMENTATION_START_VERDICT: NO_GO_PENDING_HUMAN_EVIDENCE（人間証拠が揃うまで）
```

Phase A+ は「全ブロッカー解除」を完了条件としない。解除不能理由と人間の次操作を明確にすることが正式成果。

## 5. P0 検証（Self-check）

| Check | Result |
|-------|--------|
| Phase A PR #250..#258 全 MERGED | PASS |
| ローカル main = origin/main（8137c7a） | PASS |
| worktree clean | PASS |
| 01_blocker_resolution_register.csv の blocker ID 重複なし | PASS |
| application code 変更なし | PASS |
| 既存 Phase A / DS の決定を書き換えていない | PASS |
| 変更範囲は許可範囲内 | PASS |
