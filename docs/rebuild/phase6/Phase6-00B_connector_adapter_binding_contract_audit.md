# Phase 6-00 Step B: Connector / Adapter / Binding / Contract / Schema 監査

## 1. 目的

既存下部工のConnector / Adapter / Binding / Contract / Schemaを詳細監査し、
Phase 4（Support Handoff）・Phase 5（SuperstructureHandoff / support-interface）を
既存下部工資産が受け取れるかをfield単位で判定する。

- baseline: `1fb7ac7aba4a1427c692f149e1ccbbcbc4804e8c`（Step A merge後）
- 日付: 2026-08-13
- 既存Connectorを無根拠に削除しない。

## 2. 接続経路の全体像（3系統並立）

| 経路 | Producer | Consumer | 状態 |
|---|---|---|---|
| A. BridgeProject manifest sharedFacts | `cbdmDocument.buildBridgeProjectManifest`/`attachSuperstructureToManifest` | `substructureBinding.buildBoundSubstructure` | **PRODUCTION**（App.tsx） |
| B. support-interface v0.1.0 JSON | 外部/legacy fixture（reference-bridge-001-support-interface.json） | `superstructureInterface.parseSupportInterface` + `superstructureEnvelope` | **PRODUCTION**（Host import） |
| C. Phase 5 SuperstructureHandoff v1.0.0 | `superstructureHandoff.buildSuperstructureHandoff` | `toSupportInterfaceEntry`（→Bへ） | **DORMANT**（production callerなし） |

Phase 4 SupportHandoff/SpanHandoffはproduction生成済みだが、**下部工資産は未消費**（別系統）。

## 3. Connector監査

### 3.1 既存Connector一覧

| CONN | from→to | 実装 | 判定 | 新システムでの扱い |
|---|---|---|---|---|
| CONN-010 | LINER→Substructure | `SupportPlacementEngine.ts:87` computeLinerPlacement | **KEEP（ADAPT寄り）** | LINER単一正本の原則維持。station/offset→XYZはLINER経由 |
| CONN-011 | LINER→Substructure(realtime) | `useSubstructureRealtimeUpdate.ts:48` | **REMOVE候補** | naive/axis-aligned（skewなし）。正規経路（CONN-010+新Connector）へ置換 |
| CONN-012 | Substructure→3D | `geometryBase.ts:68` localToWorld | **KEEP** | Phase 6で再利用 |
| CONN-015 | ProjectModel→Substructure | `model.ts` SupportPlacement | **ADAPT** | 新PDC経由へ接続変更 |

### 3.2 substructure_connector_spec.mdの契約 vs 実装

- 契約: `GeometrySnapshot support entity → Substructure Connector → Pier/Abutment Placement`
  - 入力: supportId / station / skew（rad canonical）/ elevation / transverse axis（local frame）/ bearing reference point
  - 禁止: support座標再計算・skew再計算・deg/rad混在
- **実装なし**: snapshotベースの`substructureConnector.ts`は存在しない。
  現在のbinding（`substructureBinding.ts`）はCBDM（snapshot前）を読み、placementはLINER経由。
- **判定**: 契約は未実装。Phase 6-01で新Connectorとして実装候補（snapshot由来）

## 4. Adapter / Binding監査

### 4.1 buildBoundSubstructure（substructureBinding.ts）— ACTIVE_PRODUCTION

- 入力: CBDM `bridgeGeometry.supports`（station/skew/kind + x/y/z/tangent/transverse）+ manifest `sharedFacts.supports[].bearingSeats`（`{seatId, transverseOffsetM}`）
- 出力: `Support[]`（substructure/model.ts）
  - supportType: kind==="abutment"→abutment、他→pier（**virtual_pierはsilent downgrade**）
  - placement: `{source:"liner", alignmentId, station, offset:0}`
  - bearingSeats: `position:{x:0, y:transverseOffsetM, z:0}`・dimensions {0.4,0.4,0.1}・bearing {id:"<seatId>-BEARING", height:0.1, type:"elastomeric"}（**hard-coded初期値**）
  - 形状はsample template（SUBSTRUCTURE-owned placeholder）
