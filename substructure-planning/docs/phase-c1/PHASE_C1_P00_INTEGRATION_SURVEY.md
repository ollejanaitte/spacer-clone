# Phase C1 P00 統合スコープ調査報告書

## 1. 調査概要

### 1.1 調査目的

Phase C1「上部工・下部工3D統合＋LINER平面図連携」の実装開始前に、LINER・Apollo・下部工プロトタイプ・3D表示・平面図描画・データ接続点を実コードベースで調査し、実装接続点・変更予定箇所・非変更箇所・検証対象を確定する。

### 1.2 調査範囲

| モジュール | 調査ファイル数 | 主な確認項目 |
|------------|---------------|-------------|
| LINER Pages | 7 | 画面構成・タブ・ルーティング |
| LINER UI/Adapter | 4 | State管理・Draft更新 |
| LINER Drawing | 12 | レイヤ構造・プリミティブ・SVG描画 |
| LINER Core | 4 | 座標計算・橋梁レイアウト・Pier結果 |
| LINER Schema | 1 | 入力Draft型定義 |
| Apollo Visualization | 5 | Builder・SolidParameter・Renderer |
| Apollo BridgeStructure | 2 | 型定義・StableID生成 |
| Viewer3D | 6 | SceneGroups・SceneBuilder・Viewer3D・Renderer |
| Substructure Prototype | 5 | Model・Geometry・Validation・IO・Default |
| JSON Schema | 6 | 5 substructure + project.schema.json |
| Contracts | 5 | StableEntityId・BSDD・TransferPackage |
| Persistence | 4 | 保存・読込・Gateway |
| App.tsx | 1 | 全体配線 |
| **合計** | **62+ファイル** | |

---

## 2. 各モジュール詳細調査結果

### 2.1 LINER

#### 2.1.1 UI構成

| ページ | ファイルパス | 役割 |
|--------|-------------|------|
| LinerLauncherPage | `frontend/src/liner/pages/LinerLauncherPage.tsx` | ランチャー |
| LinerListPage | `frontend/src/liner/pages/LinerListPage.tsx` | 一覧 |
| LinerEditPage | `frontend/src/liner/pages/LinerEditPage.tsx` | 編集（7タブ） |
| LinerPreviewPage | `frontend/src/liner/pages/LinerPreviewPage.tsx` | プレビュー |
| LinerFormalDrawingWorkspacePage | `frontend/src/liner/pages/LinerFormalDrawingWorkspacePage.tsx` | 図面ワークスペース |
| LinerMappingReviewPage | `frontend/src/liner/pages/LinerMappingReviewPage.tsx` | マッピングレビュー |

**タブ構成（LinerEditPage内）：**
- `"line"` → AlignmentManager, HorizontalElementEditor
- `"station"` → LinerStationProfilePanel
- `"height"` → PlanElevationTable
- `"vertical"` → VerticalElementEditor
- `"crossSection"` → CrossSectionTemplateEditor
- `"utilities"` → Ldist, Haunch, Hoso
- `"review"` → BridgeLayoutEditor, BridgeLayoutDiagnosticsPanel

**下部工トグルを置くべき場所（優先順）：**
1. **LinerFormalDrawingWorkspacePage** line 358-386 → `displayControls` セクション。既存の表示制御（Zoom/Fit）に隣接。最適。
2. **LinerEditPage "review" タブ** line 449-466 → BridgeLayoutEditor 内。3Dプレビューとの連携に適する。
3. **App.tsx の ViewerControls** → 3D統合表示の ON/OFF に使用。

#### 2.1.2 State管理

LINER は **外部状態管理ライブラリを使用していない**。全 state は LinerEditPage の `useState<LinerDraft>` で管理し、`onDraftChange` コールバックで親（App.tsx）へ伝播する。

| アダプタファイル | 役割 |
|-----------------|------|
| `frontend/src/liner/adapters/linerUiAdapter.ts` | 全 Draft 更新関数（1626行） |
| `frontend/src/liner/adapters/linerDomainDraftRoadDesignMapper.ts` | Domain ↔ Draft 変換 |
| `frontend/src/liner/adapters/linerProjectDraft.ts` | Commit 検証 |

**Draft 型：** `LinerDraft = BuildIntermediateInput`（`liner/core/pipeline/pipeline.ts` で定義）

#### 2.1.3 座標計算API

| 関数 | ファイル | シグネチャ |
|------|---------|-----------|
| `pointAtStationOffset` | `liner/core/coordinate3d.ts` | `(input, station, offset) → Coordinate3dResult<PointAtStationOffsetValue>` |
| `elevationAtStation` | 同上 | `(input, station) → Coordinate3dResult<number>` |
| `crossSectionAtStation` | 同上 | `(input, station) → Coordinate3dResult<CrossSectionAtStationValue>` |

**戻り値 `PointAtStationOffsetValue`：**
```typescript
{ x, y, z, physicalDistance, displayedStation, offset, azimuth, localFrame, elementId, zProvenance }
```

