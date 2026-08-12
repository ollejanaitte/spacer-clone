# Phase 5-01 Step C-01: Geometry完全設計（Coordinate / skew / 曲線橋）（凍結案）

## 1. 目的

Phase 5（鋼鈑桁橋・第一正）のGeometryを完全設計する。
Phase 5-02実装時に追加設計判断が不要なレベルまで、
構造システム・桁配置・床版・横桁・横構・支承・座標・skew・曲線橋の扱いを凍結する。

既存資産: GeometrySnapshot（凍結契約 v6.1.0）＋ DefaultGeometryEngine ＋ LINER core を
最大限再利用する。**Road geometryは再実装しない**。

- baseline: `55b40539a7acf7738b2691315dd1f354387e0e2e`（Step B merge後）
- 日付: 2026-08-12

## 2. 座標・単位・符号規約（凍結）

| 規約 | 値 |
|---|---|
| domain座標 | x = 道路軸（沿線方向・station増加方向）+ / y = 横断（右正）/ z = 標高（上正）。metric |
| globalOrigin | Project Origin（R3-00 freeze: 全Project共通） |
| Local Origin | 橋梁基準線（bridge center/reference line）offset 0。Project Originからのオフセットとして扱う |
| renderCoordinate | Three表示変換のみ（x→x, y→z, z→-y）。正本を書き換えない |
| 角度 | rad。skew: **counterclockwise-positive**（唯一・既存BridgeLayout規約） |
| 力 | kN（Phase 5-02 analysisで使用） |
| 値status | CONFIRMED / DERIVED / MISSING / NOT_AUTHORIZED 等（BpValue語彙） |

### 2.1 座標の参照階層

```
Project Origin（R3-00・全Project共通）
  └─ Road Module（LINER core）: station→XYZ / offset→XYZ / 縦断 / 横断 / カント
       └─ BridgeLayoutDocument: bridgeRange / supports（station・skew）
            └─ SuperstructureDocument: girder lines（offset）・deck・bearing配置
                 └─ GeometrySnapshot（global XYZ・fingerprint）
                      └─ renderCoordinate → Three表示（表示のみ）
```

上部工は**global XYZをLINER/Road Moduleから受け取る**（再計算しない）。

## 3. 構造システム（凍結）

- 第一正: 鋼鈑桁橋（プレートガーダー）・RC床版・非合成
- structuralSystem: `{ spanSystem: "simple" | "continuous", bridgeSystem: "SIMPLE_SINGLE" | "CONTINUOUS" }`
  - SIMPLE_SINGLE: 1 span（A1-A2）
  - CONTINUOUS: 2..5 span（A1-P1..Pn-A2）※既存layout contractの支間数上限を踏襲
- 判定はspanReferences（Span Handoff）のspan数から導出（上部工が上書き可・整合検証）

## 4. 主桁配置（凍結）

| 項目 | 規則 |
|---|---|
| girder count | 上部工入力（SuperstructureDocument.girderConfiguration.girderCount）・>=1 |
| girder lines | `G1..Gn`（index順） |
| girder spacing | **canonical入力 `girderSpacingM`**（等間隔）。指定時はoffsetを `(i - (n-1)/2) * spacing` で自動導出（derived）。個別offsetはoverride。両方無しはMISSING（発明しない） |
| offset端部 | offsetEndFromCenterline（テーパー用・任意・既定null） |
| 入力元 | 上部工所有。**発明しない**（既存superstructureBinding fail-closed原則） |

### 4.1 桁断面（web / top flange / bottom flange / depth）

- 桁断面寸法（depthM・web・flange）は**GeometrySnapshotには含めない**（snapshotは配置・座標の正本）
- 断面寸法は **SuperstructureDocument.girderConfiguration.girderSectionModel（設計入力モデル・canonical）** が所有
  - 実体: `{ depthM, webThicknessM, topFlange{widthM,thicknessM}, bottomFlange{widthM,thicknessM}, areaM2, unitWeightPerM }`（全てnull許容・MISSING）
- 基本照査（WP-G）・自重（WP-E）・3D表現は宣言値がある場合のみ実施。
  MISSINGなら照査保留（fail-closed・NOT_AVAILABLE）
- 断面性能計算は既存 `sectionProperties.computeGirderSectionProperties`（I-beam）をKEEP利用

## 5. 床版（凍結）

| 項目 | 規則 |
|---|---|
| deckId | `DECK-1`（安定ID） |
| deckKind | `rc_non_composite`（合成禁止・compositeAction=false固定） |
| widthM | 上部工の床版幅（基準: Road横断参照＋overhang。Phase 5-02でRoad Moduleから導出、未取得ならMISSING） |
| thicknessM | 上部工入力（未宣言ならMISSING・発明しない） |
| overhang | overhangLeftM / overhangRightM（上部工入力・>=0・既定null） |
| 舗装との境界 | 舗装（pavement）はRoad/床版の上載物として **load model（WP-E）** で扱う。Geometryには含めない |

### 5.1 DeckReference（GeometrySnapshot側・KEEP）

- snapshot.deckReferences: deckId / widthM / thicknessM / edgeOffsetM / elevationM / boundary
- 供給元: 新bindingがSuperstructureDocument.deckConfigurationから渡す
- edgeOffsetM: 中心線からの左右端（widthM中心配置を既定。overhang差し引きはPhase 5-02実装時に既定式）

## 6. 横桁（Cross Beam）（凍結）

