# Phase 5-01 Step F: Design Freeze Gate（凍結判定）

## 1. 目的

Phase 5-01の全設計書をcross-reviewし、矛盾を除去した上で
Design Freeze Gateを実行する。本GateのPASSをもってPhase 5-02実装を許可する。

- baseline: `2a49e7da6cdb05f4ff0b6f25ccafd52b8014783e`（Step E merge後）
- 日付: 2026-08-12
- Gate判定: **PASS**

## 2. Cross-Review 実施結果

GPT-5.6 Sol（read-only）による全12設計書のcross-reviewを実施。
**22件の不整合を検出**し、全て解消した。

### 2.1 検出・修正済み項目（Sol review #1〜#22）

| # | 指摘 | 修正先 | 状態 |
|---|---|---|---|
| 1 | RB span合計（131.401≠134.001）不整合 | E-02: station整合値 [40.201,51,42.8] をExpected化＋KNOWN_DATA_DISCREPANCY明示 | 修正済 |
| 2 | girder offset ±4.0 vs bearing ±2.5（別fixture混同） | E-02: 別々の参照として分離・注記 | 修正済 |
| 3 | Fz=-3325.5 符号規約 | E-02: \|Fz\|比較＋D-02変換境界明示 | 修正済 |
| 4 | ContractにbridgeId/bridgeLength/stationStart/Endが無い | A-01: bridgeLayoutReference.bridgeId経路＋spanReferences.spans参照へ統一 | 修正済 |
| 5 | spanReferences必須×非保存の矛盾 | A-01 §4.11/4.12・E-01 §3.1: 永続化DTOでtransient（再生成）化 | 修正済 |
| 6 | digestフィールド名不統一 | A-01 §4.22: `modelReference.grillageModelDigest`に統一・E-01追従 | 修正済 |
| 7 | structuralSystem canonical/derived混同 | A-01 §4.14: canonical入力＋derived解決分離・整合検証 | 修正済 |
| 8 | deckConfiguration width混同 | A-01 §4.16: canonical入力（厚さ/overhang）とresolvedWidth（derived）分離 | 修正済 |
| 9 | girderSpacing未定義・offset自動生成の矛盾 | A-01 §4.15・C-01: girderSpacingM canonical追加・重複offset禁止 | 修正済 |
| 10 | 桁断面design modelがContractに無い | A-01 §4.15・C-01 §4.1: girderSectionModel追加（null許容・MISSING） | 修正済 |
| 11 | 横桁/支承詳細DEFER×基本照査必須の矛盾 | D-01 §4.1: 入力MISSING時はNOT_AVAILABLE（照査保留）と明確化 | 修正済 |
| 12 | 構造自重の二重計上 | A-01 §4.21・D-01 §2.1: DL-STRUCTURAL partition明示（主桁+2次部材/DECK別） | 修正済 |
| 13 | 反力authorized状態の扱い不統一 | A-01 §4.24: NOT_AUTHORIZEDを入力データとして受渡可（人の承認までauthorized化しない） | 修正済 |
| 14 | ReactionCase形不一致（unit/support集約/seat別） | A-01 §4.24・D-02: seat別反力（seatId/girderId含む）・unit/momentUnit統一 | 修正済 |
| 15 | documentReference未定義・互換の曖昧さ | D-02 §5: documentId（UUID）定義＋toSupportInterfaceEntry変換DTO | 修正済 |
| 16 | local座標（x沿線）とglobal XYZ混在 | A-01 §4.12・D-02: Project-global XYZとstation基準local frameを分離 | 修正済 |
| 17 | 3D/CIMスコープ矛盾 | A-00 §2.2・C-02 §2: 統合viewerはPhase 5-02対象・CIM exportはDEFER | 修正済 |
| 18 | throw vs ok=false混在 | A-01 §5.7・E-03 §2: 層別fail-closed（validator=ok=false/binding=typed exception） | 修正済 |
| 19 | テスト漏れ（status遷移/STALE/chain/migration等） | E-03 §3.9: T5-REV/DOC/CHN/DNG/DER/MIG/DIG/CRC/PH6追加 | 修正済 |
| 20 | WP依存順（3Dが配置より先・WP-I依存漏れ） | E-04: WP-C1/C2分割・WP-D→WP-C2・WP-I=WP-C1/F依存 | 修正済 |
| 21 | 「反力本計算」OUT-OF-SCOPE×数値Gate矛盾 | A-00 §2.3・D-01 §3.3: 認証済み本計算は対象外・NOT_AUTHORIZED基本解析は対象 | 修正済 |
| 22 | projectSuperstructure/GeometrySnapshot表現不統一 | A-00 §7: 既存ファイル無変更・新adapter追加。Snapshot=凍結derived契約 | 修正済 |

### 2.2 整合確認済み項目

- 参照循環: なし（canonical reference循環なし）
- 単位: m / rad / kN / kNm 統一
- version: SuperstructureDocument 0.1.0 / GeometrySnapshot v6.1.0 / .spacerproj v1.0.0 整合
- baseline SHA: 各設計書記載は現在HEADの祖先
- KEEP資産: 削除・破壊の直接指示なし
- DEFER資産: 誤実装指示なし

## 3. Freeze対象（全FROZEN）

| 設計書 | 内容 | 状態 |
|---|---|---|
| Phase5-01A-00 | Phase 5 Master Design | **FROZEN** |
| Phase5-01A-01 | SuperstructureDocument Contract | **FROZEN** |
| Phase5-01B-01 | Bridge Layout Input + Adapter/Connector/Binding Mapping | **FROZEN** |
| Phase5-01B-02 | Migration設計 | **FROZEN** |
| Phase5-01C-01 | Geometry完全設計（Coordinate/skew/曲線橋） | **FROZEN** |
| Phase5-01C-02 | 3D / CIM設計 | **FROZEN** |
| Phase5-01D-01 | Load / Analysis / Design Check設計 | **FROZEN** |
| Phase5-01D-02 | Bearing / Reaction Handoff設計 | **FROZEN** |
| Phase5-01E-01 | Persistence設計 | **FROZEN** |
| Phase5-01E-02 | Reference Bridge Expected Data | **FROZEN** |
| Phase5-01E-03 | Test Specification | **FROZEN** |
| Phase5-01E-04 | Phase 5-02 Work Package | **FROZEN** |
| 本設計書 | Design Freeze Gate | **PASS** |

## 4. Freeze禁止項目の確認（残存なし）

| 確認項目 | 結果 |
|---|---|
| unresolved TODO / TBD / FIXME | なし（設計書内に未解決マーカーなし） |
| unknown owner | なし（全項目owner確定） |
| undecided schema / unit / sign / ID | なし（A-01に確定） |
| undefined tolerance / PASS条件 | なし（E-02/E-03に確定） |
| implementation-time design decision | なし（Phase 5-02で固定値を実装する事項は全て本文中に明示済み） |

## 5. Design Freeze Gate 判定

| 判定項目 | 状態 |
|---|---|
| 全設計書FROZEN | ✅ |
| 矛盾除去（Sol review 22件解決） | ✅ |
| Freeze禁止項目残存なし | ✅ |
| 実装担当が追加設計せずPhase 5-02開始可能 | ✅ |
| **Design Freeze Gate** | **PASS** |
