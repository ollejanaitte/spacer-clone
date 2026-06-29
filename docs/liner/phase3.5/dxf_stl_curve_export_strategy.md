# DXF/STL Curve Export Strategy

## 0. 菴咲ｽｮ縺･縺・
- 蟇ｾ雎｡Phase: Phase3.5-5
- 蜑肴署縺ｨ縺ｪ繧玖ｨｭ險域嶌: `coordinate_integration_3d_design.md`, `horizontal_curve_completion.md`, `vertical_alignment_design.md`, `docs/liner/cad_output_spec.md`
- 縺薙・險ｭ險域嶌縺ｧ謇ｱ縺・ｯ・峇: 譖ｲ邱咼XF polyline霑台ｼｼ縲｝rofile labels縲ヾTL蛻・牡縲∬ｨｱ螳ｹ隱､蟾ｮ縲、RC蟆・擂諡｡蠑ｵ譚｡莉ｶ縲・- 縺薙・險ｭ險域嶌縺ｧ謇ｱ繧上↑縺・ｯ・峇: DXF ARC entity蛻晄悄螳溯｣・∫悄縺ｮ譖ｲ邱嗾ube STL縲・
## 1. 閭梧勹縺ｨ逶ｮ逧・
迴ｾ迥ｶ `linerPlanDxf.ts` 縺ｨ `linerProfileDxf.ts` 縺ｯMaker.js line path縺ｧpolyline繧貞・蜉帙＠縲～linerFrameStl.ts` 縺ｯFrame member縺斐→縺ｫ蜀・浤繧貞・蜉帙☆繧九１hase3.5縺ｧ縺ｯ蜀・ｼｧ/繧ｯ繝ｭ繧ｽ繧､繝・邵ｦ譁ｭ/讓ｪ譁ｭ縺ｫ蟇ｾ蠢懊☆繧九′縲∝・譛櫂XF縺ｯ蜈ｨ譖ｲ邱嗔olyline霑台ｼｼ縺ｨ縺吶ｋ縲・
## 2. 逕ｨ隱槫ｮ夂ｾｩ

| 逕ｨ隱・| 螳夂ｾｩ |
|---|---|
| Polyline霑台ｼｼ | 譖ｲ邱壹ｒ遏ｭ縺・峩邱壼・縺ｧ陦ｨ迴ｾ縺吶ｋ縺薙→縲・|
| Sagitta error | 譖ｲ邱壹→蠑ｦ縺ｮ譛螟ｧ髮｢繧後・|
| Plan DXF | XY蟷ｳ髱｢縺ｮ荳ｭ蠢・ｷ壹｛ffset邱壹“rid縲《tation tick蜃ｺ蜉帙・|
| Profile DXF | physical distance vs elevation縺ｮ邵ｦ譁ｭ蝗ｳ蜃ｺ蜉帙・|
| STL member cylinder | Frame member遶ｯ轤ｹ髢薙ｒ蜀・浤縺ｧ蜃ｺ蜉帙☆繧鬼TL隕∫ｴ縲・|

## 3. 遒ｺ螳壽婿驥晢ｼ・uman Decision蜿肴丐・・
- Decision #1: Phase3.5蛻晄悄縺ｯ蜈ｨ譖ｲ邱嗔olyline霑台ｼｼ縲ょ・蠑ｧARC entity縺ｯPhase3.5-5b莉･髯阪・諡｡蠑ｵ蛟呵｣懊・- Decision #6: STL縺ｯ邏ｰ蛻・喧逶ｴ邱嗄ember縺九ｉ逕滓・縺励∫悄縺ｮ譖ｲ邱嗾ube縺ｯ謗｡逕ｨ縺励↑縺・・- Decision #9: DXF逕ｨsampling縺ｯ陦ｨ遉ｺ逕ｨ/Frame逕ｨ縺ｨ縺ｯ蛻・屬縺吶ｋ縲・
## 4. 繝峨Γ繧､繝ｳ繝｢繝・Ν

```ts
interface ExportSamplingSettings {
  dxf: { maxChordLength: number; maxSagitta: number; minSegmentsPerElement: number };
  profile: { stationInterval: number; verticalCurveMaxChordLength: number };
  stl: { memberRadius: number; cylinderSegments: number };
}
```

Field荳隕ｧ:

| 蜷榊燕 | 蝙・| 蠢・・| 蛻ｶ邏・| 隱ｬ譏・|
|---|---|---:|---|---|
| `dxf.maxChordLength` | number | Yes | `>0` | plan polyline譛螟ｧ蠑ｦ髟ｷ縲・|
| `dxf.maxSagitta` | number | Yes | `>0` | plan polyline譛螟ｧ隱､蟾ｮ縲・|
| `profile.stationInterval` | number | Yes | `>0` | profile sampling髢馴囈縲・|
| `stl.memberRadius` | number | Yes | `>0` | STL蜀・浤蜊雁ｾ・・|

## 5. 繧｢繝ｫ繧ｴ繝ｪ繧ｺ繝 / 險育ｮ苓ｦ丞援

Plan DXF:

- 荳ｭ蠢・ｷ・ `horizontal.sampledPoints` 縺ｧ縺ｯ縺ｪ縺上｝ipeline縺ｧDXF逕ｨsampling險ｭ螳壹↓蝓ｺ縺･縺咲函謌舌＆繧後◆polyline繧剃ｽｿ縺・・- offset邱・ 蜷ДXF sample station縺ｧ `H(s) + d*N(s)` 繧定ｩ穂ｾ｡縺吶ｋ縲・- 繧ｯ繝ｭ繧ｽ繧､繝峨∝・蠑ｧ縲∫峩邱壹・縺吶∋縺ｦLINE/LWPOLYLINE逶ｸ蠖薙〒蜃ｺ蜉帙☆繧九・
險ｱ螳ｹ隱､蟾ｮ:

| 蟇ｾ雎｡ | 譌｢螳・|
|---|---:|
| Plan curve sagitta | <= 0.001 m |
| Plan max chord | <= 0.1 m |
| Profile vertical curve chord | <= 0.1 m |
| Station label coordinate | 1e-3 m |

Profile DXF:

- `vertical.sampledPoints` 繧奪XF逕ｨprofile sampling縺ｧ逕滓・縺吶ｋ縲・- PVC/PVI/PVT label縺ｯPhase3.5-5a縺ｧTEXT縺ｨ縺励※蜃ｺ蜉帛呵｣懊よ怙蟆丞ｮ溯｣・〒縺ｯdiagnostic縺ｪ縺励〒逵∫払蜿ｯ縲・
STL:

- `ProjectModel.members` 繧定ｪｭ縺ｿ縲∝推member繧堤ｫｯ轤ｹ髢薙・蜀・浤縺ｨ縺励※蜃ｺ蜉帙・- 譖ｲ邱壹・Frame蛻・牡貂医∩member鄒､縺ｫ繧医ｊ霑台ｼｼ縺輔ｌ繧九・- STL蛛ｴ縺ｧ蜀行ampling縺励↑縺・・
## 6. UI莉墓ｧ・
驟咲ｽｮ: Export險ｭ螳單ialog縺ｾ縺溘・遒ｺ隱榊峙繧ｿ繝悶・Export section縲・
```text
[Export]
  DXF curve approximation
    max chord length [0.1 m]
    max sagitta [0.001 m]
  STL
    member radius [0.05 m]
    cylinder segments [12]
