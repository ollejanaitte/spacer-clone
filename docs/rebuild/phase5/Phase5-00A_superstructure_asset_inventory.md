# Phase 5-00 Step A: 既存上部工資産 Inventory

## 1. 本ドキュメントの目的

Phase 5-00（設計順序転換＋既存上部工資産・Connector監査）の Step A 成果物。
既存上部工関連のコード・docs・tests・schemas・fixtures を網羅的に探索し、
再構築時の再利用判断の基礎となる inventory を作成する。

- baseline SHA: `4d6beacf3d06d83635416c4d1d27081f4faaaf2b`（PR #911 merge後、GitHub main確認済み）
- 調査対象 worktree: `/home/masaharu/Projects/spacer-clone-next`（branch `rebuild/integrated-system`）
- 日付: 2026-08-12
- 本 Step は調査・整理のみ。実装・破壊的変更は一切行わない。

## 2. 既存上部工システムの全体像

探索の結果、上部工ドメインは**3系統が並立**しており、互いの接続は疎である。

| 系統 | 場所 | 状態 |
|---|---|---|
| A. BridgeProject統合チェーン（Phase 3-1〜3-8） | `frontend/src/bridgeProject/` | 構築・テスト済み。ただし bound geometry 経路のみプロダクションUIに到達。superstructure sidecarはプロダクションの書き込み元なし（dead code相当） |
| B. Apollo STEP-2/STEP-3パイプライン | `frontend/src/apollo/`（geometry / design / bridgeStructure / loads / analysis / visualization / components） | 開発プレビュー。全数値結果は `NOT_AUTHORIZED` / `UNVERIFIED_DEVELOPMENT_ONLY` でゲート |
| C. 新Project Data Core（PDC） | `frontend/src/next/` | `superstructure` moduleは schema/registry に宣言済みだが実装ゼロ。旧システムからの import もゼロ |

### 2.1 最重要データフロー（GeometrySnapshot）

`GeometrySnapshot` は凍結済みの不変な橋梁ジオメトリ正本であり、
`DefaultGeometryEngine.generateSnapshot(GeometryEngineInput)` が唯一の生産者。
下流は読み取り専用（station→XYZ / offset→XYZ / skew / crossfall / elevation を再計算しない）。

- 契約定義: `frontend/src/apollo/geometry/types.ts`（`GEOMETRY_SNAPSHOT_VERSION = "6.1.0"`）
- 生産者: `frontend/src/apollo/geometry/engine.ts`（`DefaultGeometryEngine`）
- 入力の3経路:
  1. RB-001 golden: `SuperstructurePipelinePanel.tsx` の `buildRb001GeometryInput()`（ハードコード）
  2. BridgeProject bound: `superstructureBinding.ts` の `buildBoundGeometryInput()`（CBDM + girder offsets）
  3. Legacy CBDM: `CommonModelGeometryInputAdapter.adapt(cbdm)` 直接

## 3. Inventory（path / role / inputs / outputs / dependencies / owner / reused by / tests / risk）

### 3.1 BridgeProject統合チェーン（`frontend/src/bridgeProject/`）

