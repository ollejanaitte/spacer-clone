# Curved Bridge Capability Inventory — spacer-clone Repository Analysis

This document is a detailed inventory of spacer-clone's existing curved-bridge-related capability, based on a read-only survey of the repository. It is the output of Phase 0 (pre-required source survey) of the **Step 10 Curved Bridge** scope of work, and serves as the factual baseline against which the curved-bridge implementation plan will be measured.

---

## 1. Survey Method

- **Repository:** `/home/masaharu/Projects/spacer-clone`
- **HEAD:** `0fadc1c2fa984f702b94af12f249a97fc2842705`
- **Date:** 2026-08-06
- **Mode:** Read-only survey. No files were modified.
- **Scope (directories surveyed):**
  - `frontend/src/liner/`
  - `frontend/src/apollo/`
  - `frontend/src/viewer/`
  - `docs/road/`
  - `docs/frame/`
  - `docs/liner/`
  - `docs/apollo/`
  - `docs/bridge-modeler-v2/`
  - `schemas/`
  - `examples/`
- **Search terms:** `arc`, `clothoid`, `horizontal`, `alignment`, `curved`, `curve`, `girder`, `crossBeam`, `crossFrame`, `diaphragm`, `bracing`, `bearing`, `torsion`, `warping`, `6DOF`, `moving load`, `influence line`, `local axis`, `localFrame`, `offset`, `support`, `curved bridge`

**Key finding preview:** The repository contains a mature, fully-implemented horizontal road-alignment kernel (arc/clothoid geometry, local frames, station/offset, 3D point evaluation) but **no curved-bridge-specific structural features** anywhere in the bridge modeling, analysis, design, or drawing layers.

---

## 2. Alignment Geometry (Road / Liner) — FULLY IMPLEMENTED

The horizontal alignment kernel is the strongest curved-bridge foundation in the repository. It fully supports circular arcs, clothoids, straight tangents, continuity enforcement, local frames, and 3D station/offset evaluation.

| Capability | Location | Status |
|---|---|---|
| Straight element | `frontend/src/liner/core/geometry/line.ts` | Implemented |
| Circular arc | `frontend/src/liner/core/geometry/arc.ts` | Implemented |
| Clothoid | `frontend/src/liner/core/geometry/clothoid.ts` | Implemented |
| C0 continuity | `frontend/src/liner/core/continuityC0.ts` | Implemented |
| C1 continuity | `frontend/src/liner/core/continuityC1.ts` | Implemented |
| Horizontal evaluation | `frontend/src/liner/core/geometry/horizontal.ts` | Implemented |
| 3D coordinate | `frontend/src/liner/core/coordinate3d.ts` | Implemented |
| Local frame | `frontend/src/liner/core/vector.ts` | Implemented |
| Station / offset | `frontend/src/liner/core/station/stationRules.ts` | Implemented |
| Multiple alignments | `frontend/src/liner/schema/types.ts` | Implemented |
| Alignment schema | `frontend/src/liner/schema/types.ts` | Implemented |
| Tests | `frontend/src/liner/core/__tests__/` | Implemented |

### Details

- **Straight elements** — `evaluateStraightElement` in `frontend/src/liner/core/geometry/line.ts`.
- **Circular arc** — `signedArcCurvature(element)` returns `+1/radius` for left turn, `-1/radius` for right turn; `evaluateCircularArcElement` in `frontend/src/liner/core/geometry/arc.ts`.
- **Clothoid** — `clothoidCurvatureAt`, `evaluateClothoidElement` using Simpson integration (128 intervals) in `frontend/src/liner/core/geometry/clothoid.ts`.
- **C0 continuity** — `checkC0Continuity` in `frontend/src/liner/core/continuityC0.ts`.
- **C1 continuity** — `checkC1Continuity` in `frontend/src/liner/core/continuityC1.ts`.
- **Horizontal evaluation** — `evaluateAlignmentAtDistance` and `validateAlignment` in `frontend/src/liner/core/geometry/horizontal.ts`. Each evaluation returns a `localFrame` derived from the tangent direction.
- **3D evaluation** — `pointAtStationOffset`, `crossSectionAtStation`, `elevationAtStation` in `frontend/src/liner/core/coordinate3d.ts`.
- **Local frame** — `localFrameFromAzimuth(azimuth)` returns tangent/normal/binormal `LocalFrame` in `frontend/src/liner/core/vector.ts`.
- **Station/offset** — station rules in `frontend/src/liner/core/station/stationRules.ts`; `stationAtPoint` in `frontend/src/liner/core/stationAtPoint.ts`.
- **Multiple alignments** — `alignments: AlignmentBundleDraft[]`, `activeAlignmentId`, `activeLineId` in `frontend/src/liner/schema/types.ts` (lines 291–293).
- **Schema types** — `StraightElementDraft`, `CircularArcElementDraft`, `ClothoidElementDraft` in `frontend/src/liner/schema/types.ts` (lines 311–333).
- **Tests** — `horizontalCurveGolden.test.ts`, `clothoid.test.ts`, `coordinate3d.test.ts`, `continuity.test.ts`, `crossSectionGolden.test.ts`, `verticalGolden.test.ts`, `multiAlignmentIsolation.test.ts`, `geometry.test.ts`, `goldenFixture.test.ts`, `station.test.ts`, `linkedlist` etc. in `frontend/src/liner/core/__tests__/`.

