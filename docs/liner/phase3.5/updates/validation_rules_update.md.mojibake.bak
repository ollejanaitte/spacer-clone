# validation_rules.md Update Proposal

## 蟇ｾ雎｡

- 蜈・ヵ繧｡繧､繝ｫ: `docs/liner/validation_rules.md`
- 髢｢騾｣Phase: 3.5-1縲・
- 譖ｴ譁ｰ逅・罰: Phase3.5-0隱ｿ譟ｻ縺ｧ豌ｴ蟷ｳ/邵ｦ譁ｭ/讓ｪ譁ｭ縺ｮvalidation荳崎ｶｳ縺檎｢ｺ隱阪＆繧後◆縺溘ａ縲・1縲廸4縺ｮdomain蛻･validation縺ｨdiagnostic code mapping繧定ｿｽ險倥☆繧九・
## 譖ｴ譁ｰ邂・園

| 迴ｾ迥ｶ遶 | 迴ｾ迥ｶ險倩ｿｰ | 譖ｴ譁ｰ蠕瑚ｨ倩ｿｰ |
|---|---|---|
| 2. Rule table | MVP rule縺悟腰陦ｨ | Horizontal / Vertical / Cross Section / Schema Migration縺ｫ蛻・牡 |
| 2. Rule table | C0/C1縺ｯ1陦後・縺ｿ | C0, C1, G2繧貞句挨rule蛹・|
| 2. Rule table | Cross-section rule縺ｪ縺・| offset驥崎､・…rossfall finite縲》emplate蜿ら・縲《uperelevation overlap繧定ｿｽ蜉 |
| Open Questions | Auto-fix縺ｮ縺ｿ | 譁ｰ隕重iagnostic code縺ｮ豁｣蠑乗治逡ｪ繧貞ｮ溯｣・燕遒ｺ隱堺ｺ矩・↓霑ｽ蜉 |

## 蟾ｮ蛻・｡・
```diff
@@ 2. Rule table (MVP)
+ ### Horizontal rules
+ | Segment chain C0 | endpoint gap > 1e-6 m | error | `LINER_GEOM_POSITION_DISCONTINUITY` |
+ | Segment chain C1 | azimuth gap > 1e-9 rad | error | `LINER_GEOM_AZIMUTH_DISCONTINUITY` |
+ | Segment chain G2 | curvature gap > 1e-6 1/m | warning | `LINER_GEOM_CURVATURE_DISCONTINUITY` candidate |
+ | Sampling settings | spacing/sagitta <= 0 | error | `LINER_GRID_SPACING_INVALID` |
+
+ ### Vertical rules
+ | Vertical coverage | grid station has no vertical element | error | `LINER_PROFILE_COVERAGE_GAP` candidate |
+ | Elevation continuity | elevation gap > 1e-6 m | error | `LINER_PROFILE_ELEVATION_DISCONTINUITY` candidate |
+ | Parabolic length | length <= 0 | error | `LINER_GEOM_ZERO_LENGTH_SEGMENT` |
+
+ ### Cross-section rules
+ | Offset line | duplicate offset within 1e-9 m | error | `LINER_GRID_SPACING_INVALID` |
+ | Crossfall | non-finite slope | error | `LINER_SCHEMA_INVALID` |
+ | Superelevation rules | station ranges overlap | error | `LINER_PROFILE_OVERLAP` |
+ | Template reference | gridDefinition references missing template | error | `LINER_SCHEMA_INVALID` |
+
+ ### Draft schema rules
+ | Domain draft | missing `liner.domainDraft` | error | `LINER_SCHEMA_INVALID` |
+ | Domain version | unsupported `liner.draftSchemaVersion` | error | `LINER_SCHEMA_INVALID` |
+ | Legacy draft | arbitrary free-form draft | error | `LINER_SCHEMA_INVALID` |
```

## 蜿ら・

- `docs/liner/phase3.5/horizontal_curve_completion.md`
- `docs/liner/phase3.5/vertical_alignment_design.md`
- `docs/liner/phase3.5/cross_section_superelevation_design.md`
- `docs/liner/phase3.5/typed_liner_draft_schema_vnext.md`

## Phase3.5-0.6 Diagnostic Severity

| Code | Severity |
|---|---|
| `LINER_GEOM_CURVATURE_DISCONTINUITY` | Warning |
| `LINER_GEOM_CLOTHOID_ACCURACY_EXCEEDED` | Warning |
| `LINER_PROFILE_ELEVATION_DISCONTINUITY` | Error |
| `LINER_PROFILE_COVERAGE_GAP` | Error |
| `LINER_EXPORT_POINT_COUNT_HIGH` | Warning |
