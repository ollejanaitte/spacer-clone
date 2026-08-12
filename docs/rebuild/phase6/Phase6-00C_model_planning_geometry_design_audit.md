# Phase 6-00 Step C: model / validation / planning / Geometry / 3D / persistence / design engine / tests 監査

## 1. 目的

下部工のドメインモデル・検証・Planning UI・Geometry・3D・Persistence・Design Engine・testsを個別に監査し、
Phase 6-01での再利用可否を確定する。

- baseline: `478dd93df9e5d4be7056fab19d209bd6e266d598`（Step B merge後）
- 日付: 2026-08-13

## 2. model / validation 監査

### 2.1 model.ts（SubstructureProject v0.2.0）— ACTIVE_PRODUCTION・**KEEP**

| 型 | 内容 | 成熟度 |
|---|---|---|
| `Support` | supportId/supportType/placement（liner|direct_xyz）/skewRad/bearingSeats/shape（pier|abutment） | Level 4 |
| `SupportPlacement` / `SupportPlacementSnapshot` | station/offset/alignmentId or position/azimuthRad | Level 4 |
| `BearingSeat` | seatId/bearing/position/dimensions | Level 4 |
| `PierData`/`PierColumn`/`PierCap`/`PortalPierBeam` | 単柱/壁式/門型 | Level 4 |
| `AbutmentData`/`WingWall` | 逆T/片持壁式 | Level 4 |
| `Footing` / `PileGroup` | フーチング/杭（bored/steel_pipe） | Level 4 |
| `SubstructureProject` | 全体コンテナ（v0.2.0・coordinate x-y-z・unit SI） | Level 4 |

- **KEEP判定**: 型構造は新SubstructureDocumentのベースとしてそのまま利用可能。
  ただし`placement`（LINER station/offset方式）とProject-global XYZの両立設計が必要。

### 2.2 validation.ts — ACTIVE_PRODUCTION・**KEEP**

- fail-closed: FATAL/WARNING/INFO・schemaVersion/coordinateSystem/unitSystem・supportId一意・形状必須・寸法正値
- `isAllFatalFree`・`validatePositive`/`validateNonNegative`
- **KEEP判定**: 新SubstructureDocument検証のベースとして流用可

### 2.3 SupportPlacementEngine — ACTIVE_PRODUCTION・**ADAPT（KEEP寄り）**

- `computeLinerPlacement`: LINER `pointAtStationOffset` + skew frame（`pierLineDirectionFromSkew`）→ placement snapshot
- `computeDirectXyzPlacement`: 例外（XYZ直接）
- FATAL fail-closed（`fatalCount`）
- **ADAPT判定**: LINER単一正本のまま。新PDC経路ではsupport配置情報（Phase 4 SupportHandoff）からstation/offsetを受領

## 3. Geometry / 3D 監査

| 資産 | 内容 | 判定 |
|---|---|---|
| `geometryBase.ts` | SolidNode（box/cylinder）/Transform/Group/WorldSolid・transformFromSnapshot・localToWorld・partId | **KEEP**（純ロジック） |
| `SubstructureSolidGenerator.ts` | 橋台+橋脚+基礎solids（buildAllSupportSolids） | **KEEP**（PDC接続で流用） |
| `PierSolidGenerator.ts` | 単柱/壁式/門型（columns+cap/beam）・GeometryError fail-closed | **KEEP** |
| `FoundationSolidGenerator.ts` | buildPileGrid/derivePileLayout・footing+杭cylinder | **KEEP**（piles UI除く） |
| `PlanProjection.ts` | 2D SVG plan projection | **KEEP** |
| `viewer3d/threeFactory.ts` | Solid→THREE（Z-up→Y-up swap・bounds） | **KEEP** |
| `viewer3d/SubstructureViewer3D.tsx` | R3F Canvas・OrbitControls・raycast・camera presets・dimensions | **KEEP** |

- 座標: 既存はZ-up→Y-up swap（viewer3d）。新システムの`renderCoordinate`（x→x,y→z,z→-y）とは**表示変換が異なる**
  - **重要**: 新統合3DではrenderCoordinateを正とする（表示のみ・正本を書き換えない）
- **判定**: Geometry/3D実行層はKEEP。表示変換は新規約へ揃える

## 4. Planning UI 監査

| 資産 | 内容 | 判定 |
|---|---|---|
| `SubstructurePlanningHost.tsx` | 状態owner: supports/undo/import/design/adapter/save/load | **ADAPT（KEEP寄り）** |
| `SubstructurePlanningPage.tsx` | 3ペインCAD shell | **KEEP** |
| `SubstructureViewport.tsx` | 2D/3D + extraGroups（superstructure envelope） | **KEEP** |
| `useUndoRedo.ts` / `useSubstructureRealtimeUpdate.ts` | undo/redo・placement snapshots+3D rebuild | **KEEP** |
| `formModel.ts`/`formToSupport.ts`/`SubstructureFormPanel.tsx`+`forms/*` | 入力UI | **KEEP** |
| `samples/sampleGenerator.ts` | 初期形状テンプレート | **KEEP**（SUBSTRUCTURE-owned） |
| `selectionState.tsx`/`useKeyboardShortcuts.ts`/`piles/*` | prod未配線 | **ACTIVE_TEST_ONLY**（REMOVE候補） |

