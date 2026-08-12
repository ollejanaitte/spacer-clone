# Phase 6-01 Step E: Reference Bridge Expected Data（凍結案）

## 1. 目的

Phase 6-02で照合するGround Truthを事前に凍結する。
既存Reference Bridge 001（RB-S10-001）・山岳サンプル・下部工goldenをSource候補とする。
根拠のない値は補完しない（SOURCE_NOT_AVAILABLE / KNOWN_DATA_DISCREPANCY / NOT_AUTHORIZEDを明示）。

- baseline: `03bf60f270aaa435506be2e5962f8a2ea513ef6e`（Step D merge後）
- 日付: 2026-08-13

## 2. Source一覧

| Source | 内容 |
|---|---|
| S-1 | `frontend/src/substructure/__tests__/fixtures/reference-bridge-001-support-interface.json`（PR1: bearingSeats y=±2.5/z=8.0/h=0.2・girderBottom 8.4・deck 10.0・DL-AG1 permanent \|Fz\|=3325.5・LL-MAX-AG1 liveLoad \|Fz\|=1378.9） |
| S-2 | `substructure-planning/verification/evidence/m3-03/design-result-P1.json`（P1 pier: totalConcreteVolume 187.92 m³・footing 126・column 40.32・beam 21.6・status hold_not_available） |
| S-3 | `frontend/src/liner/samples/mountain-viaduct-500/bridgeFixture.ts`（A1@50・P1..P7@100..400・A2@450・skew π/2・bearingOffsets ±3.25） |
| S-4 | `substructure-planning/examples/sample-project.json`（v0.1.0下部工サンプル） |
| S-5 | 外部資料（橋台/橋脚図面・設計計算書・要確認） |

## 3. Expected Data 一覧（凍結）

凡例: tol=tolerance / method=比較方法 / PASS条件

| # | 項目 | Source | Expected | unit | tol | method | PASS条件 |
|---|---|---|---|---|---|---|---|
| SB-01 | A1/A2位置（station） | S-3 | A1=50 / A2=450 | m | 1e-3 | supportReferences.supports[].station | 一致 |
| SB-02 | P1..Pn位置（station） | S-3 | P1..P7@100..400 | m | 1e-3 | supportReferences.supports[].station | 全P一致 |
| SB-03 | support type | S-3 | A1/A2=abutment・P1..P7=pier | — | — | supports[].supportType | 一致 |
| SB-04 | skew | S-3 | π/2（=1.5707963） | rad | 1e-6 | supports[].skewRad | CCW一致 |
| SB-05 | bearing seat位置 | S-1 | PR1: y=±2.5 / z=8.0 | m | 1e-2 | bearingSeatReferences（6課題2解決後） | 全seat一致 |
| SB-06 | bridge seat elevation | S-1 | girderBottomElevation=8.4 | m | 1e-2 | derived（6課題6） | 一致 |
| SB-07 | deck elevation | S-1 | deckElevation=10.0 | m | 1e-2 | derived（6課題6） | 一致 |
| SB-08 | pier height | S-5 | SOURCE_NOT_AVAILABLE | m | — | — | 未確認時は比較しない |
| SB-09 | cap dimensions | S-5 | SOURCE_NOT_AVAILABLE | m | — | — | 未確認時は比較しない |
| SB-10 | column dimensions | S-5 | SOURCE_NOT_AVAILABLE | m | — | — | 未確認時は比較しない |
| SB-11 | footing dimensions | S-5 | SOURCE_NOT_AVAILABLE | m | — | — | 未確認時は比較しない |
| SB-12 | foundation type | S-5 | SOURCE_NOT_AVAILABLE | — | — | — | 未確認時は比較しない |
| SB-13 | pile count/diameter/spacing | S-5 | SOURCE_NOT_AVAILABLE | — | — | — | 未確認時は比較しない |
| SB-14 | terrain elevation | S-3（山岳terrain） | terrainElevation(support位置) | m | 1e-2 | terrainReferences参照 | 一致（Terrain Moduleと） |
| SB-15 | reaction input | S-1 | PR1 DL-AG1 \|Fz\|=3325.5（permanent） | kN | — | designInputs（NOT_AUTHORIZED） | 受領・正式採用しない |
| SB-16 | reaction input（live） | S-1 | PR1 LL-MAX-AG1 \|Fz\|=1378.9（liveLoad） | kN | — | 同上 | 受領・正式採用しない |
| SB-17 | quantity total | S-2 | P1 totalConcreteVolume=187.92 | m³ | 1e-2 | quantityResults（geometricQuantity） | 一致 |
| SB-18 | quantity column | S-2 | 40.32 | m³ | 1e-2 | 同上 | 一致 |
| SB-19 | quantity footing | S-2 | 126.0 | m³ | 1e-2 | 同上 | 一致 |
| SB-20 | quantity beam | S-2 | 21.6 | m³ | 1e-2 | 同上 | 一致 |
| SB-21 | design status | S-2 | hold_not_available | — | — | designResults.status | NOT_AUTHORIZED/HOLD維持 |
| SB-22 | bearing seat offset | S-3 | mountain bearingOffsets ±3.25 | m | 1e-3 | bearingSeatReferences | 一致 |

## 4. 未認証値（NOT_AUTHORIZED）

- SB-15/16（reaction入力）: 外部計算書由来の宣言値。Phase 6-02では**入力データとして受領のみ**。
  正式設計計算・PASS/FAILへ自動採用しない（fail-closed）
- SB-21（design status）: HOLD_NOT_AVAILABLE維持（構造照査未認証）

## 5. KNOWN_DATA_DISCREPANCY / SOURCE_NOT_AVAILABLE

- SB-08〜13（寸法）: SOURCE_NOT_AVAILABLE（S-5外部資料要確認・補完しない）
- 既知差異があればKNOWN_DATA_DISCREPANCYとして明示（補完しない）

## 6. 比較方法（凍結）

- Unit正規化（m/rad/kN/m³）して比較
- 比較対象: derived出力（handoff・quantity・design status）＋canonical入力（support配置・寸法）
- 対象外（SOURCE_NOT_AVAILABLE）はスキップ（fail-closedではなく「未定義」）

## 7. テスト（T6-RB系）

- T6-RB-001: SB-01〜07/14/22（support配置・bearing・標高・terrain）
- T6-RB-002: SB-15/16（reaction入力受領・正式採用しない）
- T6-RB-003: SB-17〜20（quantity golden照合）
- T6-RB-004: SB-21（design status）
- T6-RB-005: SOURCE_NOT_AVAILABLEスキップ（SB-08〜13）