---

## 3. Vertical Alignment — FULLY IMPLEMENTED

Vertical alignment is fully implemented and works in combination with the horizontal alignment to produce the 3D road centerline. It is not curve-specific (orthogonal to horizontal curvature) but is a required input for any bridge.

| Capability | Location | Status |
|---|---|---|
| Grade elements | `frontend/src/liner/core/geometry/vertical.ts` | Implemented |
| Parabolic elements | `frontend/src/liner/core/geometry/vertical.ts` | Implemented |
| Cross slope / superelevation | `frontend/src/liner/core/grid/crossfallResolution.ts` | Implemented |
| Cross-section templates | `frontend/src/liner/core/crossSectionTemplateValidation.ts` | Implemented |
| Width change points | schema (`CrossSectionTemplateDraft`) | Implemented |
| Measured grid | `frontend/src/liner/core/grid/` | Implemented |

### Details

- **Grade/parabolic elements** — `GradeSegment` type and parabolic profiles in `frontend/src/liner/core/geometry/vertical.ts`.
- **Cross slope / superelevation** — `resolveCrossfallOffset`, `resolveCrossfallState`, `validateCrossSlopeIntervals` in `frontend/src/liner/core/grid/crossfallResolution.ts`.
- **Cross-section templates** — `validateCrossSectionTemplates` in `frontend/src/liner/core/crossSectionTemplateValidation.ts`; template resolution in `frontend/src/liner/core/crossSectionTemplateResolution.ts`.
- **Width change points** — supported via templated cross sections with physical-distance change points (elevation/width transitions).
- **Measured grid** — `frontend/src/liner/core/grid/gridGeneration.ts`, `measuredGridGeneration.test.ts`.

---

## 4. Bridge Layout (Liner) — PARTIALLY_IMPLEMENTED (straight bridges only)

The bridge layout encodes spans, piers, skew, and bearing offsets, but the geometry is fundamentally **straight-only**: bearing offsets are scalar offsets and there is no bearing direction vector, no curved girder line, and no curved cross-beam/diaphragm orientation logic.

| Capability | Location | Status |
|---|---|---|
| Span definition | `SpanDraft` (schema) | Implemented |
| Pier definition | `PierDraft` (schema) | Implemented |
| Pier line geometry | `frontend/src/liner/core/bridge/pierLineGeometry.ts` | Implemented |
| Bridge layout evaluation | `frontend/src/liner/core/bridge/bridgeLayoutEvaluation.ts` | Implemented |
| Cross-beam draft | `CrossBeamDraft` (schema only) | Implemented (schema) |
| Curved girder line | — | **Not implemented** |
| Curved cross-beam direction | — | **Not implemented** |
| Curved diaphragm / end diaphragm orientation | — | **Not implemented** |

### Details