| path | role | inputs | outputs | dependencies | owner | reused by | tests | risk |
|---|---|---|---|---|---|---|---|---|
| `superstructureAdapter.ts` | GeometrySnapshot→`BridgeProjectSuperstructure` shared facts（桁配置/床版/支承-支持点関係/NOT_AUTHORIZED分析参照） | GeometrySnapshot + options（superstructureType/spanSystem/deckThickness/girderCount） | `BridgeProjectSuperstructure`（schemaVersion 0.1.0） | apollo/geometry/types, contracts/legacy, ./types, ./validation | Phase 3-4 | **プロダクション呼び出しゼロ**（testのみ） | `superstructureAdapter.test.ts`, caseA/caseB e2e, mountain500系 | **中-高（dead in prod）** |
| `superstructureBinding.ts` | CBDM→数値 `GeometryEngineInput`（bound mode）①→②公式経路 | CBDM + `BoundGeometryInputOptions{girderOffsetsM,girderIds}`（上部工所有） | `GeometryEngineInput`（girders merged） | CommonModelGeometryInputAdapter, contracts/runtime/schemas/commonBridgeDataModel, ./validation | Phase 3-3 | `SuperstructurePipelinePanel.tsx`（prod）, tests | `superstructureBinding.test.ts`, mountain500.binding.e2e | **低-中** |
| `projectSuperstructure.ts` | `ProjectModel.apolloBridgeProjectSuperstructure` sidecarの get/hydrate/serialize | ProjectModel | ProjectModel + 検証済みrecord | ./types, ./superstructureAdapter | Phase 3-4 | `apollo/importExport.ts`（Save/Load） | `projectSuperstructure.test.ts` | 低 |
| `bridgeGeometryGenerator.ts` | Alignment+pier/span draft→`BridgeProjectBridgeGeometry` | `BridgeProjectAlignment` + PierDraft/SpanDraft | bridge geometry | ./validation | Phase 3-2 | App.tsx, panel, e2e | `bridgeGeometryGenerator.test.ts` | 低-中 |
| `alignmentAdapter.ts` | LINER `Coordinate3dInput`→`BridgeProjectAlignment` | LINER draft | alignment（station sampling） | LINER coordinate3d | Phase 3-1 | App.tsx, panel, tests | `alignmentAdapter.test.ts` | 低-中 |
| `alignmentReconstruction.ts` | CASE B: ②sample→①alignment再構築（cycle guard） | `ReconstructionSampleFacts` | draft + alignment + reconstruction record | buildBridgeProjectAlignment, contracts/bridgeProject | Phase 3-8 | caseB e2e | `alignmentReconstruction.test.ts` | 中 |
| `cbdmDocument.ts` | CBDM builder + BridgeProject manifest + sidecar attach | alignment+geometry（+sidecar） | CBDM, manifest | contracts runtime schema, checksum, uuid | Phase 3 | App.tsx, panel, e2e | `cbdmDocument.test.ts` | 中 |
| `integratedScene3d.ts` | ①+②+③統合 three.js scene + support-XYZ parity検証 | BuildIntermediateInput, superSolids, subGroups, CBDM, snapshot | `IntegratedScene3d` | liner/samples/mountain, domainToThree, substructure geometryBase | Phase 3-6 | caseA/caseB e2e | `integratedScene3d.test.ts` | 低 |
| `workflowReadiness.ts` | 最小next-action readiness | manifest, CBDM | `WorkflowReadiness` | — | Phase 3-7 | e2eのみ（prod callerなし） | caseA/caseB e2e | 低 |
| `validation.ts` | `BridgeProjectAdapterError`, `BP_CODES`, fail-closed assert | — | — | — | shared | 全bridgeProject | 全test経由 | 低 |
| `types.ts` | `BpValue` status語彙, alignment/geometry/superstructure型 | — | — | — | shared | 全bridgeProject + ProjectModel | — | 低 |

### 3.2 Apollo Geometry Core（`frontend/src/apollo/geometry/`）

