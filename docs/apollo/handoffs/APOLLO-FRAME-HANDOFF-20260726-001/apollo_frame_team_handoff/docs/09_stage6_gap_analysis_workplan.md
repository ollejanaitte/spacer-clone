# 09 — Stage 6 Gap Analysis Workplan

## 目的

骨組み計算ソフト開発チームが、READY 69 件を起点に既存製品との差分を体系的に整理する。

```text
APOLLO_READY_SUBSET_TO_OSS_GAP_ANALYSIS_VERDICT: READY
APOLLO_FRAME_TEAM_IMPLEMENTATION_START: NOT_AUTHORIZED
```

## 前提

- 製品コード変更前にギャップ分析成果物を作成すること
- Target Standard は NOT_SELECTED
- ゴールデンデータ未確定

## 作業分類バケット

各 READY / feature / interface 候補を次のいずれかに分類する:

| バケット | 定義 |
|----------|------|
| 既存機能で対応可能 | 追加実装なしで充足 |
| 軽微な拡張 | パラメータ・入出力の追加程度 |
| 新規モジュール | 新コンポーネントが必要 |
| アーキテクチャ変更 | 既存構造の見直しが必要 |
| 外部調査待ち | JIS / OPEN / APOLLO 追加調査待ち |
| 対象外 | Phase 1 スコープ外 |

## 推奨手順

1. **インベントリ** — `features/feature_catalog.csv`（281）と READY 69 の突合
2. **境界マップ** — `analysis-input/frame_analysis_interface_candidates.csv` をレビュー
3. **エンティティ** — `data_entity_candidates.csv` でデータモデル候補を評価
4. **I/O** — `input_output_candidates.csv` で既存製品 I/O と比較
5. **検証** — `validation_rule_candidates.csv` でテスト観点を草案化
6. **ブロッカー** — OPEN 32 / JIS 34 / RETURN 4 / UNKNOWN 15 を別表で管理
7. **成果物** — ギャップ分析レポート（本パッケージ外で作成）

## 入力資料

| 資料 | 用途 |
|------|------|
| `standards/ready_requirements.csv` | 優先 69 要件 |
| `standards/external_traceability_crosswalk.csv` | 横断トレーサビリティ |
| `evidence/index.csv` + images | 出典確認 |
| `analysis-input/stage6_mapping_candidates.csv` | OSS マッピング候補 |

## 禁止

- ギャップ分析完了前の全面実装着手
- OPEN → READY の無根拠昇格
- JIS 値の推測補完

## 完了条件（Stage 6 側）

- 全 READY 69 件にギャップ分類が付与されている
- ブロッカーが外部調査チケット化されている
- 入出力境界の UNKNOWN が明示されている
- 実装着手可否は別判定（本パッケージでは NOT_AUTHORIZED）

## エスカレーション

JIS GAP・Target Standard 選定・APOLLO 実機 I/O 確認は調査チーム / 監督へエスカレーションする。
