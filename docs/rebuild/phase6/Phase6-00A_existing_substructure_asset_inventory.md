# Phase 6-00 Step A: 既存下部工資産 Inventory（production path追跡済み）

## 1. 目的

Phase 6（下部工）を開始する前に、当初の線形座標計算ツール内に組み込まれていた
既存下部工資産を実コード経路まで追跡して網羅inventory化する。
docs上だけの経路と実際のproduction pathを混同しない。

- baseline: `fb63e4bc065952e75eeab349a3ed2ad43a02cfdc`（Phase 5-02 Final Report PR #936 merge後・GitHub main確認済み）
- 日付: 2026-08-13
- 本Stepは調査・整理のみ。実装・破壊的変更は行わない。

## 2. 最重要判定（全体像）

### 2.1 下部工Planning UIはACTIVE_PRODUCTION

- ルート: `/pro/liner/substructure`（旧`/pro`アプリ内）
  - `App.tsx:1363` の `isSubstructureRoute()` が唯一のproduction render site
  - 入口: LINER Edit Page → Reviewタブ → `open-substructure-planning` ボタン（`LinerEditPage.tsx:478-484`、`App.tsx:1233`）
  - deep link直アクセスも可
- 依存: **旧ProjectModel（`project.liner.domainDraft`）＋LINER draft**
  - 新Project Data Core（`next/`）とは無関係（唯一の`next/`importは`renderCoordinate.ts`の表示座標変換のみ）
- PDCの`modules.substructure` slotは予約済みだが実装なし（generic ModuleShellPage経由）

### 2.2 旧production data flow（実コード追跡済み）

```
ProjectModel（旧・project.liner.domainDraft）
  └─ App.tsx:210 linerDraftFromProject(project) → BuildIntermediateInput
       ├─ App.tsx:1364 linerPiersToSupportHandoff(draft.piers) → LinerSupportHandoff[]（fallback）
       ├─ App.tsx:1373 buildBridgeProjectAlignment(linerDraft)   [bridgeProject/alignmentAdapter.ts]
       ├─ App.tsx:1374-1378 buildBridgeProjectGeometry(alignment, piers, spans) [bridgeGeometryGenerator.ts]
       ├─ App.tsx:1379 buildCommonBridgeModel(alignment, geometry) → CBDM [cbdmDocument.ts]
       ├─ App.tsx:1380 buildBridgeProjectManifest(...) → BridgeProject
       ├─ App.tsx:1381-1384 getApolloBridgeProjectSuperstructure(project) → attachSuperstructureToManifest（常にundefined・DEAD）
       └─ App.tsx:1385 buildBoundSubstructure(commonModel, manifest) → Support[] [substructureBinding.ts]
            └─ SubstructurePlanningHost（App.tsx:1399-1406）へ boundSupports / coordinateInput として渡す
```

- **LINER単一正本**が維持されている（placementはLINER `pointAtStationOffset`）
- **BridgeProject依存はApp.tsxのみ**。下部工ドメイン自身はProjectModel/Apollo非依存
- `apolloBridgeProjectSuperstructure` sidecarは**runtimeで常にundefined**（write側にproduction callerなし）→ その分岐はDEAD

### 2.3 主要資産の分類（Step A時点）

| 分類 | 資産 |
|---|---|
| **ACTIVE_PRODUCTION**（`/pro/liner/substructure`で到達可能） | model.ts・validation.ts・geometryBase.ts・SupportPlacementEngine.ts・SubstructureSolidGenerator.ts・PierSolidGenerator.ts・FoundationSolidGenerator.ts・PlanProjection.ts・planning shell/host/page/viewport/form/tree/toolbar・linerHandoff.ts・persistence.ts（間接）・samples・dimensions・viewer3d・design（designEngine/calculationOutput/geometricQuantity/superstructureInterface/superstructureEnvelope/calculationAdapter/adapterMapper/testCalculationEngine/adapterPersistence） |
| **ACTIVE_TEST_ONLY**（testのみ） | planning/selectionState.tsx・useKeyboardShortcuts.ts・piles/UI一式・design/seismicDesign.ts・reinforcementDesign.ts |
| **DEAD**（import者なし） | substructure/index.ts（barrel）・designTypes.summarizeReactions・bridgeProject/substructureBinding.buildBoundReactions（production callerなし）・cbdmDocument.attachSubstructureToManifest（testのみ） |
| **DORMANT**（exportのみ・production callerなし） | superstructureHandoff.buildSuperstructureHandoff・toSupportInterfaceEntry（Phase 5 Handoff） |
| **RESEARCH_LAB**（app非接続） | substructure-planning/（repo root・Vanilla TS prototype） |

