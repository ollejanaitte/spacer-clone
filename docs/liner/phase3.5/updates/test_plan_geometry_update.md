# test_plan_geometry.md Update Proposal

## 蟇ｾ雎｡

- 蜈・ヵ繧｡繧､繝ｫ: `docs/liner/test_plan_geometry.md`
- 髢｢騾｣Phase: 3.5-1縲・
- 譖ｴ譁ｰ逅・罰: Phase3.5-0隱ｿ譟ｻ縺ｧ縲∵峇邱喞ompletion縲∫ｸｦ譁ｭpipeline縲∵ｨｪ譁ｭZ蜷域・縲・D邨ｱ蜷医・霑ｽ蜉test縺悟ｿ・ｦ√→蛻､譏弱＠縺溘◆繧√・1縲廸5縺ｮGolden test繧貞渚譏縺吶ｋ縲・
## 譖ｴ譁ｰ邂・園

| 迴ｾ迥ｶ遶 | 迴ｾ迥ｶ險倩ｿｰ | 譖ｴ譁ｰ蠕瑚ｨ倩ｿｰ |
|---|---|---|
| 2. Tolerance table | clothoid endpoint 1e-3遲・| Simpson邯ｭ謖√；C-08縲・0縺ｮGate縲《ampling sagitta tolerance繧定ｿｽ險・|
| 3. Golden catalog | GC-01縲廨C-10 | GC-11 vertical pipeline縲；C-12 crossfall縲；C-13 curved3D邨ｱ蜷医ｒ霑ｽ蜉 |
| 8. Test layout | proposed files | `horizontal.continuity.test.ts`, `stationInverse.test.ts`, `crossfallGrid.test.ts`, `pipeline.curved3d.test.ts` 繧定ｿｽ蜉 |

## 蟾ｮ蛻・｡・
```diff
@@ 2. Tolerance table
+ | Display sampling sagitta (m) | 0.005 | Preview |
+ | DXF sampling sagitta (m) | 0.001 | Polyline export |
+ | Frame sampling sagitta (m) | 0.0025 | Subdivided straight members |

@@ 3. Golden case catalog
+ #### GC-11: Vertical pipeline integration
+ Fixed-z legacy draft migrates to a zero-grade vertical alignment and produces
+ `vertical.sampledPoints` at station entries.
+
+ #### GC-12: Crossfall Z provenance
+ Offsets -5, 0, +5 with crossfall +0.02 produce crossfall offsets -0.10, 0, +0.10.
+ `zProvenance` stores all components separately.
+
+ #### GC-13: Curved 3D integration
+ Arc alignment + parabolic vertical + crossfall template generates grid points whose
+ XY follows the curve, Z follows profile plus crossfall, and Frame members satisfy
+ frame sampling max member length.

@@ 8. Test file layout
+ horizontal.continuity.test.ts
+ stationInverse.test.ts
+ verticalAlignment.test.ts
+ crossfallGrid.test.ts
+ pipeline.curved3d.test.ts
```

## 蜿ら・

- `docs/liner/phase3.5/horizontal_curve_completion.md`
- `docs/liner/phase3.5/vertical_alignment_design.md`
- `docs/liner/phase3.5/cross_section_superelevation_design.md`
- `docs/liner/phase3.5/coordinate_integration_3d_design.md`

## Phase3.5-0.6 Sampling Tolerance Table

| Metric | Value | Scope |
|---|---:|---|
| Display sampling sagitta (m) | 0.005 | Preview |
| DXF sampling sagitta (m) | 0.001 | Polyline export |
| Frame sampling sagitta (m) | 0.0025 | Subdivided straight members |
