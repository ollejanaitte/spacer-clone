# Phase 6-01 Step D: Design / Calculation Scope Freeze（凍結案）

## 1. 目的

Phase 6-02で「何を実計算として完成させるか」「何をHOLD/DEFERするか」をFreezeする。
既存runDesign framework / geometricQuantity / calculationAdapter / adapterMapper / testCalculationEngine / calculationOutputを最大限活かす。

- baseline: `d700edd707958db28ee6ada9f5d217bf3dced01e`（Step C merge後）
- 日付: 2026-08-13

## 2. 区分（凍結）

| 区分 | Phase 6-02で実施 | 内容 |
|---|---|---|
| Geometry | ✅ | 下部工3D/2D生成（既存solid資産KEEP） |
| quantity | ✅ | 概算数量（体積・杭長・geometricQuantity実計算・DERIVED） |
| superstructure reaction input | ✅（入力データのみ） | Phase 5 Handoffから受領・NOT_AUTHORIZED保持 |
| substructure self weight | ✅（参考） | 概算自重（体積×単位重量・参考値） |
| basic design input | ✅ | 材料・許容値はREFERENCE保持（認証Phaseで採用） |
| design status | ✅ | NOT_AUTHORIZED/INCOMPLETE/READY/STALE/OK/NG/WARNING/ERROR（自動昇格禁止） |
| calculation adapter | ✅ | calculationAdapter境界（Phase 6-02はTEST/MOCK維持） |
| calculation result | ✅（framework） | runDesign出力（構造照査はHOLD_NOT_AVAILABLE） |
| quantity result | ✅ | quantityResults（実計算） |
| 本格構造照査 | ❌ DEFER | stability/member/foundation/pileの実数値化 |
| 耐震照査 | ❌ DEFER | seismicDesign framework保持 |
| 鉄筋設計 | ❌ DEFER | reinforcementDesign framework保持 |
| 実計算engine（backend or 本実装） | ❌ DEFER | 認証・evidence Phase |
| 高度FEM | ❌ DEFER | 後続Phase |
| 成果品（図面/計算書/数量書） | ❌ DEFER | 成果品Phase |

## 3. 実計算の範囲（IN-SCOPE・Phase 6-02）

### 3.1 quantity（geometricQuantity・既存KEEP）
- フーチング体積: length×width×thickness
- 杭体積: π×r²×length×pileCount
- 橋脚/橋台body: 形式別体積（既存computeSupportQuantity）
- 概算コンクリート量/杭総延長（DERIVED・実計算）

### 3.2 design status / authorization（fail-closed）
- `designStatus`: 未認証はNOT_AUTHORIZED維持・自動昇格禁止
- `reactionStatus`: NOT_AUTHORIZED（入力データ）・正式設計計算へ自動採用しない
- PASS/FAIL昇格条件: **人の承認**（Phase 6-02では対象外）

### 3.3 calculation adapter（境界維持）
- `engineLabel: "TEST"|"MOCK"`・`isFormalDesign: false`（Phase 6-02維持）
- 実engine受領時（後続Phase）に拡張

## 4. DEFER資産の扱い（Phase 6-02で追加実装しない）

- 本格構造照査・耐震・鉄筋・実計算engine・高度FEMはPhase 6-00でDEFER決定
- **Phase 6-02へ勝手に追加しない**
- もし変更する場合は理由・scope・testsを明示（本設計書改訂としてPR）

## 5. 未認証Reaction Authorization（凍結）

| 利用 | 可否 |
|---|---|
| Geometry/placement参考 | ✅（位置・方向の参考・正本にしない） |
| Design calculation採用 | ❌（未認証） |
| PASS/FAIL昇格 | ❌（自動昇格禁止） |
| 状態保持 | HOLD_NOT_AVAILABLE / NOT_AUTHORIZED / NOT_AVAILABLEを維持・消さない |

## 6. 既存資産の再利用（Phase 6-02）

| 資産 | 利用 |
|---|---|
| designEngine.runDesign | framework（geometric qty実計算・構造HOLD） |
| geometricQuantity | 概算数量実計算 |
| calculationAdapter / adapterMapper | 境界・revision（stale検出） |
| testCalculationEngine | TEST/MOCK（Phase 6-02維持） |
| calculationOutput | 計算書CSV/JSON（**Phase 6-02では内部debug出力のみ**・成果品はDEFER） |
| designTypes | ReactionCaseData/SuperstructureInput |

## 7. テスト（T6-DS系）

- T6-DS-001: quantity実計算（体積/杭長・既存geometricQuantity.test再利用）
- T6-DS-002: designStatus NOT_AUTHORIZED維持（自動昇格禁止）
- T6-DS-003: reaction入力 NOT_AUTHORIZED（正式設計へ非採用）
- T6-DS-004: calculationAdapter TEST/MOCK境界
- T6-DS-005: DEFER資産が誤実装されない（seismic/reinforcement framework維持）
