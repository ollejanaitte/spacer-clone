# bridge-domain-model.md

橋梁ウィザードで扱う意味的データモデル。UI と FEM 生成エンジンの間の共通語彙となる。
既存の `project.schema.json` (FEMモデル) とは独立に管理し、Step6 で変換する。

## 1. 型定義 (TypeScript / Python マッピング)

### 1.1 BridgeProject (橋梁プロジェクト全体)

```ts
type BridgeProject = {
  id: string;                  // "bridge-001"
  name: string;                // 表示名
  schemaVersion: "0.1.0";      // 橋梁ドメインモデルのスキーマバージョン
  crossSection: CrossSection;  // 横断構成 (Step 1)
  spans: Span[];               // 支間情報 (Step 2)
  impactFactor: ImpactFactor;  // 衝撃係数 (Step 3)
  lines: BridgeLine[];         // 3D ライン (Step 4)
  loads: BridgeLoad[];         // 荷重ケース (Step 5)
  generationSettings: BridgeGenerationSettings; // Step 6
  generatedFem?: GeneratedFemModel;              // 生成結果
};
```

### 1.2 CrossSection

```ts
type CrossSection = {
  lane_count: number;      // 1..6
  lane_width: number;      // m, >0
  median_width: number;    // m, >=0
  sidewalk_width: number;  // m, >=0
  barrier_width: number;   // m, >=0
};
```

### 1.3 Span

```ts
type Span = {
  index: number;   // 1..N
  length: number;  // m, >0
  offset: number;  // m, >=0 (将来拡張用、MVPでは 0 を許容)
};
```

### 1.4 ImpactFactor

```ts
type ImpactFactor = {
  value: number;       // 0.0..1.0
  auto: boolean;       // true で自動計算
  formula?: string;    // 表示用（自動時の式）
};
```

### 1.5 BridgeLine

```ts
type BridgeLine = {
  id: string;          // "line-001"
  type: "traffic" | "load" | "reference";
  name: string;
  points: [number, number, number][]; // MVP: 2 点
};
```

### 1.6 BridgeLoad

```ts
type BridgeLoad = {
  id: string;
  type: "self_weight" | "distributed" | "vehicle";
  name: string;
  magnitude: number;                          // kN/m または kN
  direction: "X" | "Y" | "Z" | "-X" | "-Y" | "-Z";
  line_id?: string;                            // 対象ライン
  loadCaseId?: string;                         // 任意
};
```

### 1.7 BridgeGenerationSettings

```ts
type BridgeGenerationSettings = {
  mesh_division: number;                            // 1..50
  mesh_density: "coarse" | "standard" | "fine";
  girder_spacing_override?: number;                 // 主桁間隔の手動指定
  materialId?: string;                              // 既定 MAT1
  sectionId?: string;                               // 既定 SEC1
};
```

### 1.8 GeneratedFemModel

```ts
type GeneratedFemModel = {
  source_bridge_id: string;
  generatedAt: string; // ISO
  xCount: number;      // x 方向節点数
  yCount: number;      // y 方向節点数
  nodeCount: number;
  memberCount: number;
  supportCount: number;
  loadCount: number;
  summary: {
    totalLength: number;
    girderPositions: number[];
    supports: Array<{ x: number; y: number; nodeId: string }>;
  };
};
```

## 2. バリデーションルール

- `lane_count >= 1`
- `lane_width > 0`
- `spans.length >= 1`
- すべての `span.length > 0`
- `impactFactor.value` は 0..1
- `mesh_division >= 1`
- `line_id` 参照整合: BridgeLoad が参照する line_id は BridgeLine に存在
- line の `points.length >= 2`

## 3. Python マッピング

Python では `dataclass(frozen=True)` で実装し、JSON との相互変換は
`backend/engine/bridge_model.py` に集約する。

## 4. スキーマファイル

- `schemas/bridge.schema.json`
- `schemas/generated-fem.schema.json`
