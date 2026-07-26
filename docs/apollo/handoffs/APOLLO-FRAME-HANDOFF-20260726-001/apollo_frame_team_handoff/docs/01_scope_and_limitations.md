# 01 — Scope and Limitations

## Verdicts（必読）

```text
APOLLO_RESEARCH_SCOPE_VERDICT: COMPLETE
APOLLO_READY_SUBSET_TO_OSS_GAP_ANALYSIS_VERDICT: READY
APOLLO_FULL_DESIGN_FREEZE_VERDICT: NOT_READY
```

## 調査スコープ（Evidence ベース）

Phase 1 対象橋種:

- 直橋 / 等桁高 / 非合成 / RC 床版 / 鋼鈑桁
- 単純桁 / 1 径間 / 斜角 90 度
- 一定幅員・横断勾配・等間隔主桁（4〜6 本程度）
- 固定・可動支承 / 静的線形解析

出典: `AGENTS.md` Phase 1 定義、`summaries/phase1_relevant_manuals.md`

## 本パッケージに含むもの

- Stage 4 機能カタログ（281 件）と依存・データフロー
- Stage 5 READY 69 件の要件・検証ルール・Evidence 画像（READY リンク分のみ）
- OPEN / JIS GAP / RETURN / UNKNOWN 一覧
- Stage 6 ギャップ分析用インターフェース・エンティティ候補 CSV
- 検証計画・Evidence 利用ガイド

## 本パッケージに含まないもの

- マニュアル原本 PDF、示方書原本、JIS 原本、DDB 原本
- APOLLO 実行ファイル・ソースコード
- 設計データ（`.mdb`）、線形データ（`.alg`）、図面（`.dwg`）
- OCR 全文、Git メタデータ
- READY に紐づかない Evidence 画像

## READY 69 の位置づけ

| 意味 | 非意味 |
|------|--------|
| ギャップ分析の優先候補 | 実装完了 |
| Evidence 付き仕様候補 | 設計凍結済み |
| トレーサビリティ起点 | Target Standard 選定済み |

各 READY 行は `implementation_readiness: SPEC_READY_NOT_IMPLEMENTED` である。

## Target Standard

```text
Target Standard: NOT_SELECTED
```

Historical Baseline（DOC-RBS-I/II 等の表紙・奥付確認版）は所在記録のみ。Target としての採用は未実施。

## 件数サマリー

| 区分 | 件数 |
|------|-----:|
| Features (Stage 4) | 281 |
| READY | 69 |
| OPEN | 32 |
| JIS SOURCE GAP | 34 |
| APOLLO RETURN 残 | 4 |
| UNKNOWN | 15 |

## 設計凍結不可の理由

- JIS SOURCE GAP 34 件が一次資料未取得
- OPEN 32 件が追加出典レビュー待ち
- UNKNOWN 15 件が資料不足
- Target Standard 未選定

詳細: `standards/design_freeze_assessment.md`（パッケージ内コピー予定）

## 利用制限

受領組織は本パッケージを Stage 6 ギャップ分析に限定して使用する。正式仕様・実装着手の根拠としない。
