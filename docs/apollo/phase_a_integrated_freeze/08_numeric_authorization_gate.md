# Phase A — 08 Phase B 数値実装許可ゲート 凍結

**Authority:** Phase A integrated freeze (A7)
**Date:** 2026-08-02
**Step:** A7 — 検証・計算書・許可ゲート
**Integration base:** DS-09 `numeric_release_gate.md`（GATE-NR-01..07）・DS-00 `adoption_status_model.md`・DS-05 レジスタ・07_validation_cases.csv・06_formula_registry.csv
**Adoption vocabulary:** DS-00 と同一語彙を使用する。

本ファイルは Phase A 統合の一部として、**Phase B の数値実装許可ゲート**を再凍結する。既存 DS-09 の決定を書き換えず、参照整合を保持する。

**Phase A の方針:** 数値・照査式・係数・許容値の実装許可は**部材・照査単位**で管理する。未採択項目は `NOT_AUTHORIZED`。一部だけ揃っても全体を一括 `GRANTED` にしない（fail-closed）。

---

## 1. 基本原則（DS-09 との整合）

DS-09 `numeric_release_gate.md` の連言規則（GATE-NR-01..07）を Phase B 数値実装の上位ゲートとしてそのまま採用する。

| 上位ゲート | 内容 | 現状 |
|-----------|------|------|
| GATE-NR-01 | DS-02..DS-05 のソース/数値ブロッカーがゼロ | `BLOCKED` |
| GATE-NR-02 | 解析器の同一性・物理 I/O・規約・障害・並行・再現性の機械証跡 | `BLOCKED` |
| GATE-NR-03 | 必須 Goldens が独立誘導/固定参照・チェックサム束縛・再現・承認済み | `BLOCKED` |
| GATE-NR-04 | 固定版 SPACER の実セマンティクス・数値パリティ | `BLOCKED` |
| GATE-NR-05 | 未解決エビデンスブロッカーがゼロ | `BLOCKED` |
| GATE-NR-06 | 独立ガバナンスレビュー通過 | `PASS` |
| GATE-NR-07 | リポジトリ・文書最終検証通過 | `PASS` |

現状は連言全体が `BLOCKED`。GATE-NR-06/07 が PASS でも GATE-NR-01..05 を補償しない。

**Phase B 特有の追加規則（本ファイル）:**

- 上位ゲートが満たされても、部材・照査単位の許可（§2）が個別に満たされない限り数値実装しない。
- 許可は**部材（main_girder / rc_deck / cross_girder / sway_bracing / lateral_bracing / stiffener / splice / bearing）と照査（bending / shear / stability / deflection / fatigue / serviceability / connection）の交点**で判定する。
- 数値実装許可は「式・係数・許容値・抵抗値の全部が採択済み」かつ「その照査用の検証ケース（07_validation_cases.csv）が PASS 済み」を必須条件とする。
- エビデンスブロッカー未解決のまま数値を昇格しない。`BLOCKED` を `ADOPTED` へ直接書き換えない。

---

## 2. 部材・照査単位の許可テーブル

状態値: `NOT_AUTHORIZED`（未許可）/ `CONDITIONAL`（条件付き見込み）/ `GRANTED`（実装許可済み）。

現状は**全セル `NOT_AUTHORIZED`**。`GRANTED` は後続の決定記録（DEC-PHA-xxxx）で個別に昇格する。

| 部材 / 照査 | 曲げ | せん断 | 軸力・安定 | たわみ | 疲労 | 連結・支承 | 状態ソース |
|-------------|------|--------|------------|--------|------|-----------|-----------|
| 主桁 main_girder | NOT_AUTHORIZED | NOT_AUTHORIZED | NOT_AUTHORIZED | NOT_AUTHORIZED | OUT_OF_SCOPE | — | 05 §1.1 / §2 |
| RC床版 rc_deck | NOT_AUTHORIZED | NOT_AUTHORIZED | — | NOT_AUTHORIZED | — | — | 05 §8 |
| 横桁 cross_girder | NOT_AUTHORIZED | NOT_AUTHORIZED | NOT_AUTHORIZED | — | OUT_OF_SCOPE | — | 05 §9 |
| 対傾構 sway_bracing | — | — | NOT_AUTHORIZED | — | — | NOT_AUTHORIZED | 05 §9 |
| 横構 lateral_bracing | — | — | NOT_AUTHORIZED | — | — | NOT_AUTHORIZED | 05 §9 |
| 補剛材 stiffener | — | NOT_AUTHORIZED | NOT_AUTHORIZED | — | — | — | 05 §10 |
| 添接 splice | — | — | — | — | — | NOT_AUTHORIZED | 05 §11 |
| 支承 bearing | — | — | — | — | — | NOT_AUTHORIZED | 05 §12 |