#### 2.1.4 橋梁レイアウト

| 関数/型 | ファイル | 内容 |
|---------|---------|------|
| `evaluateBridgeLayout` | `liner/core/bridge/bridgeLayoutEvaluation.ts` | スパン・Pier評価 |
| `PierResult` | `liner/core/types.ts:385` | `{ id, physicalDistance, displayedStation, skewAngleRad, bearingOffsets, supportLinePointIds }` |
| `SpanResult` | `liner/core/types.ts:375` | `{ id, startPhysicalDistance, endPhysicalDistance, pierIdStart, pierIdEnd }` |
| `PierDraft` | `liner/schema/types.ts:530` | 入力型（id, physicalDistance, kind, skewAngleRad, bearingOffsets） |
| `pierLineDirectionFromSkew` | `liner/core/bridge/pierLineGeometry.ts` | 斜角から Pier 線方向ベクトル計算 |
| `hasBridgeLayout` | `liner/drawing/builders/bridgeLayoutDrawing.ts` | Bridge Layer 有無判定 |

#### 2.1.5 Drawing レイヤ構造

| ファイル | 内容 |
|---------|------|
| `liner/drawing/model/document.ts` | `DrawingDocument` → `DrawingSheet` → `DrawingViewport` → `DrawingLayer` |
| `liner/drawing/model/primitives.ts` | `DrawingLine`, `DrawingPolyline`, `DrawingArc`, `DrawingCircle`, `DrawingText`, `DrawingDimension` |
| `liner/drawing/model/stationAxis.ts` | `StationAxis`, `physicalDistanceToStationAxisX()` |
| `liner/drawing/rendering/DrawingDocumentSvg.tsx` | SVG レンダラー（`layer.visible` フィルタ済み） |
| `liner/drawing/builders/formalBuilders.ts` | 各 Builder。`plan-bridge-layer` は bridgeLayoutDrawing 経由で追加 |
| `liner/drawing/builders/bridgeLayoutDrawing.ts` | `createBridgeLayoutGeometryLayer` → Bridge Overlay Layer 生成 |

**DrawingLayer 型：**
```typescript
type DrawingLayer = {
  id: string;
  name: string;
  visible: boolean;          // ← 表示/非表示トグル可能
  coordinateSpace?: "model" | "paper";
  style?: DrawingStyle;
  primitives: DrawingPrimitive[];
};
```

#### 2.1.6 平面図 builder のレイヤ追加箇所

`formalBuilders.ts` の Plan builder 内（line 953-956）：
```typescript
const bridgeLayer = planBridgeLayoutLayer(context);
const planLayers = bridgeLayer
  ? [planLayer, bridgeLayer, ...annotationLayers]
  : [planLayer, ...annotationLayers];
```

**Substructure Overlay Layer 追加位置：** この `planLayers` 配列に `substructureLayer` を追加する。または builder 実行後に既存 DrawingDocument に layer を追加する後処理方式。

---

### 2.2 Apollo / 上部工

#### 2.2.1 可視化モデル構築

| 関数 | ファイル | シグネチャ |
|------|---------|-----------|
| `buildApolloVisualizationModel` | `apollo/visualization/builder.ts:909` | `(input: ApolloVisualizationBuildInput) → ApolloVisualizationBuildResult` |
| `buildApolloVisualizationModelOrThrow` | 同上:1026 | `(input) → ApolloVisualizationModel` |

**入力型：**
```typescript
type ApolloVisualizationBuildInput = {
  readonly project: ProjectModel;         // 上部工プロジェクトデータ
  readonly draft?: ApolloPhase1Unit2Draft | null;
  readonly defaultsProvider?: ApolloBridgeGeometryDefaultsProvider;
};
```

**出力型：**
```typescript
type ApolloVisualizationModel = {
  readonly schemaVersion: "1.0.0";
  readonly contractVersion: "1.0.0";
  readonly elements: readonly ApolloVisualizationElement[];
  readonly solidGeometryParameters: readonly ApolloSolidGeometryParameter[];
  // ... units, coordinateSystem, warnings, assumptions ...
};
```

#### 2.2.2 ApolloSolidGeometryParameter

```typescript
type ApolloSolidGeometryParameter = {
  readonly id: string;
  readonly kind: SolidKind;  // "girder" | "cross_beam" | "deck" | "bearing" | "pier_marker" | ...
  readonly dimensionsM: Readonly<Record<string, number>>;
  readonly localFrame: {
    readonly origin: readonly [number, number, number];
    readonly xAxis: readonly [number, number, number];
    readonly yAxis: readonly [number, number, number];
    readonly zAxis: readonly [number, number, number];
  };
  readonly exportable: boolean;
  readonly designEntityId?: string;
  // ...
};
```

