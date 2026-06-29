# geometry_core.md Update Proposal

## 対象

- 元ファイル: `docs/liner/geometry_core.md`
- 関連Phase: 3.5-1
- 更新理由: Phase3.5-0調査で、実装済みAPIは前方評価中心であり、C0/C1検証、投影、sampling 3系統分離、クロソイド精度Gateが未完了と判明したため、Human Decision #2, #9を反映する。

## 更新箇所

| 現状章 | 現状記述 | 更新後記述 |
|---|---|---|
| Scope | Horizontal/vertical/station/offsetをMVP scopeとする | Phase3.5では水平曲線completionを並行し、縦断/横断/3D統合はN3〜N5で段階実装する旨を追記 |
| 2. Horizontal segment resolution | C0/C1/G2の設計値のみ | `validateAlignment()` がC0/C1未実装である現状、Phase3.5-1でerror診断として実装するGate条件を追記 |
| 3. Clothoid | Fresnel seriesがchosen method | Phase3.5初期はSimpson積分を維持し、128分割、endpoint 1e-3 m以内、Fresnel置換Gateを追記 |
| 5. Station computation | inverse query APIの疑似コード | `stationAtPoint(x,y)` の戻り値、line/arc/clothoid別projection方式、offset符号を追記 |
| 8. Sampling density | Rendering polyline 1.0m等 | display/dxf/frame 3系統に分離し、既定値とsagitta誤差を追記 |

## 差分

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

## 参照

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
