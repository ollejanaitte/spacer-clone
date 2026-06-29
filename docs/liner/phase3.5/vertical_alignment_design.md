# Vertical Alignment Design

## 0. 菴咲ｽｮ縺･縺・
- 蟇ｾ雎｡Phase: Phase3.5-2
- 蜑肴署縺ｨ縺ｪ繧玖ｨｭ險域嶌: `typed_liner_draft_schema_vnext.md`, `horizontal_curve_completion.md`, `docs/liner/profile_rules.md`
- 縺薙・險ｭ險域嶌縺ｧ謇ｱ縺・ｯ・峇: 鬮倥＆繝・・繧ｿ縲∫ｸｦ譁ｭ蜍ｾ驟阪∵叛迚ｩ邱夂ｸｦ譁ｭ譖ｲ邱壹￣VI/PVC/PVT縲ゞI/Schema/Pipeline謗･邯壹・- 縺薙・險ｭ險域嶌縺ｧ謇ｱ繧上↑縺・ｯ・峇: 讓ｪ譁ｭ蜍ｾ驟阪《uperelevation縲：rame member蛻・牡縲．XF蜃ｺ蜉帙・
## 1. 閭梧勹縺ｨ逶ｮ逧・
迴ｾ迥ｶ `frontend/src/liner/core/geometry/vertical.ts` 縺ｫ縺ｯ `grade` 縺ｨ `parabolic` 縺ｮ隧穂ｾ｡髢｢謨ｰ縺後≠繧九′縲～buildIntermediateResult()` 縺ｯ蝗ｺ螳・`z` 縺九ｉ `buildVerticalResult()` 繧剃ｽ懊ｋ縺縺代〒縲∫ｸｦ譁ｭdomain縺ｨpipeline縺ｯ譛ｪ謗･邯壹〒縺ゅｋ縲・
譛ｬ險ｭ險医・縲゛IP-LINER貅匁侠縺ｮ縲碁ｫ倥＆縲阪檎ｸｦ譁ｭ縲阪ち繝悶°繧臥ｸｦ譁ｭ邱壼ｽ｢繧貞・蜉帙＠縲～vertical.sampledPoints` 縺ｨgrid Z縺ｮ蝓ｺ遉弱→縺ｪ繧・`Z_profile(s)` 繧堤函謌舌☆繧区婿豕輔ｒ螳夂ｾｩ縺吶ｋ縲・
## 2. 逕ｨ隱槫ｮ夂ｾｩ

| 逕ｨ隱・| 螳夂ｾｩ |
|---|---|
| Height data | 貂ｬ轤ｹ縺斐→縺ｮ譌｢遏･讓咎ｫ倥らｸｦ譁ｭ隕∫ｴ逕滓・縺ｮ蝓ｺ遉弱ョ繝ｼ繧ｿ縲・|
| Grade segment | 荳螳壼鏡驟阪・邵ｦ譁ｭ逶ｴ邱壹・|
| PVI | 邵ｦ譁ｭ蜍ｾ驟榊､牙喧轤ｹ縲・|
| PVC | 邵ｦ譁ｭ譖ｲ邱壼ｧ狗せ縲・|
| PVT | 邵ｦ譁ｭ譖ｲ邱夂ｵらせ縲・|
| Parabolic curve | 蜍ｾ驟阪′邱壼ｽ｢螟牙喧縺吶ｋ謾ｾ迚ｩ邱夂ｸｦ譁ｭ譖ｲ邱壹・|

## 3. 遒ｺ螳壽婿驥晢ｼ・uman Decision蜿肴丐・・
- Decision #3: UI縺ｯ繧ｿ繝門・蜑ｲ縲るｫ倥＆繝・・繧ｿ縺ｯ縲碁ｫ倥＆縲阪ち繝悶∫ｸｦ譁ｭ蜍ｾ驟・譖ｲ邱壹・縲檎ｸｦ譁ｭ縲阪ち繝悶↓鄂ｮ縺上・- Decision #5: 邵ｦ譁ｭdomain繧・`liner.domainDraft` 縺ｫ蠢・井ｿ晏ｭ倥☆繧九・- Decision #8: Phase3.5縺ｧ縺ｯ蜊倅ｸalignment荳翫・蜊倅ｸvertical alignment繧呈桶縺・・
## 4. 繝峨Γ繧､繝ｳ繝｢繝・Ν

