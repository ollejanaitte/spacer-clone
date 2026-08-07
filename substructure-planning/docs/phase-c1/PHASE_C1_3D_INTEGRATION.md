# Phase C1 3D 統合設計

## 1. 上部工＋下部工 3D 統合方式

### 1.1 統合方針

上部工（Apollo）と下部工（Substructure）の 3D モデルは、**単一の Three.js Scene** 内で合成表示する。

方式：**「ApolloVisualizationModel 拡張方式」**

既存の `ApolloVisualizationModel` に下部工の `ApolloSolidGeometryParameter[]` を追加することで、Viewer3D / ThreeViewport の変更を最小化する。

```typescript
// 統合後の ApolloSolidGeometryParameter
interface ApolloSolidGeometryParameter {
  id: string;
  kind: SolidKind;  // 既存 + substructure_* を追加
  dimensionsM: Record<string, number>;
  localFrame: {
    origin: Vec3;
    xAxis: Vec3;
    yAxis: Vec3;
    zAxis: Vec3;
  };
  designEntityId?: string;
  designEntityKind?: string;
  exportable: boolean;
  stableId: string;       // 追加（StableEntityId の文字列表現）
  source: "superstructure" | "substructure";  // 追加（識別用）
}

// SolidKind に追加
type SolidKind =
  // ... 既存の種類 ...
  | "substructure_column"
  | "substructure_cap"
  | "substructure_footing"
  | "substructure_pile"
  | "substructure_bearing"
  | "substructure_bearing_seat"
  | "substructure_abutment_wall"
  | "substructure_wing_wall"
  | "substructure_superstructure_envelope";
```

### 1.2 データ統合パス

```
ApolloVisualizationModel（既存）
  ├── elements: ApolloVisualizationElement[]  ← 上部工節点・部材（変更なし）
  ├── solidGeometryParameters: ApolloSolidGeometryParameter[]  ← 上部工ソリッド（変更なし）
  │
  └── substructureSolidGeometryParameters: ApolloSolidGeometryParameter[] ← 追加（下部工）

または、統合方式として単一 array 化も可：
  └── solidGeometryParameters: ApolloSolidGeometryParameter[]  ← 上部工＋下部工統合
```

**推奨：単一 array 統合（`source` フィールドで識別）**

理由：
- SceneBuilder / Renderer が単一の array を処理すればよい
- 表示/非表示制御は `source` フィルタで行う
- 既存 Renderer の変更が不要

## 2. Three.js 構成

### 2.1 SceneGroups 拡張

既存 `SceneGroups` 定義に以下を追加：

```typescript
interface SceneGroups {
  // ... 既存のグループ ...
  root: THREE.Group;

  // Apollo グループ（既存）
  apolloGirders: THREE.Group;
  apolloCrossBeams: THREE.Group;
  apolloBracings: THREE.Group;
  apolloDeck: THREE.Group;
  apolloBearings: THREE.Group;
  apolloMarkers: THREE.Group;
  apolloAppurtenances: THREE.Group;
  apolloHaunches: THREE.Group;
  apolloPavement: THREE.Group;
  apolloRoadMarkings: THREE.Group;

  // Substructure グループ（追加）
  substructureColumns: THREE.Group;
  substructureCaps: THREE.Group;
  substructureFootings: THREE.Group;
  substructurePiles: THREE.Group;
  substructureBearings: THREE.Group;
  substructureAbutments: THREE.Group;
  substructureWingWalls: THREE.Group;

  // ... 既存のその他グループ ...
  loads: THREE.Group;
  resultDiagrams: THREE.Group;
  labels: THREE.Group;
  deformed: THREE.Group;
}
```

### 2.2 SubstructureRenderer（新規）

`viewer/renderers/SubstructureRenderer.ts` として新規作成。

```
SubstructureRenderer
  ├── 入力：ApolloSolidGeometryParameter[]（source === "substructure"）
  ├── 処理：
  │    1. kind ごとに Mesh 生成（BoxGeometry / CylinderGeometry）
  │    2. localFrame から Matrix4 を構築して配置
  │    3. 種類別の色設定
  │    4. userData.stableId に Stable ID をセット
  │    5. 対応する SceneGroup に追加
  │
  └── 既存 ApolloVisualizationRenderer と同等のパターン

色設定（既存 prototype からの踏襲）：
  柱       : #8a8ac8（青紫）
  キャップ  : #7aa07a（緑）
  支承座   : #d0b080（褐色）
  支承     : #7a9ad0（青）
  フーチング: #b09050（金色）
  杭       : #a08040（銅色）
  橋台     : #9aab9a（灰緑）
  翼壁     : #8aa88a（緑）
```

### 2.3 SceneBuilder 拡張

既存 `rebuildApolloVisualizationScene()` 内で、下部工ソリッドも同時に処理：

