# Phase C1 全体アーキテクチャ設計

## 1. システム構成

```
┌─────────────────────────────────────────────────────────┐
│                        LINER                            │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ Alignment    │  │ Station      │  │ Bridge Layout │  │
│  │ Computation  │→│ Calculation  │→│ Evaluation    │  │
│  └─────────────┘  └──────────────┘  └───────┬───────┘  │
│                                              │          │
│  ┌───────────────────────────────────────────▼───────┐  │
│  │        coordinate3d.ts (pointAtStationOffset)     │  │
│  │        正本：線形座標 → 世界座標変換               │  │
│  └───────────────────────┬───────────────────────────┘  │
│                          │  support positions           │
│  ┌───────────────────────▼───────────────────────────┐  │
│  │       pierLineGeometry.ts （斜角含む支点計算）      │  │
│  └───────────────────────┬───────────────────────────┘  │
│                          │                              │
│  ┌───────────────────────▼───────────────────────────┐  │
│  │       Support Placement Engine（新規）             │  │
│  │       支点位置・方向・斜角から下部工配置を決定      │  │
│  └───────┬───────────────────────────────────┬───────┘  │
└──────────┼───────────────────────────────────┼───────────┘
           │                                   │
           ▼                                   ▼
┌──────────────────────┐    ┌──────────────────────────┐
│  Apollo（上部工3D）  │    │  Substructure Model      │
│  ┌────────────────┐  │    │  （新規・frontend統合）   │
│  │ 上部工ソリッド  │  │    │  ┌──────────────────┐   │
│  │ 生成（現状維持）│  │    │  │ Pier Generator   │   │
│  └────────┬───────┘  │    │  │ Abutment Gen.    │   │
│           │          │    │  │ Footing Gen.     │   │
│           │          │    │  │ Pile Group Gen.  │   │
│           │          │    │  │ Bearing Gen.     │   │
│           │          │    │  └──────────────────┘   │
│           │          │    └───────────┬──────────────┘
└───────────┼──────────┘                │
            │                           │
            ▼                           ▼
     ┌────────────────────────────────────────┐
     │      3D Geometry Generator（新規）      │
     │  上部工 ApolloSolidGeometryParameter   │
     │  + 下部工 Parametric Meshes            │
     │  → Unified ApolloSolidGeometryParameter│
     └────────────────┬───────────────────────┘
                      │
                      ▼
     ┌────────────────────────────────────────┐
     │      Viewer3D / ThreeViewport          │
     │  SceneGroups（現状＋substructure追加）  │
     │  SubstructureRenderer（新規）           │
     │  ApolloVisualizationRenderer（現状維持）│
     └────────────────┬───────────────────────┘
                      │
                      ▼
     ┌────────────────────────────────────────┐
     │          3D Unified Bridge             │
     │   上部工＋下部工＋地盤面の統合Scene     │
     └────────────────────────────────────────┘

     ┌────────────────────────────────────────┐
     │   2D Plan Projection（新規）             │
     │   下部工3D形状 → 2D平面投影            │
     │   → DrawingPrimitive 列                │
     └────────────────┬───────────────────────┘
                      │
                      ▼
     ┌────────────────────────────────────────┐
     │   LINER DrawingDocument + Overlay Layer│
     │   既存平面図＋下部工レイヤ              │
     │   → SVG / DXF 出力                    │
     └────────────────────────────────────────┘
```

## 2. モジュール責任分界

### 2.1 LINER（変更最小）

| 責任 | 範囲 |
|------|------|
| 線形座標の正本 | `coordinate3d.ts` の `pointAtStationOffset()` |
| 支点レイアウト | `bridgeLayoutEvaluation.ts` の `evaluatePierLayout()` |
| 斜角計算 | `pierLineGeometry.ts` |
| 平面図 DrawingDocument | 既存 builder（変更しない） |
| 2D Affine 変換 | `affineTransform2.ts` |
| SVG/DXF 出力 | 既存（変更しない） |

### 2.2 Apollo（変更最小）

| 責任 | 範囲 |
|------|------|
| 上部工ソリッド生成 | `bridgeStructureSolids.ts` 他 |
| 上部工 STL 出力 | `apolloStlExport.ts` |
| 上部工可視化モデル | `ApolloVisualizationModel` |

