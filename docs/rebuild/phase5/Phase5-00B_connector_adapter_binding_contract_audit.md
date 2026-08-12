# Phase 5-00 Step B: Connector / Adapter / Binding / Contract / Schema 監査

## 1. 目的

Step A で作成した inventory を土台に、
既存の Connector / Adapter / Binding / Contract / Schema を詳細監査し、
新 Project Data Core との compatibility boundary として
「そのままKEEPできるか / ADAPTが必要か / REWRITEが必要か」を具体的に判定する。

特に既存Connectorは**捨てない**方針で、
新システムの正本（Project Data Core / BridgeLayoutDocument）との
接続方法を確定するための材料を提供する。

- baseline: `d43c5da3b7a203c6c09f2c4c4d6cba74c7fe7871`（Step A merge後）
- 日付: 2026-08-12

## 2. 監査対象の分類

本監査では以下の4層に分類して追跡する。

| 層 | 定義 | 既存資産 |
|---|---|---|
| **Connector** | システム境界を跨ぐ frozen boundary。LINER等の他ドメイン正本をbridge側契約へ運ぶ。再実装禁止原則 | `LinerAlignmentConnector`, `CommonModelGeometryInputAdapter`（Adapter兼Connector）, STEP10 Phase6-0 Connector Spec群（CONN-001〜017） |
| **Adapter** | あるデータ構造を別のデータ構造へ写像する純関数。計算・値の発明はしない | `superstructureAdapter`, `geometryInputAdapter`, `alignmentAdapter`, `alignmentReconstruction`, `roadModuleAdapter`, `terrainModuleAdapter`, `bridgeLayoutModuleAdapter` |
| **Binding** | 正本（CBDM等）から派生値を組立・検証し、下流契約（GeometryEngineInput等）を生成する経路。fail-closed | `superstructureBinding`, `substructureBinding` |
| **Contract / Schema** | ドキュメント契約とJSON Schema（正本のデータ形状） | `bridgeSuperstructureDesignDocument` contract+schema, `bridgeProject.ts`, `commonBridgeDataModel.ts`, `bridgeLayoutTypes.ts`, `roadDesignDocument.ts`, `support-interface.schema.json` |

## 3. Connector 監査

### 3.1 Connector概念の定義元

Connector概念は `docs/apollo/step10/reference_bridge_001/phase6/phase6_0/connectors/` にあり、
`existing_connector_inventory.csv`（CONN-001〜017）で現状と再利用判定が整理されている。
原則は「**他ドメインの数学・正本を再実装しない**」。LINERが道路Alignmentの単一正本である。

### 3.2 既存Connector一覧と判定