```typescript
// SceneBuilder.ts の拡張（擬似コード）
function rebuildApolloVisualizationScene(
  sceneGroups: SceneGroups,
  model: ApolloVisualizationModel,
  visibility: ViewerVisibility,
  scales: ViewerScales
): void {
  // 既存：上部工の描画（変更なし）
  renderApolloVisualizationSolids(sceneGroups, model, visibility, scales);

  // 追加：下部工の描画
  const substructureSolids = model.solidGeometryParameters
    .filter(s => s.source === "substructure");
  renderSubstructureSolids(sceneGroups, substructureSolids, visibility, scales);
}
```

## 3. 座標変換

### 3.1 配置変換

各下部工要素は `ApolloSolidGeometryParameter.localFrame` を使って Three.js に配置する。

```typescript
function buildLocalFrameMatrix(localFrame: LocalFrame): THREE.Matrix4 {
  // localFrame: { origin: Vec3, xAxis: Vec3, yAxis: Vec3, zAxis: Vec3 }
  const matrix = new THREE.Matrix4();
  matrix.set(
    localFrame.xAxis.x, localFrame.yAxis.x, localFrame.zAxis.x, localFrame.origin.x,
    localFrame.xAxis.y, localFrame.yAxis.y, localFrame.zAxis.y, localFrame.origin.y,
    localFrame.xAxis.z, localFrame.yAxis.z, localFrame.zAxis.z, localFrame.origin.z,
    0, 0, 0, 1
  );
  return matrix;
}
```

### 3.2 ジオメトリのセンタリング

各ジオメトリは局部座標系の原点を中心として生成し、Matrix4 で全局配置する。

```
例：フーチング（6.0 x 8.0 x 1.8m）
  - BoxGeometry(6.0, 8.0, 1.8) を生成（中心が（0,0,0））
  - localFrame.origin をフーチング重心位置に設定
  - yAxis を transverse 方向、xAxis を longitudinal 方向に設定
  - skewAngle を yAxis の回転として反映
```

### 3.3 Z 基準

- **フーチング上面**: `z = topElevation`（LINER 標高またはユーザー指定）
- **柱/橋台**: フーチング上面からキャップ下面まで
- **キャップ**: 柱上面から上面まで
- **支承座・支承**: キャップ上面の指定位置
- **杭**: フーチング下面から下方へ

## 4. 既存 3D 再利用方針

### 4.1 変更しないもの

| コンポーネント | 理由 |
|---|---|
| `ApolloVisualizationRenderer` | 上部工描画ロジックに影響なし |
| `bridgeStructureSolids.ts` | 上部工ソリッド生成は独立 |
| `ThreeViewport.tsx` | SceneGroups の拡張のみで対応可能 |
| `coordinateTransform.ts` | 座標系自体は同一 |
| `Viewer3D.tsx` | SceneBuilder に委譲しているため変更不要 |

### 4.2 拡張のみ行うもの

| コンポーネント | 拡張内容 |
|---|---|
| `SceneGroups`（types.ts） | substructure 用 Group 追加 |
| `SceneBuilder.ts` | 下部工ソリッド描画呼び出し追加 |
| `ViewerVisibility`（types.ts） | substructure 表示/非表示制御追加 |

### 4.3 新規作成するもの

| コンポーネント | ファイル候補 | 内容 |
|---|---|---|
| SubstructureRenderer | `viewer/renderers/SubstructureRenderer.ts` | 下部工 Mesh 生成・配置 |
| 3D Geometry Generator | `substructure/geometry.ts` or `substructure/SubstructureSolidGenerator.ts` | パラメトリック形状生成 |
| Support Placement Engine | `substructure/SupportPlacementEngine.ts` | 支点配置計算 |

## 5. 表示制御

### 5.1 ViewerVisibility 拡張

```typescript
interface ViewerVisibility {
  // ... 既存 ...
  substructureColumns: boolean;
  substructureCaps: boolean;
  substructureFootings: boolean;
  substructurePiles: boolean;
  substructureBearings: boolean;
  substructureAbutments: boolean;
  substructureWingWalls: boolean;
}
```

### 5.2 既定値

- 下部工要素：デフォルト `true`（表示）
- 線形が未設定の場合：非表示（グレーアウト）

## 6. 留意点

### 6.1 パフォーマンス

- 下部工要素数は通常 10 未満のため、BoxGeometry / CylinderGeometry で十分
- インスタンシングは不要（要素数が少ない）
- 杭のみ複数（4〜20本）のため、CylinderGeometry の単純ループで対応

### 6.2 Three.js バージョン

- main 側：three ^0.184.0
- prototype 側：three ^0.170.0
- 移行時は main 側バージョンに統一（互換性の問題は想定されない）

### 6.3 GLB 出力との関係

- Apollo の STL 出力は変更しない
- Substructure の GLB 出力（prototype の GLTFExporter）は当面 prototype のみ維持
- 統合後の GLB 出力は Phase C2 以降の課題とする