```ts
interface VerticalAlignmentDraft {
  id: string;
  heightPoints: HeightPointDraft[];
  elements: VerticalElementDraft[];
}

type VerticalElementDraft =
  | { type: "grade"; id: string; startPhysicalDistance: number; startElevation: number; grade: number; length: number }
  | { type: "parabolic"; id: string; pvcPhysicalDistance: number; pvcElevation: number; gradeIn: number; gradeOut: number; length: number; pviPhysicalDistance?: number; pvtPhysicalDistance?: number };
```

Field荳隕ｧ:

| 蜷榊燕 | 蝙・| 蠢・・| 蛻ｶ邏・| 隱ｬ譏・|
|---|---|---:|---|---|
| `heightPoints[].physicalDistance` | number | Yes | alignment蜀・| 譌｢遏･鬮倥＆縺ｮphysical distance縲・|
| `heightPoints[].elevation` | number | Yes | finite | 讓咎ｫ倥・|
| `elements[].type` | enum | Yes | `grade/parabolic` | 邵ｦ譁ｭ隕∫ｴ遞ｮ蛻･縲・|
| `startPhysicalDistance` | number | grade | alignment蜀・| 蜍ｾ驟榊玄髢馴幕蟋九・|
| `grade` | number | grade | finite | dZ/ds縲・.02 = 2%縲・|
| `pvcPhysicalDistance` | number | parabolic | alignment蜀・| PVC菴咲ｽｮ縲・|
| `gradeIn/gradeOut` | number | parabolic | finite | 蟋狗ｵらせ蜍ｾ驟阪・|
| `length` | number | Yes | `> 0` | 蛹ｺ髢馴聞縲・|

## 5. 繧｢繝ｫ繧ｴ繝ｪ繧ｺ繝 / 險育ｮ苓ｦ丞援

Grade:

```text
Z(s) = Z0 + g * (s - s0)
grade(s) = g
```

Parabolic:

```text
u = s - s_pvc
r = (g_out - g_in) / L
Z(s) = Z_pvc + g_in*u + 0.5*r*u^2
grade(s) = g_in + r*u
```

PVI:

```text
s_pvi = s_pvc + L / 2   // symmetric curve default
Z_pvi = Z_pvc + g_in * (L / 2)
s_pvt = s_pvc + L
```

蠅・阜譚｡莉ｶ:

- 邵ｦ譁ｭ隕∫ｴ縺ｯphysical distance鬆・・- coverage gap縺ｯwarning縲“rid逕滓・縺ｫ蠢・ｦ√↑station縺ｧ譛ｪ螳夂ｾｩ縺ｪ繧影rror縲・- elevation continuity縺ｯ蠢・医・- grade continuity縺ｯparabolic謗･邯壹〒縺ｯ蠢・医“rade segment蜷悟｣ｫ縺ｮ謚倥ｌ縺ｯ險ｱ螳ｹ縲・
險ｱ螳ｹ隱､蟾ｮ:

| Quantity | Tolerance |
|---|---:|
| elevation continuity | 1e-6 m |
| station boundary | 1e-6 m |
| grade continuity | 1e-9 |

## 6. UI莉墓ｧ・
驟咲ｽｮ:

- 縲碁ｫ倥＆縲阪ち繝・ height point table縲・- 縲檎ｸｦ譁ｭ縲阪ち繝・ grade/parabolic element table縲￣VI/PVC/PVT蜈･蜉帙・
繝ｯ繧､繝､:

```text
[鬮倥＆]
  + 鬮倥＆轤ｹ霑ｽ蜉
  Physical Distance | Displayed Station | Elevation

[邵ｦ譁ｭ]
  + 蜍ｾ驟榊玄髢楢ｿｽ蜉  + 邵ｦ譁ｭ譖ｲ邱夊ｿｽ蜉
  Type | Start/PVC | Length | Z/PVC Z | Grade In | Grade Out | PVI | PVT | Diagnostics
```

繧ｨ繝ｩ繝ｼ陦ｨ遉ｺ:

