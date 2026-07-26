> **警告（必読）**
>
> このパッケージは、READY 69件を対象とした **Stage 6 ギャップ分析・アーキテクチャ検討用** です。
>
> **製品コードの実装開始許可ではありません。**
>
> OPEN、JIS GAP、APOLLO RETURN、UNKNOWN、Target Standard 未選定の項目は正式仕様として採用しないでください。

# APOLLO Frame Team Handoff Package

**Package ID:** APOLLO-FRAME-HANDOFF-20260726-001

## 目的

APOLLO マニュアル調査（Stage 4 機能抽出、Stage 5 基準トレーサビリティ）の成果を、骨組み計算ソフト開発チームが既存製品とのギャップ分析を行うための入力として提供する。

## 開始地点

1. 本 README
2. `docs/00_handoff_overview.md`
3. `docs/01_scope_and_limitations.md`（Verdict 確認）
4. `PACKAGE_INFO.md`

## 閲覧順（推奨）

| 順 | 文書 | 内容 |
|----|------|------|
| 1 | `docs/00_handoff_overview.md` | 背景・依頼範囲 |
| 2 | `docs/01_scope_and_limitations.md` | 制限・Verdict |
| 3 | `docs/02_system_overview.md` | APOLLO 構成 |
| 4 | `docs/03_feature_catalog_guide.md` | 281 機能の読み方 |
| 5 | `docs/04_ready_69_requirements_guide.md` | READY 69 件ガイド |
| 6 | `docs/05_data_flow_and_interfaces.md` | データフロー |
| 7 | `docs/06_frame_analysis_boundary.md` | 骨組み解析境界 |
| 8 | `docs/07_validation_and_test_strategy.md` | 検証方針 |
| 9 | `docs/08_open_items_and_blockers.md` | 未解決事項 |
| 10 | `docs/09_stage6_gap_analysis_workplan.md` | Stage 6 作業計画 |
| 11 | `docs/10_evidence_usage_guide.md` | Evidence 画像 |
| 12 | `docs/11_source_and_license_notes.md` | 出典・ライセンス |
| 13 | `docs/12_glossary.md` | 用語集 |

## READY 69 件の意味

- Stage 5 で監督検収された **ギャップ分析候補** である
- **実装済みではない**（`SPEC_READY_NOT_IMPLEMENTED`）
- Target Standard は **NOT_SELECTED**
- 設計値・式・係数の自動確定は禁止（Evidence 画像確認が前提）

## 禁止事項

- READY 69 件以外を正式仕様として実装に着手すること
- OPEN / JIS GAP / RETURN / UNKNOWN をテスト期待値にすること
- Target Standard を本パッケージだけで選定すること
- Evidence 画像のみから数値を確定すること
- 原本 PDF・JIS 原文の再配布

## 全面設計凍結

```text
APOLLO_FULL_DESIGN_FREEZE_VERDICT: NOT_READY
```

## Stage 6 で許可される作業

- 既存骨組み計算ソフトとの機能ギャップ分析
- 入出力境界・データモデルの検討
- テスト計画の準備
- アーキテクチャ候補の整理

## パッケージ構造（概要）

```text
apollo_frame_team_handoff/
├── README.md
├── PACKAGE_INFO.md
├── MANIFEST.csv
├── SHA256SUMS.txt
├── source-location-map.md
├── docs/
├── features/
├── standards/
├── analysis-input/
├── validation/
├── evidence/
├── reports/
└── logs/
```

## 検証方法

Grok が `manual-research/scripts/handoff/` の支援スクリプトでパッケージを構築・検証する。

```text
build_frame_handoff_package.py → validate_frame_handoff_package.py → make_zip.py
```

検証項目: 構造、禁止拡張子、絶対パス漏洩、READY 件数 69、Evidence 整合。

## 件数（参照）

| 区分 | 件数 |
|------|-----:|
| Stage 4 features | 281 |
| READY | 69 |
| OPEN | 32 |
| JIS SOURCE GAP | 34 |
| APOLLO RETURN 残 | 4 |
| UNKNOWN | 15 |

## 草案について

本 README は `manual-research/handoff-work/` の草案である。Grok 検収後に正式パッケージへ採用される。
