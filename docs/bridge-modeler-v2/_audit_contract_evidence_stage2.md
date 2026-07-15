# Bridge Modeler v2 — Contract Evidence (Stage 2)

> 調査ファイル数: frontend + backend 合計 75 ファイル以上を走査
> 成果物以外変更: なし
> docs 外変更: NO

---

## E1_HOST_PROJECT_JSON

### Frontend ProjectModel 保存キー一覧

**Evidence path:** `frontend/src/types.ts:158-196`

```
ProjectModel {
  schemaVersion, project, units, nodes, materials, sections, members,
  supports, loadCases, nodalLoads, memberLoads, massCases?,
  groundMotions?, analysisSettings, analysisResults?,
  liner?, linerTrace?
}
```

### BridgeDefinition 関連キー (ProjectModel 拡張スロット)

| キー | 型 | 説明 | Evidence |
|---|---|---|---|
| `liner?` | `ProjectLinerMetadata` | LINER 中間結果メタ | `frontend/src/types.ts:193` |
| `linerTrace?` | `PersistedLinerTraceEntry[]` | フレーム→グリッド リンク | `frontend/src/types.ts:195` |
| `analysisResults?` | `{ timeHistory?: ... }` | 永続化解析結果 | `frontend/src/types.ts:189-191` |

### BridgeProject (Bridge Domain Model) キー

**Evidence path:** `frontend/src/bridge/types.ts:49-63`, `backend/engine/bridge_model.py:104-118`

```
BridgeProject {
  id, name, schemaVersion("0.1.0"), description?, createdAt?, updatedAt?,
  crossSection, spans, impactFactor, lines, loads,
  generationSettings, generatedFem?
}
```

### BridgeProject 内部キー

| ネスト | キー | Evidence |
|---|---|---|
| crossSection | lane_count, lane_width, median_width, sidewalk_width, barrier_width | `bridge/types.ts:2-8`, `bridge_model.py:14-19` |
| spans | index, length, offset | `bridge/types.ts:10-14`, `bridge_model.py:34-38` |
| impactFactor | value, auto, formula? | `bridge/types.ts:16-20`, `bridge_model.py:44-48` |
| lines | id, type, name, points | `bridge/types.ts:24-29`, `bridge_model.py:55-59` |
| loads | id, type, name, magnitude, direction, **line_id?**, loadCaseId? | `bridge/types.ts:31-39`, `bridge_model.py:70-78` |
| generationSettings | mesh_division, mesh_density, girder_spacing_override?, materialId?, sectionId? | `bridge/types.ts:41-47`, `bridge_model.py:85-91` |

### Autosave 実装パス

| パス | 状態 | Evidence |
|---|---|---|
| `AUTOSAVE_ENABLED = false` (hardcoded) | **現在無効** | `frontend/src/App.tsx:89` |
| `autosaveProject()` → `POST /api/projects/autosave` | API 存在、fileName 固定 `"autosave.json"` | `frontend/src/api/client.ts:218-219`, `:45` |
| `loadAutosaveCandidate()` → `GET /api/projects/autosave` | API 存在 | `frontend/src/api/client.ts:222-224` |

### Importer Storage キー (LINER importer 専用)

| キー | 接頭辞 | Evidence |
|---|---|---|
| index | `spacer.importer.projects.index` | `frontend/src/liner/importer/storage/importerStorage.ts:8` |
| project | `spacer.importer.project.{id}` | `importerStorage.ts:9` |
| snapshot | `spacer.importer.snapshot.{projectId}.{snapshotId}` | `importerStorage.ts:10` |
| conversion log | `importer-conversion-log:{projectId}:{logId}` | `frontend/src/liner/importer/export/ConversionLogWriter.ts:16-17` |

### 候補キー比較表 (採用断定なし)