- **Span** — `SpanDraft` with `startPhysicalDistance` / `endPhysicalDistance` in `frontend/src/liner/schema/types.ts` (lines 518+).
- **Pier** — `PierDraft` with `physicalDistance`, `skewAngleRad`, `bearingOffsets?: PierBearingOffsetDraft[]` in `frontend/src/liner/schema/types.ts` (lines 530–535).
- **Pier line geometry** — `pierLineDirectionFromSkew`, `pierLinePointAtOffset` in `frontend/src/liner/core/bridge/pierLineGeometry.ts`. The pier line is constructed **parallel to the alignment tangent** (road centerline direction) and rotated by the skew angle.
- **Bridge layout evaluation** — `validateBridgeLayout`, `evaluateBridgeLayout` in `frontend/src/liner/core/bridge/bridgeLayoutEvaluation.ts`.
- **Cross beam** — `CrossBeamDraft` exists in schema (`frontend/src/liner/schema/types.ts:539`) but has **no curve-aware direction logic**.
- **Bearing offsets** — scalar offset distances only; there is **no bearing direction vector** and therefore no way to express radial/tangential bearing orientation on a curved girder.

---

## 5. Apollo Bridge Structure — PARTIALLY_IMPLEMENTED (straight bridges only)

Apollo implements simple-span and (in-progress step9) continuous straight girder workflows, cross-frame attachments, bracing, appurtenances, sections, quantities, and drawings. None of these are curve-aware.

| Capability | Location | Status |
|---|---|---|
| Simple single span | `frontend/src/apollo/bridgeStructure/` | Complete workflow |
| Continuous girder | `frontend/src/apollo/bridgeStructure/` (step9) | In progress |
| Cross-frame attachments | `crossFrameAttachmentModel.ts`, `crossFrameAttachmentTypes.ts` | Implemented |
| Bracing system | `bracingSystemGeometry` (test) | Implemented |
| Appurtenances | `haunch*`, `pavement*`, `appurtenance*` | Implemented |
| Section properties | `sectionProperties.ts` | Implemented |
| Quantities | `bridgeStructure/quantities.ts` | Implemented |
| Drawing | `drawing/*` | Implemented |
| Curved girder section design | — | **Not implemented** |
| Curved bearing orientation | — | **Not implemented** |
| Curved diaphragm geometry | — | **Not implemented** |

### Details

- **Simple single span** — complete workflow from layout through STL, visualization, and report (see `docs/apollo/simple_single_span/`).
- **Continuous girder** — layout, STL, visualization, report currently under development in `docs/apollo/continuous_girder/` (step9). `continuousGirder*` tests exist.
- **Cross-frame attachments** — `crossFrameAttachmentModel.ts`, `crossFrameAttachmentTypes.ts` (`ApolloCrossFrameAttachmentDraft`, `CrossFramePattern`). Attachment depths are measured downward from the girder top flange — straight-girder only.
- **Bracing system** — bracing geometry covered by tests (e.g. `bracingSystemGeometry`).
- **Appurtenances** — `haunchGeometry.ts`/`haunchModel.ts`/`haunchTypes.ts`, `pavementGeometry.ts`/`pavementModel.ts`/`pavementTypes.ts`, `appurtenanceGeometry.ts`/`appurtenanceModel.ts`.
- **Section properties** — pure-geometry section properties in `sectionProperties.ts` (explicitly `NOT_AUTHORIZED` design semantics).
- **Quantities** — `frontend/src/apollo/bridgeStructure/quantities.ts`.
- **Drawing** — `frontend/src/apollo/drawing/` with `memberArrangementViews.ts`, `supportScheduleViews.ts`, `stationGenerator.ts`, `memberScheduleModel.ts`, `drawingSetModel.ts`, `drawingSetExport.ts`, `drawingModel.ts`, `drawingExport.ts`.

---

## 6. 3D / STL / Viewer — PARTIALLY_IMPLEMENTED (straight bridges only)

3D visualization and STL export exist and can display a curved road centerline, but bridge-structure solid geometry is generated for **straight girders only**.

| Capability | Location | Status |
|---|---|---|
| STL export | `apollo/export/apolloStlExport.ts` | Implemented |
| Viewer | `viewer/SceneBuilder.ts`, `viewer/Viewer3D.tsx`, `viewer/ThreeViewport.tsx` | Implemented |
| 3D coordinate transform | `viewer/coordinateTransform.ts`, `viewer/threeUtils.ts` | Implemented |
| STL visualization (road centerline) | viewer | Curved alignment supported |
| Bridge structure STL (curved girder) | — | **Not implemented** |

### Details

