# rendering_strategy.md Update Proposal

## 対象

- 元ファイル: `docs/liner/rendering_strategy.md`
- 関連Phase: 3.5-4
- 更新理由: Phase3.5-0調査でPreviewはSVG polyline、ViewerはFrame Modelの直線member表示に依存することが判明したため、Decision #6, #9を反映する。
## 更新箇所

| 現状章 | 現状記述 | 更新後記述 |
|---|---|---|
| Assumptions | `horizontal.sampledPoints`のみ | display samplingはpreview専用、Frame Viewerは細分割memberを表示と明記|
| 1. Data contract | Axis polyline/grid/profile | 曲線centerline、Frame分割member、sampling profileの責務を追記|
| 5. UI state vs renderer input | no domain access | DXF/frame samplingもrendererが再計算しなぁE��とを追記|

## 差分
```diff
@@ Assumptions
- Uses `horizontal.sampledPoints` and `grid.points` only
+ Plan preview uses display-sampled `horizontal.sampledPoints`.
+ Existing `Viewer3D` renders generated `ProjectModel` members. Curves are represented
+ as subdivided straight members; no true curved member renderer is introduced in Phase3.5.

@@ 1. Data contract
+ | Curve centerline | `horizontal.sampledPoints` generated with display sampling |
+ | Frame curve approximation | `project.members` generated from frame sampling |
+ | DXF polyline | export sampling, not renderer sampling |

@@ 5. P1-6 UI state vs renderer input
+ Renderer never switches sampling profile itself. Sampling profile changes trigger pipeline rerun.
```

## 参照

- `docs/liner/phase3.5/horizontal_curve_completion.md`
- `docs/liner/phase3.5/coordinate_integration_3d_design.md`

## Phase3.5-0.6 Sampling Defaults

Phase3.5 sampling defaults are fixed as follows:
- Display: max chord 0.5 m
- DXF: max chord 0.1 m
- Frame: max chord 0.25 m (strict, computation cost accepted)