| 候補パターン | 現在の使用箇所 | Evidence |
|---|---|---|
| `bridge` (object in project JSON) | Bridge API payload の `bridge` キー | `backend/app/main.py:1019` |
| `generatedFem` (BridgeProject optional) | 生成済み FEM モデル保持 | `bridge/types.ts:62` |
| `bridgeMeta` (FEM payload 内) | bridge 情報を FEM payload に埋め込み | `bridge_fem_generator.py:408-415` |
| `liner` (ProjectModel extension) | LINER メタ情報 | `types.ts:193` |
| `linerTrace` (ProjectModel extension) | フレームトレース | `types.ts:195` |

---

## E2_SOLVER_API

### POST /api/fem/generate

**Evidence path:** `backend/app/main.py:1017-1062`

| 項目 | 詳細 |
|---|---|
| エンドポイント | `POST /api/fem/generate` |
| 入力 | `dict[str, Any]` — `{ bridge: BridgeProject }` または `{ bridge_id: string }` |
| 内部処理 | `parse_bridge_project()` → `BridgeProject` → `generate_fem_model()` → `GenerationResult` |
| 出力 | `{ summary: dict, fem: dict (FEM project payload), analysis?: dict }` |
| エラー | `BRIDGE_REQUIRED`, `NOT_FOUND`, `BRIDGE_DOMAIN_ERROR`, `FEM_GENERATION_ERROR` |
| HTTPException | 400, 404 |

### runAnalysis エンドポイント群

**Evidence path:** `frontend/src/api/client.ts:173-225`

| エンドポイント | メソッド | 入力 | Evidence |
|---|---|---|---|
| `/api/analysis/run` | POST | `{ project: ProjectModel, options: { returnCsv } }` | `api/client.ts:180-185` |
| `/api/analysis/eigen` | POST | `{ project, massCaseId, modeCount, normalization }` | `api/client.ts:187-189` |
| `/api/analysis/response-spectrum` | POST | `{ project, massCaseId, modeCount, spectrumCaseId, ... }` | `api/client.ts:191-196` |
| `/api/influence/run` | POST | `{ project, caseId, line, targets }` | `api/client.ts:198-200` |
| `/api/moving-load/run` | POST | `{ project, movingLoadCase }` | `api/client.ts:202-207` |
| `/api/projects/validate` | POST | `{ project: ProjectModel }` | `api/client.ts:174-178` |
| `/api/projects/save` | POST | `{ fileName, project }` | `api/client.ts:209-211` |
| `/api/projects/load` | POST | `{ fileName }` | `api/client.ts:213-216` |
| `/api/projects/autosave` | POST / GET | `{ project }` / (none) | `api/client.ts:218-224` |

### Backend 解析関数

| 関数 | 入力 | 出力 | Evidence |
|---|---|---|---|
| `run_analysis()` | `dict[str, Any]` (project payload) | `dict[str, Any]` (AnalysisResult) | `backend/engine/solver.py:22-43` |
| `solve_model()` | `Model` (dataclass) | `dict[str, Any]` | `backend/engine/solver.py:50-115` |
| `parse_model()` | `dict[str, Any]` | `Model` | `backend/engine/model.py` (imported at `solver.py:13`) |
| `generate_fem_model()` | `BridgeProject` | `GenerationResult` | `backend/engine/bridge_fem_generator.py:136-446` |
| `analyze_generation()` | `GenerationResult` | `dict[str, Any]` | `backend/engine/bridge_fem_generator.py:483-488` |

### Results 返却形式

**Evidence path:** `backend/engine/bridge_fem_generator.py:357-416` (FEM payload)

```python
{
    "project": { "id", "name", "schemaVersion", "description", "createdAt", "updatedAt" },
    "units": { "length": "m", "force": "kN", ... },
    "nodes": [...],
    "materials": [...],
    "sections": [...],
    "members": [...],
    "supports": [...],
    "loadCases": [...],
    "nodalLoads": [...],
    "memberLoads": [...],
    "analysisSettings": { "analysisType", "solver", ..., "tolerance": 1e-9 },
    "bridgeMeta": { "schemaVersion", "impactFactor", "crossSection", "spans", "lines", "loads" },
}
```