**Phase C1 で追加する SolidKind：**
```typescript
"substructure_column" | "substructure_cap" | "substructure_footing" |
"substructure_pile" | "substructure_bearing" | "substructure_bearing_seat" |
"substructure_abutment_wall" | "substructure_wing_wall" |
"substructure_superstructure_envelope"
```

#### 2.2.3 Viewer3D 連携

| コンポーネント | ファイル | 役割 |
|--------------|---------|------|
| `Viewer3D` | `viewer/Viewer3D.tsx:57` | メインビューア（`apolloVisualizationModel` を prop で受取） |
| `ThreeViewport` | `viewer/ThreeViewport.tsx` | Three.js レンダリング（`scene` 管理） |
| `SceneBuilder.rebuildModelScene` | `viewer/SceneBuilder.ts:91` | Scene 再構築（Apollo 有無を判定） |
| `rebuildApolloVisualizationScene` | `viewer/SceneBuilder.ts:187` | Apollo モデル描画（内部関数） |
| `renderApolloVisualizationSolids` | `viewer/renderers/ApolloVisualizationRenderer.ts:102` | ソリッド描画ディスパッチ |
| `createSceneGroups` | `viewer/SceneBuilder.ts:20` | 15 の SceneGroup 生成 |

**App.tsx の配線（line 1313-1339）：**
```typescript
<Viewer3D
  project={project}
  displayModel={viewerDisplayModel}
  apolloVisualizationModel={
    viewerDisplayModel === "apollo" && apolloVisualizationBuild.ok
      ? apolloVisualizationBuild.model
      : null
  }
  // ...
/>
```

**SceneGroups の Apollo グループ（viewer/types.ts）：**
`apolloGirders`, `apolloCrossBeams`, `apolloBracings`, `apolloDeck`, `apolloBearings`, `apolloMarkers`, `apolloAppurtenances`, `apolloHaunches`, `apolloPavement`, `apolloRoadMarkings`

**Phase C1 で追加する SceneGroup：**
`substructureColumns`, `substructureCaps`, `substructureFootings`, `substructurePiles`, `substructureBearings`, `substructureAbutments`, `substructureWingWalls`

#### 2.2.4 Stable ID 生成

| 関数 | ファイル | シグネチャ |
|------|---------|-----------|
| `stableUuidFromSeed` | `apollo/bridgeStructure/stableIds.ts:7` | `(seed: string) → UuidString` |
| `stableEntitySeed` | 同上:20 | `(projectScopeId, entityKind, key) → string` |

---

### 2.3 下部工（substructure-planning prototype）

#### 2.3.1 データモデル

| インタフェース | ファイル | 主要フィールド |
|--------------|---------|---------------|
| `Project` | `prototype/src/model.ts` | `schemaVersion`, `projectId`, `origin`, `supports[]` |
| `Support` | 同上 | `supportId`, `supportType`, `position`, `skewAngle`, `bearingSeats[]`, `pier?`, `abutment?` |
| `Pier` | 同上 | `formType`, `column`, `cap`, `footing`, `piles?` |
| `PierColumn` | 同上 | `width`, `depth`, `height` |
| `PierCap` | 同上 | `width`, `depth`, `height`, `overhangL`, `overhangR` |
| `Footing` | 同上 | `length`, `width`, `thickness`, `topElevation` |
| `PileGroup` | 同上 | `pileType`, `diameter`, `length`, `pileCount`, `spacing` |
| `Abutment` | 同上 | `formType`, `backwall`, `wingWallL`, `wingWallR` |
| `BearingSeat` | 同上 | `seatId`, `position`, `dimensions`, `bearing` |

**座標系：** `x-longitudinal-y-transverse-z-up`（右手系）

#### 2.3.2 3D形状生成

| 関数 | ファイル | 内容 |
|------|---------|------|
| `buildScene(project)` | `prototype/src/geometry.ts` | 全 Support の 3D Scene 生成 |
| `buildPier` | 同上 | フーチング+柱+キャップ+支承+杭の Box/Cylinder 生成 |
| `buildAbutment` | 同上 | 壁+翼壁の Box 生成 |
| `buildPiles` | 同上 | 杭グリッド配置（CylinderGeometry） |
| `buildBearingSeat` | 同上 | 支承座+支承の Box 生成 |
| `buildSuperstructure` | 同上 | 全支点を覆う Envelope Box |

**Three.js バージョン：** prototype は `three ^0.170.0`、main は `three ^0.184.0`

#### 2.3.3 バリデーション

| 関数 | ファイル | 内容 |
|------|---------|------|
| `validateProject(p)` | `prototype/src/validation.ts` | 全体バリデーション |
| `validateSupport(s)` | 同上 | Support 単位のバリデーション |
| `ValidationError` | 同上 | Issue[] を持つエラー型 |

**検証コード：** `PARSE`, `OBJECT`, `TYPE`, `NONPOSITIVE`, `OUTOFRANGE`, `SCHEMA_VERSION`, `COORDINATE_SYSTEM`, `UNIT_SYSTEM`, `INCOMPLETE`, `UNSUPPORTED_FORM`

