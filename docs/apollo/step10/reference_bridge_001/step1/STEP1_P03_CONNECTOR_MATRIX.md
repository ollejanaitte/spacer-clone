# STEP 1-P03 — INTERFACE_CONNECTOR_MATRIX

> **Authority:** Reference Bridge 001 (RB-S10-001) — 上部工一気通貫
> **Status:** STEP 1 設計
> **正本:** `phase6_0/connectors/*`（7 仕様）・`system_ownership_matrix.csv`（OWN-001..019）・`existing_connector_inventory.csv`（CONN-001..017）

## 凡例
- P=producer / C=consumer / O=owner
- `test` 欄は既定: unit(U)/contract(Ct)/integration(I)/parity(P)

## Connector 一覧

| ID | Connector | From→To | P | C | O | Input | Output | Error | test |
|----|-----------|---------|---|---|---|-------|--------|-------|------|
| CN-01 | Alignment Connector | LINER→Geometry Engine | LINER | Geometry | Alignment Connector | station/offset/alignmentId | `AlignmentPointSample`（XYZ/azimuth/frame/curvature） | `AlignmentSamplingError`（LINER 不在） | U/I（実装済 6-1B） |
| CN-02 | Geometry Input Adapter | Common Model→Engine Input | Common Model | Geometry | Geometry Input Adapter | Common Bridge Data Model | `GeometryEngineInput`（ID+state, 計算なし） | 欠落 entity は状態伝播 | U/I（実装済 6-1B） |
| CN-03 | Geometry Engine | Input→GeometrySnapshot | Geometry | 全 consumer | Geometry Engine | `GeometryEngineInput`+LINER | `GeometrySnapshot`（immutable+fingerprint） | `AlignmentSamplingError`/geometryIssues | U/P（実装済 6-1E） |
| CN-04 | Structural Model Connector | Snapshot→Structural/FEM | Geometry | Structural | Structural Connector | GeometrySnapshot（nodes/members/frames） | 解析モデル（nodes/members/supports） | 未実装（6-4a で実装） | I（2-10） |
| CN-05 | Analyzer | Structural→Results | Analyzer | Design | Analyzer(backend) | 解析モデル+荷重ケース | displacement/reactions/memberEndForces | 数値認証ゲート（結果 binding は GRANTED 後） | U/P（既存 solver tests） |
| CN-06 | Design Engine 入力 | Common Model+解析結果→設計 | Design | Design | Design Engine | 設計 document + 解析結果 | 照査・断面決定・NG→再設計 | 照査 NG → 再設計ループ | U/I（2-13..19） |
| CN-07 | 3D Connector | Snapshot→Render Model | Geometry | 3D | 3D Connector | GeometrySnapshot+設計結果 | `ApolloVisualizationModel`（表示専用） | 表示用 warning（モデル非保存） | I（2-06） |
| CN-08 | Drawing Connector | Snapshot→Drawing Model | Geometry | Drawing | Drawing Connector | GeometrySnapshot+設計結果 | drawing model（GA/標準断面） | 未対応（曲線/skew 等）を manifest に明記 | I（2-20） |
| CN-09 | Report Connector | 設計結果→Report Model | Design | Report | Report Connector | 設計結果+照査結果 | ReportModel（16 章） | formal 出力は認証ゲート | I（2-20） |
| CN-10 | Quantity Connector | Snapshot+設計→数量 | Geometry/Design | Quantity | Quantity Connector | GeometrySnapshot+断面 | quantity model（CSV/JSON） | basis 明記（EXACT/APPROX 等） | I（2-20） |
| CN-11 | Export Connector | Snapshot→STL/DXF/IFC | Geometry | Export | Export Connector | GeometrySnapshot（solid 対象） | STL(mm)/DXF(mm)/IFC | 単位変換単一ポリシー | I（2-09） |
| CN-12 | Substructure Connector | Snapshot→下部工 | Geometry | Substructure | Substructure Connector | GeometrySnapshot supports | pier/abutment 配置 | 別ラボ（参考値） | I（2-08） |
| CN-13 | Persistence Connector | UI⇔Common Model | UI | Common Model | Persistence | save/load/import/export | 永続化 JSON | 不整合は load 失敗(fail-closed) | U/I（既存） |
| CN-14 | Replay Connector | fixture→全層→出力 | Replay | Replay | Replay | RB-001 fixture | Replay 結果 + discrepancy | FAIL 分類 | P（2-12） |

## 未定義 Connector = 0

上記 CN-01..14 で、STEP 2 実装対象は CN-04/06/07/08/09/10/11/12/14。
うち設計済み・未実装（CN-04,06,07,08,09,10,12,14）は P04/P05/P07 で interface 詳細を確定する。

## 横断ルール

- 各 consumer は GeometrySnapshot を読み、station→XYZ・offset・skew・elevation を再計算しない。
- 各 connector は transform を宣言し、隠れた変換を持たない。
- 各 connector の producer/consumer は 1 対多を許すが、責務は重複しない。
- unresolved は connector 境界で数値に捏造しない。
