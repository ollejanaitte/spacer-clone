# 00 — Handoff Overview

## 背景

APOLLO（鋼橋自動設計システム）のユーザーズマニュアル群を対象に、Phase 1 橋種（非合成 RC 床版鋼鈑桁）に関する機能・基準トレーサビリティ調査を実施した。本引渡しは、その調査成果を骨組み計算ソフト開発チームへ Stage 6 ギャップ分析の入力として渡すものである。

## APOLLO 調査の完了範囲

| Stage | 状態 | 内容 |
|-------|------|------|
| Stage 4 | COMPLETE | 281 機能のカタログ化 |
| Stage 5A | COMPLETE | トレーサビリティスコープ |
| Stage 5 統合 | COMPLETE | immutable パッケージ受入れ済み |
| Stage 5 設計凍結 | NOT_READY | OPEN / JIS GAP 等が残存 |

```text
APOLLO_RESEARCH_SCOPE_VERDICT: COMPLETE
```

## Stage 4 / 5 の状態

- **Stage 4:** `features/feature_catalog.csv` に 281 行。Evidence / Interpretation / Unknown 分類済み。
- **Stage 5:** 101 要件のうち READY 69 件がギャップ分析候補。OPEN 32、JIS GAP 34、RETURN 残 4、UNKNOWN 15。
- **Target Standard:** NOT_SELECTED（Historical Baseline のみ。版は Evidence 参照だが Target として未採用）。

## 開発チームに依頼する作業

1. READY 69 件と既存骨組み計算ソフト機能のギャップ分析
2. 入出力境界・データモデル候補のレビュー（`analysis-input/`）
3. 解析連携インターフェース候補の妥当性評価
4. Reference Bridge 候補を用いたテスト計画準備
5. OPEN / JIS GAP / UNKNOWN のブロッカー整理

## 依頼しない作業

- 製品コードの全面実装開始
- Target Standard の選定（本パッケージの範囲外）
- OPEN 項目の仕様確定
- JIS 値の二次資料による補完
- APOLLO 互換計算エンジンの実装

## Package ID

`APOLLO-FRAME-HANDOFF-20260726-001`

## 関連 Verdict

```text
APOLLO_READY_SUBSET_TO_OSS_GAP_ANALYSIS_VERDICT: READY
APOLLO_FULL_DESIGN_FREEZE_VERDICT: NOT_READY
```

READY はギャップ分析への引渡し可否であり、実装許可ではない。
