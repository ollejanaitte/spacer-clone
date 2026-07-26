# 03 — Feature Catalog Guide

## 概要

Stage 4 で抽出した **281 機能** が `features/feature_catalog.csv` に記録されている。

## feature_id 規則

形式: `F4-P{part}-{seq}`

| Part | 領域 |
|------|------|
| P1 | 共通幾何・線形・プロジェクト管理 |
| P2 | RC 床版・ハンチ |
| P3 | 主桁断面・添接 |
| P4 | 床組・横桁・対傾構 |
| P5 | 荷重・解析 |
| P6 | 出力・製図・材料 |

## 主要列

| 列 | 意味 |
|----|------|
| `feature_category` | 機能カテゴリ |
| `phase_class` | Phase1_required / optional / 将来対象 等 |
| `input_name`, `input_type`, `unit` | 入力定義 |
| `classification` | Evidence / Interpretation / Unknown |
| `evidence_text_summary` | 出典テキスト要約 |
| `unknowns` | 未解決事項 |
| `oss_mapping` | OSS 責務候補（採用未定） |

## Evidence / Interpretation / Unknown

- **Evidence:** マニュアルに明記された記述の転記
- **Interpretation:** 資料から合理的に読み取った推定（設計基準の断定を含まない）
- **Unknown:** 資料不足・矛盾・物理形式未確認

例: Analyzer 入力形式、`.mdb` スキーマ詳細は Unknown。

## 依存関係

- `features/feature_dependency_map.md` — 処理順序の Interpretation マップ
- `features/feature_catalog.csv` の `upstream_feature` / `downstream_feature` — 多くは NONE（未リンク）

```text
線形 → 形状 → 床版/ハンチ → 主桁/添接 → 床組 → 荷重 → 解析 → 照査 → 帳票/図面
```

## 関連ファイル

| ファイル | 内容 |
|----------|------|
| `feature_data_flow.md` | DB・解析・帳票・図面・材料の流れ |
| `feature_aliases.csv` | 別名・画面名 |
| `feature_conflicts.md` | 矛盾候補 |
| `unresolved_features.md` | 未解決機能 |

## Stage 6 での読み方

1. READY 69 件の `feature_id` でカタログをフィルタ
2. `phase_class` で Phase 1 必須か確認
3. `classification=Unknown` はギャップ分析で「要調査」として残す
4. `oss_mapping` は候補であり確定マッピングではない

## 件数

```text
Total features: 281
READY-linked features: see standards/ready_requirements.csv (69 requirements)
```

READY 要件と feature の対応は 1:N の場合がある。