### Timeout / Cancel

**Evidence path:** `backend/app/main.py:1017-1062`, `backend/engine/solver.py:22-43`

| 機構 | 状態 |
|---|---|
| タイムアウト | ABSENT — リクエスト単位のタイムアウト指定なし |
| キャンセル | ABSENT — CancelledError / abort メカニズム検出されず |
| ストレージ保存 | ABSENT — `/api/fem/generate` は保存せず返すのみ |

---

## E3_LINER_PUBLIC_API

### Alignment 関連

| 関数/型 | エクスポート | 入出力要約 | Evidence |
|---|---|---|---|
| `LinearAlignment` (type) | public | `{ id, elements: AlignmentElement[] }` | `liner/core/types.ts:127-133` |
| `AlignmentElement` (type) | public | `StraightElement \| CircularArcElement \| ClothoidElement` | `liner/core/types.ts:93-122` |
| `evaluateAlignmentAtDistance()` | public | (alignment, distance, station) → AlignmentEvaluation | `liner/core/geometry/` (imported at `pipeline.ts:110`) |

### Station 表記変換

| 関数 | エクスポート | 入出力要約 | Evidence |
|---|---|---|---|
| `formatStationNoPlus()` | public | `(meters, options?) → string` — `"No.25+35.000"` | `liner/core/station/stationFormat.ts:38-53` |
| `parseStationNoPlus()` | public | `(text, options?) → number \| null` | `stationFormat.ts:60` |
| `formatStationDisplay()` | public | `(meters) → string` | `stationFormat.ts:135` |
| `formatStationPlanNotation()` | public | `(meters, options?) → string` | `stationFormat.ts:143` |
| `parseStationInput()` | public | `(text) → StationParseResult` | `stationFormat.ts:108` |
| `isMajorStationDistance()` | public | `(meters, majorInterval?) → boolean` | `stationFormat.ts:164` |
| `displayedStationAtPhysicalDistance()` | public | `(distance, stationDef, ...) → number` | `liner/core/station/stationRules.ts:23` |
| `generateStations()` | public | `() → GeneratedStation[]` | `stationRules.ts:50` |

### XYZ 座標

| 関数/型 | エクスポート | 入出力要約 | Evidence |
|---|---|---|---|
| `Vec2` (type) | public | `{ x, y }` | `liner/core/types.ts:9-12` |
| `Vec3` (type) | public | `{ x, y, z }` | `liner/core/types.ts:14-18` |
| `LocalFrame` (type) | public | `{ tangent: Vec3, normal: Vec3, binormal: Vec3 }` | `liner/core/types.ts:87-91` |
| `AlignmentSamplePoint` (type) | public | `{ physicalDistance, displayedStation, x, y, azimuth, curvature, ... }` | `liner/core/types.ts:187-197` |

### 接線・縦断・横断勾配・幅員

| 関数/型 | エクスポート | 入出力要約 | Evidence |
|---|---|---|---|
| `HorizontalSegmentResult` (type) | public | `{ startAzimuth, endAzimuth, ... }` | `liner/core/types.ts:198-212` |
| `ProfileSegmentResult` (type) | public | `{ startElevation, endElevation, ... }` | `liner/core/types.ts:234-249` |
| `CrossSlopeDraft` (type) | public | `{ signConvention, valuePercent }` | `liner/schema/types.ts:219-222` |
| `CrossSlopeIntervalDraft` (type) | public | `{ id, startPhysicalDistance, endPhysicalDistance, mode, leftSlopePercent, rightSlopePercent, ... }` | `liner/schema/types.ts:231-239` |
| `CrossSectionTemplateDraft` (type) | public | `{ id, name, offsetLines, crossSlope?, station? }` | `liner/schema/types.ts:264-271` |
| `CrossSectionOffsetLineDraft` (type) | public | `{ id, offset, elevation, role?, label? }` | `liner/schema/types.ts:287-293` |
| `computeOffsetLineElevation()` | public | `(offset, slopePercent) → number` | `liner/core/crossSectionElevation.ts:4` |
| `resolveCrossfallState()` | public | `(distance, intervals, ...) → ResolvedCrossfallState` | `liner/core/grid/crossfallResolution.ts:197` |
| `resolveCrossfallOffset()` | public | `(distance, ...) → number` | `crossfallResolution.ts:227` |
| `validateCrossSlopeIntervals()` | public | `() → issues[]` | `crossfallResolution.ts:155` |
| `gradePercentToRatio()` | public | `(gradePercent) → number` | `liner/core/gradeConversion.ts:2` |
| `gradeRatioToPercent()` | public | `(gradeRatio) → number` | `gradeConversion.ts:7` |

