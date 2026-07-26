# 12 — Glossary

| 用語 | 定義 |
|------|------|
| **APOLLO** | 鋼橋自動設計システムの総称（Align, Analyzer, SuperDesigner 等を含む） |
| **Align** | 線形計算サブシステム。`.alg` 出力 |
| **Analyzer** | 構造解析サブシステム。入力物理形式は本調査では UNKNOWN |
| **SuperDesigner** | 自動設計。MS-Access `.mdb` を中心とする |
| **SuperDrawing** | 自動製図。GSP/DWG 出力 |
| **y-Mater** | 材料計算。NPDATA.txt 入力 |
| **feature_id** | Stage 4 機能 ID（例: F4-P1-007） |
| **requirement_id** | Stage 5C 要件 ID（例: REQ-5C-0001） |
| **validation_rule_id** | 検証ルール ID（例: VAL-REQ-5C-0001） |
| **READY** | 監督検収済みギャップ分析候補（69 件）。実装済みではない |
| **OPEN** | 追加出典レビュー待ち（32 件） |
| **JIS GAP** | 一次 JIS 未取得（34 件） |
| **APOLLO RETURN** | APOLLO マニュアル追加抽出待ち。残 4 件 |
| **UNKNOWN** | 資料不足・未確認（15 件） |
| **Historical Baseline** | 調査時点で確認した出典版（Target ではない） |
| **Target Standard** | 設計採用基準。**NOT_SELECTED** |
| **Design Freeze** | 全面設計凍結。現状 **NOT_READY** |
| **Evidence** | 出典確認用 PNG 画像。classification=Evidence の根拠 |
| **Interpretation** | 資料からの合理的推定。断定を含まない |
| **Phase 1** | 非合成 RC 床版鋼鈑桁の調査スコープ |
| **Stage 4** | 機能抽出（281 features） |
| **Stage 5** | 基準トレーサビリティ |
| **Stage 6** | 既存 OSS / 骨組み計算ソフトとのギャップ分析 |
| **SPEC_READY_NOT_IMPLEMENTED** | 仕様候補は整理済みだが未実装 |
| **BLOCK_NUMERIC_AUTO_DETERMINATION** | 数値の自動確定を禁止する検証方針 |
| **crosswalk** | feature / requirement / evidence の横断表 |
| **immutable** | Stage 5 受入れ済み変更禁止パッケージ |
| **gap analysis** | 既存製品機能との差分分析（本引渡しの主目的） |

## 略語

| 略語 | 展開 |
|------|------|
| RC | Reinforced Concrete（鉄筋コンクリート） |
| RTF | Rich Text Format（計算書形式） |
| GSP | 図面中間形式（SuperDrawing） |
| DWG | AutoCAD 図面形式 |
| OSS | Open Source Software（既存 OSS。本リポジトリでは変更対象外） |
| DDB | デザインデータブック |

## Verdict 用語

```text
APOLLO_RESEARCH_SCOPE_VERDICT: COMPLETE
APOLLO_READY_SUBSET_TO_OSS_GAP_ANALYSIS_VERDICT: READY
APOLLO_FULL_DESIGN_FREEZE_VERDICT: NOT_READY
```