- overlap/gap/coverage error縺ｯ陦ｨ荳企Κ縺ｮdiagnostics縺ｨ隧ｲ蠖楢｡後↓陦ｨ遉ｺ縲・- PVI/PVC/PVT縺ｮ閾ｪ蜍戊ｨ育ｮ怜､縺ｯread-only preview縺ｨ縺励※陦ｨ遉ｺ縺励∵・遉ｺ蜈･蜉帙′縺ゅｋ蝣ｴ蜷医・蟾ｮ蛻・ｒwarning陦ｨ遉ｺ縺吶ｋ縲・
## 7. Pipeline邨ｱ蜷・
- Stage: `resolveVertical(profile, stationTable)`縲・- 蜈･蜉・ `domainDraft.verticalAlignment`, `stationTable`, `horizontal.totalLength`縲・- 蜃ｺ蜉・ `VerticalGeometryResult`縲・- 譌｢蟄伜ｷｮ蛻・ `buildVerticalResult(stations,totalLength,z)` 繧貞ｻ・ｭ｢縺励～evaluateVerticalAlignmentAtDistance()` 繧貞他縺ｶ縲・
Pipeline sampling:

- `vertical.sampledPoints` 縺ｯstation table entries縺ｨdisplay sampling points縺ｮ蜷域・縺ｧ逕滓・縺吶ｋ縲・- Grid轤ｹ縺ｮZ_profile縺ｯgrid station縺斐→縺ｫ邵ｦ譁ｭ隧穂ｾ｡縺励※蜿門ｾ励☆繧九・
## 8. Validation / Diagnostics

| Rule | Level | Code |
|---|---|---|
| length <= 0 | error | `LINER_GEOM_ZERO_LENGTH_SEGMENT` |
| range overlap | error | `LINER_PROFILE_OVERLAP` |
| station outside alignment | error | `LINER_STATION_OUT_OF_RANGE` |
| elevation discontinuity | error | `LINER_PROFILE_ELEVATION_DISCONTINUITY`・域眠隕丞呵｣懶ｼ・|
| grade exceeds hard limit | error | `LINER_PROFILE_GRADE_EXCEEDS_LIMIT` |
| grade exceeds soft limit | warning | `LINER_PROFILE_GRADE_EXCEEDS_LIMIT` |
| no vertical coverage for grid point | error | `LINER_PROFILE_COVERAGE_GAP`・域眠隕丞呵｣懶ｼ・|

## 9. 繝・せ繝域婿驥・
- Unit: grade, parabolic隧穂ｾ｡縲・- Boundary: PVC/PVI/PVT縲∬ｦ∫ｴ蠅・阜縲…overage gap縲・- Golden: GC-05邵ｦ譁ｭ謾ｾ迚ｩ邱壹∝崋螳啝 migration縺九ｉgrade=0縲・- Pipeline: `buildIntermediateResult()` 縺悟崋螳啝縺ｧ縺ｯ縺ｪ縺冗ｸｦ譁ｭ隧穂ｾ｡蛟､繧・`vertical.sampledPoints` 縺ｫ蜃ｺ縺吶％縺ｨ縲・
## 10. Migration / 蠕梧婿莠呈鋤

v0.1 fixed-z draft:

```text
verticalAlignment.elements = [
  { type: "grade", startPhysicalDistance: 0, startElevation: z ?? 0, grade: 0, length: alignmentLength }
]
heightPoints = [{ physicalDistance: 0, elevation: z ?? 0 }]
```

譌ｧ蝗ｺ螳啝蜈･蜉帙・UI荳翫碁ｫ倥＆縲阪ち繝悶↓襍ｷ轤ｹ鬮倥＆縺ｨ縺励※陦ｨ遉ｺ縺吶ｋ縲・
## 11. 繧ｪ繝ｼ繝励Φ隱ｲ鬘・/ 蟆・擂諡｡蠑ｵ

- 隍・焚profile line縲・- PVI縺九ｉPVC/PVT繧定・蜍慕函謌舌☆繧矩ｫ伜ｺｦ蜈･蜉帙・- 蝨ｰ逶､邱壹→險ｭ險育ｸｦ譁ｭ縺ｮ莠碁㍾profile縲・
## 12. 蜿ら・

- 蜑肴署: `typed_liner_draft_schema_vnext.md`, `horizontal_curve_completion.md`
- 蜿ら・縺輔ｌ繧玖ｨｭ險域嶌: `cross_section_superelevation_design.md`, `coordinate_integration_3d_design.md`, `dxf_stl_curve_export_strategy.md`
- 髢｢騾｣繧ｳ繝ｼ繝・ `frontend/src/liner/core/geometry/vertical.ts`, `frontend/src/liner/core/pipeline/pipeline.ts`, `frontend/src/liner/components/LinerStationProfilePanel.tsx`
- 髢｢騾｣繝・せ繝・ planned `verticalAlignment.test.ts`, `pipeline.curved3d.test.ts`

### Phase3.5-0.6 Diagnostic Severity

| Code | Severity |
|---|---|
| `LINER_GEOM_CURVATURE_DISCONTINUITY` | Warning |
| `LINER_GEOM_CLOTHOID_ACCURACY_EXCEEDED` | Warning |
| `LINER_PROFILE_ELEVATION_DISCONTINUITY` | Error |
| `LINER_PROFILE_COVERAGE_GAP` | Error |
| `LINER_EXPORT_POINT_COUNT_HIGH` | Warning |