### Pipeline (中間結果ビルド)

| 関数/型 | エクスポート | 入出力要約 | Evidence |
|---|---|---|---|
| `BuildIntermediateInput` (type) | public | alignment, stationDefinition, verticalAlignment, crossSections, gridDefinitions, ... | `liner/core/pipeline/pipeline.ts:63-77` |
| `buildIntermediateResult()` | public | `(BuildIntermediateInput) → CanonicalLinerIntermediateResult` | `pipeline.ts:502` |
| `CanonicalLinerIntermediateResult` (type) | public | horizontal, vertical, grid, spans, piers, frame, ... | `liner/core/types.ts:470-487` |

### Drawing / DXF

| 関数/型 | エクスポート | 入出力要約 | Evidence |
|---|---|---|---|
| `buildDrawingDocument()` | public | `(sheet, settings, diagnostics) → DrawingDocument` | `liner/drawing/builders/formalBuilders.ts:1622` |
| `exportFormalDrawingDxf()` | public | `(kind, document, options) → FormalDrawingDxfExportResult` | `liner/dxf/export/exportFormalDrawingDxf.ts:32-64` |
| `canExportFormalDrawingDxf()` | public | `(document) → boolean` | `exportFormalDrawingDxf.ts:77-88` |
| `downloadFormalDrawingDxf()` | public | `(result) → void` (Blob download) | `exportFormalDrawingDxf.ts:90-101` |
| `FormalDrawingDxfKind` (type) | public | `"plan" \| "plan-type-a" \| "plan-type-b-centerline" \| "profile-band" \| "cross-section"` | `exportFormalDrawingDxf.ts:10-15` |

---

## E4_COORDS_TOLERANCE

### 座標符号・単位

| 定数 | 値 | Evidence |
|---|---|---|
| `DEFAULT_DXF_UNITS` | `"meters"` | `liner/dxf/model/units.ts:3` |
| DXF INSUNITS mapping | unitless:0, millimeters:4, meters:6 | `liner/dxf/model/units.ts:5-9` |
| FEM units | `{ length: "m", force: "kN", moment: "kN_m", ... }` | `bridge_fem_generator.py:367-374` |
| `GRAVITY_ACCELERATION` | `9.80665` | `backend/engine/constants.py:4` |
| `MASS_ABS_TOL` | `0.0` | `backend/engine/constants.py:5` |
| CoordinateSystemMarker | `{ handedness: "right", lengthUnit: "m", angleUnit: "rad" }` | `liner/core/types.ts:20-25` |

### Epsilon / Tolerance 定数

