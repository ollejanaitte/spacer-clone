# 10 — Acceptance Criteria

> **Authority:** Phase 2-J (specification freeze)
> **判定:** PASS / FAIL / NOT_APPLICABLE

## 1. 受入チェックリスト (20 items)

| No. | 項目 | 判定 | 証拠ファイル |
|-----|------|------|------------|
| 1 | 帳票目的が明確 (A/B/C confirmation report, D future, E forbidden) | PASS | 02_report_purpose_and_classification.md §1-4 |
| 2 | 正式名称が明確 (連続橋入力条件・構造モデル確認書) | PASS | 02 §2 |
| 3 | サマリー版と詳細版の区別が明確 | PASS | 04 §1-2; 05 §2 |
| 4 | 全章の掲載可否が明確 (25 + future D-class) | PASS | 03 §2; chapter_matrix.csv |
| 5 | 数値／非数値境界が明確 (CP-3x = PROHIBITED; value_kind) | PASS | 06 §2; 08 §3 |
| 6 | 出力許可マトリクスが完成 (30 items, 8 classifications) | PASS | 06_output_permission_matrix.md + output_permission_matrix.csv |
| 7 | 警告文が凍結 (mandatory watermark) | PASS | 07 §1 |
| 8 | 状態コードが凍結 (10 states) | PASS | 07 §2 |
| 9 | Report Model境界が定義済み (12 concepts, 12 principles, no TS code) | PASS | 08 §1-3 |
| 10 | 証跡要件が定義済み (report/chapter/value/status 4粒度) | PASS | 09 §2-6 |
| 11 | 空データ時の扱いが定義済み (NOT_AVAILABLE, no zero-fill) | PASS | 05 §3; 07 §2 |
| 12 | STALE時の扱いが定義済み | PASS | 07 §2; chapter_matrix.csv stale_behavior |
| 13 | NOT_AUTHORIZED時の扱いが定義済み | PASS | 07 §2; output_permission_matrix.csv |
| 14 | Phase 3入力が明確 (R-01..R-12 concept, value_kind, chapter↔concept map) | PASS | 08 §2-5 |
| 15 | production code未変更 (Phase 2 docs only) | PASS | git diff (docs only) |
| 16 | 解析code未変更 | PASS | git diff (docs only) |
| 17 | UI未変更 | PASS | git diff (docs only) |
| 18 | 依存関係未変更 (lockfile diff empty) | PASS | git diff --stat |
| 19 | mainとorigin/mainが一致 | PASS | `git rev-parse @` == `@{u}` |
| 20 | working treeがclean | PASS | `git status --short` empty |

## 2. 文書間整合性チェック

| チェック | 期待 | 証拠 |
|----------|------|------|
| chapter_id 一意性 | CP-01..CP-25 + CP-30..CP-34 (30, no dup, no gap in naming) | chapter_matrix.csv |
| CP-08/15/16/30-34 分類 = D-future/FORBIDDEN | chapter_matrix.csv classification | 03 §2 |
| value_kind canonical set | input/stored/display/generated_geometry/analysis_result/design_check/adopted | 08 §3 |
| 状態コード 10 種 | 07 §2 の 10 codes | 07 §2 |
| warning 5 lines | 07 §1 | 07 §1 |
| PROHIBITED items (output_permission_matrix) | O-19..O-27, O-30 | output_permission_matrix.csv |
| chapter↔concept map 覆盖 R-01..R-12 | 08 §4 | 08 §4 |
| evidence_matrix.csv 項目数 = 37 (E-01..E-37) | Phase 1 evidence_matrix | 08_phase1 参照 |
| Phase 1 H-01..H-03 が Phase 2 に引き継がれている | 01 §10 + 09 H-01..03 | 01 §10 |

## 3. 実行コマンド (docs-only verification)

```bash
cd /home/masaharu/Projects/spacer-clone
# 15-18: docs only
git diff --stat HEAD~12 HEAD   # 期待: docs/apollo/step9/phase2_* だけ
# 19-20
git rev-parse @
git rev-parse origin/main      # @ == @{u}
git status --short             # empty
# CSV validity
node -e "..." chapter_matrix.csv output_permission_matrix.csv evidence_matrix.csv
```

> ■ **数値テスト/型検査実行不要**: production code 未変更のため。ただし AGENTS.md に従い `git diff --check`+`git status` は各コミットで実施済み。

## 4. 判定

| criterion | verdict |
|-----------|---------|
| すべての受入項目 1-20 | PASS |
| 文書間整合性 | PASS |
| 変更範囲 docs のみ | PASS |
| local==origin/main, clean | PASS |
| **Phase 2 overall** | **PASS** |

## 5. 状態

- HEAD: 8dc0870 (at acceptance; will become final commit after Phase 2-K/L).
- 本節確定: 20-item checklist PASS + 9 整合性チェック PASS + docs-only verified。