- **STL export** — `frontend/src/apollo/export/apolloStlExport.ts` (uses `@jscad/modeling` + `@jscad/stl-serializer`); tests exist for continuous-girder STL.
- **Viewer** — `frontend/src/viewer/SceneBuilder.ts`, `Viewer3D.tsx`, `ThreeViewport.tsx`, plus `renderers/`, `settings/`, diagnostics and comparison components.
- **3D transform** — `viewer/coordinateTransform.ts`, `viewer/threeUtils.ts`; `SceneBuilder.apolloVisualization.test.ts` and `threeUtils.apolloVisualization.test.ts`.
- **Curved centerline** — the viewer can render the curved road alignment (centerline) because it consumes the fully-implemented alignment geometry.
- **Bridge structure STL** — only straight continuous/simple girders are generated; there is **no curved-girder 3D geometry generation**.

---

## 7. Frame Analysis — GENERALLY IMPLEMENTED (straight 3D frame)

The 3D frame solver is a general 6-DOF-per-node solver with full 3D member results. It can analyze a curved model **only if the user manually defines the curved geometry** via node coordinates; there is no curve-specific preprocessing, curved-girder torsion/warping, or centrifugal load.

| Capability | Location | Status |
|---|---|---|
| 3D frame solver (6DOF/node) | `schemas/project.json`, analysis engine | Implemented |
| Member forces (fx, fy, fz, mx, my, mz) | result schema | Implemented |
| Input schema | `schemas/project.schema.json` | Implemented |
| Result schema | `schemas/result.schema.json` | Implemented |
| Member local axis | member definition | Implemented |
| Influence line | `docs/frame/analysis/influence-*.md` | Design + MVP |
| Moving load | `docs/frame/analysis/influence-engine.md` | MVP |
| Verification | `examples/verification/beam/cantilever_torsion.json` | Exists |
| Warping torsion | — | **Not implemented** |
| Secondary stress / curved-girder torsion | — | **Not implemented** |
| Centrifugal load | — | **Not implemented** |
| Curved-bridge influence line | — | **Not implemented** |

### Details

- **3D frame solver** — general 6-DOF-per-node solver; 6 components of member-end forces (`fx, fy, fz, mx, my, mz`).
- **Input schema** — `schemas/project.schema.json` with `nodes`, `members`, `sections`, `supports`, `loads`.
- **Result schema** — `schemas/result.schema.json` with displacements (`ux, uy, uz, rx, ry, rz`), reactions, and `memberEndForces`.
- **Member local axis** — defined per member in the input model.
- **Influence line** — design documents `docs/frame/analysis/influence-moving-load.md`, `influence-analysis.md`, `influence-engine.md`. MVP is a single `LoadingLine`, vertical unit load, single concentrated load, using `memberInterpolation` (Euler-Bernoulli beam elements).
- **Moving load** — `docs/frame/analysis/influence-engine.md` §7; envelope of a single concentrated load.
- **Verification** — `examples/verification/beam/cantilever_torsion.json` exists (torsion verification for a straight cantilever).
- **Limitations** — no warping torsion, no secondary stress, no curved-girder torsion, no centrifugal load, and no curved-bridge-specific influence line.

---

## 8. Design Check — NOT_IMPLEMENTED for curved bridges

There is no curved-bridge design-check capability. The repository does not perform curved-girder section checks (bending + torsion + warping), curved cross-frame design, curved bracing design, curved bearing design, curved-bridge fatigue, or curved-bridge camber.

| Capability | Status |
|---|---|
| Curved girder section check (bending + torsion + warping) | **Not implemented** |
| Curved cross-frame design | **Not implemented** |
| Curved bracing design | **Not implemented** |
| Curved bearing design | **Not implemented** |
| Fatigue for curved bridges | **Not implemented** |
| Camber for curved bridges | **Not implemented** |

---

## 9. Report / Drawing — NOT_IMPLEMENTED for curved bridges

Report and drawing output exists for straight bridges only. There is no curved-bridge report template and no curved-bridge drawing template.

| Capability | Location | Status |
|---|---|---|
| Report model (continuous, step9) | `apollo/report/*` | Implemented — straight only |
| Output integration | `apollo/output/` | Implemented — straight only |
| DXF export | `docs/liner/cad_output_spec.md` | Spec exists |
| Curved bridge report template | — | **Not implemented** |
| Curved bridge drawing template | — | **Not implemented** |

### Details

- **Report model** — `frontend/src/apollo/report/reportModel.ts`, `reportModelContinuous.ts`, `reportModelTypes.ts`, `reportModelValidator.ts`, `reportExport.ts`.
- **Output** — `frontend/src/apollo/output/`.
- **DXF** — `docs/liner/cad_output_spec.md` describes DXF output integration.

