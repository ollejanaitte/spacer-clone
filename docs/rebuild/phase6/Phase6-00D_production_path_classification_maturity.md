# Phase 6-00 Step D: Production Path / Dead Code判定 ＋ KEEP / ADAPT / REWRITE / DEFER / REMOVE ＋ 成熟度Level評価

## 1. 目的

全重要資産をproduction path / dead code判定し、
KEEP / ADAPT / REWRITE / DEFER / REMOVEに分類する。
主要資産の成熟度Level（0〜7）を証拠付きで評価する。

- baseline: `ba56172cbcb7e60b4ec6624204b49fe48750ac0b`（Step C merge後）
- 日付: 2026-08-13

## 2. Production Path / Dead Code Map

| 判定 | 資産 | 根拠 |
|---|---|---|
| **ACTIVE_PRODUCTION** | model.ts / validation.ts / SupportPlacementEngine.ts / geometryBase.ts / SubstructureSolidGenerator.ts / PierSolidGenerator.ts / FoundationSolidGenerator.ts / PlanProjection.ts | `/pro/liner/substructure`（App.tsx:1363）で到達・Host/Page/Viewport経由 |
| **ACTIVE_PRODUCTION** | planning: Host/Page/Viewport/FormPanel/forms/Toolbar/TreePanel/PropertyPanel/CoordinateTable/StatusArea/ContextMenu/useUndoRedo/useSubstructureRealtimeUpdate/formModel/formToSupport/linerHandoff/persistence（間接）/samples/dimensions | Host（App.tsx:1399）→Page→Viewport |
| **ACTIVE_PRODUCTION** | viewer3d（threeFactory/SubstructureViewer3D） | Viewport経由（R3F WebGL実レンダリング） |
| **ACTIVE_PRODUCTION** | design: designEngine/geometricQuantity/calculationAdapter/adapterMapper/testCalculationEngine/calculationOutput/adapterPersistence/superstructureInterface(parse/validate)/superstructureEnvelope | Host:189/198/204/315/338/368-452 |
| **ACTIVE_PRODUCTION** | bridgeProject: substructureBinding.buildBoundSubstructure / cbdmDocument.buildCommonBridgeModel/buildBridgeProjectManifest / alignmentAdapter / bridgeGeometryGenerator | App.tsx:1373-1385 |
| **ACTIVE_PRODUCTION** | liner/core/coordinate3d（pointAtStationOffset等） | 全placement経路の単一正本 |
| **ACTIVE_TEST_ONLY** | planning/selectionState.tsx / useKeyboardShortcuts.ts / piles/*（4ファイル） | prod未配線（testのみimport） |
| **ACTIVE_TEST_ONLY** | design/seismicDesign.ts / reinforcementDesign.ts | designEngineは別途inline HOLD（本module未使用） |
| **ACTIVE_TEST_ONLY** | design/geometricQuantity.computeProjectQuantity / superstructureInterface.bearingSeatsToModel/interfaceToReactions / superstructureEnvelope.summarizeEnvelope | testのみ |
| **DORMANT** | superstructureHandoff.buildSuperstructureHandoff / toSupportInterfaceEntry（Phase 5） | re-export+testのみ・production callerなし |
| **DEAD** | substructure/index.ts（barrel） | import者ゼロ |
| **DEAD** | designTypes.summarizeReactions | import者ゼロ |
| **DEAD** | bridgeProject/substructureBinding.buildBoundReactions | production callerなし（testのみ） |
| **DEAD** | bridgeProject/cbdmDocument.attachSubstructureToManifest / attachSuperstructureToManifest（runtime） | sidecarがruntime常にundefined・attach*はtestのみ |
| **REFERENCE_ONLY** | substructure-planning/（repo root） | 独立prototype・app未接続・設計意図の記録 |
| **BACKEND** | なし | 下部工計算はfrontendのみ（backend/に該当資産ゼロ） |

## 3. KEEP / ADAPT / REWRITE / DEFER / REMOVE Matrix

### KEEP（ほぼそのまま利用可）

| 資産 | 根拠 |
|---|---|
| model.ts（SubstructureProject v0.2.0） | 新SubstructureDocumentの型ベース |
| validation.ts | fail-closed検証ロジック |
| SupportPlacementEngine | LINER単一正本・placement計算 |
| geometryBase / SubstructureSolidGenerator / PierSolidGenerator / FoundationSolidGenerator / PlanProjection | 純ロジック・Phase 6実行層 |
| viewer3d（threeFactory/SubstructureViewer3D） | 3D実行層（表示変換のみ新規約へ） |
| Planning UI（Page/Viewport/forms/undo等） | 成熟・production実績 |
| designEngine framework / geometricQuantity / calculationAdapter / adapterMapper / calculationOutput | 実計算（概算数量）+ framework |
| superstructureEnvelope | 上部工envelope 3D |
| 既存tests | regression保護 |

### ADAPT（接続先を新PDC/Handoffへ変更）

| 資産 | 変更点 |
|---|---|
| bridgeProject/substructureBinding.buildBoundSubstructure | 入力元をCBDM→新PDC/Phase 4 SupportHandoffへ |
| substructureBinding.buildBoundReactions（DEAD→ADAPT） | Phase 5 reactionCases受領時に再利用（sign規約整合） |
| planning/linerHandoff | 新経路ではPhase 4 SupportHandoffを正とする（旧はfallback維持） |
| superstructureInterface.parseSupportInterface | Phase 5 toSupportInterfaceEntry出力を受領（schema整合） |
| adapterPersistence / planning/persistence | download/upload→新PDC auto-save/.spacerprojへ |
| useSubstructureRealtimeUpdate | 新Connector（snapshot由来）への置換候補 |
| SubstructurePlanningHost入力 | App.tsx（旧ProjectModel）→新PDC由来へ |

### REWRITE（局所再実装必要）

| 資産 | 根拠 |
|---|---|
| schemas/substructure/*（project/pier/abutment/foundation） | 0.1.0がfrontend 0.2.0と不整合。新SubstructureDocument schemaへ一本化 |
| Persistence方式 | download/upload→PDC auto-save/.spacerproj（縦断再設計） |
| toSupportInterfaceEntry | sign/axis/ID/enum/localFrame/elevationの6課題を修正（v1.0互換） |
| substructure_connector_spec実装（新Connector） | 契約未実装。snapshot由来のConnectorを新規実装 |
| App.tsx substructure route | 旧ProjectModel依存→新PDC接続（Phase 6-02で） |

### DEFER（後続Phaseへ送る）

| 資産 | 後送先 |
|---|---|
| 構造照査（stability/member/foundation/pile/seismic/rebar） | 認証・evidence Phase |
| 耐震照査・鉄筋設計 | Phase 6詳細設計 |
| 実計算engine（backend or 本実装） | Phase 6-02以降 |
| 図面・計算書・数量・成果品 | 成果品Phase |
| TEST/MOCK engineの置換 | 実engine Phase |
| Terrain/Existing連携の本接続 | Phase 6-01設計・6-02実装 |

### REMOVE候補（production pathになく重複・obsolete・危険）

| 資産 | 根拠（Phase 6-00では実際に削除しない） |
|---|---|
| substructure/index.ts（barrel） | import者ゼロ・深いpath importが既存慣行 |
| designTypes.summarizeReactions | 未使用 |
| planning/selectionState.tsx / useKeyboardShortcuts.ts | prod未配線・重複機能 |
| planning/piles/*（UI 4ファイル） | prod未配線（共有geometry関数はKEEP） |
| design/seismicDesign.ts / reinforcementDesign.ts | runDesignと重複HOLD（統合かREMOVEをPhase 6-01で決定） |
| bridgeProject/attachSubstructureToManifest | testのみ |
| CONN-011（useSubstructureRealtimeUpdate naive経路） | 正規経路へ置換 |

※ REMOVE判定は「候補」。Phase 6-01で最終判断。既存dirty差分・旧資産は削除しない。

## 4. 成熟度Level評価

凡例: L0=型のみ / L1=UI入力可 / L2=Geometry生成可 / L3=3D表示可 / L4=Save/Load可 / L5=Connector/Adapter接続済み / L6=実計算結果取得可 / L7=Reference Sample照合済み

| 資産 | Level | 証拠 |
|---|---|---|
| Abutment（model/geometry/3D/validation） | **L4** | 型（逆T/片持壁式）・solid生成（SubstructureSolidGenerator）・2D/3D表示・validation・persistence round-trip・tests（abutmentGeometry/modelValidation/persistence） |
| Pier（model/column/cap/bearing seat） | **L4** | 単柱/壁式/門型・capSolid/portalBeam・bearingSeat（hard-coded初期値）・tests（pierGeometry） |
| Footing | **L4** | 型・box solid・validation・persistence |
| Pile / Foundation | **L4** | 杭bored/steel_pipe・buildPileGrid/derivePileLayout・cylinder solid・tests（foundationGeometry） |
| Terrain integration | **L0（未接続）** | 下部工はTerrainを直接参照しない（terrainElevationはPhase 4 Handoff側に存在・未消費） |
| Existing integration | **L0（未接続）** | 下部工はExistingを参照しない |
| 3D Viewer | **L4** | R3F実WebGL・raycast/camera/dimensions・E2E実証 |
| Persistence | **L4** | save/load（download/upload）実動作・round-trip・stale検出。※PDC接続はL0 |
| Design Engine | **L5** | runDesign framework・real geometric qty（L6相当の概算数量）・構造照査はHOLD_NOT_AVAILABLE（L6未満）・calculationAdapter境界 |
| Connector（既存） | **L5** | LINER→Support placement接続済み（CONN-010）・snapshot由来Connectorは未実装（L0） |
| Validation | **L4** | fail-closed FATAL/WARNING/INFO・persistence連動 |
| Planning UI | **L4** | create/edit/delete/undo/redo/tree/2D/3D/status・E2E |
| 新PDC接続 | **L0** | modules.substructure slot空（Phase 6-01で実装） |

### 成熟度サマリ

- **再利用可能（L4+）**: model / validation / placement / geometry / 3D viewer / planning UI / design framework / persistence（ファイル方式）
- **未接続（L0）**: Terrain / Existing / PDC / snapshot Connector / 実構造照査
- **注意**: 現状の最高LevelはL4〜L5。L6（実計算結果）は概算数量のみで構造照査は未到達。
  L7（Reference Sample照合）はsubstructure-planning/verificationのgolden（m3-03/design-result-P1.json）で
  概算数量のみ照合済み（構造照査はHOLDのため照合不能）

## 5. 監査結論（Step D）

1. 既存下部工資産の核心（model/geometry/3D/planning/design framework）は**成熟（L4〜L5）かつproduction実績あり**
2. **Terrain / Existing / PDC / 新Handoff接続が欠落**（L0）→ Phase 6-01の主要設計対象
3. 構造照査・実計算engine・耐震・鉄筋は**DEFER**（認証ゲート未クリア）
4. REMOVE候補は明示したが**Phase 6-00では削除しない**
5. 未認証反力（NOT_AUTHORIZED）は正式設計計算へ**自動採用しない**（fail-closed）