| path | role | owner | tests | risk |
|---|---|---|---|---|
| `types.ts` | `GeometrySnapshot` + 全サブ契約（ResolvedValue/SupportLine/GirderLine/GridPanelPoint/BearingPoint等） | Phase 6-1A | `contract.test.ts` | **高（凍結境界）** |
| `contracts.ts` | `GeometryEngineInput`, `GeometryEngine`, `GeometryInputAdapter`, `AlignmentConnector` | Phase 6-1A | 他経由 | 高 |
| `geometryInputAdapter.ts` | `CommonModelGeometryInputAdapter`（CBDM→input抽出、純粋・値は発明しない） | Phase 6-1B | `geometryInputAdapter.test.ts` + binding test | 低 |
| `alignmentConnector.ts` | `LinerAlignmentConnector`（LINER委譲、単一Alignment正本） | Phase 6-1B | `alignmentConnector.test.ts` | 低 |
| `placement.ts` | support/girder line配置（stations/offsets/skew; bound stations path） | Phase 6-1C | `placement.test.ts` + binding test | 中 |
| `crossSectionFrame.ts` | 横断面フレーム（skew回転） | Phase 6-1D | `crossSectionFrame.test.ts` | 低 |
| `engine.ts` | `DefaultGeometryEngine.generateSnapshot` + fingerprint（fnv1a32） | Phase 6-1E | `engine.test.ts` | 中 |
| `gridPoints.ts` | RB-001 panel-point grid | Phase 6-2 | `gridPoints.test.ts` | 中 |
| `deck.ts` | deck reference/boundary; `RB001_DECK_SPEC` | Phase 6-2 | `deck.test.ts` | 低 |
| `members.ts` | member配置ref + cross-girder ref; `RB001_CROSS_GIRDER_SPECS` | Phase 6-2 | `members.test.ts` | 低 |
| `planeGridTransform.ts` | plane-grid→global affine変換 | Phase 6-2 | `planeGridTransform.test.ts` | 中（golden） |

### 3.3 Apolloパネル（`frontend/src/apollo/components/`）

| panel | role | 依存 | risk |
|---|---|---|---|
| `SuperstructurePipelinePanel.tsx` | 上部工E2Eパイプライン（sample/bound）: Geometry→3D→Analysis→Design→Replay→Output | geometry engine, visualization, design, replay, `apiClient.analyzeGrillage`, BridgeProject adapters | **高（demo入力/RB-001ハードコード）** |
| `BridgeStructureInputPanel.tsx` | 橋梁構造入力 + 構造生成（`generateBridgeStructureFromInput`）、桁断面性能、単位重量採用、数量、sample re-apply | `apollo/bridgeStructure/*` | 中 |
| `GeneralArrangementPanel.tsx` | GA図面G-01..G-07 + SVG/DXF/PDF/ZIP export | `apollo/drawing/*` | 中 |
| `StandardSectionDrawingPanel.tsx` | 標準横断図 preview/export | `apollo/drawing/drawingModel` | 低 |
| `AppurtenanceHaunchAnalysisPanel.tsx` | 付属物・ハンチ dead-load closed-form解析（単純支持・桁毎） | `apollo/analysis/appurtenanceHaunchAnalysisAdapter` | **高（未検証dev解析）** |
| `DeckAppurtenanceInputPanel.tsx` | 地覆/高欄/中央分離帯入力 | `apollo/bridgeStructure/appurtenanceModel` | 中 |
| `RcDeckHaunchInputPanel.tsx` | ハンチ per-girder RECT/TRAPEZOID入力 | `apollo/bridgeStructure/haunchModel` | 中 |
| `CrossFrameAttachmentInputPanel.tsx` | cross-frame/sway取り付け深さ入力 | bridgeStructure | 低 |
| `PavementMarkingInputPanel.tsx` | 舗装・区画線入力 | `pavementModel` | 低 |
| `LoadConfirmationDevelopmentPanel.tsx` | load model status/confirmation | `apollo/loads/appurtenanceHaunchLoadModel` | 中 |
| `QuantityModelDevelopmentPanel.tsx` | 概算数量モデル | `apollo/quantity/*` | 中 |
| `ReportModelDevelopmentPanel.tsx` | 計算書モデル | `apollo/report/*` | 中 |
| `OutputIntegrationPanel.tsx` | 成果物バンドル/ZIP | drawing/artifact + report + quantity | 中 |
| `AnalysisDevelopmentProbePanel.tsx` | 単純支持解析プローブ（NOT_AUTHORIZED） | — | 高（dev only） |
| `DemandCheckDevelopmentPanel.tsx` | demand候補（CANDIDATE/UNVERIFIEDのみ） | — | 高（dev only） |
| `WorkflowControlScreen.tsx` + Workflow系 | STEP 4-A workflow制御UI | `apollo/workflow/*` | 低 |