| 定数 | 値 | 所在 | Evidence |
|---|---|---|---|
| `DEFAULT_TOLERANCES.length` | `1e-6` | liner core | `liner/core/tolerances.ts:7` |
| `DEFAULT_TOLERANCES.coordinate` | `0.001` | liner core | `tolerances.ts:8` |
| `DEFAULT_TOLERANCES.clothoidCoordinate` | `1e-3` | liner core | `tolerances.ts:9` |
| `DEFAULT_TOLERANCES.azimuth` | `0.001 * (π/180)` ≈ `1.745e-5 rad` | liner core | `tolerances.ts:4,10` |
| `DEFAULT_TOLERANCES.elevation` | `1e-6` | liner core | `tolerances.ts:11` |
| `DEFAULT_TOLERANCES.station` | `1e-6` | liner core | `tolerances.ts:12` |
| `DEFAULT_TOLERANCES.offset` | `1e-4` | liner core | `tolerances.ts:13` |
| `CENTERLINE_OFFSET_EPSILON_M` | `1e-9` | liner components | `liner/components/offsetLineOrdering.ts:3` |
| `isIdentityAffineTransform2` epsilon | `1e-9` (default param) | liner transforms | `liner/drawing/transforms/invertAffineTransform2.ts:30` |
| `pointInsideBounds` epsilon | `1e-3` (test helper) | liner test | `liner/drawing/__tests__/formalBuilders.test.ts:25` |
| `NEAR_SINGULAR_CONDITION_LIMIT` | `1.0e17` | backend solver | `backend/engine/solver.py:16` |
| `NEAR_ZERO_EIGENVALUE_RELATIVE_LIMIT` | `1.0e-17` | backend solver | `solver.py:17` |
| `LARGE_DISPLACEMENT_ABSOLUTE_LIMIT` | `1.0e3` | backend solver | `solver.py:18` |
| `LARGE_DISPLACEMENT_SPAN_RATIO_LIMIT` | `1.0e3` | backend solver | `solver.py:19` |
| FEM analysisSettings.tolerance | `1e-9` | bridge_fem_generator | `bridge_fem_generator.py:406` |
| SemanticParity scalar tolerance | `1e-6` (test default) | bridgeDefinition test | `ResultsPanel.test.tsx:391` |
| `nearlyEqual()` default tolerance | `DEFAULT_TOLERANCES.coordinate` (= 0.001) | liner core | `tolerances.ts:16-21` |
| `assertPositiveLength()` threshold | `DEFAULT_TOLERANCES.length` (= 1e-6) | liner core | `tolerances.ts:24-26` |

### Duplicate Node Tolerance

| パス | 手法 | Evidence |
|---|---|---|
| bridge_fem_generator | round to 6 decimal: `{round(v, 6) for v in candidates}` | `bridge_fem_generator.py:82` |
| `_x_positions()` | `round(cursor + ..., 6)` | `bridge_fem_generator.py:94` |
| `_quick_self_check()` | `node_ids` set check for duplicate IDs | `bridge_fem_generator.py:457-459` |

### Zero-Length Member 判定

| パス | 手法 | Evidence |
|---|---|---|
| `bridge_fem_generator._quick_self_check()` | `if i == j: raise BridgeFemGenerationError(f"zero-length member {m['id']}")` | `bridge_fem_generator.py:474-476` |
| `i18n/ja.ts` | `"部材のI端とJ端が同じ位置です。"` (ZERO_LENGTH_MEMBER) | `i18n/ja.ts:281` |
| `liner/core/diagnostics.ts` | `LINER_GEOM_ZERO_LENGTH_SEGMENT`, `LINER_FRAME_ZERO_LENGTH_MEMBER` | `liner/core/types.ts:40,52`, `diagnostics.ts:8,20` |
| `backend/i18n` | `"ゼロ長セグメントがあります。"` | `i18n/ja.ts:1758` |

---

## E5_STABLE_ID_PATTERNS

### UUID / ID 生成パターン

| パス | パターン | Evidence |
|---|---|---|
| `createUniqueId(prefix)` (importer storage) | `${prefix}-${crypto.randomUUID()}` | `liner/importer/storage/importerStorage.ts:74-79` |
| `createUniqueId(prefix)` (lineMasterHooks) | `${prefix}-${crypto.randomUUID()}` | `liner/importer/line-master/lineMasterHooks.ts:33-34` |
| `createUniqueId(prefix)` (ImporterProjectService) | `${prefix}-${crypto.randomUUID()}` | `liner/importer/ImporterProjectService.ts:41-42` |
| `createUniqueId(prefix)` (importerUtils) | `${prefix}-${crypto.randomUUID()}` | `liner/importer/utils/importerUtils.ts:15-16` |
| Fallback | `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}` | `importerStorage.ts:78` |