#### 2.3.4 JSON保存

| 関数 | ファイル | 内容 |
|------|---------|------|
| `serializeProject(p)` | `prototype/src/projectIO.ts` | JSON 文字列化 |
| `parseProject(text)` | 同上 | パース + バリデーション |

---

### 2.4 JSON Schema

| Schema | ファイル | 内容 |
|--------|---------|------|
| `substructure-project.schema.json` | `schemas/substructure/` | プロジェクト全体（`supports[]` + `alignmentRefs`） |
| `pier.schema.json` | 同上 | Pier 形状定義（`$defs` のみ） |
| `abutment.schema.json` | 同上 | Abutment 形状定義（`$defs` のみ） |
| `foundation.schema.json` | 同上 | フーチング+杭定義（`$defs` のみ） |
| `support-interface.schema.json` | 同上 | 上部工⇔下部工交換スキーマ |
| `project.schema.json` | `schemas/` | メインプロジェクト（2503行） |
| `stable-entity-id.schema.json` | `schemas/contracts/v0.1/` | StableEntityId 定義 |

**注意：** `support-interface.schema.json` と `substructure-project.schema.json` で **bearingSeat のフィールド名が異なる**。
- substructure-project: `{ seatId, position, dimensions, bearing: { id, height, type } }`
- support-interface: `{ bearingId, bearingPosition, bearingHeight, bearingDimensions }`

---

### 2.5 データ契約（Contracts）

| 契約 | ファイル | 内容 |
|------|---------|------|
| `StableEntityId` | `contracts/stableEntityId.ts` | `{ namespace, id(UUID), entityKind, aliases }` |
| `RoadToFrameTransferPackage` | `contracts/roadToFrameTransferPackage.ts` | `SubstructureEntry`, `BearingLineEntry` を含む |
| `RoadDesignDocument` | `contracts/roadDesignDocument.ts` | 道路設計書（`stableIdRegistry` 含む） |
| `BridgeSuperstructureDesignDocument` | `contracts/bridgeSuperstructureDesignDocument.ts` | BSDD（`BsddSupport`, `BsddSpan` 含む） |

**Persistence：**
| ファイル | 内容 |
|---------|------|
| `contracts/persistence/types.ts` | `DocumentLoadResult`, `DocumentSaveResult` |
| `contracts/persistence/loadDocument.ts` | `loadRoadDesignDocument()`, `loadBridgeFrameAnalysisDocument()` |
| `contracts/persistence/saveDocument.ts` | `saveRoadDesignDocument()`, `saveBridgeFrameAnalysisDocument()` |
| `contracts/persistence/documentGateway.ts` | `DocumentPersistenceGateway`（load + save 統合） |

---

## 3. 接続点調査結果

### 3.1 LINER → 支点配置（Support Placement Engine）

| 項目 | 内容 |
|------|------|
| **入力** | `CanonicalLinerIntermediateResult.piers[]`（`PierResult[]`） |
| **入力関数** | `evaluateBridgeLayout(input)` → `{ piers: PierResult[], spans: SpanResult[] }` |
| **座標計算** | `pointAtStationOffset(input, pier.physicalDistance, 0)` → `PointAtStationOffsetValue` |
| **斜角** | `PierResult.skewAngleRad` を直接使用 |
| **出力** | `SupportPlacement[]` 新規型 |
| **接続ファイル** | 新規: `frontend/src/substructure/SupportPlacementEngine.ts` |
| **再利用関数** | `coordinate3d.ts`, `pierLineGeometry.ts` |

### 3.2 LINER → Apollo（既存）

| 項目 | 内容 |
|------|------|
| **現状** | `createHeadlessLinerFrameProject()` → `ProjectModel` → `buildApolloVisualizationModel()` |
| **変更** | 不要。Phase C1 では現状維持。 |

### 3.3 LINER → 下部工

| 項目 | 内容 |
|------|------|
| **接続方式** | SupportPlacementEngine を経由 |
| **データ** | `SupportPlacement[]` → `SubstructureModel` の placement フィールドへ |
| **ファイル** | 新規: `frontend/src/substructure/SupportPlacementEngine.ts` |

### 3.4 Apollo → 下部工

| 項目 | 内容 |
|------|------|
| **現状** | 直接接続なし。`support-interface.schema.json` が唯一の交換スキーマ |
| **Phase C1** | 直接接続不要。両者は同一 Scene への配置でのみ結合。 |

### 3.5 上部工3D + 下部工3D

| 項目 | 内容 |
|------|------|
| **接続方式** | 同一 `ApolloVisualizationModel` の `solidGeometryParameters` に統合 |
| **識別** | `source: "superstructure" | "substructure"` フィールド追加 |
| **Scene構築** | `SceneBuilder.rebuildApolloVisualizationScene()` を拡張 |
| **Renderer** | 新規: `viewer/renderers/SubstructureRenderer.ts` |

