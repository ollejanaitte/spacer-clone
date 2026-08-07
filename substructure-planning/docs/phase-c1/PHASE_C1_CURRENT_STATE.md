# Phase C1 現状実装棚卸し

## 1. モジュール別現状評価

### 1.1 LINER（線形計算・平面図描画）

**現状：実装完了・安定稼働中**

| コンポーネント | ファイル | 状態 | 再利用可否 |
|---|---|---|---|
| 線形要素計算（直線・円弧・クロソイド） | `liner/core/geometry/` | 完成 | 直接再利用 |
| 測点計算・Station 式解決 | `liner/core/station/` | 完成 | 直接再利用 |
| 3D 座標計算（station + offset → XYZ） | `liner/core/coordinate3d.ts` | 完成 | 支点位置計算に直接使用 |
| グリッド生成 | `liner/core/grid/` | 完成 | 間接利用 |
| 橋梁スパン・橋脚レイアウト評価 | `liner/core/bridge/bridgeLayoutEvaluation.ts` | 完成 | 支点位置の正本として使用 |
| Pier 線形ジオメトリ（斜角対応） | `liner/core/bridge/pierLineGeometry.ts` | 完成 | 下部工配置の基準として使用 |
| 平面図 DrawingDocument 構築 | `liner/drawing/builders/formalBuilders.ts` | 完成 | Overlay 対象 |
| 平面図 SVG 描画 | `liner/drawing/rendering/DrawingDocumentSvg.tsx` | 完成 | Overlay 表示に利用 |
| 2D Affine 変換 | `liner/drawing/transforms/affineTransform2.ts` | 完成 | 2D 平面投影変換に利用 |
| DXF 出力 | `liner/dxf/` | 完成 | 変更不要 |

**主要エクスポート：**
- `pointAtStationOffset(station, offset)` → `{ x, y, z, azimuth, localFrame }`
- `stationAtPoint(x, y)` → `{ station, offset, elementId }`
- `evaluateAlignmentAtDistance(physicalDistance)` → `{ point, azimuth, curvature, localFrame }`
- `evaluateSpanLayout()` / `evaluatePierLayout()` → 支点位置一覧
- `buildFormalDrawingDocument()` → DrawingDocument（Overlay レイヤ追加可能）

### 1.2 Apollo（上部工 3D）

**現状：実装完了・安定稼働中**

| コンポーネント | ファイル | 状態 | 再利用可否 |
|---|---|---|---|
| 3D 可視化モデル構築 | `apollo/visualization/builder.ts` | 完成 | 上部工データの正本 |
| 主桁・床版・横桁ソリッド | `apollo/visualization/bridgeStructureSolids.ts` | 完成 | 統合時に現状維持 |
| 付属物・ハンチソリッド | `apollo/visualization/appurtenanceHaunchSolids.ts` | 完成 | 統合時に現状維持 |
| 舗装・標示ソリッド | `apollo/visualization/pavementMarkingSolids.ts` | 完成 | 統合時に現状維持 |
| STL 出力 | `apollo/export/apolloStlExport.ts` | 完成 | 変更不要 |

**主要エクスポート：**
- `buildApolloVisualizationModel(projectModel)` → `ApolloVisualizationModel`
- `ApolloSolidGeometryParameter`（kind / dimensionsM / localFrame を持つ）
- 上部工座標系：x-longitudinal / y-transverse / z-up

### 1.3 Substructure-planning（下部工 3D プロトタイプ）

**現状：独立 prototype として実装完了・未統合**

| コンポーネント | ファイル（prototype） | 状態 | 再利用可否 |
|---|---|---|---|
| TS データモデル | `prototype/src/model.ts` | 完成 | frontend 移行必要 |
| バリデーション | `prototype/src/validation.ts` | 完成 | 移行＋拡張必要 |
| 3D ジオメトリ生成 | `prototype/src/geometry.ts` | 完成 | 移行＋座標系統合必要 |
| 概算数量 | `prototype/src/quantity.ts` | 完成 | 移行必要 |
| JSON入出力 | `prototype/src/projectIO.ts` | 完成 | 統合形式に適合必要 |
| GLB出力 | `prototype/src/main.ts`（GLTFExporter） | 完成 | 現状維持 |
| 標準プロジェクト | `prototype/src/defaultProject.ts` | 完成 | 統合後も維持 |
| Unit Test（x4） | `prototype/tests/` | 完成 | 移行＋拡張必要 |
| E2E Test（10件） | `prototype/tests/browser_verify.mjs` | 完成 | 移行後再調整必要 |

**prototype の制約：**
- 独立 Vite プロジェクト（main spacer-clone の一部ではない）
- 線形座標を考慮せず、絶対座標（x/y/z）を直接入力
- 上部工との座標連携なし（JSON の support-interface のみ）
- Three.js v0.170（main は v0.184）

### 1.4 Viewer3D / Three.js

**現状：実装完了・Apollo + Frame Model 表示対応済み**

