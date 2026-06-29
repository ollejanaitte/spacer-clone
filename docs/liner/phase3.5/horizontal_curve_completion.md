# Horizontal Curve Completion Design

## 0. 菴咲ｽｮ縺･縺・
- 蟇ｾ雎｡Phase: Phase3.5-1
- 蜑肴署縺ｨ縺ｪ繧玖ｨｭ險域嶌: `typed_liner_draft_schema_vnext.md`, `docs/liner/geometry_core.md`, `docs/liner/station_rules.md`, `docs/liner/numerical_accuracy.md`
- 縺薙・險ｭ險域嶌縺ｧ謇ｱ縺・ｯ・峇: 逶ｴ邱壹∝・譖ｲ邱壹√け繝ｭ繧ｽ繧､繝峨・蜈･蜉帙∬ｩ穂ｾ｡縲，0/C1讀懆ｨｼ縲《ampling 3邉ｻ邨ｱ縲・・兜蠖ｱAPI縲“olden test縲・- 縺薙・險ｭ險域嶌縺ｧ謇ｱ繧上↑縺・ｯ・峇: 邵ｦ譁ｭ鬮倥＆縲∵ｨｪ譁ｭ蜍ｾ驟阪：rame Model縺ｸ縺ｮ譛邨らｵｱ蜷医．XF/STL蜃ｺ蜉帛ｮ溯｣・・
## 1. 閭梧勹縺ｨ逶ｮ逧・
Phase3.5-0隱ｿ譟ｻ縺ｧ縲；eometry Core縺ｫ縺ｯ `evaluateStraightElement()`, `evaluateCircularArcElement()`, `evaluateClothoidElement()`, `evaluateAlignmentAtDistance()` 縺悟ｭ伜惠縺吶ｋ荳譁ｹ縲～validateAlignment()` 縺ｯC0/C1騾｣邯壽ｧ繧呈､懆ｨｼ縺励※縺・↑縺・％縺ｨ縺悟愛譏弱＠縺溘ゅ∪縺溘∝・譖ｲ邱・繧ｯ繝ｭ繧ｽ繧､繝峨・UI邱ｨ髮・ｯｾ雎｡縺ｧ縺ｯ縺ｪ縺上・・兜蠖ｱ `stationAtPoint(x,y)` 繧よ悴螳溯｣・〒縺ゅｋ縲・
譛ｬ險ｭ險医・縲￣hase3.5-1縺ｧ豌ｴ蟷ｳ譖ｲ邱壹ｒ螳溯｣・ｮ御ｺ・憾諷九↓縺吶ｋ縺溘ａ縺ｮGate譚｡莉ｶ繧貞ｮ夂ｾｩ縺吶ｋ縲・
## 2. 逕ｨ隱槫ｮ夂ｾｩ

| 逕ｨ隱・| 螳夂ｾｩ |
|---|---|
| C0騾｣邯・| 髫｣謗･隕∫ｴ縺ｮ邨らせ蠎ｧ讓吶→谺｡隕∫ｴ縺ｮ蟋狗せ蠎ｧ讓吶′險ｱ螳ｹ蟾ｮ蜀・〒荳閾ｴ縺吶ｋ縺薙→縲・|
| C1騾｣邯・| 髫｣謗･隕∫ｴ縺ｮ邨らせ譁ｹ菴崎ｧ偵→谺｡隕∫ｴ縺ｮ蟋狗せ譁ｹ菴崎ｧ偵′險ｱ螳ｹ蟾ｮ蜀・〒荳閾ｴ縺吶ｋ縺薙→縲・|
| G2蜿り・ｨｺ譁ｭ | 譖ｲ邇・｣邯壽ｧ縲１hase3.5縺ｧ縺ｯwarning謇ｱ縺・ｒ蝓ｺ譛ｬ縺ｨ縺吶ｋ縲・|
| Sagitta | 譖ｲ邱壼ｼｧ縺ｨ霑台ｼｼ蠑ｦ縺ｮ譛螟ｧ髮｢繧後Ｑolyline霑台ｼｼ隱､蟾ｮ縺ｮ蝓ｺ貅悶・|
| 騾・兜蠖ｱ | 莉ｻ諢醜Y轤ｹ縺九ｉ邱壼ｽ｢荳翫・譛霑第磁physical distance縲‥isplayed station縲｛ffset繧呈ｱゅａ繧句・逅・・|

## 3. 遒ｺ螳壽婿驥晢ｼ・uman Decision蜿肴丐・・
- Decision #2: 繧ｯ繝ｭ繧ｽ繧､繝峨・Simpson遨榊・繧堤ｶｭ謖√☆繧九りｨｱ螳ｹ隱､蟾ｮ縲∝・蜑ｲ謨ｰ縲∝ｰ・擂Fresnel鄂ｮ謠帶擅莉ｶ繧呈・險倥☆繧九・- Decision #3: UI縺ｯ繧ｿ繝門・蜑ｲ縺ｮ縲後Λ繧､繝ｳ縲阪ち繝悶↓豌ｴ蟷ｳ邱壼ｽ｢蜈･蜉帙ｒ鄂ｮ縺上・- Decision #8: Phase3.5縺ｧ縺ｯ蜊倅ｸalignment縺ｮ縺ｿ謇ｱ縺・・- Decision #9: 陦ｨ遉ｺ逕ｨ縲．XF逕ｨ縲：rame蛻・牡逕ｨsampling繧貞・髮｢縺吶ｋ縲・
## 4. 繝峨Γ繧､繝ｳ繝｢繝・Ν

逍台ｼｼTS:

```ts
interface HorizontalAlignmentDraft {
  id: string;
  elements: HorizontalElementDraft[];
}