```

繧ｨ繝ｩ繝ｼ:

- 險ｭ螳壼､0莉･荳九・Export髢句ｧ句燕縺ｫblock縲・- DXF sample轤ｹ謨ｰ縺御ｸ企剞繧定ｶ・∴繧句ｴ蜷医・warning縺励・xport荳榊庄縺ｧ縺ｯ縺ｪ縺冗｢ｺ隱阪ｒ菫・☆險ｭ險医↓縺吶ｋ縲・
## 7. Pipeline邨ｱ蜷・
- DXF module縺ｯdomain draft繧堤峩謗･隱ｭ縺ｾ縺ｪ縺・・- Export蜑阪↓DXF sampling option縺ｧpipeline繧貞・螳溯｡後☆繧九°縲（ntermediate縺ｫexport sampled polyline繧呈戟縺溘○繧九・- Phase3.5縺ｧ縺ｯ縲継ipeline蜀榊ｮ溯｡後阪ｒ蝓ｺ譛ｬ縺ｨ縺励…ache縺ｯsourceRevision + sampling key縺ｧ隴伜挨縺吶ｋ縲・
## 8. Validation / Diagnostics

| Rule | Level | Code |
|---|---|---|
| dxf sampling <= 0 | error | `LINER_GRID_SPACING_INVALID` |
| export point count soft limit雜・℃ | warning | `LINER_EXPORT_POINT_COUNT_HIGH`・域眠隕丞呵｣懶ｼ・|
| missing vertical samples | error | `LINER_PROFILE_COVERAGE_GAP` |
| STL member missing node | error | `LINER_FRAME_MISSING_NODE` |

## 9. 繝・せ繝域婿驥・
- `linerPlanDxf.curve.test.ts`: arc/clothoid縺轡XF parse蜿ｯ閭ｽ縺ｪline/polyline縺ｨ縺励※蜃ｺ繧九・- `linerProfileDxf.verticalCurve.test.ts`: parabolic profile縺継olyline縺ｨ縺励※蜃ｺ繧九・- `linerFrameStl.test.ts`: 譖ｲ邱夂罰譚･縺ｮ蛻・牡member project縺ｧASCII STL縺檎函謌舌＆繧後ｋ縲・- E2E: `liner-curved-alignment.spec.ts`縲・
## 10. Migration / 蠕梧婿莠呈鋤

譌｢蟄魯XF/STL API縺ｯDraft繧貞女縺大叙繧九′縲￣hase3.5縺ｧ縺ｯvNext domain draft縺ｫmigration縺励※縺九ｉpipeline繧貞ｮ溯｡後☆繧九Ｗ0.1 fixed-z draft縺ｯN2 migration繧帝壹☆縲・
## 11. 繧ｪ繝ｼ繝励Φ隱ｲ鬘・/ 蟆・擂諡｡蠑ｵ

- DXF ARC entity: 蜀・峇邱壹・縺ｿPhase3.5-5b莉･髯阪〒讀懆ｨ弱ゅけ繝ｭ繧ｽ繧､繝峨・polyline邯ｭ謖√・- LWPOLYLINE bulge蟇ｾ蠢懊・- Profile label縺ｮ隧ｳ邏ｰ縺ｪ陬ｽ蝗ｳ隕冗ｴ・・- STL縺ｧ驛ｨ譚先妙髱｢蠖｢迥ｶ繧貞・譟ｱ莉･螟悶↓縺吶ｋ諡｡蠑ｵ縲・
## 12. 蜿ら・

- 蜑肴署: `coordinate_integration_3d_design.md`
- 蜿ら・縺輔ｌ繧玖ｨｭ險域嶌: `implementation_priority_and_pr_breakdown.md`, `updates/cad_output_spec_update.md`
- 髢｢騾｣繧ｳ繝ｼ繝・ `frontend/src/liner/exports/linerPlanDxf.ts`, `linerProfileDxf.ts`, `linerFrameStl.ts`
- 髢｢騾｣繝・せ繝・ `frontend/src/liner/exports/*.test.ts`, planned `linerPlanDxf.curve.test.ts`

### Phase3.5-0.6 Diagnostic Severity

| Code | Severity |
|---|---|
| `LINER_GEOM_CURVATURE_DISCONTINUITY` | Warning |
| `LINER_GEOM_CLOTHOID_ACCURACY_EXCEEDED` | Warning |
| `LINER_PROFILE_ELEVATION_DISCONTINUITY` | Error |
| `LINER_PROFILE_COVERAGE_GAP` | Error |
| `LINER_EXPORT_POINT_COUNT_HIGH` | Warning |
