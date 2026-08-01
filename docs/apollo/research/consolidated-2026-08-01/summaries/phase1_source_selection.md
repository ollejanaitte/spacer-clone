# Phase 1 Source Selection

## 1. Phase 1対象の定義

直橋 / 等桁高 / 非合成 / RC床版 / 鋼鈑桁橋 / 単純桁 / 1径間 / 斜角90度 / 一定幅員 / 一定横断勾配 / 等間隔主桁 / 主桁4〜6本程度 / 一定床版厚 / 標準的な横桁配置 / 固定支承・可動支承 / 静的線形解析。

## 2. 選定方法

1. Stage1 catalog・relationships・phase1_relevant を入力とする（再作成しない）。
2. Stage2 のシステム構成・処理順序で「どの機能領域が必要か」を固定する。
3. MiMo で MAN-001〜014 の表紙章、単体の適用/入出力、FUTURE 目次の共通章名を抽出。
4. Grok が原本照合のうえ `stage3_class` を最終判定。

## 3. PHASE1_CORE（17）

MAN-021, MAN-001〜014, MAN-062, MAN-063。
詳細: `inventory/phase1_core_manuals.md` / `phase1_manual_selection.csv`。

| 群 | 役割 |
|---|---|
| MAN-021 | システム・形式・単体一覧 |
| MAN-001 | 非合成鈑桁 TOC |
| MAN-002〜014 | 各章分冊（はじめに〜疲労） |
| MAN-062 | Section 単体（優先） |
| MAN-063 | Splice 単体 |

## 4. PHASE1_SUPPORT（1）

- **MAN-061** Section 別冊。MAN-062 と版関係未確定のため SUPPORT。新旧断定しない。

## 5. FUTURE（46）

合成鈑桁・コンクリート床版系箱桁・鋼床版鈑桁/箱桁・StDeck（MAN-064/065）。
章名の機械的共通候補は `work/stage3_future_common_topics.csv`（仕様同一の断定はしない）。

## 6. OUT_OF_SCOPE（1）

- **MAN-060** PcSlab（PC床版）。Phase1 は RC 床版。

## 7. UNDECIDED（whole-manual: 0）

マニュアル全体を UNDECIDED クラスにした冊は無し。
版・支承・ダイヤ等の未決は `features/unresolved_source_selection.md` と `revision_status` 列で管理。

## 8. 機能と資料の対応

`features/phase1_feature_to_manual_matrix.csv`
bearing / diaphragm は資料紐付け未確定（Unknown）。

## 9. 推奨読取順序

`features/manual_reading_order.md`（Layer 0〜5）。仮案。根拠は MAN-021/002 と MAN-001 章立て。

## 10. 資料間依存

- MAN-001 → MAN-002〜014（分冊）
- MAN-003 / Align ←→ SuperDesigner（Stage2）
- MAN-007 ↔ Analyzer
- MAN-008/009 ↔ MAN-062/063（機能領域の補完。同一プロセスとは未証明）
- MAN-021 → 全サブシステム理解の前提

## 11. 版・重複・関係未確定

- SHA 完全一致重複: Stage0 で 0
- MAN-061 / MAN-062: 版関係 UNKNOWN（SUPPORT/CORE 併置）
- MAN-064 = StDeck（Splice ではない）再確認済み

## 12. Stage 4への引き継ぎ

`features/stage4_extraction_plan.md`
本 Stage では詳細抽出を開始しない。

## 13. Evidence

- MAN-001〜014 表紙・章対応（`stage3_nonc_girder_manual_evidence.csv`、Grok章名補正）
- 単体適用・形式（`stage3_standalone_manual_evidence.csv`）
- FUTURE 共通章名候補（`stage3_future_common_topics.csv`）
- Stage1/2 成果物

## 14. Interpretation

- CORE 17 + SUPPORT 1 で Phase1 の入力〜解析〜断面・添接〜帳票入口までカバー可能と見る。
- FUTURE の同名章は UI/用語の参考に留め、仕様コピーはしない。

## 15. Unknown

`features/unresolved_source_selection.md` 参照。
