# rendering_strategy.md Update Proposal

## 蟇ｾ雎｡

- 蜈・ヵ繧｡繧､繝ｫ: `docs/liner/rendering_strategy.md`
- 髢｢騾｣Phase: 3.5-4
- 譖ｴ譁ｰ逅・罰: Phase3.5-0隱ｿ譟ｻ縺ｧPreview縺ｯSVG polyline縲〃iewer縺ｯFrame Model縺ｮ逶ｴ邱嗄ember陦ｨ遉ｺ縺ｫ萓晏ｭ倥☆繧九％縺ｨ縺悟愛譏弱＠縺溘◆繧√・ecision #6, #9繧貞渚譏縺吶ｋ縲・
## 譖ｴ譁ｰ邂・園

| 迴ｾ迥ｶ遶 | 迴ｾ迥ｶ險倩ｿｰ | 譖ｴ譁ｰ蠕瑚ｨ倩ｿｰ |
|---|---|---|
| Assumptions | `horizontal.sampledPoints`縺ｮ縺ｿ | display sampling縺ｯpreview蟆ら畑縲：rame Viewer縺ｯ邏ｰ蛻・喧member繧定｡ｨ遉ｺ縺ｨ譏手ｨ・|
| 1. Data contract | Axis polyline/grid/profile | 譖ｲ邱喞enterline縲：rame蛻・牡member縲《ampling profile縺ｮ雋ｬ蜍吶ｒ霑ｽ險・|
| 5. UI state vs renderer input | no domain access | DXF/frame sampling繧Ｓenderer縺悟・險育ｮ励＠縺ｪ縺・％縺ｨ繧定ｿｽ險・|

## 蟾ｮ蛻・｡・
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

## 蜿ら・

- `docs/liner/phase3.5/horizontal_curve_completion.md`
- `docs/liner/phase3.5/coordinate_integration_3d_design.md`

## Phase3.5-0.6 Sampling Defaults

Phase3.5 sampling defaults are fixed as follows:
- Display: max chord 0.5 m
- DXF: max chord 0.1 m
- Frame: max chord 0.25 m (strict, computation cost accepted)