| コンポーネント | ファイル | 状態 | 再利用可否 |
|---|---|---|---|
| ThreeViewport | `viewer/ThreeViewport.tsx` | 完成 | 拡張点：下部工 SceneGroup 追加 |
| SceneBuilder | `viewer/SceneBuilder.ts` | 完成 | 拡張点：SubstructureRenderer 追加 |
| ApolloVisualizationRenderer | `viewer/renderers/ApolloVisualizationRenderer.ts` | 完成 | 現状維持 |
| SceneGroups 定義 | `viewer/types.ts` | 完成 | 拡張点：substructure 用グループ追加 |
| 座標変換 | `viewer/coordinateTransform.ts` | 完成 | 現状維持（x-long / y-trans / z-up） |
| Label 表示 | `viewer/renderers/` | 完成 | Stable ID 表示に利用可能 |

### 1.5 Schema / Contract

**現状：実装完了**

| コンポーネント | 状態 | 再利用可否 |
|---|---|---|
| `stableEntityId.ts` | 完成 | Substructure namespace 追加のみ |
| `bridgeSuperstructureDesignDocument.ts` | 完成 | 上部工の正本として維持 |
| `roadToFrameTransferPackage.ts` | 完成 | SubstructureEntry 拡張が必要 |
| `coordinateContext.ts` | 完成 | 現状維持 |
| `support-interface.schema.json` | 完成 | 下部工データ形式の基準として維持 |
| `pier.schema.json` / `abutment.schema.json` | 完成 | データモデルの正本として維持 |
| `foundation.schema.json` | 完成 | フーチング・杭データ形式の基準 |
| `substructure-project.schema.json` | 完成 | project.json 内 substructure 拡張の参考 |
| `project.schema.json` | 完成 | substructure フィールド追加の対象 |

### 1.6 保存・読込

| コンポーネント | 状態 | 影響 |
|---|---|---|
| Electron 保存（JSON ファイル） | 完成 | substructure データ追加後も same format |
| Backend 保存 | 完成 | 変更不要 |
| FE 永続化レイヤ（persistence/） | 完成 | project.json substructure 拡張に対応 |
| Apollo STL 出力 | 完成 | 変更不要 |
| Substructure GLB 出力（prototype） | 完成 | 統合後も互換維持 |

## 2. 再利用可能機能サマリー

| # | 機能 | ソース | Phase C1 での使われ方 |
|---|---|---|---|
| 1 | station → XYZ 計算 | LINER coordinate3d.ts | 支点位置の正本 |
| 2 | skew angle 計算 | LINER pierLineGeometry.ts | 下部工の斜角回転 |
| 3 | DrawingDocument + Layer | LINER drawing/model/ | 2D 投影の出力先 |
| 4 | AffineTransform2 | LINER drawing/transforms/ | 2D 図形の配置変換 |
| 5 | 上部工ソリッド生成 | Apollo visualization/ | 統合表示で現状維持 |
| 6 | SceneGroups + Renderer | viewer/ | 下部工 SceneGroup 追加 |
| 7 | パラメトリック 3D 形状生成 | substructure prototype geometry.ts | 移行して線形対応 |
| 8 | StableEntityId 体系 | contracts/stableEntityId.ts | substructure namespace 追加 |
| 9 | JSON Schema 定義 | schemas/substructure/*.json | データ形式の設計根拠 |
| 10 | 検証パターン（直橋/斜橋/曲線橋） | LINER bridge tests | Golden Case として流用 |

## 3. 不足機能一覧（Phase C1 で新規実装が必要なもの）

| # | 機能 | 理由 | 優先度 |
|---|---|---|---|
| 1 | Substructure 3D Geometry Generator（frontend統合版） | prototype からの移行＋線形対応 | HIGH |
| 2 | Support Placement Engine | LINER 支点座標から下部工配置座標を計算 | HIGH |
| 3 | 3D Unified Bridge Scene | 上部工＋下部工を同一 Scene に合成 | HIGH |
| 4 | SubstructureRenderer | 下部工 3D 形状の Three.js 描画 | HIGH |
| 5 | 2D Plan Projection | 下部工 3D → 2D 平面投影図形生成 | HIGH |
| 6 | LINER DrawingDocument Overlay 層 | 既存平面図に下部工レイヤ追加 | HIGH |
| 7 | project.json substructure 拡張 | 下部工データの保存・読込対応 | HIGH |
| 8 | project.json substructure 移行 | 既存データとの互換性維持 | MEDIUM |
| 9 | Golden Case 整備 | 直橋/斜橋/曲線橋のテストデータ | HIGH |
| 10 | E2E テスト（Playwright）追加 | Phase C1 機能の回帰防止 | MEDIUM |

## 4. 技術的リスク

| # | リスク | 影響 | 確率 | 対策 |
|---|---|---|---|---|
| 1 | 曲線橋＋斜角での座標不一致 | 3D/2D 配置ズレ | LOW | Golden Case で早期発見 |
| 2 | Three.js 版間の非互換 | prototype v0.170 vs main v0.184 | LOW | main 側 v0.184 に統一 |
| 3 | LINER 平面図描画パフォーマンス低下 | Overlay 追加による SVG 肥大化 | MEDIUM | レイヤ分割＋LOD 検討 |
| 4 | SceneGroups の競合 | Apollo グループ名との衝突 | LOW | 命名規則の事前定義 |
| 5 | existing project.json 非互換 | substructure フィールド追加による既定値問題 | MEDIUM | Zod デフォルト値＋optional で対応 |
| 6 | GLB 出力の二重化 | Apollo STL と Substructure GLB の統合 | LOW | 当面は並存を許容 |
| 7 | 状態管理の複雑化 | 上部工・下部工で別データソース | MEDIUM | 明確な正本定義で対応 |