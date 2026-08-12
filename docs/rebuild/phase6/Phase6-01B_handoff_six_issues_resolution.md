# Phase 6-01 Step B: Phase 5 Handoff 6課題解決（凍結案）

## 1. 目的

Phase 6-00で判明したPhase 5 Handoffの6課題を設計上解決しFreezeする。
一つでも未解決のままDesign Freezeしない。

- baseline: `b9e39d8bc2326e9f552174271b6c20523fe4665f`
- 日付: 2026-08-13

## 2. 課題1: reaction sign convention

### 現状
- Phase 5 SuperstructureHandoff: **up-positive**（支承が上部工を押し上げる=+z・test Fz=+150）
- 既存fixture（reference-bridge-001-support-interface.json）: **down-negative**（Fz=-3325.5・DL-AG1適用荷重表現）

### 正規規約（凍結）
- **Reactionはup-positive（+z=上向き）を唯一とする**
- fixtureの負値は「適用荷重（下向き）」の表現であり、RB-12比較は|Fz|で照合

### compatibility rule / conversion
- Phase 5 Handoff → 下部工: そのまま（up-positive）
- 外部fixture取り込み時: `reactionFz = -appliedLoadFz`（適用荷重→反力へ符号変換・明示）

### 旧データ対応 / fail-closed
- 旧support-interfaceの負値は「適用荷重」と解釈し、反力として採用しない（入力データのみ）
- signConvention fieldで常に明示・欠落はreject

### migration / test
- T6-RXN-001: up-positive維持
- T6-RXN-010: fixture負値→|Fz|比較（RB-12）

## 3. 課題2: bearingPosition axis mapping

### 現状
- `toSupportInterfaceEntry`: transverseを **x** へ（localOffset.transverseM→x）
- 既存fixture/envelope: transverseを **y** へ（bearingPosition {x:0, y:±2.5, z:8.0}）

### 正規規約（凍結）
- bridge-local bearingPosition: **x=longitudinal / y=transverse / z=相対標高**（v0.1.0 schema準拠）

### conversion
- `bearingPosition.x = localOffset.longitudinalM`
- `bearingPosition.y = localOffset.transverseM`
- `bearingPosition.z = seat.position.z - support.position.z`

### 旧データ対応
- 旧x=transverse形式の受領は不可（sign/axis検証で検出）・新形式のみ受理
- fail-closed: axis不一致検出（既存seatsのxが大きい/ yが小さい等は警告）

### test
- T6-BRG-002: transverse→y・longitudinal→x

## 4. 課題3: seat-ID 3方式混在

### 現状
- Phase 5: `BRG-{supportId}-{girderId}`
- manifest: `{supportId}-SEAT-{girderId}`
- import path: `{supportId}-SEAT-01..`
- fixture: `{id}-BRG-01..`

### 正規規約（凍結）
- canonical seatId: **`BRG-{supportId}-{girderId}`**（決定論的・一意・girder対応可読）

### compatibility rule
- Adapter受領時に旧IDを正規化: supportId+girderId（or index）からBRG-{support}-{girder}へ再生成
- 旧データ（SEAT-系）は受領時にマッピング・warning表示・正規化後使用

### fail-closed
- seatId重複・dangling reject
- 正規化不能（support/girder不明）reject

### test
- T6-BRG-011: 旧SEAT-ID正規化
- T6-BRG-012: BRG-ID一意

## 5. 課題4: caseKind enum vs combinationId

### 現状
- `toSupportInterfaceEntry`: caseKind = combinationId（"DL-STRUCTURAL"/"COMBO-1"）→ v0.1.0 enum [permanent/liveLoad/braking/wind/seismicLevel1/seismicLevel2]違反

### 正規規約（凍結）
- `ReactionCaseData.caseKind` = enum値（既存designTypes）
- `combinationId` は別field（metadata/extension）で保持（traceability）

### conversion（mapping table）
| combinationId prefix | caseKind |
|---|---|
| DL- | permanent |
| COMBO-1（死荷重） | permanent |
| LL | liveLoad |
| BRK | braking |
| WIND | wind |
| SEISMIC-L1 | seismicLevel1 |
| SEISMIC-L2 | seismicLevel2 |
| 不明 | **permanent（既定）+ warning**（fail-open・明示） |

