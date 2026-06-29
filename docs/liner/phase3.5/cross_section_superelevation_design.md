# Cross Section and Superelevation Design

## 0. 菴咲ｽｮ縺･縺・
- 蟇ｾ雎｡Phase: Phase3.5-3
- 蜑肴署縺ｨ縺ｪ繧玖ｨｭ險域嶌: `typed_liner_draft_schema_vnext.md`, `vertical_alignment_design.md`, `docs/liner/profile_rules.md`
- 縺薙・險ｭ險域嶌縺ｧ謇ｱ縺・ｯ・峇: 蟷・藤縲∝ｷｦ蜿ｳoffset縲∵ｨｪ譁ｭ蜍ｾ驟阪…ross-section template縲〇蜷域・縲∫ｬｦ蜿ｷ隕冗ｴ・・- 縺薙・險ｭ險域嶌縺ｧ謇ｱ繧上↑縺・ｯ・峇: localFrame縺ｸ縺ｮsuperelevation蝗櫁ｻ｢蜿肴丐・・hase3.5-4・峨．XF/STL蜃ｺ蜉帙・
## 1. 閭梧勹縺ｨ逶ｮ逧・
迴ｾ迥ｶ縺ｮgrid逕滓・縺ｯ `offsets: number[]` 縺ｨ蝗ｺ螳・`z` 縺ｮ縺ｿ繧剃ｽｿ縺・～zProvenance.crossfallOffset`, `structuralReferenceOffset`, `sectionDepthOffset`, `girderEccentricity` 縺ｯ縺吶∋縺ｦ0縺ｧ縺ゅｋ縲１hase3.5-3縺ｧ縺ｯ讓ｪ譁ｭ邱壼ｽ｢繧壇omain縺ｨ縺励※菫晏ｭ倥＠縲“rid轤ｹ縺斐→縺ｮZ謌仙・繧貞ｮ溷､蛹悶☆繧九・
## 2. 逕ｨ隱槫ｮ夂ｾｩ

| 逕ｨ隱・| 螳夂ｾｩ |
|---|---|
| Offset | alignment謗･邱壹↓蟇ｾ縺吶ｋ蟾ｦ豁｣縺ｮ讓ｪ譁ｭ霍晞屬縲・|
| Crossfall | 讓ｪ譁ｭ蜍ｾ驟阪ょｷｦ荳翫′繧翫ｒ豁｣縺ｨ縺吶ｋ縲・|
| Superelevation | 譖ｲ邱夐Κ縺ｧ讓ｪ譁ｭ蜍ｾ驟阪ｒ螟牙喧縺輔○繧玖ｨｭ螳壹１hase3.5-3縺ｧ縺ｯZ謌仙・縺ｮ縺ｿ縲〕ocalFrame蝗櫁ｻ｢縺ｯ3.5-4縲・|
| Cross-section template | 蟷・藤縲｛ffset line縲∵ｧ矩蝓ｺ貅撲ffset縲∵｡∝￥蠢・ｒ譚溘・繧逆emplate縲・|
| `zProvenance` | Grid point Z繧呈ｧ区・縺吶ｋ蜀・ｨｳ縲・|

## 3. 遒ｺ螳壽婿驥晢ｼ・uman Decision蜿肴丐・・
- Decision #3: UI縺ｯ縲梧ｨｪ譁ｭ縲阪ち繝悶ｒ謖√▽縲・- Decision #5: 讓ｪ譁ｭdomain縺ｯ `liner.domainDraft` 縺ｫ蠢・井ｿ晏ｭ倥☆繧九・- Decision #7: 讓ｪ譁ｭ蜍ｾ驟阪・superelevation縺ｮ隨ｦ蜿ｷ縺ｯ3.5-3縺ｧ遒ｺ螳壹＠縲〕ocalFrame蜿肴丐縺ｯ3.5-4縺ｸ謖√■雜翫☆縲・- Decision #9: Frame蛻・牡逕ｨsampling縺ｨ縺ｯ蛻･縺ｫ讓ｪ譁ｭoffset/template繧剃ｿ晏ｭ倥☆繧九・
## 4. 繝峨Γ繧､繝ｳ繝｢繝・Ν

```ts
interface CrossSectionTemplateDraft {
  id: string;
  name: string;
  stationRange?: { startPhysicalDistance: number; endPhysicalDistance: number };
  offsetLines: CrossSectionOffsetLineDraft[];
  defaultCrossfall: number;
  superelevationRules: SuperelevationRuleDraft[];
}