---

## 10. Summary Table

| Category | Feature | Status | Curve-Specific | Notes |
|---|---|---|---|---|
| Horizontal Alignment | Straight | Implemented | Curve-supporting | `line.ts` |
| Horizontal Alignment | Arc | Implemented | Curve-supporting | `arc.ts`, signed curvature, left/right turn |
| Horizontal Alignment | Clothoid | Implemented | Curve-supporting | `clothoid.ts`, Simpson 128 |
| Horizontal Alignment | C0/C1 continuity | Implemented | Curve-supporting | `continuityC0.ts`, `continuityC1.ts` |
| Horizontal Alignment | Station/offset | Implemented | Curve-supporting | `stationRules.ts`, `stationAtPoint.ts` |
| Horizontal Alignment | Local frame | Implemented | Curve-supporting | `vector.ts` `localFrameFromAzimuth` |
| Vertical Alignment | Grade / parabolic | Implemented | Not curve-specific | `vertical.ts` |
| Vertical Alignment | Cross slope / superelevation | Implemented | Not curve-specific | `grid/crossfallResolution.ts` |
| Bridge Layout | Spans | Partially implemented | — | `SpanDraft` |
| Bridge Layout | Piers | Partially implemented | — | `PierDraft` |
| Bridge Layout | Skew | Partially implemented | — | `skewAngleRad` |
| Bridge Layout | Bearing offsets | Partially implemented | Need curve-specific bearing direction | scalar offsets only, no direction vector |
| Apollo Structure | Simple span | Partially implemented | Straight-only | complete workflow |
| Apollo Structure | Continuous girder | Partially implemented | Straight-only | step9 in progress |
| Apollo Structure | Cross frame | Partially implemented | Straight-only | `crossFrameAttachment*` |
| Apollo Structure | Bracing | Partially implemented | Straight-only | bracing geometry tests |
| 3D/STL | Centerline 3D | Partially implemented | Curve-supporting | curved centerline rendered |
| 3D/STL | STL export | Partially implemented | Straight bridge geometry only | `apolloStlExport.ts` |
| 3D/STL | Viewer | Partially implemented | Straight bridge geometry only | `SceneBuilder.ts` etc. |
| Frame Analysis | 3D solver, 6DOF | Implemented | No curved torsion/warping | general solver |
| Frame Analysis | Influence line | Implemented | No curved-specific | `influence-*.md` |
| Frame Analysis | Moving load | Implemented | No curved-specific | MVP single line/load |
| Design Check | Section | Not implemented for curved | Curved-relevant | bending+torsion+warping missing |
| Design Check | Cross frame | Not implemented for curved | Curved-relevant | — |
| Design Check | Bracing | Not implemented for curved | Curved-relevant | — |
| Design Check | Bearing | Not implemented for curved | Curved-relevant | — |
| Report/Drawing | Report | Not implemented for curved | Curved-relevant | straight only |
| Report/Drawing | DXF | Not implemented for curved | Curved-relevant | spec only |
| Report/Drawing | Drawing | Not implemented for curved | Curved-relevant | straight only |

---

## 11. Verdict

| Dimension | Verdict |
|---|---|
| Road alignment (horizontal curve) capability | **FULLY IMPLEMENTED** |
| Bridge structure curved geometry | **NOT_IMPLEMENTED** (straight bridge only) |
| Curved frame analysis | **PARTIALLY_IMPLEMENTED** — the 3D solver can analyze a curved model only if the user manually defines the curved geometry (node coordinates); no curved-girder torsion/warping, no centrifugal load, no curved-bridge influence line |
| Curved design check | **NOT_IMPLEMENTED** |
| Curved report/drawing | **NOT_IMPLEMENTED** |

**Bottom line:** The repository has an excellent, production-grade road-alignment foundation (arcs, clothoids, local frames, station/offset, 3D evaluation) that is **curve-supporting** and can be reused as the geometric backbone for curved-bridge modeling. However, **there are ZERO curved-bridge-specific structural features**: no curved girder geometry, no curved bearing orientation, no curved cross-beam/diaphragm logic, no curved girder torsion/warping analysis, no curved design checks, and no curved report/drawing templates. Every structural layer above the road alignment is straight-only.