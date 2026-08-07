# Phase C1 データフロー設計

## 1. 全体データフロー

```
[LINER Domain Draft]  ←─── ユーザー入力（線形・測点・支点設定）
         │
         ▼
[CanonicalLinerIntermediateResult]  ←─── LINER Pipeline 計算結果
         │
         ├── horizontal: AlignmentSamplePoint[]
         ├── vertical: ProfileSamplePoint[]
         ├── stations: GeneratedStation[]
         ├── grid: GridPointResult[]
         ├── spans: SpanResult[]
         └── piers: PierResult[]  ←─── 支点情報の正本
         │
         ▼
[Support Placement Engine]（新規）
         │
         ├── 入力：PierResult[] + 線形データ
         ├── 処理：
         │    1. 各支点（PIER/ABUTMENT）の station を取得
         │    2. pointAtStationOffset(station, offset=0) → 世界座標
         │    3. pierLineGeometry → 斜角・局部座標系
         │    4. 支承位置（bearing seat）の station/offset 計算
         │
         └── 出力：SupportPlacement[]（各支点の配置情報）
             各要素：
             {
               supportId: string（例："P1"）
               supportType: "pier" | "abutment"
               station: number
               skewAngle: number（rad）
               position: Vec3（世界座標）
               longitudinalAxis: Vec3
               transverseAxis: Vec3
               verticalAxis: Vec3
               bearingSeats: BearingSeatPlacement[]
                 [{ bearingId, station, offset, position, localFrame }]
             }

[Substructure Model]（新規・JSON 正本）
         │
         ├── project.json 内 substructure フィールド
         ├── 各 Support の形状パラメータ：
         │   {
         │     supportId: "P1",
         │     type: "pier",
         │     column: { width, depth, height },
         │     cap: { width, height, depth, overhangL, overhangR },
         │     footing: { length, width, thickness, topElevation },
         │     piles: { diameter, length, pileCount, spacing },
         │     bearingSeats: [{ width, depth, height, ... }],
         │     placements: SupportPlacement（配置情報を参照）
         │   }
         │
         └── stableIds: Map<string, StableEntityId>

[3D Geometry Generator]（新規）
         │
         ├── 入力：SubstructureModel + SupportPlacement
         ├── 処理：
         │    1. 各 support の局部座標系を構築
         │    2. パラメトリック 3D Mesh 生成
         │    3. ApolloSolidGeometryParameter 形式に変換
         │
         └── 出力：ApolloSolidGeometryParameter[]
             例：
             {
               id: "P1-COLUMN-01",
               kind: "substructure_column",
               dimensionsM: { width: 2.0, depth: 2.2, height: 6.0 },
               localFrame: {
                 origin: { x: 0, y: 0, z: 0 },
                 xAxis: tangentDirection,
                 yAxis: transverseDirection,
                 zAxis: upDirection
               },
               stableId: "substructure:column:uuid-xxx"
             }

[2D Plan Projection]（新規）
         │
         ├── 入力：SubstructureModel + SupportPlacement
         ├── 処理：
         │    1. 各 3D 形状の XY 平面への投影（Z 無視）
         │    2. 投影形状の DrawingPrimitive 化
         │    3. LINER 平面図座標系への Affine 変換
         │
         └── 出力：DrawingPrimitive[]
             例：
             {
               kind: "rectangle",
               center: { x, y },
               width: 8.0, height: 6.0,
               rotation: skewAngle,
               strokeColor: "#b09050",
               fillColor: "#b0905040",
               layerId: "substructure-footing",
               stableId: "substructure:footing:uuid-xxx"
             }

[Unified Bridge Scene]
         │
         ├── ApolloVisualizationModel（上部工：変更なし）
         ├── + ApolloSolidGeometryParameter[]（下部工：新規）
         │
         └── Viewer3D / ThreeViewport で合成表示

[LINER DrawingDocument]
         │
         ├── 既存 DrawingLayer[]（線形・測点・曲線表：変更なし）
         ├── + Overlay DrawingLayer（下部工：新規）
         │
         └── SVG / DXF 出力
```

## 2. データ正本ルール

| データ | 正本 | 派生元 | 備考 |
|--------|------|--------|------|
| 線形座標 | `CanonicalLinerIntermediateResult` | LINER Draft | 変更禁止（LINER が唯一） |
| 支点位置 | `SupportPlacement[]` | LINER PierResult | LINER から派生。安定後は独立保存可能 |
| 下部工形状 | `SubstructureModel` (JSON) | ユーザー入力 | 寸法・形式はユーザー定義 |
| 3D Mesh | `ApolloSolidGeometryParameter[]` | SubstructureModel + SupportPlacement | 毎回再生成（永続化不要） |
| 2D 図形 | `DrawingPrimitive[]` | SubstructureModel + SupportPlacement | 毎回再生成（永続化不要） |
| Scene | Three.js Scene 内 Group | 上記 3D Mesh | 毎回再構築 |

## 3. JSON 境界定義

### 3.1 project.json 拡張