| CONN | from→to | 実装 | 入力 | 出力 | 判定 | 新システムでの位置づけ |
|---|---|---|---|---|---|---|
| CONN-001 | LINER→bridge geometry | `apollo/geometry/alignmentConnector.ts`（`LinerAlignmentConnector`） | alignmentId, station, offset | XYZ/azimuth/curvature/frames/sourceStation | **ADAPT（KEEP寄り）** | 新Road ModuleもLINER coreを参照するため同一正本。新経路では `readRoadAlignmentContext`（PDC）側が同機能を持つ。上部工側からのstation/offset要求は本Connectorを流用可。LINER正本を継続参照し、再実装しない |
| CONN-002 | LINER→BridgeDefinition | `bridgeDefinition/adapters/fromLinerBridge.ts` | domain draft | LinerBridge | KEEP（旧BridgeDefinition域） | 新システムでは使用しない見込み（BridgeDefinition自体がPhase 4-00でREWRITE/not used判定）。REFERENCE扱い |
| CONN-003 | BridgeDefinition→ProjectModel | `bridgeDefinition/generator/structuralModelGenerator.ts` | BridgeDefinition | nodes | **REPLACE**（旧値仮定 station→X/offset→Y/Z=0） | 新システムではGeometrySnapshot由来へ置換。旧実装は参照のみ |
| CONN-004 | BridgeProject→ProjectModel(backend) | `backend/engine/bridge_fem_generator.py` | BridgeProject | nodes | **REPLACE**（R0-08でREWRITE） | FEMは後続Phase。旧FEM生成は再実装対象 |
| CONN-005 | Apollo bridgeStructure→BSDD | `apollo/bridgeStructure/generateBsdd.ts` | BridgeStructureInputDraft | BSDD | **ADAPT** | 上部工正本（将来SuperstructureDocument）へ接続変更。girder offset式とdeck/support生成ロジックは有効 |
| CONN-006 | BSDD→3D solids | `apollo/visualization/bridgeStructureSolids.ts` | BSDD+layout | Solid params | **KEEP** | 上部工3D生成として再利用可。`NOT_AUTHORIZED`ゲート維持 |
| CONN-007 | BSDD→STL | `apollo/export/apolloStlExport.ts` | BSDD solids | STL(mm) | **KEEP** | 成果品Phaseへ。deterministic exportは価値あり |
| CONN-008 | Draft→Drawing | `apollo/drawing/drawingSetModel.ts` | raw draft | DrawingModel | **ADAPT**（REPLACE寄り） | 図面は後続Phase。GeometrySnapshot/BSDD正本から生成へ変更 |
| CONN-009 | Draft→Report | `apollo/report/reportModelContinuous.ts` | raw draft | ReportModel | **ADAPT** | 計算書も後続Phase。正本参照へ変更 |
| CONN-010 | LINER→Substructure | `substructure/SupportPlacementEngine.ts` | LINER input | SupportPlacementSnapshot | **ADAPT（KEEP寄り）** | Phase 6下部工で再利用。station/offset→XYZはLINER正本継続。skewは正本参照（再計算禁止） |
| CONN-011 | LINER→Substructure(realtime) | `substructure/planning/useSubstructureRealtimeUpdate.ts` | station/offset | snapshot | **REMOVE（naive / no skew）** | 旧UI用。新システムでは正規経路（CONN-010 + PDC）へ置換。既存テストは参照のみ |
| CONN-012 | Substructure→3D | `substructure/geometryBase.ts` localToWorld | snapshot | SolidTransform | **KEEP** | Phase 6で再利用 |
| CONN-013 | ProjectModel→Viewer | `viewer/threeUtils.ts` createNodeMap | nodes | viewer vectors | **KEEP（表示専用変換）** | 表示変換はViewer都合であり正本を書き換えない。ただし新systemの`renderCoordinate`（x→x,y→z,z→-y）と座標規約が異なる（旧はy-up swap）ため、**新システム側はrenderCoordinateを正とする** |
| CONN-014 | BSDD solids→Viewer | `viewer/renderers/ApolloVisualizationRenderer.ts` | solid params | renderer | KEEP | 表示専用 |
| CONN-015 | ProjectModel→Substructure | `substructure/model.ts` SupportPlacement | project substructure | snapshot | **ADAPT** | 新Project Data Core経由へ接続変更。bearingSeats等は上部工Handoffから |
| CONN-016 | ProjectModel→Save/Load | `contracts/persistence/saveDocument.ts` | project JSON | atomic store | **REPLACE** | 新システムは`next/persistence/`（project.json + .spacerproj）が正。旧saveDocumentはREFERENCE |
| CONN-017 | ProjectModel→Frame analysis | `contracts/legacy/frame/adapter.ts` | project model | frame document | **ADAPT（DEFER）** | FEM後続PhaseでBSDD→BFAD経路へ接続 |

### 3.3 Connector判定の要約

- **KEEP**: CONN-006/007/010/012/013/014（3D・STL・配置・表示）
- **ADAPT**: CONN-001/002/005/008/009/015/017（正本接続先を新システムへ変更）
- **REPLACE/REWRITE**: CONN-003/004/011/016（旧値仮定・旧UI・旧永続化）
- **REMOVE**: CONN-011（旧naive配置）

既存Connectorの「LINER単一正本」「正本再実装禁止」「fail-closed」原則は新システムでも維持する。
新システム側はこの原則を、`readRoadAlignmentContext`（PDC）＋`renderCoordinate`＋`next/persistence`で
既に実践済みである。

## 4. Adapter 監査

### 4.1 上部工関連Adapter

| adapter | 入力 | 出力 | プロダクション接続 | 判定 | 根拠 |
|---|---|---|---|---|---|
| `bridgeProject/superstructureAdapter.ts`（`buildBridgeProjectSuperstructure`） | GeometrySnapshot + options | `BridgeProjectSuperstructure`（0.1.0） | **呼び出しなし（testのみ）** | **ADAPT** | 構造・バリデーション・round-tripは健全だが、(1)プロダクションのproducer不在、(2)`analysisReference`が恒久`NOT_AUTHORIZED`、(3)旧BridgeProject型に依存。Phase 5-01で新SuperstructureDocumentへの接続用に再配線または入力切替が必要。**単体ではREWRITE不要**（写像ロジックはそのまま利用可能） |
| `apollo/geometry/geometryInputAdapter.ts`（`CommonModelGeometryInputAdapter`） | CBDM | `GeometryEngineInput` | `superstructureBinding`経由（prod） | **ADAPT** | 純粋・決定的・fail-open（値の発明なし）。CBDM依存を新BridgeLayoutDocument/SuperstructureDocument参照へ変更可能。設計影響小 |
| `bridgeProject/alignmentAdapter.ts` | LINER draft | `BridgeProjectAlignment` | App.tsx, panel | ADAPT | LINER正本参照ロジックは有効。新PDCの`readRoadAlignmentContext`と役割重複→新システム側を正とし、旧側は参照 |
| `bridgeProject/alignmentReconstruction.ts` | ②sample facts | ①alignment再構築 | e2eのみ | **DEFER** | Phase 4-00で「bridge layoutがBridge Layout正本」となったため、旧CASE B逆算経路は将来不要。ただしcycle guard考え方はReference。他システムが使用するまで削除しない |
| `next/modules/roadModuleAdapter.ts` | RoadModule正本 | roadDesignDocument / roadInputs | PDC（prod） | **KEEP** | 新システム自身のアダプタ。上部工がAlignmentを参照する唯一の正規経路 |
| `next/modules/bridgeLayoutModuleAdapter.ts` | PDC | BridgeLayoutDocument | PDC（prod） | **KEEP** | Phase 5上部工はここからdocumentを読む |
| `next/modules/terrainModuleAdapter.ts` / `existingConditionsAdapter.ts` | PDC | Terrain/Existing | PDC（prod） | KEEP | 上部工が地形参照する場合に利用。既存はreference済み |