### 3.6 下部工 → 2D平面投影

| 項目 | 内容 |
|------|------|
| **入力** | `SubstructureModel` + `SupportPlacement[]` |
| **出力** | `DrawingPrimitive[]`（矩形/線/十字/円） |
| **変換** | 3D形状をXY平面に投影 → StationAxis で図面座標変換 |
| **ファイル** | 新規: `frontend/src/substructure/PlanProjection.ts` |

### 3.7 下部工 → LINER平面図 Overlay

| 項目 | 内容 |
|------|------|
| **方式** | 既存 DrawingDocument に `DrawingLayer` 追加 |
| **追加位置** | `formalBuilders.ts` の `planLayers` 配列、または builder 呼出し後 |
| **レイヤID** | `"substructure-overlay"` |
| **表示制御** | `DrawingLayer.visible` トグル（既存 SVG レンダラーが自動対応） |
| **UIトグル位置** | `LinerFormalDrawingWorkspacePage` line 358 の displayControls セクション |

---

## 4. 変更予定ファイル

### FILES_TO_MODIFY（変更ファイル）

| # | ファイルパス | 変更内容 |
|---|-------------|---------|
| 1 | `frontend/src/contracts/stableEntityId.ts` | `StableIdNamespace` に `"substructure"` 追加 |
| 2 | `frontend/src/viewer/types.ts` | `SceneGroups` に substructure 用 Group 追加、`ViewerVisibility` 拡張 |
| 3 | `frontend/src/viewer/SceneBuilder.ts` | `rebuildApolloVisualizationScene()` 内で SubstructureRenderer 呼出し追加 |
| 4 | `frontend/src/viewer/Viewer3D.tsx` | ViewerVisibility 初期値に substructure 追加 |
| 5 | `schemas/project.schema.json` | `substructure` フィールド追加 |
| 6 | `frontend/src/contracts/persistence/types.ts` | 保存対象に substructure フィールド追加（必要なら） |
| 7 | `frontend/src/liner/pages/LinerFormalDrawingWorkspacePage.tsx` | displayControls セクションに下部工 Overlay トグル追加 |
| 8 | `frontend/src/liner/drawing/builders/formalBuilders.ts` | substructure レイヤ追加の呼出し（または builder 実行後処理） |

### FILES_TO_ADD（新規ファイル）

| # | ファイルパス | 内容 |
|---|-------------|------|
| 1 | `frontend/src/substructure/types.ts` | SubstructureModel 型定義 |
| 2 | `frontend/src/substructure/validation.ts` | 下部工バリデーション（prototype からの移行） |
| 3 | `frontend/src/substructure/SupportPlacementEngine.ts` | 支点配置計算エンジン |
| 4 | `frontend/src/substructure/SubstructureSolidGenerator.ts` | 3D形状生成（prototype からの移行＋拡張） |
| 5 | `frontend/src/substructure/PlanProjection.ts` | 2D平面投影 |
| 6 | `frontend/src/viewer/renderers/SubstructureRenderer.ts` | 下部工 3D 描画 Renderer |
| 7 | `frontend/src/substructure/__tests__/...` | テストファイル群 |

### FILES_TO_REUSE（再利用ファイル）

| # | ファイルパス | 再利用方法 |
|---|-------------|-----------|
| 1 | `liner/core/coordinate3d.ts` | `pointAtStationOffset()` を SupportPlacementEngine から呼出し |
| 2 | `liner/core/bridge/pierLineGeometry.ts` | `pierLineDirectionFromSkew()` で斜角計算 |
| 3 | `liner/core/bridge/bridgeLayoutEvaluation.ts` | `evaluateBridgeLayout()` で PierResult 取得 |
| 4 | `liner/drawing/model/document.ts` | DrawingLayer 追加の対象型 |
| 5 | `liner/drawing/model/primitives.ts` | 2D投影図形の出力型 |
| 6 | `liner/drawing/rendering/DrawingDocumentSvg.tsx` | layer.visible フィルタをそのまま利用 |
| 7 | `apollo/visualization/types.ts` | ApolloSolidGeometryParameter の拡張（既存型変更なし） |
| 8 | `apollo/visualization/builder.ts` | 現状維持（下部工は別途追加） |
| 9 | `viewer/renderers/ApolloVisualizationRenderer.ts` | 現状維持 |
| 10 | `viewer/ThreeViewport.tsx` | 現状維持 |
| 11 | `contracts/stableEntityId.ts` | `createStableEntityId()` を substructure 用 namespace で呼出し |
| 12 | `substructure-planning/prototype/src/geometry.ts` | 3D生成ロジックの流用元 |
| 13 | `substructure-planning/prototype/src/validation.ts` | バリデーションロジックの流用元 |
| 14 | `schemas/substructure/*.json` | データ形式の設計根拠（変更しない） |

