# Phase X0 — Document Asset Inventory & Research Baseline

**目的:** LINER設計ルールエンジン構築の土台として、「何の資料が、どこに、どの版で存在し、
どの設計領域・ソフトウェア機能・将来フェーズに利用できるか」を棚卸しする。

**スコープ:** 資料の棚卸し・正本台帳の構築のみ。本文の完全解析・数式実装・ソフトウェア実装は行わない。

## 本ディレクトリの成果物

| ファイル | 内容 | Step |
| --- | --- | --- |
| `README.md` | 本ファイル（目次） | X0-P00 |
| `X0_SCOPE.md` | スコープ定義 | X0-P00 |
| `X0_SOURCE_ROOTS.md` | 情報源ルート定義 | X0-P00 |
| `DOCUMENT_INVENTORY.csv` | 資料資産台帳（147行・28列） | X0-P01/P02/P03 |
| `SOURCE_REGISTER.csv` | 情報源ルート台帳（6ルート） | X0-P01 |
| `OCR_TEXT_LAYER_STATUS.csv` | PDFテキスト層・OCR要否（94件） | X0-P02 |
| `DOCUMENT_RELATION_MATRIX.csv` | 設計領域別関連度マトリクス（147行） | X0-P03 |
| `DUPLICATE_REPORT.csv` | 完全重複レポート（7グループ） | X0-P04 |
| `VERSION_FAMILY_REPORT.csv` | 版違い候補レポート（3ファミリー） | X0-P04 |
| `RESEARCH_PRIORITY.csv` | P0〜P3優先順位（146行） | X0-P04 |
| `OPEN_QUESTIONS.md` | 未解決・要確認事項 | X0-P04 |
| `X1_HANDOFF.md` | X1（本文リバースエンジニアリング）への引継ぎ | X0-P05 |
| `X0_PR_LEDGER.md` | Step PR台帳 | X0-P05 |
| `PHASE_X0_FINAL_REPORT.md` | 最終報告書 | X0-P05 |

## 主要統計

- 資産総数: **147**（うちPDF 94）
- 優先度: P0=17 / P1=29 / P2=100 / P3=1
- OCR必須: 12（道示Ⅰ〜Ⅴ・便覧・設計例・デザインデータブック・道路構造令）
- 完全重複グループ: 7 / 版違いファミリー: 3

## 対象範囲

- 道路構造令・道路設計基準・実案件サンプル・橋梁設計基準・市販ソフト（LINER/SPACER/APOLLO）マニュアル・既存調査成果物
- ソースルート: `~/Projects` 配下6ルート（`X0_SOURCE_ROOTS.md` 参照）

## 絶対ルール（遵守事項）

1. ソフトウェア実装を行わない
2. LINER計算ロジック・Apollo・上部工・SPACERのコードを変更しない
3. PDF原本をGitへコピーしない（台帳には識別情報のみ記録）
4. 原本PDFを編集・改名・移動・削除しない
5. mainへのcommit/push/mergeをしない（全PR base = research/liner-r1-planning）
6. 不明値は `UNKNOWN` とする
7. OCRは大量実行しない（テキスト層有無の判定のみ実施）
8. `git add .` / `git add -A` を禁止（対象ファイルを明示してstage）