| 種別 | 配置規則 |
|---|---|
| end cross beam | A1・A2の各support位置（support cross beam兼用・両端） |
| support cross beam | 全support位置（A1/P1..Pn/A2）に存在（連続橋必須） |
| intermediate cross beam | crossBeamSpacingM間隔で自動配置（support位置を避ける） |

- crossBeamId: 端/支承位置 `XB-{supportId}`、中間 `XB-i-{n}`
- Phase 5-02スコープ: **配置のみ生成**。断面寸法（depth/width）はnull（DEFER）
- GeometrySnapshot側: `crossGirderReferences`（CrossGirderReference: stationM + connectedGirderIds）として保持

## 7. 横構（Cross Frame）（凍結）

- swayBracing / lateralBracing: 間隔入力のみ（crossFrameSpacingM・intervalM）
- Phase 5-02スコープ: **配置のみ**・部材断面はnull（DEFER）
- GeometrySnapshot側: `memberPlacementReferences`（MemberKind: swayBracing / lateralBracing）として保持
  - 部材連結点はsnapshotのGirderStationPointから生成（既定: 横構間隔のstation点でgirder間に接続）

## 8. 支承（Bearing）（凍結）

| 項目 | 規則 |
|---|---|
| bearing配置 | support × girder の全交点（snapshot.bearingPoints由来・dedupe） |
| bearing seatId | `BRG-{supportId}-{girderId}` |
| bearingType | 上部工入力（"rubber"|"fixed"|"movable"|null）・Phase 5-02既定null |
| fixedOrMovable | "FIXED"|"MOVABLE"|"UNDECIDED"（既定UNDECIDED） |
| 方向 | longitudinalDirection（"+station"|"-station"|null）・transverseDirection（"L"|"R"|null） |
| 支承高 | bearing heightはPhase 5-02ではnull（DEFER）。snapshot.bearingPointsは位置（global XYZ）のみ |

## 9. Support Line / skew（凍結）

- SupportLine（snapshot）: supportId / stationM / skewRad / transverseAxis / elevationM
- skewRadはBridgeLayoutDocument（Support Handoff）由来。**counterclockwise-positive**
- skewSource（"automatic"|"user"）はSupport Handoffに保持
- 上部工側でskewを**再計算しない**（BridgeLayout正本）

## 10. 曲線橋・縦断・横断（凍結）

### 10.1 水平曲線（curved alignment）

- 水平曲線（直線・円弧・緩和曲線）は **LINER core（`evaluateAlignmentAtDistance`）が正本**
- snapshotはLINERから受けた各点の global XYZ / local frame / azimuth / curvature を保持
  - GirderStationPoint: position + azimuthRad + localFrame
  - CrossSectionFrame: position + localFrame + skewRad + transverseAxis
- 上部工は曲線計算を**再実装しない**（LinerAlignmentConnector委譲）

### 10.2 縦断（vertical geometry）

- 縦断（grade）はRoad Module（LINER vertical）が正本
- support elevation・girder line elevationはLINER由来（snapshotのelevationM）
- 上部工側で縦断を再実装しない

### 10.3 横断勾配（transverse slope / crossfall）

- 横断勾配はRoad Module（crossfall: 右下がり正）が正本
- 床版キャンバー・横断勾配の反映はPhase 5-02では**配置レベル**（deck referenceのelevation/edge）
  - 詳細な床版傾斜のソリッド化は後続Phase（3D詳細）で扱う
  - Phase 5-02: deck boundary elevationはsupport elevation基準（端・中央で均一を既定）

## 11. GeometryEngineInput 生成仕様（凍結）

新binding（`superstructureBindingNew`）がSuperstructureDocumentから生成する
`GeometryEngineInput` のマッピング:

| GeometryEngineInput項目 | 供給元 |
|---|---|
| bridgeId | bridgeLayoutReference.bridgeId |
| alignmentIds | roadReference.alignmentId |
| supports[{id, stationM, skewRad, state}] | supportReferences.supports（supportId/station/skew） |
| girders[{id, offsetM, state:"CONFIRMED"}] | girderConfiguration.girderLines（girderSpacingMからderived or override） |
| spanLengthsM / bridgeLengthM | spanReferences.spans[].spanLength / Σ |
| deckSpecs[{deckId, widthM, thicknessM, edgeOffsetM}] | deckConfiguration（resolvedWidthM / thicknessM / overhang） |
| crossGirderSpecs | crossBeamConfiguration（support位置＋中間spacing） |
| gridPointIds / sectionIds | 既定: 自動生成（RB-001グリッド仕様は参考・Phase 5-02で既定式） |
| unresolved | BridgeLayout / Road解決不能時 |

## 12. GeometrySnapshot 凍結契約の維持

- **契約変更しない**（v6.1.0維持）。理由: 下流（3D/analysis/design/replay/export）全てが仮定
- Phase 5-02で不足する情報（横構部材断面等）は snapshot外（SuperstructureDocumentのdesign model）に置く
- 契約変更が必要になる場合は本設計書の改訂＋migration計画＋testsを事前にPhaseとして立てる（Phase 5-01では不要）

## 13. 検証・tests観点（WP-C）

- 座標: Project Origin / Local Origin / renderCoordinateの3段階
- skew: counterclockwise-positive・support line／横断面frame
- 曲線: LINER曲線上のgirder line・横断面（mountain系・curved fixtures）
- 桁配置: 等間隔offset式・G1..Gn
- deck: width/thickness/overhang・edgeOffset
- 横桁: support位置必須・中間spacing・重複なし
- bearing: support×girder全交点・seatId一意
