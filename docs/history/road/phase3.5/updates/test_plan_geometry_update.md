# test_plan_geometry.md Update Proposal

## 対象

- 元ファイル: `docs/liner/test_plan_geometry.md`
- 関連Phase: 3.5-1。
- 更新理由: Phase3.5-0調査で、曲線completion、縦断pipeline、横断Z合成、3D統合成追加testが必須と判明したため、N1〜N5のGolden testを反映する。
## 更新箇所

| 現状章 | 現状記述 | 更新後記述 |
|---|---|---|
| 2. Tolerance table | clothoid endpoint 1e-3等| Simpson維持、GC-08、N0のGate、sampling sagitta toleranceを追記|
| 3. Golden catalog | GC-01〜GC-10 | GC-11 vertical pipeline、GC-12 crossfall、GC-13 curved3D統合を追加 |
| 8. Test layout | proposed files | `horizontal.continuity.test.ts`, `stationInverse.test.ts`, `crossfallGrid.test.ts`, `pipeline.curved3d.test.ts` を追加 |

## 差分
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

## 参照

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