### FILES_NOT_TO_MODIFY（変更禁止ファイル）

| # | ファイルパス | 理由 |
|---|-------------|------|
| 1 | `frontend/src/liner/core/*` | 線形計算ロジックは変更禁止 |
| 2 | `frontend/src/liner/adapters/*` | 既存 Draft 更新ロジックは変更禁止 |
| 3 | `frontend/src/apollo/visualization/*` | 上部工可視化ロジックは変更禁止 |
| 4 | `frontend/src/apollo/export/*` | STL 出力は変更禁止 |
| 5 | `frontend/src/apollo/bridgeStructure/*` | BSDD 生成は変更禁止 |
| 6 | `frontend/src/apollo/ApolloPhase1Shell.tsx` | Apollo Shell 変更禁止 |
| 7 | `frontend/src/viewer/ThreeViewport.tsx` | Scene 管理は変更禁止 |
| 8 | `frontend/src/viewer/coordinateTransform.ts` | 座標変換ポリシー変更禁止 |
| 9 | `frontend/src/viewer/renderers/ApolloVisualizationRenderer.ts` | 上部工描画変更禁止 |
| 10 | `schemas/substructure/*.json` | 既存 Schema 変更禁止 |
| 11 | `backend/` 全ファイル | バックエンド変更禁止 |
| 12 | `substructure-planning/prototype/` 全ファイル | 独立プロトタイプはそのまま維持 |

---

## 5. リスク調査

### 5.1 UI統合リスク

| # | リスク | 影響度 | 対策 |
|---|--------|--------|------|
| 1 | 下部工トグル UI が LINER の DrawingWorkspace に収まらない | LOW | displayControls セクションに追加可能。スペース問題なし |
| 2 | 下部工入力 UI を独立維持するか統合するか混同 | LOW | 当面は独立維持（prototype のまま）。統合は Phase C2 以降 |
| 3 | 3D統合表示の ON/OFF 制御が ViewerControls と重複 | LOW | ViewerControls の displayModel 選択とは独立した toggle として追加 |

### 5.2 データ契約リスク

| # | リスク | 影響度 | 対策 |
|---|--------|--------|------|
| 1 | support-interface と substructure-project の bearingSeat 命名不一致 | MEDIUM | 変換アダプタで対応。prototype 側の命名（seatId/position/dimensions）に統一 |
| 2 | project.json に substructure フィールド追加で既存データ破壊 | LOW | optional フィールド + Zod デフォルト値で対応 |
| 3 | Stable ID namespace 追加で既存 ID と衝突 | LOW | `"substructure"` namespace は新規。既存と衝突しない |

### 5.3 座標系リスク

| # | リスク | 影響度 | 対策 |
|---|--------|--------|------|
| 1 | 線形座標系（x-long/y-trans/z-up）と prototype 座標系の不一致 | LOW | 両者同一。一致確認済み |
| 2 | skew 角の符号定義不一致 | MEDIUM | LINER: `skewAngleRad`（radian）、prototype: `skewAngle`（degree）。単位変換が必要 |
| 3 | 曲線橋での局部座標系と世界座標系の変換誤差 | LOW | `pointAtStationOffset` の localFrame を正本として使用 |
| 4 | 上部工と下部工で localFrame の origin 定義が異なる | MEDIUM | 上部工は部材中心、下部工は Support.position 基準。変換時に統一基準を定義 |

### 5.4 3D統合リスク

| # | リスク | 影響度 | 対策 |
|---|--------|--------|------|
| 1 | SceneGroups の Apollo グループ名と substructure グループ名が重複 | LOW | `substructure` プレフィックスで衝突回避 |
| 2 | ViewerVisibility に substructure 要素追加で既存 Viewer 互換性 | LOW | 追加のみで既存フィールド変更なし |
| 3 | Three.js 版数不一致（prototype 0.170 vs main 0.184） | LOW | 移行時に main 版に統一 |
| 4 | 既存 ApolloVisualizationRenderer への副作用 | LOW | 変更しないため副作用なし |

### 5.5 LINER平面図 Overlay リスク

| # | リスク | 影響度 | 対策 |
|---|--------|--------|------|
| 1 | 既存平面図 SVG レンダラーへの副作用 | LOW | 独立レイヤ追加のみ。SVG レンダラーは layer.visible フィルタのみ |
| 2 | DXF 出力に下部工が含まれる影響 | LOW | 独立レイヤとして追加。CAD 側で表示制御可能 |
| 3 | 縮尺によって下部工投影図形が小さすぎる | LOW | 最小サイズ保証を追加検討 |

### 5.6 並行開発との競合リスク

| # | リスク | 影響度 | 対策 |
|---|--------|--------|------|
| 1 | LINER の別ブランチ開発と競合 | LOW | 専用 worktree で作業。LINER ファイルは変更最小 |
| 2 | Apollo の別ブランチ開発と競合 | LOW | Apollo ファイルは変更なし |
| 3 | 既存回帰テストとの競合 | LOW | 回帰テスト全通過を Gate 条件に設定 |

