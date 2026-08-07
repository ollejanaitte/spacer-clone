# Phase C1 P03 UI 画面マップ

## 画面構成

```
=== メイン画面（App.tsx）===
[ProjectTree] -> [■下部工計画] -> SubstructurePlanningPage

=== 下部工計画画面 ===
SubstructurePlanningPage
  ├── SubstructureTreePanel（左ペイン）
  ├── Viewport（中央ペイン）
  │   ├── Substructure3DPreview（R3F Canvas + OrbitControls）
  │   └── SubstructurePlanPreview（SVG 2D計画図）
  ├── SubstructurePropertyPanel（右ペイン）
  │   ├── PlacementSelector（方式選択）
  │   ├── StructureSelector（形式選択）
  │   ├── PierInputForm / PortalPierInputForm
  │   │   ├── ColumnParamsEditor
  │   │   ├── CapParamsEditor
  │   │   ├── FoundationInputForm
  │   │   │   └── PileInputPanel（JIP系FOOTING）
  │   │   └── BearingSeatEditor
  │   └── AbutmentInputForm
  │       ├── BackwallParamsEditor
  │       └── WingWallParamsEditor
  └── CoordinateTable（下部パネル）

=== ダイアログ ===
SampleCreationDialog（新規作成時）
  └── SampleSelector + プレビュー

=== LINER 連携 ===
LinerFormalDrawingWorkspacePage
  └── displayControls セクション
      └── [Substructure Overlay Toggle]
```

## コンポーネント間データフロー

```
selectSupport(supportId)
  → SubstructureSelectionContext.update(supportId)
    → SubstructureTreePanel: 選択ハイライト
    → Substructure3DPreview: Object3D 発光
    → SubstructurePlanPreview: SVG ハイライト
    → SubstructurePropertyPanel: パラメータ表示切替
    → CoordinateTable: 行選択

updateParam(supportId, key, value)
  → useSubstructureRealtimeUpdate
    → 300ms debounce
      → Substructure Model 更新
      → SupportPlacementEngine 再実行（必要なら）
      → 3D Geometry Generator 再実行
      → Plan Projection 再実行
      → 全ビュー更新
```