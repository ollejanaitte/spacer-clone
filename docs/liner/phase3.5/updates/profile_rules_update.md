# profile_rules.md Update Proposal

## 蟇ｾ雎｡

- 蜈・ヵ繧｡繧､繝ｫ: `docs/liner/profile_rules.md`
- 髢｢騾｣Phase: 3.5-2/3.5-3
- 譖ｴ譁ｰ逅・罰: Phase3.5-0隱ｿ譟ｻ縺ｧ `zProvenance` 縺・蝓九ａ縺ｧ縲∫ｸｦ譁ｭpipeline譛ｪ謗･邯壹∵ｨｪ譁ｭZ蜷域・譛ｪ螳溯｣・→蛻､譏弱＠縺溘◆繧√・3/N4縺ｮ雋ｬ蜍吝・髮｢繧貞渚譏縺吶ｋ縲・
## 譖ｴ譁ｰ邂・園

| 迴ｾ迥ｶ遶 | 迴ｾ迥ｶ險倩ｿｰ | 譖ｴ譁ｰ蠕瑚ｨ倩ｿｰ |
|---|---|---|
| 1. Vertical component split | crossfall/superelevation縺ｯ0 in MVP | Phase3.5-3縺ｧcrossfallOffset繧貞ｮ溷､蛹悶〕ocalFrame蝗櫁ｻ｢縺ｯ3.5-4縺ｨ譏手ｨ・|
| 2. Vertical segment types | formula縺ｮ縺ｿ | pipeline謗･邯壹’ixed-z鄂ｮ謠帙”eightPoints/PVI/PVC/PVT蜈･蜉帙ｒ霑ｽ險・|
| 4. Cross-section | template field蛻玲嫌 | 隨ｦ蜿ｷ隕冗ｴ・ offset蟾ｦ豁｣縲…rossfall蟾ｦ荳翫′繧頑ｭ｣縲～crossfallOffset=c*d` 繧定ｿｽ險・|

## 蟾ｮ蛻・｡・
```diff
@@ 1. Vertical component split
- Cross-section module (0 in MVP)
+ Cross-section module. Phase3.5-3 generates real `crossfallOffset`.
+ Superelevation rotation of `localFrame` is deferred to Phase3.5-4.

@@ 2. Vertical segment types
+ Phase3.5-2 replaces the fixed-Z pipeline path. Existing `z` is migrated to a
+ zero-grade vertical segment covering the full alignment. PVI/PVC/PVT values are
+ UI/domain inputs and are emitted into `vertical.segments` where applicable.

@@ 4. Cross-section and structural reference
+ Sign convention:
+ - transverse offset is positive left of alignment.
+ - crossfall is positive when the left side rises.
+ - `crossfallOffset = crossfall(s) * offset`.
```

## 蜿ら・

- `docs/liner/phase3.5/vertical_alignment_design.md`
- `docs/liner/phase3.5/cross_section_superelevation_design.md`
- `docs/liner/phase3.5/coordinate_integration_3d_design.md`
