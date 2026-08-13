# Phase 7-01B: Substructure → Analysis Adapter（設計Freeze）

- Phase: 7-01 Step B
- baseline: `f736d5d4326248fed42f60679a6d6bb602f5e5d6`
- 日付: 2026-08-13
- 凍結: Design Decision D-01 / D-04 / D-08 / D-09
- 対応R: R4 / R5（下部工入力側）

## 1. 目的

SubstructureDocument（正本・Phase 6）を唯一sourceとして、AnalysisDocumentの下部工由来部分
（support位置・bearing seat接続・foundation spring・elastic support）を生成するAdapterを凍結する。

**Phase 7初期スコープのIN/OUTを確定**（Phase 7-00では下部工詳細FEMがDEFER候補だった）。

## 2. IN / OUT（Freeze）

### 2.1 IN-SCOPE（Phase 7-02で解析modelへ反映）

| 項目 | 内容 |
|---|---|
| support位置 | supportReferences（supportId/supportType/station/position/skew）→ Analysis support node位置 |
| bearing seat接続 | bearingReactionReferences.bearingSeats → Analysis node/support生成 |
| bearing種別→DOF拘束 | fixedOrMovable/bearingType → mapping（bearing_support_spring_contract） |
| foundation spring | SubstructureDocumentのfoundation/pile情報→spring（**値が資料に無ければSOURCE_NOT_AVAILABLEで閉じる**） |
| 下部工supportの高さ | 支承座標（girderBottomElevation/deckElevation）→ 解析nodeのz補正 |

### 2.2 OUT-OF-SCOPE（DEFER・正式確定）

| 項目 | 内容 | 扱い |
|---|---|---|
| 下部工部材のFEM | 柱・キャップ・フーチング・杭の部材要素化 | **DEFER**（下部工詳細FEM） |
| 下部工剛性 | 柱/フーチングの剛性を上部工解析へ組み込む | **DEFER** |
| 下部工反力の設計照査 | reactionCasesはNOT_AUTHORIZED入力データとして維持 | **DEFER**（設計照査Phase） |
| 下部工土圧・水圧 | — | **DEFER** |
| advanced soil interaction | — | **DEFER** |

> **決定**: Phase 7-02では下部工は「support/bearing/foundation springの入力源」としてのみ解析modelへ反映。
> 下部工部材FEM・下部工剛性の組み込みはDEFER（Phase 7-02スコープ外）。

## 3. データフロー（Freeze）

```
SubstructureDocument（正本・唯一source）
  ├─ supportReferences.supports[]（supportId/station/position/skew）
  ├─ bearingReactionReferences.bearingSeats[]（seatId/supportId/girderId/position/orientation/fixedOrMovable）
  ├─ bearingReactionReferences.girderBottomElevation/deckElevation
  └─ support.pier/abutment.footing/pileGroup（foundation情報）
        ↓ SubstructureAnalysisAdapter（新規）
  AnalysisDocument（下部工由来部）
     ├─ supports（support位置・local frame・bearing seat対応）
     ├─ bearings（seatId・mapping結果）
     ├─ foundationSprings（値が有ればCONFIRMED・無ければSOURCE_NOT_AVAILABLE）
     └─ support node z補正（girderBottomElevation）
```

## 4. 既存資産との関係

| 既存資産 | 役割 | 扱い |
|---|---|---|
| `substructurePhase5Adapter.ts`（buildBearingReactionFromHandoff） | SuperstructureHandoff→bearing seats+reaction cases | **KEEP**（下部工正本側の受領・維持） |
| `substructurePhase4Adapter.ts`（buildSupportPlacementFromHandoff） | support placement | **KEEP** |
| `substructureTypes.ts`（SubstructureDocument） | 正本 | **KEEP**（source） |
| `substructure/model.ts`（Support/PierData/Footing/PileGroup） | canonical入力型 | **KEEP**（source） |

## 5. Support生成仕様（Freeze）

| field | source | 規則 |
|---|---|---|
| supportId | supportReferences.supports[].supportId | 直写し・一意 |
| supportType | 同上 | abutment / pier |
| station | 同上 | m・有限 |
| position | 同上（domainX/domainY/elevation） | project-global XYZへ |
| skewAngleRad | 同上 | rad・CCW positive（bridgeLayout authority） |
| localFrame | bearing seat orientation | tangent/transverse/vertical |
| bearingSeats | bearingReactionReferences.bearingSeats | seatId `BRG-{supportId}-{girderId}` |

## 6. Bearing → Support 接続（R5解決・詳細はbearing_support_spring_contract）

- 各bearing seat → 対応Analysis node（supportPoint:{supportId}:{girderId}）へ support生成。
- fixedOrMovable / bearingType → DOF拘束 mapping（詳細は `Phase7-01B_bearing_support_spring_contract` §3.3）。
- 位置ベース一律拘束を廃止（bearing種別に応じた拘束）。

## 7. Foundation Spring（R4解決・詳細はfoundation_spring_release_mpc）

- source: `support.pier.footing/pileGroup` / `support.abutment.footing/pileGroup`。
- spring stiffness値は**資料に存在する場合のみ**CONFIRMED。存在しない場合は `SOURCE_NOT_AVAILABLE` で閉じる（**補完禁止**・`NOT_AVAILABLE`は一般状態）。
- Phase 7-02既定: 下部工foundation springは**契約実装のみ**（stiffness値がsourceに無いためSOURCE_NOT_AVAILABLE・解析はbool supportで実行）。

## 8. reactionCasesの扱い

- `bearingReactionReferences.reactionCases[]`は下部工側のNOT_AUTHORIZED入力データ（KEEP）。
- 解析側ではauthorized扱いしない（下部工moduleの保持・表示のみ）。
- AnalysisDocumentには含めない（下部工正本に属する）。

## 9. Adapter出力（AnalysisDocument下部工部）

- supports / bearings / foundationSprings（各sourceEntityId + sourceKind・D-11）。
- 上流fingerprint: `sourceReferences.substructure.dataFingerprint`。

## 10. validation / fail-closed

| 項目 | 挙動 |
|---|---|
| support位置欠損 | NOT_AVAILABLE（解析不可にはせず・bool support既定で閉じる） |
| bearing seat dangling | reject（girder存在確認） |
| foundation値欠損 | SOURCE_NOT_AVAILABLE（補完禁止） |
| skew非有限 | reject |

## 11. tests観点

- support位置・local frame生成
- bearing seat接続（seatId一意・girder対応）
- fixedOrMovable→DOF拘束mapping
- foundation spring（CONFIRMED/SOURCE_NOT_AVAILABLE）
- reactionCasesが解析側でauthorized扱いされないこと
- 再生成determinism