---

## 6. 検証対象

### 6.1 必須テストケース

| Case | 橋種 | 線形 | スパン | 斜角 | 確認項目 |
|------|------|------|--------|------|---------|
| GC-01 | 直橋 | R=∞ | 3@30m | 0° | 全項目 |
| GC-02 | 直橋+斜角 | R=∞ | 3@30m | 30° | 全項目+斜角反映 |
| GC-03 | 単純曲線橋 | R=300 | 2@30m | 0° | 全項目+曲線配置 |
| GC-04 | 曲線橋+斜角 | R=300 | 2@30m | 15° | 全項目+複合条件 |

### 6.2 確認項目一覧

| # | 項目 | 確認方法 |
|---|------|---------|
| 1 | 支点中心位置が LINER 座標と一致 | `pointAtStationOffset` 結果と SupportPlacement の比較 |
| 2 | 下部工の向き（接線方向）が正しい | localFrame.tangent と azimuth の一致確認 |
| 3 | 斜角が正しく反映されている | skew 角による Y 軸回転の確認 |
| 4 | 各部材寸法がパラメータと一致 | BoxGeometry サイズと dimensionsM の一致確認 |
| 5 | フーチング外形が正しい | 2D投影矩形と 3D上面の一致確認 |
| 6 | 杭位置が正しい | グリッド配置の座標計算確認 |
| 7 | 支承位置が正しい | bearingSeat 位置と 3D/2D の一致確認 |
| 8 | Stable ID が一意で追跡可能 | 3D/2D/JSON 間で同一 ID のリンク確認 |
| 9 | 3D 表示と 2D 投影が一致 | XY 投影範囲の比較 |
| 10 | JSON round-trip 再現性 | 保存→読込→再生成で同一結果 |
| 11 | GLB 出力互換 | prototype の GLB 出力が維持されていること |
| 12 | LINER 回帰テスト通過 | `npm run test` 全通過 |
| 13 | Apollo 回帰テスト通過 | `npm run test:regression` 全通過 |
| 14 | Spacer/frontend 回帰テスト通過 | E2E 全通過 |

### 6.3 回帰試験対象

| テスト群 | コマンド | 備考 |
|---------|---------|------|
| LINER Unit Tests | `npx vitest run src/liner/` | 変更なしのため通過必須 |
| Apollo Unit Tests | `npx vitest run src/apollo/` | 変更なしのため通過必須 |
| Contracts Tests | `npx vitest run src/contracts/` | namespace 追加のみ影響軽微 |
| Viewer Tests | `npx vitest run src/viewer/` | SceneGroups 拡張のテスト追加あり |
| Drawing Tests | `npx vitest run src/liner/drawing/` | レイヤ追加のテスト追加あり |
| Golden Regression | `npm run test:regression` | Golden Case 追加 |
| E2E Tests | `npm run test:e2e` | 下部工表示の E2E 追加予定 |

---

## 7. 推奨実装戦略

### 7.1 実装順序（推奨）

```
Phase 1: データ基盤（types.ts, validation.ts, stableId + namespace）
Phase 2: SupportPlacementEngine（座標計算＋斜角反映）
Phase 3: SubstructureSolidGenerator（3D形状生成、prototype からの移行）
Phase 4: 3D統合（SceneGroups + SubstructureRenderer + SceneBuilder拡張）
Phase 5: 2D投影（PlanProjection.ts）
Phase 6: LINER Overlay（DrawingLayer追加 + UIトグル）
Phase 7: 保存（project.json substructure 拡張）
Phase 8: 検証（Golden Case + 回帰テスト）
```

### 7.2 コード流用方針

| プロトタイプ | 流用先 | 変更点 |
|-------------|--------|--------|
| `geometry.ts` の `buildScene` | `SubstructureSolidGenerator.ts` | Three.js 0.184 対応、localFrame 出力に変更 |
| `validation.ts` の `validateProject` | `validation.ts`（frontend） | Issue コード体系を既存 ValidationIssue に合わせる |
| `model.ts` の全 interface | `types.ts`（frontend） | project.json 互換形式に調整 |
| `projectIO.ts` の serialize/parse | 保存処理 | persistence レイヤに統合 |

### 7.3 注意点

1. **skew 角の単位**：prototype は degree、LINER は radian。SupportPlacementEngine では radian 統一
2. **bearingSeat 命名**：prototype 側の `seatId/position/dimensions/bearing` に統一
3. **localFrame の原点**：上部工と下部工で一貫した定義（部材中心を基準）を確認
4. **project.json 拡張**：`substructure` フィールドは optional とし、移行後も既存データを破壊しない

---

## 8. 最終報告