### 2.3 Support Placement Engine（新規）

| 責任 | 範囲 |
|------|------|
| 支点位置計算 | LINER 座標から support 位置を決定 |
| 局部座標系構築 | tangent / transverse / up の直交基底 |
| 斜角反映 | skew angle による Y 軸回転 |
| 上部工 envelope 計算 | 全支点を包含する 3D バウンディングボックス |

### 2.4 Substructure Model（新規・frontend 統合）

| 責任 | 範囲 |
|------|------|
| 下部工データ保持 | project.json 内 substructure 拡張 |
| バリデーション | プロトタイプ validation.ts の移行＋拡張 |
| 形状パラメータ管理 | 各要素の寸法・位置・向き |

### 2.5 3D Geometry Generator（新規）

| 責任 | 範囲 |
|------|------|
| 下部工 3D Mesh 生成 | BoxGeometry / CylinderGeometry のパラメトリック生成 |
| 上部工＋下部工統合 | 単一 ApolloSolidGeometryParameter[] への統合 |
| Three.js 対応 | BufferGeometry の生成と配置 |

### 2.6 Viewer3D（拡張）

| 責任 | 範囲 |
|------|------|
| 下部工 SceneGroup 追加 | `substructurePiers`, `substructureAbutments`, `substructureFoundations`, `substructurePiles`, `substructureBearings` |
| SubstructureRenderer（新規） | 下部工 3D 形状の Scene への追加 |
| 既存 Renderer 維持 | ApolloVisualizationRenderer は変更しない |

### 2.7 2D Plan Projection（新規）

| 責任 | 範囲 |
|------|------|
| 下部工 2D 投影図形生成 | 3D 形状の XY 平面への投影 |
| DrawingPrimitive 生成 | 線分・矩形・円の DrawingPrimitive 列 |
| LINER 座標系への変換 | AffineTransform2 による投影配置 |

### 2.8 LINER Plan Overlay（新規）

| 責任 | 範囲 |
|------|------|
| Overlay DrawingLayer 追加 | 既存 DrawingDocument への独立レイヤ追加 |
| 表示/非表示制御 | ユーザー任意のトグル |

## 3. 3D/2D 共通モデル方針

### 3.1 単一正本の原則

下部工データの正本は「Substructure Model（project.json 内 substructure 拡張）」とする。

```
Substructure Model（JSON正本）
    ├──→ 3D Geometry Generator → Three.js Scene
    └──→ 2D Plan Projection → LINER DrawingDocument
```

3D と 2D は同じ正本から導出されるため、常に一致する。

### 3.2 Stable ID 共有方針

- 3D Mesh、2D DrawingPrimitive、JSON データ間で同一 Stable ID を保持
- ID 形式：`{namespace}:{entityKind}:{UUID}`
- Namespace 追加：`substructure` を `StableIdNamespace` に追加
- EntityKind 例：`pier`, `abutment`, `column`, `cap`, `footing`, `pile`, `bearing`, `bearingSeat`

### 3.3 座標系統一

| 座標系 | 定義 |
|--------|------|
| 世界座標 | x-longitudinal / y-transverse / z-up（右手系） |
| 線形局部座標 | tangent（接線方向）/ normal（法線方向）/ binormal（鉛直上） |
| 支点局部座標 | longitudinal（線形接線方向）/ transverse（直角方向/斜角反映）/ vertical（鉛直上） |
| 2D 投影座標 | x-longitudinal / y-transverse（z を無視） |

### 3.4 既存モジュールとのインタフェース

| 境界 | 入力 | 出力 | 変更有無 |
|------|------|------|----------|
| LINER → Support Placement | `CanonicalLinerIntermediateResult` | `SupportPlacement[]` | 新規 |
| Apollo → Unified Scene | `ApolloVisualizationModel` | `ApolloSolidGeometryParameter[]` | 変更なし |
| Substructure → 3D Generator | `SubstructureModel`（JSON） | `ApolloSolidGeometryParameter[]` | 新規 |
| Substructure → 2D Projection | `SubstructureModel`（JSON） | `DrawingPrimitive[]` | 新規 |
| LINER Drawing → Overlay | `DrawingDocument` | `DrawingDocument`（Overlay 層追加） | 拡張 |