### 4.2 Adapter判定の要約

- 新システムのアダプタ群（road/terrain/bridgeLayout）は**そのままKEEP**。
- 旧上部工Adapterのうち、写像ロジックが有効なものは**ADAPT**（接続先を新正本へ）。
- 旧CASE B逆算（alignmentReconstruction）は**DEFER**。

## 5. Binding 監査

| binding | 入力 | 出力 | 呼び出し | 判定 | 根拠 |
|---|---|---|---|---|---|
| `bridgeProject/superstructureBinding.ts`（`buildBoundGeometryInput`） | CBDM + girderOffsetsM | `GeometryEngineInput`（bound mode） | `SuperstructurePipelinePanel`（prod） | **ADAPT（KEEP寄り）** | fail-closedバリデーション（missing support/station/bridge length/span、girder offsets必須）は新システムでも必要な不変条件そのもの。CBDM入力を新SuperstructureDocument+Span/Support Handoffへ差し替えるだけで再利用可。girder offsetは上部工所有のまま（発明しない） |
| `bridgeProject/substructureBinding.ts`（`buildBoundSubstructure` / `buildBoundReactions`） | CBDM + manifest | `Support[]` / reactions（NOT_AUTHORIZEDのみ） | App.tsx | **ADAPT（DEFER寄り）** | 下部工Phase 6で再利用。反力を「入力データのみ」として扱うfail-closedは正しい方針。上部工Handoff（bearing座標・標高）を正しく伝えるためには、Phase 5上部工の成果（Superstructure Handoff）を入力に加える必要がある |

## 6. Contract / Schema 監査

### 6.1 既存上部工Contract

| contract | schemaId / version | 役割 | 判定 | 根拠 |
|---|---|---|---|---|
| `contracts/bridgeSuperstructureDesignDocument.ts` + `schemas/contracts/v0.1/bridge-superstructure-design-document.schema.json` | `spacer.contracts.bridge-superstructure-design-document` v0.1.0 | BSDD正本（spans/girderLines/deck/supports/loadCases/analysisBindings/structuralDesignModel） | **ADAPT** | 上部工の正本構造として有効。新SuperstructureDocumentの設計時に、既存の`bridge`（spans/girderLines/deck/supports）部分と`structuralDesignModel`（mainGirders/rcDecks/haunches/crossBeams…）部分を、新Project Data Coreの参照境界（ID/reference）に合わせて整理する。`NOT_AUTHORIZED` design-status governanceは継承する。**Phase 5-00では実装変更しない**（Contract候補のみ確認） |
| `contracts/bridgeProject.ts` | `spacer.contracts.bridge-project` | BridgeProject manifest（sharedFacts/references/reconstruction） | **ADAPT（参照）** | 旧統合manifest。新システムではBridgeLayoutDocument + SuperstructureDocument + handoffが正本となり、本contractはhistorical reference。ただしreactions `NOT_AUTHORIZED` guardはPhase 6で再利用 |
| `contracts/commonBridgeDataModel.ts` | `spacer.contracts.common-bridge-data-model` | CBDM | **ADAPT（参照）** | 旧①→②中間正本。新システムではbridgeLayout document + handoff + SuperstructureDocumentが役割を担う。数字値（spanLength/bridgeLength/widthM）の抽出ロジックはADAPTで流用可 |
| `contracts/roadDesignDocument.ts` | `spacer.contracts.road-design-document` | Road正本 | **KEEP** | 新Road Moduleが利用。上部工は参照のみ |
| `next/modules/bridgeLayout/bridgeLayoutTypes.ts` | `spacer.next.bridge-layout`（新） | BridgeLayoutDocument正本 | **KEEP** | Phase 5上部工の入力正本。Span/Support Handoffはderived |
| `schemas/substructure/support-interface.schema.json` | v0.1.0 | 上部工→下部工交換schema | **KEEP（Phase 6境界）** | bearingSeats/girderBottomElevation/deckElevation/reactionCasesは上部工成果の出口。Phase 5-01でSuperstructure Handoffとして正式化する際のベース |

