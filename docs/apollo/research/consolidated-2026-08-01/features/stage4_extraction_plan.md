# Stage 4 Extraction Plan

Stage 4 には進まない。以下は引継ぎ定義のみ。

## 対象資料セット
- PHASE1_CORE: inventory/phase1_core_manuals.md
- PHASE1_SUPPORT: inventory/phase1_support_manuals.md
- 読取順: features/manual_reading_order.md

## 抽出単位
Manual ID × feature_category（phase1_feature_to_manual_matrix.csv）

## 各カテゴリで取る項目（定義のみ）
入力、型、単位、初期値、制約、自動決定、計算、出力、帳票、図面、連携、出典ページ

## 最初のバッチ（推奨）
1. MAN-021 共通条件・単位・ファイル
2. MAN-005 設計データ
3. MAN-006 RC床版
4. MAN-007 Analyzer連携
5. MAN-008/009 + MAN-062/063 断面・添接

## 禁止
箱桁・合成・鋼床版固有仕様の混入。MAN-060 PC床版の採用。