```
BASE_MAIN_SHA: d36da3e53de36afdc5513d06d893f00d80b6913e
WORKTREE_PATH: /tmp/spacer-clone-phase-c1
FEATURE_BRANCH: feature/phase-c1-3d-liner-integration
WORKTREE_STATUS: clean

LINER_UI_ENTRY: frontend/src/liner/pages/LinerFormalDrawingWorkspacePage.tsx:358
LINER_PLAN_RENDERER_ENTRY: frontend/src/liner/drawing/rendering/DrawingDocumentSvg.tsx
ALIGNMENT_COORDINATE_API: frontend/src/liner/core/coordinate3d.ts:pointAtStationOffset
LINER_STATE_STORE_ENTRY: frontend/src/liner/adapters/linerUiAdapter.ts

APOLLO_UI_ENTRY: frontend/src/apollo/ApolloPhase1Shell.tsx
BRIDGE_DEFINITION_ENTRY: frontend/src/apollo/bridgeStructure/types.ts
SUPPORT_BEARING_ENTRY: frontend/src/contracts/bridgeSuperstructureDesignDocument.ts:BsddSupport
SUPERSTRUCTURE_3D_ENTRY: frontend/src/apollo/visualization/builder.ts:buildApolloVisualizationModel
APOLLO_STATE_STORE_ENTRY: なし（props-down 方式）

SUBSTRUCTURE_MODEL_ENTRY: substructure-planning/prototype/src/model.ts
SUBSTRUCTURE_3D_ENTRY: substructure-planning/prototype/src/geometry.ts
SUBSTRUCTURE_IO_ENTRY: substructure-planning/prototype/src/projectIO.ts
SUPPORT_INTERFACE_ENTRY: schemas/substructure/support-interface.schema.json

PLACEMENT_CONNECTOR_TARGET: frontend/src/substructure/SupportPlacementEngine.ts（新規）
3D_INTEGRATION_CONNECTOR_TARGET: viewer/SceneBuilder.ts + viewer/renderers/SubstructureRenderer.ts（新規）
PLAN_PROJECTION_TARGET: frontend/src/substructure/PlanProjection.ts（新規）
PLAN_OVERLAY_CONNECTOR_TARGET: liner/drawing/builders/formalBuilders.ts（拡張）+ LinerFormalDrawingWorkspacePage.tsx（UI）

FILES_TO_MODIFY: 8 files
  - frontend/src/contracts/stableEntityId.ts
  - frontend/src/viewer/types.ts
  - frontend/src/viewer/SceneBuilder.ts
  - frontend/src/viewer/Viewer3D.tsx
  - schemas/project.schema.json
  - frontend/src/contracts/persistence/types.ts
  - frontend/src/liner/pages/LinerFormalDrawingWorkspacePage.tsx
  - frontend/src/liner/drawing/builders/formalBuilders.ts

FILES_TO_ADD: 7+ files
  - frontend/src/substructure/types.ts
  - frontend/src/substructure/validation.ts
  - frontend/src/substructure/SupportPlacementEngine.ts
  - frontend/src/substructure/SubstructureSolidGenerator.ts
  - frontend/src/substructure/PlanProjection.ts
  - frontend/src/viewer/renderers/SubstructureRenderer.ts
  - frontend/src/substructure/__tests__/*

FILES_TO_REUSE: 14 files
FILES_NOT_TO_MODIFY: 12 files

UI_INTEGRATION_RISKS: LOW（displayControls セクションに追加可能）
DATA_CONTRACT_RISKS: MEDIUM（bearingSeat 命名不一致のみ）
COORDINATE_RISKS: LOW（skew 単位変換のみ注意）
3D_INTEGRATION_RISKS: LOW（SceneGroups 拡張のみ）
LINER_OVERLAY_RISKS: LOW（独立レイヤ追加）
PARALLEL_DEVELOPMENT_RISKS: LOW（専用 worktree + 変更ファイル最小）

REQUIRED_TESTS: 4 Golden Cases（GC-01〜GC-04）× 14確認項目
REGRESSION_TARGETS: LINER / Apollo / Contracts / Viewer / Drawing / Golden / E2E

SOURCE_CODE_CHANGED: NO
SCHEMA_CHANGED: NO
UI_CHANGED: NO
TEST_CODE_CHANGED: NO
GITHUB_WRITE_EXECUTED: NO

UNRESOLVED_BLOCKERS: NONE
IMPLEMENTATION_READY: YES
GO_NO_GO: GO
```

---

## 9. 結論

Phase C1 実装開始に必要な **全接続点・変更ファイル・リスク・検証対象** を調査完了した。

**判定：GO**

実装担当者は以下の最小セットで開始できる：
1. `frontend/src/substructure/` に新規モジュールを作成
2. `viewer/` に SceneGroups 拡張 + SubstructureRenderer 追加
3. `liner/drawing/` に Overlay Layer 追加
4. `schemas/project.schema.json` に substructure フィールド追加
5. 既存モジュールの変更は 8 ファイルのみ、かつ影響範囲限定

**未解決ブロッカーなし。**