type HorizontalElementDraft =
  | StraightElementDraft
  | CircularArcElementDraft
  | ClothoidElementDraft;
```

Field荳隕ｧ:

| 蜷榊燕 | 蝙・| 蠢・・| 蛻ｶ邏・| 隱ｬ譏・|
|---|---|---:|---|---|
| `id` | string | Yes | unique | 隕∫ｴID縲・|
| `type` | string | Yes | `straight/arc/clothoid` | union discriminator縲・|
| `start.x/y` | number | Yes | finite | 隕∫ｴ蟋狗せ縲・|
| `azimuth` | number | Yes | finite rad | 蟋狗せ謗･邱壽婿菴崎ｧ偵・|
| `length` | number | Yes | `> 0` | 蠑ｧ髟ｷ縲・|
| `radius` | number | arc縺ｮ縺ｿ | `> 0` | 蜀・峇邱壼濠蠕・・|
| `turn` | enum | arc/clothoid | `left/right` | 譖ｲ邱壽婿蜷代・|
| `clothoidParameter` | number | clothoid縺ｮ縺ｿ | `> 0` | A蛟､縲・|
| `startRadius/endRadius` | number/null | clothoid縺ｮ縺ｿ | null or `> 0` | 譛蛾剞蜊雁ｾ・・遘ｻ縲・|

## 5. 繧｢繝ｫ繧ｴ繝ｪ繧ｺ繝 / 險育ｮ苓ｦ丞援

逶ｴ邱・

```text
x(s) = x0 + cos(theta0) s
y(s) = y0 + sin(theta0) s
kappa(s) = 0
```

蜀・峇邱・

```text
sign = left ? +1 : -1
delta = sign * s / R
theta(s) = theta0 + delta
x(s) = x0 + sign * R * (sin(theta(s)) - sin(theta0))
y(s) = y0 - sign * R * (cos(theta(s)) - cos(theta0))
kappa = sign / R
```

繧ｯ繝ｭ繧ｽ繧､繝・

```text
kappa(s) = k0 + (k1 - k0) * s / L
theta(s) = theta0 + k0*s + 0.5*((k1-k0)/L)*s^2
x(s) = x0 + integral_0^s cos(theta(u)) du
y(s) = y0 + integral_0^s sin(theta(u)) du
```

Simpson遨榊・:

- 譛蟆丞・蜑ｲ謨ｰ: 128蛹ｺ髢薙ｒ邯ｭ謖√・- 蛻・牡謨ｰ縺ｯ蛛ｶ謨ｰ縺ｫ荳ｸ繧√ｋ縲・- Phase3.5險ｱ螳ｹ隱､蟾ｮ: L <= 500 m, A >= 30 m縺ｧendpoint隱､蟾ｮ 1e-3 m莉･蜀・・- Fresnel鄂ｮ謠姆ate: GC-08縲廨C-10縺ｧ1e-3 m繧呈ｺ縺溘○縺ｪ縺・√∪縺溘・performance smoke縺ｧsampling縺・蛟堺ｻ･荳企≦縺上↑繧句ｴ蜷医・
C0/C1讀懆ｨｼ:

| Check | Tolerance | Failure |
|---|---:|---|
| C0 position | 1e-6 m | error `LINER_GEOM_POSITION_DISCONTINUITY` |
| C1 azimuth | 1e-9 rad | error `LINER_GEOM_AZIMUTH_DISCONTINUITY` |
| G2 curvature | 1e-6 1/m | warning `LINER_GEOM_CURVATURE_DISCONTINUITY`・域眠隕丞呵｣懶ｼ・|

騾・兜蠖ｱAPI:

```ts
interface StationProjection {
  physicalDistance: number;
  displayedStation: number;
  offset: number;
  distance: number;
  elementId: string;
  localDistance: number;
  localFrame: LocalFrame;
}

