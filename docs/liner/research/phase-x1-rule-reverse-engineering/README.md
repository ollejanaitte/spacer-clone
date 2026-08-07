# Phase X1 — Design Rule Reverse Engineering

**目的:** 道路構造令・JIP-LINER・実案件・橋梁資料から設計ルールを抽出し、
FACT/INFERENCE/UNRESOLVED を分離したルール台帳を作る。将来のLINER設計ルールエンジンの土台。

**スコープ:** ルール抽出・マッピング・証跡整備のみ。ソフトウェア実装は行わない。

## 成果物一覧

| ファイル | 内容 | Step |
| --- | --- | --- |
| `README.md` | 本ファイル | X1-P00 |
| `X0_5_REVIEW_REPORT.md` | X0.5レビュー報告（GO判定） | X1-P00 |
| `X1_SCOPE.md` | スコープ定義 | X1-P00 |
| `X1_SOURCE_PLAN.md` | 対象資料・章・OCR計画 | X1-P00 |
| `TERM_DICTIONARY.csv` | 用語辞書 | X1-P00 |
| `RULE_INVENTORY.csv` | ルール台帳（全ルール） | X1-P01〜P04 |
| `RULE_EVIDENCE_MATRIX.csv` | ルール↔証跡マトリクス | X1-P01〜P04 |
| `ROAD_ORDINANCE_REVERSE_ENGINEERING.md` | 道路構造令リバースエンジニアリング | X1-P01 |
| `STANDARD_TO_LINER_MAPPING.csv` | 基準→LINER機能マッピング | X1-P02 |
| `JIP_LINER_REVERSE_ENGINEERING.md` | JIP-LINERリバースエンジニアリング | X1-P02 |
| `PROJECT_RULE_MAPPING.csv` | 実案件↔ルールマッピング | X1-P03 |
| `PROJECT_CROSSCHECK_REPORT.md` | 実案件クロスチェック報告 | X1-P03 |
| `ROAD_TO_BRIDGE_MAPPING.csv` | 道路→橋梁マッピング | X1-P04 |
| `ROAD_BRIDGE_INTERFACE_ANALYSIS.md` | 道路橋梁インターフェース分析 | X1-P04 |
| `RULE_ENGINE_CANDIDATES.csv` | Rule Engine候補統合 | X1-P05 |
| `UNRESOLVED_RULES.csv` | 未解決ルール | X1-P05 |
| `X1_PR_LEDGER.md` | Step PR台帳 | X1-P06 |
| `PHASE_X1_FINAL_REPORT.md` | 最終報告書 | X1-P06 |

## 証拠ルール

全項目を FACT / INFERENCE / UNRESOLVED に分離する。

- FACT: 資料に明記（source page 必須）
- INFERENCE: 複数資料からの推定
- UNRESOLVED: 証拠不足

一般知識での補完はしない。不明値は `UNKNOWN`。

## 絶対ルール

- `~/Projects/spacer-clone` は読み取り確認のみ
- PDF原本のGit収録禁止 / 全文OCR禁止（必要ページのみ）
- main禁止（全PR base = research/liner-r1-planning）
- ソフトウェア実装なし / `git add .`・`git add -A` 禁止
- X2以降の自動開始禁止
