# Phase 2.5 — STEP 9 ブロッカー解決（H-01/H-02/H-03, U-03, CH/CP 正規化, PROHIBITED 再確認）

> **Authority:** STEP 9 — Phase 2.5 (blocker resolution before Phase 3 Report Model spec freeze)
> **Base:** Phase 2 `docs/apollo/step9/phase2_continuous_bridge_report_spec/` (COMPLETE @ 96ea018)
> **Model:** TokenRouter KimK3（作業員: Composer 2.5 / 調査: Grok 4.5）
> **結果:** 全面ドキュメントのみ／production code 変更なし（Phase 2.5-F = NOT_APPLICABLE）

## 目的

Phase 2（Report Model 仕様凍結）は完了だが、引き継がれている **H-01/H-02/H-03**（architect 人確認事項）と **U-03**（`computeGirderSectionProperties` spanLength ゲート）が Phase 3 (Report Model 実装) の GO/NO-GO を決めるブロッカーとなっている。Phase 2.5 はこれらを**仕様として判定・凍結**し、Phase 3 に明確なエントリーゲート条件を渡す。

- H-01/H-02/H-03 を architect 判定で **RESOLVED/ADOPTED** へ（実装は伴わない）。
- U-03 を **A/B/C/D** で判定。判定=C かつ §8 利用可能条件を満たす場合のみ、最小コード変更を 1 回だけ許容する。
- CH-*（コードスクリフト）→ CP-*（計算書章ID）の正規化を再確認。
- PROHIBITED 出力 (O-19..O-30) と D-class 章 (CP-08/15/16/30..34) の禁止を再確認。

## 制約

- **production code / 解析 code / UI / PDF / HTML は原則変更しない。** U-03 最小修正だけが例外的に許容される条件がある。
- `main` ブランチ直 push。`git add` は対象ファイルのみ明示。1 機能/1 章 ごとに 1 commit / 1 push。
- すべての数値状態 (`NOT_AUTHORIZED`/`NOT_GRANTED`/`PROHIBITED`/`NOT_AVAILABLE`/`NOT_IMPLEMENTED`) を維持する。
- `final_report.txt` を各サブステップ完了時に更新する。

## 成果物

| No. | ファイル | 役割 | コミット |
|----|----------|------|----------|
| 01 | `README.md` | 本ファイル | A |
| 02 | `01_preflight_and_input_review.md` | preflight + Phase 1/2 正本確認 | A |
| 03 | `02_h01_architect_decision.md` | H-01 判定 | B |
| 04 | `03_h02_architect_decision.md` | H-02 判定 | C |
| 05 | `04_h03_architect_decision.md` | H-03 判定 | D |
| 06 | `05_u03_spanlength_gate_investigation.md` | U-03 調査 + A/B/C/D 判定 | E |
| 07 | （なし） | Phase 2.5-F U-03 最小修正 | F（条件付き / NOT_APPLICABLE） |
| 08 | `06_ch_cp_identifier_canonicalization.md` | CH→CP 正規化 | G |
| 09 | `07_prohibited_output_reconfirmation.md` | PROHIBITED / D-class 再確認 | H |
| 10 | `09_human_decision_register.md` | architect 決定レジスタ | I |
| 11 | `blocker_matrix.csv` | H/U ブロッカー一覧 | I |
| 12 | `decision_register.csv` | 決定一覧 | I |
| 13 | `08_phase3_entry_gate.md` | Phase 3 GO/NO-GO | J |
| 14 | `10_phase3_handoff.md` | Phase 3 ハンドオフ | K |
| 15 | `completion_report.md` | 最終 | L |

## 判定用語

`ADOPTED / REJECTED / DEFERRED / BLOCKED / RESOLVED / PARTIALLY_RESOLVED / NOT_APPLICABLE / HUMAN_DECISION_REQUIRED / CONFLICTING_EVIDENCE`

## Phase 3 GO 条件

H-01/H-02/H-03 が architect 解決済み **かつ** U-03 方針が決定 **かつ** CH/CP 正規化 + PROHIBITED 再確認完了 **かつ** local==origin/main, clean。

## 状態

- HEAD: 96ea018 (Phase 2 COMPLETE)。
- 本Phase: IN_PROGRESS。
