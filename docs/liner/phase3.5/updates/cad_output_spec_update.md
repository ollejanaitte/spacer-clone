# cad_output_spec.md Update Proposal

## 蟇ｾ雎｡

- 蜈・ヵ繧｡繧､繝ｫ: `docs/liner/cad_output_spec.md`
- 髢｢騾｣Phase: 3.5-5
- 譖ｴ譁ｰ逅・罰: Human Decision #1縺ｫ繧医ｊ縲￣hase3.5蛻晄悄縺ｮDXF譖ｲ邱壼・蜉帙・蜈ｨ譖ｲ邱嗔olyline霑台ｼｼ縺ｫ遒ｺ螳壹＠縺溘◆繧√ら樟陦慧ocs縺ｯSVG MVP/DXF post-MVP荳ｭ蠢・・縺溘ａ縲￣hase3.5 DXF譁ｹ驥昴ｒ霑ｽ險倥☆繧九・
## 譖ｴ譁ｰ邂・園

| 迴ｾ迥ｶ遶 | 迴ｾ迥ｶ險倩ｿｰ | 譖ｴ譁ｰ蠕瑚ｨ倩ｿｰ |
|---|---|---|
| Scope | SVG MVP; DXF subset post-MVP | Phase3.5縺ｧDXF polyline subset繧貞ｮ溯｣・ｯｾ雎｡縺ｫ霑ｽ蜉 |
| 1. Resampling contract | fixed intermediate samples only | DXF逕ｨsampling profile繧恥ipeline縺ｧ逕滓・縺励，AD module縺ｧ縺ｯ蜀行ampling縺励↑縺・|
| 7. Post-MVP DXF | LINE/LWPOLYLINE遲・| Phase3.5蛻晄悄縺ｯARC縺ｪ縺励∝・譖ｲ邱嗔olyline霑台ｼｼ縲、RC縺ｯ5b莉･髯榊呵｣・|

## 蟾ｮ蛻・｡・
```diff
@@ Scope
- SVG export (MVP); DXF subset (post-MVP).
+ SVG export and Phase3.5 DXF subset. DXF curves are emitted as polyline approximations.

@@ 1. Resampling contract
+ CAD export consumes samples produced by the pipeline with the `dxf` sampling profile.
+ CAD modules must not call geometry routines directly or resample ad hoc.

@@ 7. Post-MVP DXF
- Subset: LINE, LWPOLYLINE, POINT, TEXT
+ Phase3.5 initial subset: LINE/LWPOLYLINE, POINT, TEXT, layer table.
+ All straight, arc, and clothoid elements are emitted as polylines.
+ ARC entity support for circular arcs is deferred to Phase3.5-5b or later.
+ Default approximation: max chord 0.1 m, max sagitta 0.001 m.
```

## 蜿ら・

- `docs/liner/phase3.5/dxf_stl_curve_export_strategy.md`
- `docs/liner/phase3.5/horizontal_curve_completion.md`

## Phase3.5-0.6 DXF Sampling Defaults

| Target | Default |
|---|---|
| Plan curve sagitta | <= 0.001 m |
| Plan max chord | <= 0.1 m |
| Profile vertical curve chord | <= 0.1 m |
