# 08 — Open Items and Blockers

## 件数サマリー

| 区分 | 件数 | CSV（ソース） |
|------|-----:|---------------|
| OPEN | 32 | `standards/stage5_open_items.csv` |
| JIS SOURCE GAP | 34 | `standards/stage5_jis_source_gaps.csv` |
| APOLLO RETURN 残 | 4 | `standards/stage5_apollo_return_resolution.csv` |
| UNKNOWN | 15 | `standards/stage5_unknown_resolution.csv` |
| Target Standard | NOT_SELECTED | 全 READY 行 |

READY: **69**（ブロッカーではないが Target 未選定のため数値凍結不可）

## OPEN（32）

| 項目 | 内容 |
|------|------|
| 意味 | 追加出典・条文レビューが必要 |
| 担当 | 調査チーム（CSV の owner 列参照） |
| 次アクション | 一次資料の追加抽出・監督レビュー |
| 設計凍結影響 | 該当要件は READY に昇格しない限り仕様候補外 |
| 昇格禁止 | 根拠なしに READY へ昇格しない |

## JIS SOURCE GAP（34）

| 項目 | 内容 |
|------|------|
| 意味 | 一次 JIS 原文が未取得 |
| 次アクション | 一次 JIS の入手と条文照合 |
| 設計凍結影響 | **ブロッキング** — 材料・製作限界等の確定不可 |
| 禁止 | 二次資料・記憶による JIS 値の補完 |

## APOLLO RETURN 残（4）

| 項目 | 内容 |
|------|------|
| 意味 | APOLLO マニュアルからの追加抽出が不十分 |
| 次アクション | 該当 MAN-* の再読・抽出 |
| 設計凍結影響 | APOLLO 固有挙動の仕様化が保留 |

## UNKNOWN（15）

| 項目 | 内容 |
|------|------|
| 意味 | 資料不足・矛盾・物理形式未確認 |
| 次アクション | 任意の再読（Part 4/5）または Stage 6 での実機調査 |
| 設計凍結影響 | 境界条件・I/O 形式が未確定のまま残る |

## Target Standard: NOT_SELECTED

Historical Baseline は DOC-RBS-I/II 等の表紙・奥付確認版として記録。  
Target としての版選定は本プロジェクト未実施。骨組み計算ソフト側で独自に選定しないこと（調整が必要）。

## 矛盾

`standards/stage5_conflicts.csv` — 監督レビュー待ちの矛盾候補。

## 管理方針

`standards/stage5_open_items_management.md`:

> Do not silently promote to READY.

## Stage 6 への影響

ギャップ分析は READY 69 を主軸とし、OPEN/JIS/UNKNOWN は「対応不能・要外部調査・要アーキテクチャ変更」バケットへ分類する（`docs/09_stage6_gap_analysis_workplan.md`）。