- 主桁・横桁・対傾構・横構・RC床版・補剛材: `PHASE1_REQUIRED` の照査はすべて `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT`。
- 添接・支承: `PHASE1_REFERENCE` を維持。正式照査は PKG-SCOPE-P1B 等の決定後（DEC-PHA-0016）。
- 疲労: `OUT_OF_SCOPE`（データ境界のみ、DEC-PHA-0014）。

---

## 3. 許可の必須条件（GRANTED の成立条件）

部材・照査セルを `GRANTED` にするには**次のすべて**が揃う必要がある。

1. **基準採択:** 対象照査の R7 条文・表番号が目視確認済みで、VER/LS/LV/DTS レジスタ行が採択済み（PA-OQ-001 解除）。
2. **式採択:** verification_equation_register.csv の該当 VER 行に equation_summary・係数配置・適用条件が採択済み。
3. **限界値採択:** 該当 LV 行に limit_value / unit / comparison_rule が採択済み。
4. **解析連携:** 応答量が DS-06 のプローブ通過後（AN-BLK-004 解除、解析完了 ≠ 照査承認 を維持）。
5. **検証ケース:** 該当照査の数値検証ケース（07_validation_cases.csv）が独立誘導/外部実行で PASS 済み。
6. **決定記録:** DEC-PHA-xxxx によりセル単位で明示的に `GRANTED` と記録済み。

条件 1..5 のいずれかが欠けたままの昇格は禁止。`CONDITIONAL` は「条件付き見込み」であり実装許可ではない。

---

## 4. 現在のブロッカー（許可を止めている要因）

| 要因 | 対象 | 解除条件 |
|------|------|----------|
| PA-OQ-001 道示 R7 条文目視未確認 | 全照査 | 目視確認（または許可済み検索可能版入手） |
| PA-OQ-003 JIS 番号未確定 | 材料強度・鋼種 | ライセンス JIS 一次資料の取得と人間確認 |
| PA-OQ-004 2026-03-31 正誤表未反映項目 | 版・正誤表 | 公式正誤表 PDF の内容確認 |
| PA-OQ-005 非合成鋼鈑桁 R7 計算例不在 | 全設計検証 | 正式計算例または独立検算資料 |
| PA-OQ-006 独立計算結果なし | 全数値検証 | EA-03 外部実行パッケージの実行 |
| PA-OQ-009 解析方式未決定 | 応答量 | DS-06 / 解析方式の決定 |
| GATE-NR-02 解析器機械証跡なし | 応答量 | EA-01/EA-03 バンドル導入 |
| GATE-NR-03 Goldens 未承認 | 検証ケース | 独立誘導・承認 |

## 5. 解除後の手順（GATE-NR 再評価との一体性）

全ブロッカー解除後、Phase B 数値実装の許可は:

1. 部材・照査単位の許可テーブルを更新（DEC-PHA-xxxx）。
2. 07_validation_cases.csv の該当ケースを `ADOPTED` に昇格（PASS 証跡付き）。
3. DS-09 の完全な Golden・パリティ承認、独立レビュー、最終検証を**1 つの解除判断**として再実行。
4. 履歴レジスタを書き換えず、新規決定として記録（DS-09 Re-evaluation 節と一致）。

---

## 6. A7 検証（Self-check）

| Check | Result |
|-------|--------|
| 全セルが NOT_AUTHORIZED（一括 GRANTED なし） | PASS |
| DS-09 GATE-NR-01..07 との整合（連言、fail-closed） | PASS |
| 許可条件が部材・照査単位で定義されている | PASS |
| 数値・式・係数を捏造していない | PASS |
| 既存 DS-09 / DS-00 の決定を書き換えていない | PASS |
| 06_formula_registry.csv / 07_validation_cases.csv と参照整合 | PASS |
| 採択語彙が DS-00 と一致 | PASS |
| 変更範囲は `docs/apollo/phase_a_integrated_freeze/` + `final_report.txt` のみ | PASS |
| 未完の TODO / TBD なし | PASS |