**パターン:** 全て `${prefix}-<crypto.randomUUID()>` 形式。`crypto` 非対応時は `Date.now()-random` フォールバック。

### Node/Member ID (FEM 生成)

| パス | パターン | Evidence |
|---|---|---|
| Node | `N{counter}` — 連番 (N1, N2, ...) | `bridge_fem_generator.py:162` |
| Member | `M{counter}` — 連番 (M1, M2, ...) | `bridge_fem_generator.py:200` |
| NodalLoad | `NL{counter}` | `bridge_fem_generator.py:283` |
| MemberLoad | `ML{counter}` | `bridge_fem_generator.py:353` |
| LoadCase | `LC1`, `LC_{load.id}` | `bridge_fem_generator.py:262,270` |

### Bridge ID

| パス | パターン | Evidence |
|---|---|---|
| `bridge_default()` | 固定 `"bridge-001"` | `bridge_model.py:335` |
| 生成時 | `project.id or "bridge-generated"` | `bridge_fem_generator.py:360` |

---

## E6_LOAD_LEGACY

### line_id 荷重の証拠パス

| パス | 内容 | Evidence |
|---|---|---|
| `BridgeLoad.line_id` | `str = ""` — optional フィールド | `backend/engine/bridge_model.py:77` |
| `BridgeLoad.loadCaseId` | `str = ""` — optional フィールド | `bridge_model.py:78` |
| `BridgeLoad` type enum | `"self_weight" \| "distributed" \| "vehicle"` | `bridge_model.py:73` |
| `_validate_load_line_refs()` | `line_id` が lines 内に存在するか検証 | `bridge_model.py:312-318` |
| `generate_fem_model()` vehicle 分岐 | `ln = next((l for l in project.lines if l.id == ld.line_id), None)` | `bridge_fem_generator.py:298-299` |
| `generate_fem_model()` distributed 分岐 | `ln = next((l for l in project.lines if l.id == ld.line_id), None) if ld.line_id else None` | `bridge_fem_generator.py:322` |
| `fromBridgeProject.ts` adapter | `target: { kind: "line", refId: load.line_id }` | `frontend/src/bridgeDefinition/adapters/fromBridgeProject.ts:418-419` |
| `bridge/types.ts` | `line_id?: string` | `frontend/src/bridge/types.ts:37` |
| `__fixtures__/bridgeRegressionFixtures.ts` | `line_id: "line-1"`, `line_id: "line-2"` | `bridgeDefinition/__fixtures__/bridgeRegressionFixtures.ts:70,106,114` |
| `i18n/ja.ts` | `"荷重 ${id} の line_id が未定義"`, `"distributed: 分布荷重。対象 line_id の x 範囲..."`, `"vehicle: 車両荷重。対象 line_id 上の代表節点..."` | `i18n/ja.ts:787,856,857` |

---

## E7_DRAWING_DXF

### DrawingDocument 公開型

**Evidence path:** `frontend/src/liner/drawing/model/document.ts:8-43`

```typescript
type DrawingViewportKind = "plan" | "profile" | "cross_section" | "band";
type DrawingCoordinateSpace = "model" | "paper";

type DrawingLayer = { id, name, visible, coordinateSpace?, style?, primitives: DrawingPrimitive[] };
type DrawingViewport = { id, kind, modelBounds, paperBounds, transform, layers, stationAxisId? };
type DrawingSheet = { id, name, paper: PaperDefinition, viewports: DrawingViewport[] };
type DrawingDocument = { version, sheets: DrawingSheet[], diagnostics, stationAxes };
```

### DXF Mapper

| 関数 | 入出力 | Evidence |
|---|---|---|
| `mapDrawingDocumentToDxf()` | `(DrawingDocument, options?) → { document: DxfDocument, diagnostics }` | `liner/dxf/mapper/mapDrawingDocumentToDxf.ts:38-41` |
| `drawingDocumentToDxfString()` | `(DrawingDocument, options?) → { dxf: string, diagnostics }` | `mapDrawingDocumentToDxf.ts:290-297` |
| `mapDrawingPrimitiveToDxfEntities()` | `(primitive, layerNameById, units) → { entities, diagnostics }` | `mapDrawingPrimitive.ts:25` |