### 3.4 計算・解析・設計資産

| concern | 主コード | 状態 |
|---|---|---|
| 鋼板桁断面特性 | `apollo/bridgeStructure/sectionProperties.ts`（I-beam area/centroid/Ix/断面係数） | 純ジオメトリ、NOT_AUTHORIZED |
| 桁配置 | `bridgeProject/superstructureAdapter.ts`（offsets）, `apollo/geometry/placement.ts`, `generateBsdd.ts` | — |
| RC床版（非合成） | BSDD `RcDeck`/`DeckAnchorage`, `apollo/geometry/deck.ts`, `generateBsdd.ts` | compositeAction=false |
| 横桁/横構/ブレース | BSDD `CrossBeam`/`SwayBracing`/`LateralBracing`/`BraceMember`/`Stiffener`/`Splice`; `apollo/geometry/members.ts` | 全てNOT_AUTHORIZED |
| 支承 | `apollo/geometry/types.ts` `BearingPoint`; `engine.ts` bearing assembly; `substructureBinding.ts` `BearingSeat` | — |
| 反力 | `substructureBinding.ts` `buildBoundReactions`（入力データとしてのみ公開、authorized statusはreject） | fail-closed |
| 死荷重（付属物/ハンチ） | `apollo/loads/appurtenanceHaunchLoadModel.ts`（`SegmentDeadLoad`） | NOT_AUTHORIZED |
| 解析 | `apollo/analysis/appurtenanceHaunchAnalysisAdapter.ts`; `apollo/design/grillageModel.ts`; `backend/engine/grillage.py`; `backend/engine/solver.py` | 全てdev-gated |
| 設計チェック | `apollo/design/checkFramework.ts`（RB001宣言10checks、全てNOT_AUTHORIZED）; `autoDesign.ts`（PENDING_AUTHORIZATION） | 宣言のみ・方程式なし |

### 3.5 Contract / Schema

| asset | 役割 | risk |
|---|---|---|
| `frontend/src/contracts/bridgeSuperstructureDesignDocument.ts`（1420行） | BSDD TS契約 + fail-closed validator。`documentKind = bridge-superstructure-design`。design-status governance、entity-ID registry、dangling-ref check、composite connector禁止 | **高（正規schema、変更波及大）** |
| `schemas/contracts/v0.1/bridge-superstructure-design-document.schema.json`（3514行） | JSON Schema 2020-12、`spacer.contracts.bridge-superstructure-design-document`。runtime Zod mirror: `contracts/runtime/schemas/bridgeSuperstructureDesignDocument.ts` | 高 |
| `contracts/contractVersionRegistry.ts` | v0.1.0登録 | 低 |
| 関連contract | `bridgeProject.ts`（manifest）, `commonBridgeDataModel.ts`（CBDM runtime schema）, `bridgeFrameAnalysisDocument.ts`, `frameAnalysisResultResource.ts` | 中 |

### 3.6 新Project Data Core（`frontend/src/next/`）の上部工slot

| asset | 状態 |
|---|---|
| `next/project/schema.ts` | `PROJECT_MODULE_KEYS` に `superstructure` を含む。projectSchema.modules はstrictObjectで全module必須 |
| `next/modules/registry.ts` | `superstructure` module登録済み（dependencies `["bridgeLayout"]`, displayName "上部工"）。`analysis` は `superstructure` に依存宣言 |
| `next/modules/` | **superstructure module実装ファイルなし**（slotは予約済みだが空） |
| PDCの旧系統からの分離 | PDCはLINER core型 + roadDesignDocumentのみimport。旧 apollo/bridgeProject/superstructure契約コードは一切importしていない。逆方向も同様 |

### 3.7 3D / 出力資産