- **Phase 4 SupportHandoff消費**: しない（CBDM+manifestの別系統。position/tangentAzimuthRad/terrainElevation/roadReferenceId/coordinateContextId未読）
- **Phase 5 Handoff消費**: partial（manifest bearingSeatsのみ）
- **判定**: ADAPT（入力元を新PDC/Handoffへ接続変更）

### 4.2 buildBoundReactions（substructureBinding.ts）— DEAD

- 入力: manifest `sharedFacts.reactions`（NOT_AUTHORIZEDのみ許可・それ以外はthrow fail-closed）
- 出力: `SupportReactions[]`（caseId "&lt;caseKind&gt;-case"）
- **production callerなし**（testのみ）
- **判定**: ADAPT候補（Phase 5 reactionCases受領時に再利用。sign規約の整合が必要）

### 4.3 linerPiersToSupportHandoff（linerHandoff.ts）— ACTIVE_PRODUCTION（fallback）

- LINER PierDraft→`LinerSupportHandoff {id, station, skewRad, kind}`（abutment/pierのみ・virtual_pier除外）
- Phase 4 Handoffとは別の簡易形（position/azimuth/terrain/referenceなし）
- **判定**: KEEP（旧LINER fallback）＋新経路ではPhase 4 SupportHandoffを正とする

### 4.4 parseSupportInterface（superstructureInterface.ts）— ACTIVE_PRODUCTION

- support-interface v0.1.0 JSON parse（fail-closed on schemaVersion/supportId/supportType/array shapes）
- schemaより寛容（requiredのposition/origin/coordinateSystem等を要求しない）
- `bearingSeatsToModel`/`interfaceToReactions`はtest-only（Hostはraw doc保持のみ）
- **判定**: ADAPT（Phase 5 toSupportInterfaceEntry出力を受領する際に、JSON schemaと整合させる）

## 5. Contract / Schema監査

### 5.1 既存Contract

| contract | version | 役割 | 判定 |
|---|---|---|---|
| `substructure/model.ts` SubstructureProject | 0.2.0 | 下部工正本model（frontend） | **KEEP（新SubstructureDocumentのベース）** |
| `schemas/substructure/substructure-project.schema.json` | 0.1.0 | JSON Schema | **STALE**（frontend 0.2.0と不整合・runtime未使用・testなし） |
| `schemas/substructure/support-interface.schema.json` | 0.1.0 | 上部工→下部工交換schema | **ADAPT**（parser寛容化・Phase 5互換） |
| `schemas/substructure/pier/abutment/foundation.schema.json` | なし | 個別entity schema | **STALE**（enum狭い） |
| `design/designTypes.ts` | — | ReactionCaseData/SuperstructureInput | **KEEP（Phase 5 reactionCases受領の型ベース）** |
| `design/calculationAdapter.ts` | 0.1.0 | Adapter境界契約（engineLabel TEST/MOCK固定） | **ADAPT**（実engine受領時に拡張） |

### 5.2 Schema version drift（重要）

- frontend serializer（v0.2.0: placement/pileGroup/portal_frame/wall/cantilever_frame・name/originなし）
  vs `substructure-project.schema.json`（v0.1.0: name/origin/position必須・single_column_rect/inverted_t/bored_pileのみ）
- **既存HandleSave出力はこのschemaを満たさない**
- **自動testなし**（projectSchemaRegression.test.tsはmain project schemaのみ検証）
- **判定**: Phase 6-01でschemaを0.2.0へ刷新（新SubstructureDocumentと一本化）

## 6. Phase 4 SupportHandoff互換（field別）

