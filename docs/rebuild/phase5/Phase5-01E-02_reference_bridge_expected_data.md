# Phase 5-01 Step E-02: Reference Bridge Expected Data（凍結案）

## 1. 目的

Phase 5-02で比較するGround Truthを事前に凍結する。
既存Reference Bridge 001（RB-S10-001・鋼鈑桁橋）の図面・設計計算書・
既存コード内golden値をSource候補とする。

確認できない値は `SOURCE_NOT_AVAILABLE` と明示し、勝手に補完しない。

- baseline: `242667fce9532daa35c1240847305559bea911fb`
- 日付: 2026-08-12

## 2. Source一覧（凍結）

| Source | 内容 |
|---|---|
| S-1 | 既存コードgolden: `SuperstructurePipelinePanel.tsx` `buildRb001GeometryInput()`（spans 40.201/51.0/40.2・bridgeLength 134.001・直線L1 azimuth 0） |
| S-2 | 既存コードgolden: `apollo/design/designConditions.ts` `RB001_DESIGN_CONDITIONS`（spanLengthsM/bridgeLengthM） |
| S-3 | 既存fixture: `substructure/__tests__/fixtures/reference-bridge-001-support-interface.json`（PR1: bearing seats y=±2.5/z=8.0/高さ0.2・reaction DL-AG1 Fz=-3325.5・girderBottomElevation 8.4・deckElevation 10.0） |
| S-4 | docs/apollo/step10/reference_bridge_001/（STEP1〜・RB-001図面/計算書の要約） |
| S-5 | 鋼鈑桁橋図面・設計計算書（外部資料・要確認） |
| S-6 | 既存grillage test fixture（`design.test.ts` RB001・8 nodes/10 members/8 supports） |

## 3. Expected Data 一覧（凍結）

凡例: tol = tolerance / method = 比較方法 / PASS条件

| # | 項目 | Source | Expected | unit | tol | method | PASS条件 |
|---|---|---|---|---|---|---|---|
| RB-01 | bridge length | S-1/S-2 | 134.001 | m | 1e-3 m | SuperstructureDocument.bridgeLengthM（Span Handoff Σ） | \|値-134.001\| <= tol |
| RB-02 | span lengths | S-1/S-2 | [40.201, 51.0, 40.2] | m | 1e-3 m | spanReferences[].spanLength | 全spanで \|値-expected\| <= tol |
| RB-03 | girder length | S-1 | 134.001（= bridge length・直線） | m | 1e-3 m | girderLines.stationEnd - stationStart | 一致 |
| RB-04 | support stations | S-1 | [0, 40.201, 91.201, 134.001] | m | 1e-3 m | supportReferences[].station | 全support一致 |
| RB-05 | skew | S-1（直線） | 0 | rad | 1e-6 | skewAngleRad | 0（直線） |
| RB-06 | girder count | S-1 | 2（BOUND_DEMO_GIRDERS ±4.0） | 本 | — | girderConfiguration.girderCount | 2 |
| RB-07 | girder spacing | S-1 | 8.0（±4.0） | m | 1e-3 m | girderLines offset差 | 8.0 |
| RB-08 | girder depth | S-5 | SOURCE_NOT_AVAILABLE（要確認） | m | — | — | 未確認時は比較しない |
| RB-09 | deck width | S-4/S-5 | SOURCE_NOT_AVAILABLE（要確認） | m | — | — | 未確認時は比較しない |
| RB-10 | support/bearing position | S-3（PR1: y=±2.5, z=8.0） | y ±2.5 / z 8.0 | m | 1e-2 m | bearingSeats[].position（新Handoff） | 全seat一致（既存support-interface fixtureと突合） |
| RB-11 | key cross-section properties | S-5 | SOURCE_NOT_AVAILABLE（要確認） | — | — | sectionProperties出力 | 未確認時は比較しない |
| RB-12 | major reaction values | S-3 | DL-AG1 PR1 Fz = -3325.5 | kN | 1%（=±33.3 kN） | reactionResults（grillage） | \|値-(-3325.5)\|/3325.5 <= 0.01 |
| RB-13 | key analysis results | S-4/S-6 | SOURCE_NOT_AVAILABLE（8 nodes/10 members/8 supports構成はS-6で確認） | — | — | grillageModel node/member/support数 | S-6と一致 |
| RB-14 | geometry dimensions | S-1 | 直線L1・azimuth 0 | rad | 1e-6 | snapshot alignment references | 一致 |

## 4. 比較方法（凍結）

- Unit: 設計書（E-03）のReference Bridgeテストで実施
- method: 新moduleの出力を正規化（単位m/rad/kN）して expected と比較
- 比較対象は **derived出力（Handoff・reactionResults）と、入力の再現（girder/span）** の2層
- fingerprint一致テスト（同一入力→同一出力）も含む

## 5. SOURCE_NOT_AVAILABLE の扱い（凍結）

- RB-08/09/11（桁深さ・床版幅・断面性能）は外部資料S-5の確認が必要
- 確認できない限り**補完しない**。Expected Data表に `SOURCE_NOT_AVAILABLE` を維持し、
  比較対象から除外（fail-closedではなく「未定義」）
- Phase 5-02でS-5確認後に本表を更新（設計書変更としてPR）

## 6. 検証・tests観点（WP-J）

- RB-01〜07・RB-10・RB-12を既定PASS条件としてE2Eに組み込み
- RB-08/09/11はSOURCE_NOT_AVAILABLE（スキップ・明示）