| asset | 役割 |
|---|---|
| `apollo/visualization/snapshot3d.ts` | GeometrySnapshot→3D payload（Viewer + STL/DXF export） |
| `apollo/visualization/snapshotVisualizationModel.ts` | snapshot→`ApolloVisualizationModel` |
| `apollo/visualization/bridgeStructureSolids.ts`, `appurtenanceHaunchSolids.ts`, `pavementMarkingSolids.ts`, `builder.ts`, `designEntityBinding.ts` | 3D solid生成 |
| `apollo/export/apolloStlExport.ts` | Binary STL exporter（@jscad, m→mm, deterministic, FNV-1a digest, fail-closed） |
| `apollo/export/apolloExportManifest.ts` | `ApolloStlExportManifest` v1.0.0 |
| `apollo/replay/replay.ts` | 3D/STL replay + discrepancy分類 |
| `next/modules/renderCoordinate.ts` | 新システムのdomain→Three変換（x→x, y→z, z→-y） |
| `next/modules/integratedSceneBuilder.ts` | Road+Terrain+Existing+Bridge統合scene |

### 3.8 下部工側の将来Handoff接続点（read-only確認）

- `substructure/design/superstructureInterface.ts`: `support-interface.json`（bearingSeats / reactionCases / girderBottomElevation / deckElevation）をfail-closed parse → model BearingSeat[] + SupportReactions
- `substructure/design/superstructureEnvelope.ts`: bearing位置 + girder/deck標高 → 上部工3D envelope（girder band + deck band）
- `schemas/substructure/support-interface.schema.json`: 上部工→下部工交換schema（bearingSeats等）
- `bridgeProject/substructureBinding.ts`: CBDM+manifest → `Support[]`（bearingSeatsのtransverse offsetのみ継承、X/Zは0初期化→LINER縦断から導出）
- 反力は全経路で「入力データ」としてのみ扱われ、数値設計には未使用（全check HOLD_NOT_AVAILABLE）

### 3.9 Backend資産

| asset | 役割 | 状態 |
|---|---|---|
| `backend/engine/grillage.py` | グリレージモデル→解析project→`run_analysis`（declared steel E=205GPa, declared section）→gated `NOT_GRANTED` | R0-08: PORT/KEEP |
| `backend/app/main.py` | `POST /api/design/analyze` | — |
| `backend/engine/solver.py` | 線形静解析ソルバ（scipy） | PORT/KEEP |
| `backend/engine/eigen.py` / `response_spectrum.py` / `moving_load.py` / `time_history_*.py` | 動的・時刻歴系 | 後続Phaseで検討 |
| `backend/rule_engine/` | 道路構造令rule engine | R0-08: DEAD/RETIRE-or-rewire |

## 4. tests / fixtures / samples inventory

| 領域 | テスト | 内容 |
|---|---|---|
| bridgeProject | `__tests__/` 15ファイル | caseA/caseB e2e, mountain500系, superstructureBinding/Adapter, substructureBinding, integratedScene3d, alignmentReconstruction, projectSuperstructure |
| apollo | 97ファイル（`__tests__/` 66） | STL export/parity, continuous girder, workflow, design, step4b/4c系, section properties |
| substructure | `__tests__/` 48ファイル | superstructureInterface/Envelope, referenceBridgeConnection, design/adapter系, persistence, planning shell |
| next（PDC） | 67ファイル | bridgeLayout系（support/span handoff, integrity gate, persistence）, road, terrain |
| viewer | 22ファイル | Viewer3D, coordinateTransform, comparison |
| if3 | 5ファイル | runAnalysisBindingGuard等 |
| contracts | 8ファイル | bridgeProject, bridgeSuperstructureDesignDocument, frameAnalysisResultResource |
| backend | 86 Python | grillage, eigen, response_spectrum, moving_load, time_history, rule系 |
| liner | ~164ファイル | 道路線形core（regression保持） |