既存 `project.json` の `liner` フィールドに隣接して `substructure` フィールドを追加する。

```typescript
// project.json の拡張イメージ
interface Project {
  // ... 既存フィールド（変更なし）...
  liner?: LinerMetadata;        // 既存
  substructure?: {              // 新規追加
    schemaVersion: "0.1.0";
    supports: SubstructureSupport[];
  };
}

interface SubstructureSupport {
  supportId: string;            // "P1", "A1" など
  supportType: "pier" | "abutment";
  formType: "single_column_rect" | "inverted_t";

  // 形状パラメータ
  column?: {
    width: number;
    depth: number;
    height: number;
  };
  cap?: {
    width: number;
    height: number;
    depth: number;
    overhangL: number;
    overhangR: number;
  };
  footing?: {
    length: number;
    width: number;
    thickness: number;
    topElevation: number;
  };
  piles?: {
    pileType: "bored_pile";
    diameter: number;
    length: number;
    pileCount: number;
    spacing: number;
  };
  bearingSeats?: BearingSeatData[];

  // Stable ID 参照
  stableIdRegistry: Record<string, StableEntityId>;

  // 配置情報（LINER からの派生、保存任意）
  placement?: SupportPlacementSnapshot;
}

interface SupportPlacementSnapshot {
  station: number;
  skewAngle: number;
  position: Vec3;
  longitudinalAxis: Vec3;
  transverseAxis: Vec3;
}
```

### 3.2 JSON 保存戦略

| シナリオ | 保存内容 | 読込時 |
|----------|----------|--------|
| LINER あり | substructure.placement 省略可（LINER から再計算） | LINER が存在すれば placement を再生成 |
| LINER なし（単独下部工） | substructure.placement 必須 | placement から直接復元 |
| 移行（既存 project.json） | substructure なし | デフォルト値で補完（形状なし） |

### 3.3 support-interface.schema.json との関係

既存の `support-interface.schema.json` は substructure ↔ superstructure 間の交換スキーマとして維持する。
Phase C1 ではこのスキーマを変更せず、project.json 内 substructure 拡張との変換アダプタを用意する。

```
substructure-project.json ─→ support-interface.json ─→ Apollo（上部工）
       ↑                          （変換アダプタ）
project.json substructure 拡張 ────┘
```

## 4. Stable ID 共有方式

### 4.1 命名規則

```
{namespace}:{entityKind}:{uuid}

例：
substructure:pier:a1b2c3d4-...
substructure:column:e5f6g7h8-...
substructure:cap:i9j0k1l2-...
substructure:footing:m3n4o5p6-...
substructure:pile:q7r8s9t0-...
substructure:bearing:u1v2w3x4-...
substructure:bearingSeat:y5z6a7b8-...
substructure:abutment:c9d0e1f2-...
```

### 4.2 既存 StableEntityId 体系との統合

- Namespace: `StableIdNamespace` に `"substructure"` を追加
- EntityKind: 既存 `entityKind` 判定関数に substructure 種別を追加
- 生成方法: `createStableEntityId({ namespace: "substructure", entityKind, id: deterministicUuid })`
- 決定性 UUID: 既存 `deterministicUuid()` を使用（`substructure/${supportId}/${componentKind}` を seed）

### 4.3 3D / 2D / JSON 間の ID リンク

| レイヤ | ID 保持場所 |
|--------|-------------|
| JSON | `SubstructureSupport.stableIdRegistry[componentKey]` |
| 3D | `ApolloSolidGeometryParameter.id` に対応する StableId |
| 2D | `DrawingPrimitive.stableId` フィールド（追加が必要） |
| Scene | Three.js `Object3D.userData.stableId` |

## 5. 座標変換フロー

### 5.1 局部座標系 → 世界座標変換（支点配置）

```
入力：
  - station（測点）
  - offset（線形からの偏移、通常 0）
  - skewAngle（斜角、rad）
  - 形状パラメータ（幅・高さ・奥行）

処理：
  1. pointAtStationOffset(station, 0) → 中心位置 P、接線方位 θ
  2. 局部基底：
     tangent   = (cos θ, sin θ, 0)
     transverse_local = (-sin θ, cos θ, 0) [skew=0]
  3. 斜角適用：
     transverse = rotateZ(transverse_local, -skewAngle)
     up = (0, 0, 1)
  4. localFrame = { origin: P, xAxis: tangent, yAxis: transverse, zAxis: up }

出力：
  - ApolloSolidGeometryParameter.localFrame に格納
  - Three.js Matrix4 として Scene に適用
```

### 5.2 3D → 2D 投影変換

```
各下部工の 3D 形状から Z 成分を無視して XY 平面に投影。
投影後、LINER DrawingDocument の StationAxis に従い
AffineTransform2 で図面座標に変換。

投影ルール：
  - フーチング、キャップ：上面矩形を投影（skew 反映）
  - 柱：断面矩形を投影
  - 杭：円の中心位置のみ（or 円を投影）
  - 支承：上面矩形を投影
  - 橋台壁面：正面線を投影
```