### fail-closed
- caseKind enum外はreject（mapping不能時は既定+warning・明示）

### test
- T6-RXN-002: DL-/COMBO-1→permanent
- T6-RXN-003: LL→liveLoad・未知→既定+warning

## 6. 課題5: support localFrame identity fabrication

### 現状
- `superstructureHandoff`: support localFrameを**恒等（identity）**でハードコード
- snapshotのSupportPoint.localFrameは実frameを持つ（未利用）

### 正規規約（凍結）
- support localFrameは**実frame**（GeometrySnapshot support point / LINER由来）
  - tangent = 接線 / transverse = 横断（skew適用） / vertical = 鉛直
- Phase 6 Adapterはsnapshot（またはSupport Handoff tangent azimuth）から実frameを組み立て
- **非直線alignment対応**（曲線橋で恒等frameを使わない）

### fallback
- frame源が無い場合: identityは **VIEWER_PLACEHOLDER** として明示（正本にしない）
- fail-closed: 正本frameのNOT_AVAILABLEは許容・silent fabrication禁止

### test
- T6-LOC-001: snapshot由来frame
- T6-LOC-002: 曲線橋frame（identityでない）
- T6-LOC-003: frame欠落→VIEWER_PLACEHOLDER明示

## 7. 課題6: girderBottomElevation / deckElevation null

### 現状
- Phase 5 handoff: 常にnull（SuperstructureDocumentに標高源なし）
- 既存envelope: `deckTop = girderBottom + 0.25m` fallback（**発明値**）

### 正規規約（凍結）
- 標高は**導出（derived）**または **NOT_AVAILABLE**（発明しない）
  - girderBottomElevation = support road elevation（Support Handoff position.elevation）+ bearing height（宣言時） - girder depth（宣言時）
  - deckElevation = girderBottom + deck thickness（宣言時）
  - いずれかの入力が未宣言 → **NOT_AVAILABLE**
- canonicalデータに+0.25m等の**発明値を持ち込まない**

### fallback
- 表示のみ: viewerはVIEWER_PLACEHOLDERとして薄型表示（正本外・明示）

### test
- T6-ELE-001: 導出式（宣言値あり）
- T6-ELE-002: 未宣言→NOT_AVAILABLE（+0.25mを持ち込まない）

## 8. 6課題 解決サマリ（Freeze対象）

| # | 課題 | 正規規約 | conversion | fail-closed | test |
|---|---|---|---|---|---|
| 1 | reaction sign | up-positive唯一 | 外部負値は適用荷重として扱う | sign明示必須 | T6-RXN-001/010 |
| 2 | bearing axis | x=longitudinal/y=transverse | localOffset→axis再配置 | axis不一致検出 | T6-BRG-002 |
| 3 | seat-ID | BRG-{support}-{girder}唯一 | 旧ID正規化 | 重複/dangling reject | T6-BRG-011/012 |
| 4 | caseKind | enum値+combinationId別保持 | mapping table（DL→permanent等） | enum外reject/既定+warning | T6-RXN-002/003 |
| 5 | localFrame | 実frame（snapshot/LINER） | snapshotから組み立て | identityはVIEWER_PLACEHOLDER | T6-LOC-001/002/003 |
| 6 | 標高 | derived or NOT_AVAILABLE | 導出式 | 発明値(+0.25m)禁止 | T6-ELE-001/002 |

## 9. 未認証Reaction Authorization（凍結）

- Phase 5-02のReactionはNOT_AUTHORIZED入力を含む
- 下部工側:
  - **Geometry / placement等の参考利用**: 可（位置・方向の参考・正本にしない）
  - **Design calculationへの採用**: 不可（未認証）
  - **PASS/FAILへの昇格**: 不可（自動昇格禁止）
- 状態は `HOLD_NOT_AVAILABLE` / `NOT_AUTHORIZED` / `NOT_AVAILABLE` を維持・消さない
- 認証後（人が承認）のみ採用可能（Phase 6では対象外）
