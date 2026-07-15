# bridge-domain-model.md

<!-- DOC-AUTHORITY:START -->
> **Authority:** LEGACY MIXED MODELER REFERENCE
> This BridgeProject/wizard/generator design mixes Road and Frame concerns and is retained as current compatibility evidence. It is not the target `BridgeFrameAnalysisDocument`, transfer package, or direct apply authority; target ownership and edit protection are governed by [`../../planning/stage6-10/responsibility_matrix.md`](../../planning/stage6-10/responsibility_matrix.md) and [`../../planning/stage6-10/road_to_frame_contract.md`](../../planning/stage6-10/road_to_frame_contract.md).
<!-- DOC-AUTHORITY:END -->

Semantic data model handled by the bridge wizard. This is the shared vocabulary between the UI and the FEM generation engine.
It is managed independently of the existing `project.schema.json` (FEM model) and is converted in Step 6.

## 1. Type Definitions (TypeScript / Python mapping)

### 1.1 BridgeProject (the whole bridge project)

```ts
type BridgeProject = {
  id: string;                  // "bridge-001"
  name: string;                // display name
  schemaVersion: "0.1.0";      // schema version of the bridge domain model
  crossSection: CrossSection;  // cross-section composition (Step 1)
  spans: Span[];               // span information (Step 2)
  impactFactor: ImpactFactor;  // impact factor (Step 3)
  lines: BridgeLine[];         // 3D lines (Step 4)
  loads: BridgeLoad[];         // load cases (Step 5)
  generationSettings: BridgeGenerationSettings; // Step 6
  generatedFem?: GeneratedFemModel;              // generation result
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
  offset: number;  // m, >=0 (reserved for future extension; 0 is allowed in the MVP)
};
```

### 1.4 ImpactFactor

```ts
type ImpactFactor = {
  value: number;       // 0.0..1.0
  auto: boolean;       // true = automatic calculation
  formula?: string;    // for display (the formula used in automatic mode)
};
```

### 1.5 BridgeLine

```ts
type BridgeLine = {
  id: string;          // "line-001"
  type: "traffic" | "load" | "reference";
  name: string;
  points: [number, number, number][]; // MVP: 2 points
};
```

### 1.6 BridgeLoad

```ts
type BridgeLoad = {
  id: string;
  type: "self_weight" | "distributed" | "vehicle";
  name: string;
  magnitude: number;                          // kN/m or kN
  direction: "X" | "Y" | "Z" | "-X" | "-Y" | "-Z";
  line_id?: string;                            // target line
  loadCaseId?: string;                         // optional
};
```

### 1.7 BridgeGenerationSettings

```ts
type BridgeGenerationSettings = {
  mesh_division: number;                            // 1..50
  mesh_density: "coarse" | "standard" | "fine";
  girder_spacing_override?: number;                 // manual main girder spacing
  materialId?: string;                              // default MAT1
  sectionId?: string;                               // default SEC1
};
```

### 1.8 GeneratedFemModel

```ts
type GeneratedFemModel = {
  source_bridge_id: string;
  generatedAt: string; // ISO
  xCount: number;      // node count in x direction
  yCount: number;      // node count in y direction
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

## 2. Validation Rules

- `lane_count >= 1`
- `lane_width > 0`
- `spans.length >= 1`
- Every `span.length > 0`
- `impactFactor.value` is between 0 and 1
- `mesh_division >= 1`
- `line_id` reference integrity: every `line_id` referenced by a `BridgeLoad` exists in `BridgeLine`
- `line.points.length >= 2`

## 3. Python Mapping

In Python, this is implemented as `dataclass(frozen=True)`. JSON conversion is centralized in `backend/engine/bridge_model.py`.

## 4. Schema Files

- `schemas/bridge.schema.json`
- `schemas/generated-fem.schema.json`