function stationAtPoint(alignment, stationDefinition, point): StationProjection;
```

蜃ｦ逅・

1. 隕∫ｴ縺斐→縺ｫ蛟呵｣徘rojection繧呈ｱゅａ繧九・2. 逶ｴ邱壹・邱壼・蟆・ｽｱ縲∝・蠑ｧ縺ｯ荳ｭ蠢・ｧ貞ｰ・ｽｱ縲√け繝ｭ繧ｽ繧､繝峨・蛻晄悄sampling蠕後↓Newton縺ｾ縺溘・螻謇謗｢邏｢縺ｧ譛蟆剰ｷ晞屬蛹悶☆繧九・3. 譛蟆・`distance` 縺ｮ蛟呵｣懊ｒ謗｡逕ｨ縺吶ｋ縲・4. offset隨ｦ蜿ｷ縺ｯ `dot(point - H(s), N(s))`縲・
Sampling 3邉ｻ邨ｱ:

| 邉ｻ邨ｱ | 譌｢螳・| 隱､蟾ｮ | Consumer |
|---|---:|---:|---|
| System | max chord | sagitta tolerance | Strictness | Consumer |
|---|---:|---:|---|---|
| Display | 0.5 m | <= 0.005 m | recommended | Preview / Review diagram |
| DXF | 0.1 m | <= 0.001 m | recommended | Plan / Profile DXF |
| Frame | 0.25 m | <= 0.0025 m | strict | Subdivided Frame members |

## 6. UI莉墓ｧ・
驟咲ｽｮ: `liner.setup` 縺ｮ縲後Λ繧､繝ｳ縲阪ち繝悶・
繝・く繧ｹ繝医Ρ繧､繝､:

```text
[繝ｩ繧､繝ｳ]
  Alignment ID: [alignment-1]
  + 隕∫ｴ霑ｽ蜉: 逶ｴ邱・/ 蜀・峇邱・/ 繧ｯ繝ｭ繧ｽ繧､繝・  -------------------------------------------------
  ID | Type | Start X | Start Y | Azimuth | Length | Radius/A | Turn | Diagnostics
  S1 | straight | ... 
  A1 | arc      | ... radius ... left
  C1 | clothoid | ... A ... R_in ... R_out
```

Validation陦ｨ遉ｺ:

- C0/C1 error縺ｯ隧ｲ蠖楢｡後→谺｡陦後・蠅・阜縺ｫ陦ｨ遉ｺ縲・- `ContinuityDiagnosticsPanel` 縺ｯ遒ｺ隱榊峙繧ｿ繝悶↓繧り｡ｨ遉ｺ縲・- Sampling control縺ｯ遒ｺ隱榊峙繧ｿ繝悶↓驟咲ｽｮ縺励・邉ｻ邨ｱ繧貞挨field縺ｧ邱ｨ髮・☆繧九・
## 7. Pipeline邨ｱ蜷・
- Stage: `validateDomain` 縺ｧfield validation縲～resolveHorizontal` 縺ｧ隕∫ｴ隧穂ｾ｡繝ｻ謗･邯夊ｨｺ譁ｭ繝ｻsample逕滓・縲・- 蜈･蜉・ `domainDraft.alignment`, `domainDraft.stationDefinition`, `domainDraft.sampling`.
- 蜃ｺ蜉・ `HorizontalGeometryResult`, `AlignmentSamplePoint[]`, `HorizontalSegmentResult[]`, projection index・亥・驛ｨ・峨・- 譌｢蟄伜ｷｮ蛻・ `buildHorizontalResult()` 縺ｯ蜊倅ｸ `sampleInterval` 縺ｧ縺ｯ縺ｪ縺上…onsumer蛻･sampling險ｭ螳壹ｒ蜿励￠蜿悶ｋ縲・
## 8. Validation / Diagnostics

