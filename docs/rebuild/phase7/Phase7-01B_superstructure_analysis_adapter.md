# Phase 7-01B: Superstructure → Analysis Adapter（設計Freeze）

- Phase: 7-01 Step B
- baseline: `f736d5d4326248fed42f60679a6d6bb602f5e5d6`
- 日付: 2026-08-13
- 凍結: Design Decision D-01 / D-06 / D-10 / D-11 / D-13
- 対応R: R2 / R3 / R6 / R7 / R24

## 1. 目的

SuperstructureDocument（正本）を唯一sourceとして、AnalysisDocumentの上部工由来部分
（node / member / section / material / load）を決定論生成するAdapterを凍結する。

既存 `superstructureAnalysisAdapter.ts`（DORMANT）をADAPTし、
`buildGrillageModel`（`apollo/design/grillageModel.ts`）を再構成する。

## 2. データフロー（Freeze）

```
SuperstructureDocument（正本・唯一source）
  + GeometrySnapshot（geometry authority・KEEP）
        ↓ SuperstructureAnalysisAdapter（再構成・ADAPT）
  AnalysisDocument（上部工由来部）
     ├─ nodes（support点 + girder panel点 + 横桁点）
     ├─ members（主桁縦部材 + 横桁部材）
     ├─ sections / materials（実断面・実材料・R7）
     ├─ bearings（bearing seat → support mapping）
     ├─ supports（bool DOF / spring）
     └─ loadCases / nodalLoads / memberLoads（R2・支間分布載荷）
        ↓
  Solver Input Adapter（Phase7-01C・backend project生成）
```

## 3. Adapter境界（ADAPT対象・既存資産との関係）

| 既存資産 | 役割 | 扱い |
|---|---|---|
| `superstructureAnalysisAdapter.ts`（buildSuperstructureAnalysisInput / reactionsFromResult / applySuperstructureAnalysisResult / defaultAnalysisRunner） | SuperstructureDocument→解析入力 | **ADAPT**：buildSuperstructureAnalysisInputを新AnalysisDocument生成へ再構成。reactionsFromResultはIF3直接読取に修正（R10） |
| `apollo/design/grillageModel.ts`（buildGrillageModel） | GeometrySnapshot→grillage model | **再構成（骨格KEEP・荷重/mesh/topology REWRITE・R24）** |
| `superstructureLoadModel.ts`（buildDeadLoads / comboOneTotalKN） | 死荷重計算 | **KEEP**（sourceとして利用） |
| `superstructureComponents.ts`（computeSuperstructureSectionProperties） | 断面性能 | **KEEP**（section source） |
| `superstructureHandoff.ts`（buildSuperstructureHandoff） | 下部工handoff | **KEEP**（別目的。解析とは独立） |

## 4. Node生成仕様（Freeze）

| node種別 | source | 生成規則 | ID（sourceEntityId） |
|---|---|---|---|
| 支持点node | GeometrySnapshot.supportPoints | support × girder交点の全点 | `supportPoint:{supportId}:{girderId}`（既存 `N-{supportId}-{girderId}` を継承） |
| girder panel node | GeometrySnapshot.girderLines[].points（GirderStationPoint） | 各girder線のstation点（support外のパネル点） | `girderPanel:{girderId}:{stationM}` |
| 横桁node | crossBeamConfiguration.crossBeams[] station × girderLines | 横桁位置×girder交点 | `crossBeamPoint:{crossBeamId}:{girderId}` |
| 中間節点 | mesh分割（D-13） | 支間をmeshDivision分割（grillage用） | `meshNode:{girderId}:{index}` |

- 座標: project-global XYZ（m）。station/offsetはsnapshot authority（再計算しない）。
- 重複防止: 同一source→同一nodeを統合（support点とgirder panel点が一致する場合はsupport点nodeを共用）。

## 5. Member生成仕様（Freeze）

| member種別 | source | 生成規則 |
|---|---|---|
| 主桁（mainGirder） | girderLines × 支間（support点間） | 縦部材。連続橋は支間毎（end node共有で連続） |
| 横桁（crossBeam） | crossBeamConfiguration.crossBeams[] | 各横桁位置でgirder間を接続（横部材） |
| 横構（crossFrame） | crossFrameConfiguration | **DEFER**（配置のみ・Phase 7-02でmember化しない） |
| 横繋ぎ・補剛 | — | **DEFER** |

- **orientationVector（R1・Sol review #16）**: member毎に**決定論生成**（global固定ではない）。
  - `localX = unit(nodeJ − nodeI)`（member軸・node順序は解析model生成時に確定）
  - `localZ = global up（0,0,1）をlocalX直交面へ投影・正規化`（常に上向き）
  - `localY = localZ × localX`（右手系）
  - `orientationVector = localY`（backend engineのorientation規約に一致）
  - **node順序規則**: localZが常に+upになるよう nodeI/nodeJ を整序（逆向きmemberの符号反転を防止・#16）。
  - 重力（DL）は **global `wz < 0`** で転送（local方向に依存させない）。
- elementType: `frame`（12DOF Euler-Bernoulli・KEEP solver）。

## 6. Section / Material生成仕様（R7解決）

- **Section**:
  - source: `SuperstructureDocument.girderConfiguration.girderSectionModel`（depthM/webThicknessM/flanges/areaM2/unitWeightPerM）。
  - A / Iy / Iz / J は `computeSuperstructureSectionProperties`（KEEP）から導出（I断面・box非対応）。
  - areaM2/unitWeightPerMが直接値を持つ場合はCONFIRMED、導出はCOMPUTED。
  - **欠損時: NOT_AVAILABLE・解析不可fail-closed**（fallback禁止・D-10）。