- **判定**: Planning UIの大半はKEEP。新PDC接続（Host入力を新PDC/Handoff由来へ）はADAPT

## 5. Persistence 監査

| 資産 | 内容 | 判定 |
|---|---|---|
| `planning/persistence.ts` | serialize/deserialize SubstructureProject（v0.2.0・fail-closed） | **KEEP（ADAPT寄り）** |
| `design/adapterPersistence.ts` | AdapterEnvelope save/load（substructure-project.json） | **ADAPT**（新PDC auto-saveへ） |
| 保存形式 | ブラウザdownload/uploadのみ | **REWRITE相当**（新PDC .spacerproj/auto-saveへ） |
| backend | 下部工保存資産なし | — |

- **判定**: 既存save/loadはdownload/upload方式。新システムではPDC auto-save/.spacerprojへ接続（ADAPT）

## 6. Design Engine 監査

| 資産 | 内容 | 数値 | 判定 |
|---|---|---|---|
| `designEngine.ts` | runDesign framework・geometric qty実計算・全構造check HOLD_NOT_AVAILABLE | 概算数量のみ実・構造照査HOLD | **KEEP（framework）** |
| `geometricQuantity.ts` | box/cylinder体積・杭長実計算 | **REAL math** | **KEEP** |
| `calculationAdapter.ts` | Adapter境界契約（TEST/MOCK・isFormalDesign:false） | 契約 | **KEEP（ADAPT寄り）** |
| `adapterMapper.ts` | Support→AdapterInput・FNV-1a modelRevision | 実 | **KEEP** |
| `testCalculationEngine.ts` | TEST/MOCK（実幾何+hardcoded 0.5 fixture） | TEST/MOCK | **KEEP（旧）** |
| `calculationOutput.ts` | 計算書CSV/JSON | 整形 | **KEEP** |
| `superstructureInterface.ts` | support-interface parse | parse | **ADAPT**（Phase 5互換） |
| `superstructureEnvelope.ts` | 上部工envelope 3D | 実 | **KEEP** |
| `seismicDesign.ts`/`reinforcementDesign.ts` | 耐震/鉄筋HOLD | HOLD | **ACTIVE_TEST_ONLY**（DEFER） |

- **判定**: Design Engineのframework（runDesign/geometricQuantity/adapter境界）はKEEP。
  実構造照査はDEFER（未認証）。未認証反力の自動採用禁止（fail-closed継承）

## 7. tests 監査

### 7.1 substructure tests（48ファイル・全PASS確認済み）

- design: designEngine/geometricQuantity/calculationAdapter/adapterMapper/testCalculationEngine/calculationOutput/adapterPersistence/designGolden/reinforcementDesign/seismicDesign
- geometry: pierGeometry/abutmentGeometry/foundationGeometry/planProjection/placementEngine/superstructureEnvelope/superstructureInterface
- persistence: persistence/adapterPersistence/projectSchemaRegression
- planning: planningShell/interaction/selectionSync/realtimeUpdate/inputForms/sampleDialog/sampleGenerator/pileLayoutModel/pileLayoutUI/dimensionModel/dimensionUI/linerHandoff/hostIntegration
- viewer: threeFactory/substructureViewer3D
- 参照: referenceBridgeConnection

### 7.2 bridgeProject binding tests

- substructureBinding/mountain500.substructure/caseA/caseB e2e/mountain500.fullchain.e2e/integratedScene3d

### 7.3 E2E（Playwright・実アプリ）

- substructure-main-entry/substructure-integration/substructure-persistence/substructure-design-result/substructure-m3-integration

### 7.4 Phase 4/5 handoff tests

- bridgeLayoutSupportHandoff/bridgeLayoutSpanHandoff/bridgeLayoutIntegrityPersistence/superstructureHandoff/referenceBridge

- **判定**: 既存testsはproduction pathを強力に保護。**KEEP（regression）**。
  新PDC接続時のtests追加はPhase 6-01/6-02

## 8. Terrain / Existing 連携監査

- 既存下部工は**Terrain/Existingを直接参照しない**（support placementはLINER alignment経由）
  - `terrainElevation`はPhase 4 SupportHandoffに存在するが、下部工側は未消費
  - `bridgeLayoutPlacement.ts`は`lookupTerrainElevation`/`getProjectTerrainGrid`を持つ（Phase 4側）
- **判定**: Phase 6-01で基礎高さ・根入れ計算にTerrain参照を接続（新Connector経由）

## 9. 監査結論（Step C）

| カテゴリ | 判定 |
|---|---|
| model（v0.2.0） | **KEEP**（新SubstructureDocumentのベース） |
| validation | **KEEP** |
| SupportPlacementEngine | **ADAPT**（KEEP寄り・LINER正本維持） |
| Geometry/3D | **KEEP**（表示変換はrenderCoordinateへ揃える） |
| Planning UI | **KEEP**（Host入力のみADAPT） |
| Persistence | **ADAPT/REWRITE相当**（download/upload→PDC） |
| Design Engine | **KEEP**（framework・構造照査はDEFER） |
| tests | **KEEP**（regression維持） |
| Terrain/Existing | **未接続**（Phase 6-01で接続） |