| Rule | Level | Code |
|---|---|---|
| length <= 0 | error | `LINER_GEOM_ZERO_LENGTH_SEGMENT` |
| arc radius <= 0 | error | `LINER_GEOM_CLOTHOID_INVALID_RADIUS`・亥ｰ・擂 `LINER_GEOM_ARC_INVALID_RADIUS` 蛟呵｣懶ｼ・|
| clothoid A <= 0 | error | `LINER_GEOM_CLOTHOID_INVALID_RADIUS` |
| C0 gap | error | `LINER_GEOM_POSITION_DISCONTINUITY` |
| C1 gap | error | `LINER_GEOM_AZIMUTH_DISCONTINUITY` |
| clothoid endpoint error > Target Accuracy | warning | `LINER_GEOM_CLOTHOID_ACCURACY_EXCEEDED` |
| sampling spacing <= 0 | error | `LINER_GRID_SPACING_INVALID` |

## 9. 繝・せ繝域婿驥・
- Unit: straight/arc/clothoid endpoint縲…urvature縲∥zimuth縲・- Continuity: C0 gap縲，1 gap縲；2 warning縲・- Inverse: line/arc/clothoid荳翫・轤ｹ縲∝ｷｦoffset縲∝承offset縲∫ｯ・峇螟匁怙霑醍せ縲・- Golden: GC-01縲廨C-04縲；C-08縲廨C-10縲・- Regression: sampling 3邉ｻ邨ｱ縺ｧ轤ｹ謨ｰ縺ｨ譛螟ｧsagitta縺梧悄蠕・ｯ・峇縺ｫ蜈･繧九％縺ｨ縲・
## 10. Migration / 蠕梧婿莠呈鋤

v0.1 fixed-z draft縺ｮ `alignment.elements` 縺ｫ `arc/clothoid` 縺悟性縺ｾ繧後※縺・※繧５S蝙倶ｸ願ｪｭ繧√ｋ蝣ｴ蜷医・vNext union縺ｸ縺昴・縺ｾ縺ｾ遘ｻ縺吶６I縺ｧ邱ｨ髮・〒縺阪↑縺九▲縺滓里蟄倬撼straight隕∫ｴ縺ｯvNext隱ｭ縺ｿ霎ｼ縺ｿ蠕後↓邱ｨ髮・庄閭ｽ縺ｫ縺吶ｋ縲・
閾ｪ逕ｱ蠖｢蠑愁raft縺ｯN2縺ｮ譁ｹ驥晞壹ｊmigration蟇ｾ雎｡螟悶・
## 11. 繧ｪ繝ｼ繝励Φ隱ｲ鬘・/ 蟆・擂諡｡蠑ｵ

- DXF ARC entity蜃ｺ蜉帙・Phase3.5-5b莉･髯阪・蛟呵｣懊・- G2騾｣邯壹ｒerror縺ｫ譏・ｼ縺吶ｋ縺九・蟆・擂蛻､譁ｭ縲・- PI蜈･蜉帙∵磁邱夐聞/莠､隗貞・蜉帙！P豕輔・蟆・擂Phase縲・
## 12. 蜿ら・

- 蜑肴署: `typed_liner_draft_schema_vnext.md`
- 蜿ら・縺輔ｌ繧玖ｨｭ險域嶌: `coordinate_integration_3d_design.md`, `dxf_stl_curve_export_strategy.md`, `implementation_priority_and_pr_breakdown.md`
- 髢｢騾｣繧ｳ繝ｼ繝・ `frontend/src/liner/core/geometry/horizontal.ts`, `arc.ts`, `clothoid.ts`, `line.ts`, `vector.ts`
- 髢｢騾｣繝・せ繝・ `frontend/src/liner/core/__tests__/geometry.test.ts`, `clothoid.test.ts`, planned `horizontal.continuity.test.ts`, `stationInverse.test.ts`

### Phase3.5-0.6 Sampling Decision

Decision addendum: Frame sampling max chord is fixed at 0.25 m and is strict.
Reason: FEM accuracy has priority. Higher computation cost is acceptable.
If performance problems appear, mitigation must happen in Display/DXF sampling or structural-side processing, not by relaxing Frame sampling.

### Phase3.5-0.6 Diagnostic Severity

| Code | Severity |
|---|---|
| `LINER_GEOM_CURVATURE_DISCONTINUITY` | Warning |
| `LINER_GEOM_CLOTHOID_ACCURACY_EXCEEDED` | Warning |
| `LINER_PROFILE_ELEVATION_DISCONTINUITY` | Error |
| `LINER_PROFILE_COVERAGE_GAP` | Error |
| `LINER_EXPORT_POINT_COUNT_HIGH` | Warning |

For N1, `LINER_GEOM_CURVATURE_DISCONTINUITY` and `LINER_GEOM_CLOTHOID_ACCURACY_EXCEEDED` are Warning. Clothoid accuracy is measured by PR-1b-0 before the final PR-1b-5 precision gate scope is fixed.