## 3. 資産Inventory（path / role / inputs / outputs / deps / production / tests / classification）

### 3.1 ドメインモデル・validation

| path | role | classification |
|---|---|---|
| `substructure/model.ts` | 正本データモデル（Support/SupportPlacement/BearingSeat/Pier/Abutment/Footing/PileGroup/SubstructureProject v0.2.0） | **ACTIVE_PRODUCTION** |
| `substructure/validation.ts` | fail-closed検証（FATAL/WARNING/INFO・schemaVersion/coordinate/unit・supportId一意・形状必須） | **ACTIVE_PRODUCTION** |
| `substructure/SupportPlacementEngine.ts` | LINER経由placement（computeLinerPlacement・skew frame・FATAL fail-closed） | **ACTIVE_PRODUCTION** |
| `substructure/planning/linerHandoff.ts` | LINER PierDraft→LinerSupportHandoff（station/skewRadのみ） | **ACTIVE_PRODUCTION**（App.tsx:1364） |

### 3.2 Geometry / 3D

| path | role | classification |
|---|---|---|
| `substructure/geometryBase.ts` | SolidNode/Transform/Group/WorldSolid・transformFromSnapshot・localToWorld・partId | **ACTIVE_PRODUCTION** |
| `substructure/SubstructureSolidGenerator.ts` | 橋台+橋脚+基礎solids生成（buildAllSupportSolids） | **ACTIVE_PRODUCTION** |
| `substructure/PierSolidGenerator.ts` | 単柱/壁式/門型（columns+cap/beam） | **ACTIVE_PRODUCTION** |
| `substructure/FoundationSolidGenerator.ts` | フーチングbox+杭cylinder（buildPileGrid/derivePileLayout） | **ACTIVE_PRODUCTION** |
| `substructure/PlanProjection.ts` | 2D plan projection（SVG） | **ACTIVE_PRODUCTION** |
| `substructure/viewer3d/threeFactory.ts` | Solid→THREE変換（Z-up→Y-up swap）・bounds | **ACTIVE_PRODUCTION** |
| `substructure/viewer3d/SubstructureViewer3D.tsx` | R3F Canvas・OrbitControls・raycast selection・camera presets | **ACTIVE_PRODUCTION** |

### 3.3 Planning UI

| path | role | classification |
|---|---|---|
| `planning/SubstructurePlanningHost.tsx`（679行） | 状態owner: supports・undo/redo・superstructure import・design/adapter run・save/load・export | **ACTIVE_PRODUCTION** |
| `planning/SubstructurePlanningPage.tsx` | 3ペインCAD shell（Toolbar/Tree/Viewport/Form/CoordinateTable/StatusArea） | **ACTIVE_PRODUCTION** |
| `planning/SubstructureViewport.tsx` | 2D SVG + 3D Viewer + dimensions + extraGroups（superstructure envelope） | **ACTIVE_PRODUCTION** |
| `planning/useUndoRedo.ts` | undo/redo（300ms debounce） | **ACTIVE_PRODUCTION** |
| `planning/useSubstructureRealtimeUpdate.ts` | placement snapshots（makePlacementSnapshots）+ 3D rebuild（300ms debounce） | **ACTIVE_PRODUCTION** |
| `planning/formModel.ts` / `formToSupport.ts` | Support↔form変換（deg/rad） | **ACTIVE_PRODUCTION** |
| `planning/SubstructureFormPanel.tsx` + `forms/*` | 型別入力フォーム | **ACTIVE_PRODUCTION** |
| `planning/samples/sampleGenerator.ts` / `SampleCreationDialog.tsx` | 初期形状テンプレート生成（SUBSTRUCTURE-owned） | **ACTIVE_PRODUCTION** |
| `planning/selectionState.tsx` / `useKeyboardShortcuts.ts` | 選択provider / ショートカット | **ACTIVE_TEST_ONLY**（prod未配線） |
| `planning/piles/*`（4ファイル） | 杭配置UI（layoutModel/Panel/Preview/CoordinateTable） | **ACTIVE_TEST_ONLY**（prod未配線・共有geometry関数のみPROD） |
| `planning/dimensions/*` | 寸法表示（2D/3D） | **ACTIVE_PRODUCTION** |