interface CrossSectionOffsetLineDraft {
  id: string;
  offset: number;
  role: "main_girder" | "edge" | "bearing" | "virtual";
  structuralReferenceOffset: number;
  sectionDepthOffset: number;
  girderEccentricity: number;
}
```

Field荳隕ｧ:

| 蜷榊燕 | 蝙・| 蠢・・| 蛻ｶ邏・| 隱ｬ譏・|
|---|---|---:|---|---|
| `offset` | number | Yes | finite | 蟾ｦ豁｣offset縲・|
| `defaultCrossfall` | number | Yes | finite | 蟾ｦ荳翫′繧頑ｭ｣縲・|
| `superelevationRules[]` | array | No | station range蜀・| station縺斐→縺ｮcrossfall螟牙喧縲・|
| `structuralReferenceOffset` | number | Yes | finite | profile axis縺九ｉ讒矩蝓ｺ貅悶∪縺ｧ縲・|
| `sectionDepthOffset` | number | Yes | finite | 譁ｭ髱｢豺ｱ縺墓・蛻・・|
| `girderEccentricity` | number | Yes | finite | 隗｣譫刃ode縺ｨ驥榊ｿ・・蛛丞ｿ・・|

## 5. 繧｢繝ｫ繧ｴ繝ｪ繧ｺ繝 / 險育ｮ苓ｦ丞援

隨ｦ蜿ｷ:

```text
offset d: alignment蟾ｦ蛛ｴ縺梧ｭ｣
crossfall c: 蟾ｦ荳翫′繧翫′豁｣
crossfallOffset = c(s) * d
```

Z蜷域・:

```text
Z_node(s,d) =
  Z_profile(s)
  + crossfallOffset(s,d)
  + structuralReferenceOffset(d)
  + sectionDepthOffset(d)
  + girderEccentricity(d)
```

Superelevation rule:

- Phase3.5-3縺ｧ縺ｯ `c(s)` 繧堤ｷ壼ｽ｢陬憺俣縺ｧ豎ゅａ繧九・- range螟悶・template `defaultCrossfall`縲・- localFrame縺ｮnormal/binormal蝗櫁ｻ｢縺ｯ陦後ｏ縺壹～zProvenance.crossfallOffset` 縺ｮ縺ｿ縺ｫ蜿肴丐縺吶ｋ縲・
險ｱ螳ｹ隱､蟾ｮ:

| Quantity | Tolerance |
|---|---:|
| offset duplicate | 1e-9 m |
| Z component | 1e-6 m |
| crossfall interpolation | 1e-9 |

## 6. UI莉墓ｧ・
驟咲ｽｮ: `liner.setup` 縺ｮ縲梧ｨｪ譁ｭ縲阪ち繝悶・
繝ｯ繧､繝､:

```text
[讓ｪ譁ｭ]
  Template: [default]
  Default crossfall: [ +0.020 ]
  + Offset line霑ｽ蜉
  Offset | Role | Struct ref | Depth | Eccentricity
  -5.0   | edge | 0.00       | 0.00  | 0.00
   0.0   | main | 0.00       | 0.00  | 0.00
  +5.0   | edge | 0.00       | 0.00  | 0.00

  Superelevation Rules
  Start | End | Crossfall start | Crossfall end
```

Validation陦ｨ遉ｺ:

- 蟾ｦ豁｣/蜿ｳ雋繧旦I繝ｩ繝吶Ν縺ｧ譏守､ｺ縲・- crossfall縺ｯ%陦ｨ遉ｺ縺ｨdecimal蜀・Κ蛟､繧剃ｸ｡遶九☆繧九・- localFrame蜿肴丐縺ｯ3.5-4莠亥ｮ壹〒縺ゅｋ縺薙→繧旦I荳翫・謚陦楢ｪｬ譏弱〒縺ｯ縺ｪ縺上∬ｨｭ險医・diagnostics縺ｫ逡吶ａ繧九・
## 7. Pipeline邨ｱ蜷・
- Stage: `resolveCrossSection`縲・- 蜈･蜉・ `crossSections[]`, `gridDefinitions[]`, `vertical.sampledPoints`縲・- 蜃ｺ蜉・ offset line隗｣豎ｺ邨先棡縲～SectionSliceResult[]`, grid轤ｹ縺斐→縺ｮ `zProvenance`縲・- 譌｢蟄伜ｷｮ蛻・ `generateGridPoints()` 縺ｯ `offsets` 驟榊・縺ｧ縺ｯ縺ｪ縺春emplate offset lines繧定ｪｭ縺ｿ縲～z`蝗ｺ螳壹〒縺ｯ縺ｪ縺住蜷域・蠑上ｒ菴ｿ縺・・
## 8. Validation / Diagnostics

| Rule | Level | Code |
|---|---|---|
| offset驥崎､・| error | `LINER_GRID_SPACING_INVALID` |
| template譛ｪ蜿ら・ | warning | `LINER_SCHEMA_INVALID` |
| gridDefinition縺荊emplate繧貞盾辣ｧ縺ｧ縺阪↑縺・| error | `LINER_SCHEMA_INVALID` |
| crossfall髱枅inite | error | `LINER_SCHEMA_INVALID` |
| superelevation range overlap | error | `LINER_PROFILE_OVERLAP` |

## 9. 繝・せ繝域婿驥・
- Unit: `crossfallOffset = c*d` 縺ｮ隨ｦ蜿ｷ遒ｺ隱阪・- Golden: 蟾ｦ蜿ｳoffset縺ｧZ縺碁・ｬｦ蜿ｷ縺ｫ螟牙喧縺吶ｋcase縲・- Regression: `zProvenance` 蜈ｨfield縺悟ｮ溷､縺ｧ蝓九∪繧九％縺ｨ縲・- UI: `CrossfallPanel.test.tsx`, `CrossSectionTemplatePanel.test.tsx`縲・
## 10. Migration / 蠕梧婿莠呈鋤

v0.1 `offsets` 縺九ｉdefault template繧堤函謌舌☆繧・

```text
offsetLines = offsets.map(offset => ({
  offset,
  role: offset === 0 ? "main_girder" : "edge",
  structuralReferenceOffset: 0,
  sectionDepthOffset: 0,
  girderEccentricity: 0
}))
defaultCrossfall = 0
```

## 11. 繧ｪ繝ｼ繝励Φ隱ｲ鬘・/ 蟆・擂諡｡蠑ｵ

- 霆顔ｷ壹＃縺ｨ縺ｮ讓ｪ譁ｭ蜍ｾ驟阪・- 譖ｲ邱壼濠蠕・↓蠢懊§縺溯・蜍不uperelevation險育ｮ励・- localFrame蝗櫁ｻ｢縺ｮ隧ｳ邏ｰ縺ｯN5縺ｧ謇ｱ縺・・
## 12. 蜿ら・

- 蜑肴署: `typed_liner_draft_schema_vnext.md`, `vertical_alignment_design.md`
- 蜿ら・縺輔ｌ繧玖ｨｭ險域嶌: `coordinate_integration_3d_design.md`, `dxf_stl_curve_export_strategy.md`
- 髢｢騾｣繧ｳ繝ｼ繝・ `frontend/src/liner/core/grid/gridGeneration.ts`, `frontend/src/liner/core/types.ts`
- 髢｢騾｣繝・せ繝・ planned `crossfallGrid.test.ts`, `CrossfallPanel.test.tsx`

### Phase3.5-0.6 Diagnostic Severity

| Code | Severity |
|---|---|
| `LINER_GEOM_CURVATURE_DISCONTINUITY` | Warning |
| `LINER_GEOM_CLOTHOID_ACCURACY_EXCEEDED` | Warning |
| `LINER_PROFILE_ELEVATION_DISCONTINUITY` | Error |
| `LINER_PROFILE_COVERAGE_GAP` | Error |
| `LINER_EXPORT_POINT_COUNT_HIGH` | Warning |