### 6.2 Schema監査の要点

- 旧BSDDis schema v0.1.0、既存Zod mirrorと`contractVersionRegistry.ts`に登録済み。変更はgenerator・hydration・import/exportへ波及するため、**変更はPhase 5-01以降に限定**。
- 新PDCの`projectSchema`はstrictObjectであり、module追加はschema.ts（keys＋strictObject）とregistry.tsの3重変更が必要。Superstructure module実装時はこの制約を踏まえる。
- `Existing Conditions`がmoduleでなくmetadata配下にある点は構造的非整合（既知）。Phase 5-00では触れない。

## 7. 新システム接続方針（compatibility boundaryの形）

```
新Project Data Core（正本）
  ├─ modules.bridgeLayout.bridgeLayoutDocument  ← Phase 4正本（KEEP）
  │    ├─ buildSpanHandoff    → Phase 5上部工（span配置の正式入口）
  │    └─ buildSupportHandoff → 共通Support配置情報（Phase 5上部工参照 / Phase 6下部工参照）
  ├─ modules.superstructure（Phase 5-01で実装予定）← SuperstructureDocument正本へ集約
  │    ├─ superstructureAdapter（ADAPT）: GeometrySnapshot/span/support → shared facts
  │    └─ superstructureBinding（ADAPT）: 新正本 → GeometryEngineInput（buildBoundGeometryInput改）
  ├─ modules.substructure（Phase 6）
  │    └─ superstructureEnvelope / support-interface（KEEP）: 上部工成果を受ける
  └─ modules.road / terrain（KEEP）: 参照のみ

旧Apollo資産（compatibility boundaryとして維持）
  ├─ GeometryEngine / GeometrySnapshot（KEEP・凍結契約）
  ├─ CommonModelGeometryInputAdapter（ADAPT: 入力差し替え）
  ├─ LinerAlignmentConnector（ADAPT: LINER単一正本の原則を維持）
  └─ 3D / STL / 図面 / 数量（KEEP/ADAPT: 後続Phaseで正本参照へ）
```

- Connectorは「旧正本を維持する層」に**しない**。全ての正本は新PDC側に置き、旧資産は
  計算・Geometry・3D・出力の実行層としてのみ利用する。
- ID/reference境界を優先し、Road/Terrain/Existing/下部工の正本を上部工へ複製しない。

## 8. 個別判定サマリ（superstructureAdapter / superstructureBinding / projectSuperstructure / 既存Contract schema）

| 資産 | 判定 | 具体的なADAPT内容 |
|---|---|---|
| `superstructureAdapter.ts` | **ADAPT** | producer配線 or 入力切替。写像ロジックは流用。`analysisReference=NOT_AUTHORIZED`恒久設定は新Systemではauthorization stateとして保持。新SuperstructureDocument生成の核として再利用 |
| `superstructureBinding.ts` | **ADAPT（KEEP寄り）** | CBDM入力を新正本（BridgeLayoutDocumentから生成したspan/support情報＋SuperstructureDocumentのgirder offsets）へ変更。fail-closed不変条件はそのまま。結果の`GeometryEngineInput`は旧GeometryEngineへの互換入力として維持 |
| `projectSuperstructure.ts` | **ADAPT** | `ProjectModel`旧sidecar永続化を、新PDC `modules.superstructure`の永続化へ移行。round-trip検証ロジックは踏襲 |
| 既存Contract schema（BSDD） | **ADAPT** | SuperstructureDocument最小Contract候補のベース。Phase 5-01でID/reference境界整理。schema変更はPhase 5-01以降 |
| `CommonModelGeometryInputAdapter` | ADAPT | 入力元をCBDM→新正本へ。実装はほぼ不変 |
| `LinerAlignmentConnector` | ADAPT（KEEP寄り） | 新Road Module参照経路と同一原則。上部工側station/offset要求に流用 |

## 9. リスク（Step B固有）

- `superstructureAdapter`がプロダクションdeadであるため、Phase 5-01で「配線する」判断を誤ると既存test（caseA/caseB e2e）を壊す。配線は新module内で完結させ、旧App.tsx経路は触らない。
- BSDD schemaのlarge surface（3514行）は、SuperstructureDocument設計時に部分再構成が必要。全書き換えではなく、ID/reference境界の整理に限定する。
- 新PDCと旧Apolloは現在完全分離。初回接続は「Adapter/Connectorを新正本へ向ける」小さなPRで段階的に行う。