### 3.4 Design Engine

| path | role | 数値 | classification |
|---|---|---|---|
| `design/designEngine.ts` | runDesignフレームワーク（reactions passthrough・geometric qty実計算・全structural check HOLD_NOT_AVAILABLE） | 実計算: 概算数量のみ。構造照査は全てHOLD | **ACTIVE_PRODUCTION**（Host:379） |
| `design/geometricQuantity.ts` | 体積/杭長（box/cylinder実計算） | **REAL math** | **ACTIVE_PRODUCTION**（designEngine経由） |
| `design/calculationAdapter.ts` | Adapter境界契約（TEST_PASS/FAIL/HOLD/ERROR・isFormalDesign:false・engineLabel:TEST/MOCK） | 契約のみ | **ACTIVE_PRODUCTION**（adapterPersistence経由） |
| `design/adapterMapper.ts` | Support→CalculationAdapterInput・FNV-1a modelRevision（stale検出） | 実マッピング | **ACTIVE_PRODUCTION**（Host:416） |
| `design/testCalculationEngine.ts` | TEST/MOCK engine（実幾何+hardcoded fixture 0.5） | TEST/MOCK | **ACTIVE_PRODUCTION**（Host:442） |
| `design/calculationOutput.ts` | 計算書CSV/JSON | 整形のみ | **ACTIVE_PRODUCTION** |
| `design/adapterPersistence.ts` | AdapterEnvelope save/load（substructure-project.json・v0.2.0） | round-trip検証 | **ACTIVE_PRODUCTION**（Host:315/338） |
| `design/superstructureInterface.ts` | support-interface v0.1.0 parse（fail-closed）・bearingSeatsToModel・interfaceToReactions | parse/map | **ACTIVE_PRODUCTION**（parse/validate: Host:198/204。map関数はtest-only） |
| `design/superstructureEnvelope.ts` | 上部工envelope 3D（girder band+deck） | 実計算 | **ACTIVE_PRODUCTION**（Host:189） |
| `design/seismicDesign.ts` / `reinforcementDesign.ts` | 耐震/鉄筋framework（全HOLD・decisionId未発行） | HOLD | **ACTIVE_TEST_ONLY**（designEngineは別途inline HOLD） |
| `design/designTypes.ts` | ReactionCaseData/SuperstructureInput/BearingSeatInput | 型のみ | **ACTIVE_PRODUCTION**（Host:26）※`summarizeReactions`はDEAD |

### 3.5 Persistence

| path | role | classification |
|---|---|---|
| `planning/persistence.ts` | serialize/deserialize SubstructureProject（v0.2.0・fail-closed） | **ACTIVE_PRODUCTION**（adapterPersistence経由） |
| `design/adapterPersistence.ts` | AdapterEnvelope（SubstructureProject+CalculationState）save/load | **ACTIVE_PRODUCTION** |
| 保存形式 | **ブラウザdownload/uploadの`substructure-project.json`**（ローカル/サーバー/PDCへは非保存） | — |
| backend | **下部工計算資産はbackendに存在しない**（全部frontend TS） | — |

### 3.6 BridgeProject binding / Connector

| path | role | classification |
|---|---|---|
| `bridgeProject/substructureBinding.ts` | buildBoundSubstructure（CBDM+manifest→Support[]・形状はsample template） | **ACTIVE_PRODUCTION**（App.tsx:1385） |
| 同上 buildBoundReactions | manifest.reactions→SupportReactions（NOT_AUTHORIZEDのみ許可） | **DEAD**（testのみ） |
| `bridgeProject/cbdmDocument.ts` | buildCommonBridgeModel/buildBridgeProjectManifest/attachSuperstructureToManifest/attachSubstructureToManifest | attach*は**DEAD**（runtimeでsidecar undefined） |
| `bridgeProject/types.ts` | BpValue/BpSupport/BridgeProjectBridgeGeometry | **ACTIVE_PRODUCTION** |
| `apollo/geometry/types.ts` | GeometrySnapshot（SupportLine/SupportPoint/BearingPoint） | **KEEP（凍結契約）** |

