# cad_output_spec.md Update Proposal

## 対象

- 元ファイル: `docs/liner/cad_output_spec.md`
- 関連Phase: 3.5-5
- 更新理由: Human Decision #1により、Phase3.5初期のDXF曲線出力は全曲線polyline近似に確定したため。現行docsはSVG MVP/DXF post-MVP中心のため、Phase3.5 DXF方針を追記する。

## 更新箇所

| 現状章 | 現状記述 | 更新後記述 |
|---|---|---|
| Scope | SVG MVP; DXF subset post-MVP | Phase3.5でDXF polyline subsetを実装対象に追加 |
| 1. Resampling contract | fixed intermediate samples only | DXF用sampling profileをpipelineで生成し、CAD moduleでは再samplingしない |
| 7. Post-MVP DXF | LINE/LWPOLYLINE等 | Phase3.5初期はARCなし、全曲線polyline近似、ARCは5b以降候補 |

## 差分

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

## 参照

- `docs/liner/phase3.5/dxf_stl_curve_export_strategy.md`
- `docs/liner/phase3.5/horizontal_curve_completion.md`

## Phase3.5-0.6 DXF Sampling Defaults

| Target | Default |
|---|---|
| Plan curve sagitta | <= 0.001 m |
| Plan max chord | <= 0.1 m |
| Profile vertical curve chord | <= 0.1 m |