- **Material**:
  - source: 上部工材料（鋼・コンクリート）。既存grillage宣言steel（E=2.05e8/G=8.0e7/ρ=78.5）は**参考値としてのみ**使用し、正本はSuperstructureDocument材料設定。
  - 現状SuperstructureDocumentに材料物性fieldがない場合は **CONFIRMED（既定鋼材）を明示sourceとして追加**、またはNOT_AVAILABLE。
  - **決定**: Phase 7-02では上部工moduleに `materialConfiguration`（E/G/ν/ρ）fieldを追加し、SuperstructureDocument正本から供給。未設定時は既存宣言steel（CONFIRMED・source="structuralSteel_default"）を使用（明示宣言・無根拠固定ではない）。
- **禁止**: grillage内の固定宣言値を無根拠で正式解析の正本とする。

## 7. Bearing → Support（R5解決・詳細はbearing_support_spring_contract）

- bearing seat（`BRG-{supportId}-{girderId}`）→ 対応nodeへ support生成。
- fixedOrMovable / bearingType → DOF拘束 mapping（**§3.3唯一mapping table・Sol review #7**）。
- UNDECIDED / null → **§3.3の既定（F/T/T/F/F/F）** を適用し、support source=FROM_BEARING_DEFAULTと記録（#7統一）。

### 7.0 Bearing/Support生成の唯一authority（Sol review #5）

- **`BearingSupportResolver`（WP-B/WP-C共通・唯一）** が全bearing/support生成を所有。
- superstructure adapterは**上部工由来のbearing seat**、substructure adapterは**下部工由来のsupport位置/高さ**を
  **source fragmentとして返す**（互いに独立）。
- `BearingSupportResolver` が `seatId` で両fragmentをjoinし、単一の supports/bearings を生成。
- **不一致reject**: 同一seatIdのposition/bearingType/localFrameが上下流で食い違う場合 → `BEARING_SOURCE_MISMATCH` reject。
- 上部工/下部工どちらかにしか存在しないseat → `SEAT_SOURCE_UNILATERAL` を明示記録（定義済みmapping既定を適用 or NOT_AVAILABLE）。

### 7.1 横桁断面（Sol review #14）

- 横桁のsourceは `crossBeamConfiguration.crossBeams[]` の depthM / widthM のみ。
- **横桁断面導出規則（Freeze）**: 矩形断面として導出。
  - A = widthM × depthM（m²）
  - Iy = widthM × depthM³ / 12（横断方向曲げ）
  - Iz = depthM × widthM³ / 12（橋軸方向曲げ）
  - J = 矩形ねじり近似式（WP-Eで公式固定・例 `(b³·h³)/(3.6(b²+h²))`）
  - material = 主桁と同一鋼材（SuperstructureDocument材料）
  - sectionId = `X-SEC-{crossBeamId}`（sourceEntityId追跡）
- **欠損時**: depthM/widthM のいずれかMISSING → 当該横桁は解析modelから除外し `NOT_AVAILABLE` 記録（補完禁止）。

## 8. Load生成仕様（R2解決・詳細はload_combination_contract）

- source: `superstructureLoadModel.buildDeadLoads`（KEEP）の DL-STRUCTURAL（主桁+横桁+横構+支承）・DL-DECK（床版）。
- **配分（正式仕様・Sol review #19）**: **`q = caseTotalKN / Σ_loaded_member_length`**（一意の式）。
  - DL-STRUCTURAL（主桁）: 各主桁memberへ均等配分（memberLoad・kN/m）。
  - DL-STRUCTURAL（横桁/横構/支承）: structuralSecondaryがMISSINGのため主桁分布に包含（partition維持）。
  - DL-DECK: 床版自重をgirder lineへ均等配分（各girderの受持幅=deckResolvedWidth/girderCount×thickness×unitWeight → kN/m）。
- **support節点のみへの集中載荷は正式仕様にしない**。
- nodalLoads/memberLoadsはbackendへ正しく転送（R2・grillage contractで受渡し契約）。
- 組合せ: COMBO-1 = 1.0·DL-STRUCTURAL + 1.0·DL-DECK（実行可能）。

## 9. Adapter出力（AnalysisDocument上部工部）

Adapterは`AnalysisDocument`（Phase7-01A契約）の上部工由来部分を返す。
- 全entityに `sourceEntityId` + `sourceKind`（D-11）。
- 上流fingerprint: `sourceReferences.superstructure.dataFingerprint + geometrySnapshotFingerprint`。
- 再生成: 上流変更→fingerprint不一致→再生成（revisionId++）。

## 10. validation / fail-closed

| 項目 | 挙動 |
|---|---|
| girderLines空 | 生成不可（reject） |
| section欠損 | NOT_AVAILABLE・解析不可（fallback禁止） |
| meshDivision不正 | reject（1..N有限） |
| bearing seat存在しないgirder | reject（dangling） |
| 数値非有限 | reject（INVALID_NUMERIC_VALUE） |
| 未対応bridgeSystem | 単純桁(SIMPLE_SINGLE)/連続(CONTINUOUS)のみ。他→UNSUPPORTED |

## 11. tests観点（詳細はtest_specification）

- 節点生成（support点/girder panel/横桁点・重複統合）
- 部材生成（主桁/横桁・orientationVector・連続性）
- section/material source（CONFIRMED/COMPUTED/NOT_AVAILABLE）
- bearing→support mapping
- 死荷重配分（girder line分布・総量保存・support節点のみ禁止）
- COMBO-1
- 再生成determinism（同一入力→同一AnalysisDocument）
- 上流変更→fingerprint不一致→再生成