### DXF Entity Types

**Evidence path:** `frontend/src/liner/dxf/model/types.ts:47-108`

```
DxfEntity = DxfLineEntity | DxfLwPolylineEntity | DxfArcEntity
          | DxfCircleEntity | DxfTextEntity | DxfMTextEntity
```

### DXF Header / Defaults

**Evidence path:** `frontend/src/liner/dxf/model/defaults.ts:1-30`

| 定数 | 値 | Evidence |
|---|---|---|
| `DEFAULT_DXF_HEADER.acadVer` | `"AC1021"` | `defaults.ts:5` |
| `DEFAULT_DXF_HEADER.dwgCodepage` | `"UTF-8"` | `defaults.ts:6` |
| `DEFAULT_DXF_LAYER_0` | `{ name: "0", color: 7, lineType: "CONTINUOUS" }` | `defaults.ts:11-17` |
| `DEFAULT_DXF_LINETYPE_CONTINUOUS` | `{ name: "CONTINUOUS", ... }` | `defaults.ts:19-24` |
| `DEFAULT_DXF_TEXT_STYLE` | `{ name: "STANDARD", fontFile: "txt", height: 0 }` | `defaults.ts:26-30` |
| `SUPPORTED_ACAD_VERSIONS` | `["AC1015", "AC1021", "AC1024", "AC1027"]` | `liner/dxf/model/types.ts:6` |

### Layer Presets (CAD Semantic Layers)

**Evidence path:** `frontend/src/liner/dxf/presets/cadLayerPresets.ts:3-162`

| PresetId | ACI Color | Linetype | Lineweight | Evidence |
|---|---|---|---|---|
| `PLAN_CENTER` | 1 (red) | CONTINUOUS | 50 | `cadLayerPresets.ts:34-41` |
| `PLAN_OFFSET` | 3 (green) | CONTINUOUS | 35 | `cadLayerPresets.ts:42-49` |
| `PLAN_STATION` | 5 (blue) | CENTER | 25 | `cadLayerPresets.ts:50-57` |
| `PLAN_TEXT` | 7 (white) | CONTINUOUS | 25 | `cadLayerPresets.ts:58-65` |
| `PLAN_BAND` | 7 | CONTINUOUS | 25 | `cadLayerPresets.ts:66-73` |
| `PROFILE_GRID` | 8 | HIDDEN | 18 | `cadLayerPresets.ts:74-81` |
| `PROFILE_DESIGN` | 1 | CONTINUOUS | 50 | `cadLayerPresets.ts:82-89` |
| `PROFILE_GROUND` | 3 | DASHED | 35 | `cadLayerPresets.ts:90-97` |
| `PROFILE_TEXT` | 7 | CONTINUOUS | 25 | `cadLayerPresets.ts:98-105` |
| `PROFILE_BAND` | 7 | CONTINUOUS | 25 | `cadLayerPresets.ts:106-113` |
| `CROSS_SHAPE` | 1 | CONTINUOUS | 50 | `cadLayerPresets.ts:114-121` |
| `CROSS_CENTER` | 5 | CENTER | 25 | `cadLayerPresets.ts:122-129` |
| `CROSS_DIM` | 6 | CONTINUOUS | 18 | `cadLayerPresets.ts:130-137` |
| `CROSS_TEXT` | 7 | CONTINUOUS | 25 | `cadLayerPresets.ts:138-145` |
| `SHEET_FRAME` | 7 | CONTINUOUS | 35 | `cadLayerPresets.ts:146-153` |
| `SHEET_TEXT` | 7 | CONTINUOUS | 25 | `cadLayerPresets.ts:154-161` |

### Drawing Layer ID → CAD Preset マッピング

**Evidence path:** `cadLayerPresets.ts:165-198`

