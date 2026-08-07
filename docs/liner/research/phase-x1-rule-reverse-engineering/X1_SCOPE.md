# X1_SCOPE — Phase X1 スコープ定義

## 1. 目的

将来の「LINER設計ルールエンジン」の入力となる設計ルール台帳を、
FACT/INFERENCE/UNRESOLVED の区別を厳守して構築する。

## 2. 対象資料（X0台帳の正本 asset_id）

| 資料 | asset_id | 役割 |
| --- | --- | --- |
| 道路構造令の解説と運用 | DOC-X0-0145 | 道路設計ルールの根拠（P0） |
| サンプル_道路線形計算例 | DOC-X0-0143 | 実案件の線形計算（P0） |
| サンプル_道路設計図 | DOC-X0-0144 | 実案件の平面線形（P0） |
| JIP-LINER_マニュアル | DOC-X0-0035（正本） | LINER機能仕様（P0） |
| 001_サンプル_LINER計算書 | DOC-X0-0032（正本） | LINER入出力例（P0） |
| 道路橋示方書Ⅰ〜Ⅴ | DOC-X0-0066〜0070 | 橋梁設計基準（P0） |
| APOLLO SuperDesigner | DOC-X0-0091 | APOLLO自動設計製図（P0） |
| 鋼鈑桁橋_設計計算例 | DOC-X0-0001（正本） | 上部工計算例（P1） |
| 鋼鈑桁橋_図面例 | DOC-X0-0002（正本） | 上部工図面例（P1） |
| SPACER操作マニュアル | DOC-X0-0040（正本） | SPACER機能（P1） |
| level2-type2（xls） | DOC-X0-0038（正本） | レベル2地震動データ（P1） |

## 3. Rule分類（rule_category）

ROAD_CLASSIFICATION / DESIGN_SPEED / DESIGN_VEHICLE / CROSS_SECTION / LANE_WIDTH /
SHOULDER_WIDTH / MEDIAN / SIDEWALK / BICYCLE / HORIZONTAL_ALIGNMENT / CURVE_RADIUS /
CURVE_LENGTH / TRANSITION_CURVE / SUPERELEVATION / WIDENING / SIGHT_DISTANCE /
LONGITUDINAL_GRADE / VERTICAL_CURVE / CROSS_SLOPE / STATION / COORDINATE / PIER /
SPAN / GIRDER / GRID_POINT / SKEW / RAMP / INTERCHANGE / BRIDGE_INTERFACE /
DRAWING / OUTPUT / VALIDATION / EXCEPTION / UNKNOWN

## 4. 証拠ルール

- 各Ruleは最低限: source_asset_id / source_document / source_page / source_section /
  source_item / evidence type（FACT/INFERENCE/UNRESOLVED）を持つ
- FACT は source_page 必須
- 本文に根拠のない値を一般知識で補完しない

## 5. 抽出対象（X1-P01 道路構造令）

道路区分 / 設計速度 / 設計車両 / 横断面 / 車道 / 路肩 / 曲線半径 / 曲線長 / 片勾配 /
拡幅 / 緩和区間 / 視距 / 縦断勾配 / 縦断曲線

各項目: 適用条件 / 規定値 / 最小・最大 / 推奨値 / 例外 / 特例 / 注意 / 表・図 / 関連条文 / 単位 / page

## 6. やらないこと

- ソフトウェア実装 / LINERロジック変更 / GUI・曲線橋・Y字橋・JCT・Apollo・SPACER・
  上部工・3D実装
- 道路構造令全文の無差別OCR
- 出典不明Ruleの作成
- X2以降の自動開始

## 7. 完了条件

- X0.5 = GO
- X1-P00〜P06 全て research/liner-r1-planning へmerge
- RULE_INVENTORY / RULE_EVIDENCE_MATRIX 完成
- 道路構造令・JIP-LINER・実案件・道路→橋梁 mapping 完成
- Rule Engine候補統合 / UNRESOLVED分離 / provenance付与
- main未変更 / 上部工worktree未変更 / PDF原本未収録 / 実装なし