fixtures: `reference-bridge-001-support-interface.json`（`substructure/__tests__`）、RB-001 golden constants（pipeline panel / replay / grid / deck / cross-girder specs）、mountain-viaduct-500 sample、`substructure-planning/verification/evidence/m3-03/design-result-P1.json` golden。

## 5. リスク・重複正本候補・技術的負債

### リスク
1. **上部工の「正本」が3系統に重複**（BridgeProject sidecar / BSDD sidecar / PDC `superstructure` module）。現在UIで実際に生成されるのはBSDD（`apolloBsdd`）のみ。
2. **`buildBridgeProjectSuperstructure` はプロダクションdead**。Rebuild時はproducer配線かretireかを選択必要。
3. 全解析/設計の数値結果が `NOT_AUTHORIZED` / `UNVERIFIED_DEVELOPMENT_ONLY`。ゲート保持は価値を制限するがリスクを制限する。
4. **RB-001 golden定数が多数箇所にハードコード**（pipeline, replay, grid/deck/cross-girder specs, section candidates, grillage fixtures）。これらはgolden parity fixtureであり、ユーザーデータではない。
5. **GeometrySnapshotは凍結契約**。`types.ts`変更は高影響（3D/design/replay/export/BSDD sidecar全てが仮定）。
6. **CBDMの数値フィールド（spanLength/bridgeLength/widthM）がbound経路の要**。legacy fixtureは欠損時graceful degrade。
7. **PDCはgreenfield**。上部工moduleはクリーンだが、`analysis`/`cim`/`deliverables` が依存宣言済みで将来形が制約される。
8. **module登録は3重手動**（schema.ts keys / schema.ts strictObject / registry.ts）。動的拡張機構なし。

### 重複正本候補
- 支間長・橋長（CBDM / BSDD / PDC bridgeLayout document）
- support配置（CBDM / BridgeProject manifest / PDC BridgeLayoutDocument / substructure Support[]）
- 桁offset（BridgeProject sidecar / BSDD girderLines / GeometrySnapshot girderLines / PDC superstructure module将来）
- deck情報（BSDD deck / GeometrySnapshot deckReferences / BridgeProject deckFacts）
- 反力（BFAD / frame-analysis-result-resource / BridgeProject reactions / substructure reactionCases）

### 技術的負債
- `SuperstructurePipelinePanel` のdemo入力（`BOUND_DEMO_GIRDERS` = ±4.0m）とRB-001ハードコード
- `backend/engine/bridge_fem_generator.py`（R0-08: REWRITE対象、station→X/offset→Y/Z=0仮定）
- `rule_engine`（DEAD）
- 旧`frontend/src/viewer/` 座標変換（SpacerAxisSwap）が新systemのrenderCoordinate（x→x,y→z,z→-y）と別規約

## 6. 再利用推奨順序（暫定・Step Cで確定）

1. **新PDC `superstructure` module** を正本とする（greenfield、slot予約済み）
2. **GeometrySnapshot / GeometryEngine** をcompatibility boundaryとして流用（凍結契約、テスト厚）
3. **superstructureBinding（buildBoundGeometryInput）** をSpan/Support Handoff入力へADAPT
4. **superstructureAdapter（buildBridgeProjectSuperstructure）** はproducer配線 or ADAPT判断（Step B/C）
5. **BSDD contract + schema** はSuperstructureDocument正本候補としてADAPT/REWRITE判断
6. 計算・解析・3D資産は `NOT_AUTHORIZED` ゲート維持のままADAPT（実設計は後続Phase）
7. `superstructureEnvelope.ts` / `support-interface` はPhase 6下部工Handoff境界としてKEEP確認

## 7. 次StepへのInput

- Step B: Connector / Adapter / Binding / Contract / Schema の詳細監査
- Step C: KEEP / ADAPT / REWRITE / DEFER 分類 + Migration Map
- Step D: 設計順序転換（UI最小修正）
