# 04 — READY 69 Requirements Guide

## 概要

Stage 5 で監督検収された **READY 69 件** は、骨組み計算ソフトとのギャップ分析における優先トレーサビリティ集合である。

```text
READY count: 69
Target Standard: NOT_SELECTED
Implementation: NOT implemented (SPEC_READY_NOT_IMPLEMENTED)
```

## 実装済みではない

各 READY 行の `implementation_readiness` は `SPEC_READY_NOT_IMPLEMENTED` である。  
「READY」は「Evidence 付きで仕様候補として整理済み」を意味し、製品実装完了を意味しない。

## requirement / validation / evidence の関係

```text
ready_requirements.csv (RDY-xxx)
    ├── requirement_id (REQ-5C-xxxx)
    ├── validation_rule_id (VAL-REQ-5C-xxxx)
    └── evidence_image → evidence/images/*.png
```

- **requirement:** 要件要約・出典文書・ページ
- **validation_rule:** 自動数値確定禁止等の検証方針（`BLOCK_NUMERIC_AUTO_DETERMINATION`）
- **evidence:** 条文所在の PNG（OCR 代替ではない）

出典 CSV: `standards/stage5_ready_requirements.csv`（パッケージ内は `standards/ready_requirements.csv` 予定）

## カテゴリ別索引（topic プレフィックス）

READY 69 件は `topic` 列のドメイン接頭辞で分類できる（例）:

| 接頭辞 | 例示トピック |
|--------|--------------|
| `unit_system` | 単位系選択 |
| `slab_load_input` | 床版設計荷重 |
| `live_load` | 路面荷重 |
| `splice` | 添接計算 |
| `main_girder` | 主桁設計 |
| `section_check` | 断面チェック |

完全な一覧は `standards/ready_requirements.csv` を参照。

## 設計値確定可否

| 区分 | 扱い |
|------|------|
| READY + Evidence | 所在確認用。数値は画像と一次資料で監督確認が必要 |
| validation_rule | 数値の自動確定をブロック |
| OPEN / JIS GAP | テスト期待値にしない |

## Target Standard 未選定

`target_standard_status: TARGET_STANDARD_NOT_SELECTED`  
Historical Baseline（DOC-RBS-I/II 表紙・奥付確認版）は記録されているが、Target として未採用。

## トレーサビリティ

- `standards/external_traceability_crosswalk.csv` — feature / requirement / evidence の横断
- `evidence/index.csv` — パッケージ内 Evidence 索引

## 注意

OPEN 32 件を READY に昇格しない。JIS GAP 34 件は一次 JIS 未取得のまま数値を埋めない。