| Phase 4 `SupportHandoffItem` field | buildBoundSubstructure | linerPiersToSupportHandoff | 判定 |
|---|---|---|---|
| supportId | ✅直接（CBDM lineage一致時） | ✅直接 | **そのまま利用可** |
| supportType | ⚠️ virtual_pier silent downgrade | ✅abutment/pierのみ | **変換必要** |
| station | ✅直接 | ✅直接 | **そのまま利用可** |
| position {domainX,domainY,elevation} | ❌未消費（LINER再計算） | ❌なし | **Adapter変換必要**（Project-global XYZ→placement） |
| tangentAzimuthRad | ❌未消費 | ❌なし | **新Connectorで利用** |
| skewAngleRad | ⚠️ CBDM由来・null→0 | ⚠️ ??0 | **CCW一致**・null処理要 |
| skewSource | ❌未消費 | ❌なし | 新Connectorで利用 |
| terrainElevation | ❌未消費 | ❌なし | **新Connectorで利用**（基礎高さ計算） |
| roadReferenceId | ⚠️ alignmentId（別源） | ❌なし | **ID整合要** |
| coordinateContextId | ❌未消費 | ❌なし | **新Connectorで利用** |

**判定**: Phase 4 SupportHandoffは`supportId/supportType/station/skew`が直接受領可。
position/azimuth/terrain/referenceは既存下部工側で未消費（LINER再計算に委譲）のため、
新Connector（Phase 6-01）でsupport配置へ接続する。

## 7. Phase 5 SuperstructureHandoff互換（field別）

| Phase 5 `SuperstructureHandoff` field | 経路 | 判定 |
|---|---|---|
| supports[].supportId/type/station/skew | toSupportInterfaceEntry→v0.1.0 | ✅直接 |
| supports[].position {x,y,z} | v0.1.0 origin/position | ✅直接（Project-global XYZ） |
| supports[].localFrame | v0.1.0 axes | ⚠️**identity fabricate**（実frame未計算） |
| bearingSeats[].seatId | v0.1.0 bearingId | ⚠️**3方式混在**（BRG-/SEAT-） |
| bearingSeats[].position | v0.1.0 bearingPosition | ⚠️**axis swap**（transverse→x vs fixture y） |
| bearingSeats[].elevation | envelope seat z | ✅絶対Z |
| bearingType/fixedOrMovable/directions | v0.1.0 | ❌schemaに無し |
| reactionCases[].Fx..Mz | v0.1.0 force/moment | ⚠️**caseKind enum違反**（combinationId使用） |
| girderBottomElevation / deckElevation | v0.1.0 | ❌**常にnull**（fallback +0.25m） |
| superstructureEnvelope | buildSuperstructureEnvelope | ⚠️2方式（Phase 5 vs substructure側） |
| selfWeight | — | ❌下部工未消費 |

**判定**: Phase 5 Handoffの受領は**Adapter変換必須**。
- reaction sign規約（up-positive vs fixture down-negative）の統一
- bearingPosition axis（transverse）の統一
- seat-ID統一・caseKind enum整合・projectId/bearingHeight null対策
- localFrame実計算（非直線対応）・girder/deckElevation源の設定

## 8. ID / unit / sign / coordinate 差分サマリ

| 規約 | Phase 4 | Phase 5 | substructure Support | v0.1.0 schema/envelope |
|---|---|---|---|---|
| Axis | domain x沿線/y横断/z標高 | project-global XYZ | x沿線/y横断/z標高 | x-longitudinal-y-transverse-z-up |
| Skew | CCW-positive | CCW-positive | CCW | scalar |
| Reaction Z | — | up-positive | signなし | fixture down-negative |
| Units | m/rad | m/rad/kN/kNm | m/rad/kN | m/rad（force kN） |
| seat-ID | — | BRG-{s}-{g} | {s}-SEAT-{g} | {s}-BRG-01.. |

## 9. 監査結論（Step B）

1. 既存Connector（LINER/geometryBase系）は**KEEP**。新正本にはしない
2. `substructureBinding`は**ADAPT**（入力元を新PDC/Handoffへ）
3. `superstructureInterface`/`superstructureEnvelope`は**ADAPT**（Phase 5互換）
4. schemaは**REWRITE相当**（0.2.0刷新・新SubstructureDocumentと一本化）
5. Phase 4 SupportHandoffはsupport基本4項目が直接受領可・配置詳細は新Connectorで接続
6. Phase 5 Handoffは**Adapter変換必須**（sign/axis/ID/enum/localFrame/elevationの6課題）
7. 未認証反力（NOT_AUTHORIZED）は**正式設計計算へ自動採用しない**（fail-closed継承）