### 3.7 Schemas

| schema | version | 状態 |
|---|---|---|
| `schemas/substructure/substructure-project.schema.json` | 0.1.0 | **STALE**（frontend v0.2.0と不整合・runtime未使用・自動testなし） |
| `schemas/substructure/support-interface.schema.json` | 0.1.0 | frontend parserはschemaより寛容（required不一致） |
| `schemas/substructure/pier.schema.json` / `abutment.schema.json` / `foundation.schema.json` | なし | **STALE**（enumがfrontend実装より狭い） |

### 3.8 Connector spec（docs）

- `docs/apollo/step10/reference_bridge_001/phase6/phase6_0/connectors/substructure_connector_spec.md`
  - 契約: GeometrySnapshot support entity → Substructure Connector → Pier/Abutment Placement
  - **実装なし**（snapshotベースのsubstructureConnector.tsは存在しない）
- `existing_connector_inventory.csv`（CONN-010/011/012/015）: LINER/geometryBase/model系はREUSE・CONN-011はREMOVE。Phase 4/5 Handoffとは無関係

### 3.9 Research lab

- `substructure-planning/`（repo root）: 独立したVanilla TS+Three.js prototype（"正式な下部工設計ソフトの実装ではありません"）。app未接続。データモデル・座標系・交換schema・verificationの設計意図が記録されている。**REFERENCE_ONLY**

## 4. production / test-only / dead 判定サマリ

| 判定 | 数 | 主な例 |
|---|---|---|
| ACTIVE_PRODUCTION | 多数 | model/validation/placement/geometry/3D/planning host/design framework/persistence |
| ACTIVE_TEST_ONLY | 6 | selectionState・keyboardShortcuts・piles UI・seismicDesign・reinforcementDesign |
| DORMANT | 2 | buildSuperstructureHandoff・toSupportInterfaceEntry（Phase 5 Handoff） |
| DEAD | 4 | substructure/index barrel・summarizeReactions・buildBoundReactions・attachSubstructureToManifest |
| RESEARCH_LAB | 1 | substructure-planning/ |
| BACKEND | 0 | 下部工計算はfrontendのみ |

## 5. リスク・重要発見（Step A時点）

1. **Phase 5 Handoff（SuperstructureHandoff）はproduction callerなし**（DORMANT）。Phase 5-02で生成されたものの、下部工側の受領経路が未配線
2. **Phase 4 SupportHandoffは下部工資産から未消費**（buildBoundSubstructureはCBDM+manifestの別系統）
3. **schema version drift**: substructure-project.schema.json（0.1.0）はfrontend serializer（0.2.0）を検証できない。自動testなし
4. **反力sign規約競合**: Phase 5 Handoff（up-positive）vs 既存fixture（down-negative）
5. **bearing位置axis swap**: toSupportInterfaceEntryはtransverseをxへ置く（fixture/envelopeはy）
6. **seat-ID 3方式混在**: `BRG-{support}-{girder}`（Phase 5）/ `{support}-SEAT-{girder}`（manifest）/ `{support}-SEAT-01..`（import）
7. **girderBottomElevation/deckElevation常にnull**（SuperstructureDocumentに標高源なし→envelopeは+0.25m fallback）
8. **localFrame identity fabrication**: Phase 5 handoffのsupport localFrameは恒等（実frame未計算）
9. **backendに下部工資産ゼロ** → Phase 6の実計算はfrontendか新規backend
10. **Persistenceはdownload/uploadのみ**（PDC/サーバー非保存）

## 6. 次StepへのInput

- Step B: Connector / Adapter / Binding / Contract / Schema監査（Phase 4/5 Handoff field互換）
- Step C: model / planning / Geometry / 3D / persistence / design engine / tests深掘り
- Step D: KEEP / ADAPT / REWRITE / DEFER / REMOVE + 成熟度Level
- Step E: Handoff compatibility + Migration Map + Phase 6-01 readiness