```
plan → PLAN_CENTER, plan-annotation → PLAN_TEXT, plan-band → PLAN_BAND,
profile → PROFILE_DESIGN, profile-annotation → PROFILE_TEXT, band → PROFILE_BAND,
cross-section → CROSS_SHAPE, cross-section-centerline → CROSS_CENTER
```

### Kind Enum (FormalDrawingDxfKind)

**Evidence path:** `liner/dxf/export/exportFormalDrawingDxf.ts:10-15`

```
FormalDrawingDxfKind = "plan" | "plan-type-a" | "plan-type-b-centerline" | "profile-band" | "cross-section"
```

### DrawingPrimitive Types

**Evidence path:** `liner/drawing/model/primitives.ts:1-80`

```
DrawingPrimitive = DrawingLine | DrawingPolyline | DrawingArc
                 | DrawingCircle | DrawingText | DrawingDimension
```

---

## E8_FEATURE_FLAGS

### 現存 VITE_* Feature Flag

| フラグ名 | 説明 | Evidence |
|---|---|---|
| `VITE_USE_BRIDGE_DEFINITION_STRUCTURAL_MODEL` | BridgeDefinition 構造モデル有効化 | `frontend/src/bridgeDefinition/featureFlags.ts:1` |

### 読み込み実装

**Evidence path:** `frontend/src/bridgeDefinition/featureFlags.ts:1-7`

```typescript
const FLAG_NAME = "VITE_USE_BRIDGE_DEFINITION_STRUCTURAL_MODEL";
export function isBridgeDefinitionStructuralModelEnabled(): boolean {
  const meta = import.meta as ImportMeta & { env?: Record<string, string | undefined> };
  const value = meta.env?.[FLAG_NAME];
  return value === "true";
}
```

### 使用箇所

| パス | 用途 | Evidence |
|---|---|---|
| `frontend/src/bridge/api.ts:2` | API 呼び出し分岐 | `bridge/api.ts:2` |
| `frontend/playwright.config.ts:15` | テスト時に `"true"` セット | `playwright.config.ts:15` |
| `playwright.phase5-japanese.config.ts:15` | テスト時に `"true"` セット | `playwright.phase5-japanese.config.ts:15` |

### その他 VITE/環境変数

| キー | 値 | Evidence |
|---|---|---|
| `SPACER_AXIS_SWAP_STORAGE_KEY` | localStorage キー（VITE ではないが viewer 設定） | `viewer/coordinateTransform.ts:39` |
| `VIEWER_DISPLAY_SIZE_STORAGE_KEY` | localStorage キー | `viewer/settings/displaySize.ts:62` |
| `spacer_clone_ui_mode_default` | localStorage キー | `lobby/services/uiModeDefault.ts:7` |
| `spacer.importer.projects.index` | localStorage キー | `importerStorage.ts:8` |

---

## 調査サマリ

| カテゴリ | 調査ファイル数 | 主要発見 |
|---|---|---|
| E1 | 8+ | ProjectModel 17+ キー、BridgeProject 12+ キー、liner 拡張2、importer storage 4 キ� |
| E2 | 6+ | `/api/fem/generate` + 7 エンドポイント、GenerationResult 形式、timeout/cancel なし |
| E3 | 20+ | alignment/station/XYZ/crossfall/width 関数多数、全て export |
| E4 | 10+ | DEFAULT_TOLERANCES 7 項目、epsilon 8+ 定数、round(6) dedup、zero-length 2 検出 |
| E5 | 6+ | `crypto.randomUUID()` prefix 方式、FEM は連番 `N{counter}`/`M{counter}` |
| E6 | 5+ | `line_id` は optional、vehicle/distributed で参照、validation 存在 |
| E7 | 8+ | DrawingDocument 4 型、DXF entity 6 種、16 プリセット、kind enum 5 値 |
| E8 | 2+ | `VITE_USE_BRIDGE_DEFINITION_STRUCTURAL_MODEL` のみ検出 |
