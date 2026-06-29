# geometry_core.md Update Proposal

## 蟇ｾ雎｡

- 蜈・ヵ繧｡繧､繝ｫ: `docs/liner/geometry_core.md`
- 髢｢騾｣Phase: 3.5-1
- 譖ｴ譁ｰ逅・罰: Phase3.5-0隱ｿ譟ｻ縺ｧ縲∝ｮ溯｣・ｸ医∩API縺ｯ蜑肴婿隧穂ｾ｡荳ｭ蠢・〒縲，0/C1讀懆ｨｼ縲・・兜蠖ｱ縲《ampling 3邉ｻ邨ｱ蛻・屬縲√け繝ｭ繧ｽ繧､繝臥ｲｾ蠎ｦGate縺梧悴螳御ｺ・→蛻､譏弱＠縺溘◆繧√・uman Decision #2, #9繧貞渚譏縺吶ｋ縲・
## 譖ｴ譁ｰ邂・園

| 迴ｾ迥ｶ遶 | 迴ｾ迥ｶ險倩ｿｰ | 譖ｴ譁ｰ蠕瑚ｨ倩ｿｰ |
|---|---|---|
| Scope | Horizontal/vertical/station/offset繧樽VP scope縺ｨ縺吶ｋ | Phase3.5縺ｧ縺ｯ豌ｴ蟷ｳ譖ｲ邱喞ompletion繧貞・陦後＠縲∫ｸｦ譁ｭ/讓ｪ譁ｭ/3D邨ｱ蜷医・N3縲廸5縺ｧ谿ｵ髫主ｮ溯｣・☆繧区葎繧定ｿｽ險・|
| 2. Horizontal segment resolution | C0/C1/G2縺ｮ險ｭ險亥､縺ｮ縺ｿ | `validateAlignment()` 縺靴0/C1譛ｪ螳溯｣・〒縺ゅｋ迴ｾ迥ｶ縲￣hase3.5-1縺ｧerror險ｺ譁ｭ縺ｨ縺励※螳溯｣・☆繧季ate譚｡莉ｶ繧定ｿｽ險・|
| 3. Clothoid | Fresnel series縺慶hosen method | Phase3.5蛻晄悄縺ｯSimpson遨榊・繧堤ｶｭ謖√＠縲・28蛻・牡縲‘ndpoint 1e-3 m莉･蜀・：resnel鄂ｮ謠姆ate繧定ｿｽ險・|
| 5. Station computation | inverse query API縺ｮ逍台ｼｼ繧ｳ繝ｼ繝・| `stationAtPoint(x,y)` 縺ｮ謌ｻ繧雁､縲〕ine/arc/clothoid蛻･projection譁ｹ蠑上｛ffset隨ｦ蜿ｷ繧定ｿｽ險・|
| 8. Sampling density | Rendering polyline 1.0m遲・| display/dxf/frame 3邉ｻ邨ｱ縺ｫ蛻・屬縺励∵里螳壼､縺ｨsagitta隱､蟾ｮ繧定ｿｽ險・|

## 蟾ｮ蛻・｡・
```diff
@@ Scope
+ Phase3.5 implementation is split into horizontal completion (N1), vertical alignment (N3),
+ cross section/superelevation (N4), 3D integration (N5), and export strategy (N6).
+ This document remains the algorithmic source of truth, but Phase3.5 design pack files
+ define the implementation gates.

@@ 2. Horizontal segment resolution
+ Phase3.5-1 gate:
+ - `validateAlignment()` must report C0 position discontinuity as
+   `LINER_GEOM_POSITION_DISCONTINUITY`.
+ - `validateAlignment()` must report C1 azimuth discontinuity as
+   `LINER_GEOM_AZIMUTH_DISCONTINUITY`.
+ - Curvature discontinuity is warning-level in Phase3.5 unless a later Human Decision
+   promotes it to error.

@@ 3. Clothoid
- Endpoint computation (chosen method): Fresnel integrals via truncated series expansion
+ Phase3.5 initial implementation keeps the existing Simpson integration.
+ Minimum intervals: 128 even intervals. Endpoint tolerance: 1e-3 m for L <= 500 m and A >= 30 m.
+ Fresnel replacement is deferred until the Simpson implementation fails GC-08 through GC-10
+ or becomes a measured performance bottleneck.

@@ 5. Station computation
+ `stationAtPoint(x, y)` returns `{ physicalDistance, displayedStation, offset, distance,
+ elementId, localDistance, localFrame }`. Offset is positive along the left normal.

@@ 8. Sampling density
+ Sampling is split into display, DXF, and frame-division settings.
+ Defaults: display chord 0.5 m / sagitta 0.005 m, DXF chord 0.1 m / sagitta 0.001 m,
+ frame max chord 0.25 m / sagitta 0.0025 m (strict).
```

## 蜿ら・

- `docs/liner/phase3.5/horizontal_curve_completion.md`
- `docs/liner/phase3.5/typed_liner_draft_schema_vnext.md`
- `docs/liner/phase3.5-0_investigation_report.md`

## Phase3.5-0.6 Simpson Target Accuracy Update

**Before**: Simpson endpoint error 1e-3 m was treated as a Phase3.5 tolerance.

**After**: endpoint error <= 1e-3 m (L <= 500 m, A >= 30 m) is Target Accuracy, not a guaranteed bound. PR-1b-0 Clothoid Precision Spike measures GC-08/09/10 and performance smoke results. PR-1b-5 then fixes the final scope: continue Simpson or switch to Fresnel.

## Phase3.5-0.6 Sampling Defaults Update

**After**:
- Display: max chord 0.5 m / sagitta <= 0.005 m
- DXF: max chord 0.1 m / sagitta <= 0.001 m
- Frame: max chord 0.25 m / sagitta <= 0.0025 m (strict, performance cost accepted)
