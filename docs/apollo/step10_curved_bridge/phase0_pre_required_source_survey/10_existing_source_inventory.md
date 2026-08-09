# Existing Source Inventory — spacer-clone Repository

Inventory of existing sources in `/home/masaharu/Projects/spacer-clone` that are relevant to **curved bridge development**. This is the factual baseline for the Step 10 Curved Bridge scope of work. All paths were verified against the repository at HEAD `0fadc1c`.

---

## 1. Repository Source Inventory

### Road Alignment (Liner) Core

Mature, production-ready horizontal/vertical alignment geometry kernel. This is the strongest curved-bridge foundation in the repository.

| File | Provides | Relevance to Curved Bridge |
|---|---|---|
| `frontend/src/liner/core/geometry/arc.ts` | Circular arc evaluation, signed curvature (`+1/R` left, `-1/R` right) | Core curve geometry for curved girders |
| `frontend/src/liner/core/geometry/clothoid.ts` | Clothoid evaluation via Simpson integration (128 intervals) | Spiral transitions in curved bridge alignments |
| `frontend/src/liner/core/geometry/horizontal.ts` | `evaluateAlignmentAtDistance`, `validateAlignment`; returns per-point `localFrame` | Curved girder centerline + tangent frame |
| `frontend/src/liner/core/geometry/line.ts` | Straight tangent element evaluation | Straight spans / tangents between curves |
| `frontend/src/liner/core/continuityC0.ts` | `checkC0Continuity` | Alignment continuity validation for curved layouts |
| `frontend/src/liner/core/continuityC1.ts` | `checkC1Continuity` | Tangent (bearing) continuity at curve junctions |
| `frontend/src/liner/core/coordinate3d.ts` | `pointAtStationOffset`, `crossSectionAtStation`, `elevationAtStation` | Station/offset → 3D point for curved member placement |
| `frontend/src/liner/core/vector.ts` | `localFrameFromAzimuth`, LocalFrame (tangent/normal/binormal), offset points | Local frames + offset geometry for curved girders |
| `frontend/src/liner/core/geometry/types.ts` | Geometry element type definitions | Curve element typing |
| `frontend/src/liner/core/geometry/clothoidGate.ts` | Clothoid enable/validation gating | Curve feature gating pattern |
| `frontend/src/liner/core/elevationAt.ts` | Elevation evaluation helper | Vertical profile for curved bridge |
| `frontend/src/liner/core/diagnostics.ts` | Geometry diagnostics | Curved alignment diagnostics |
| `frontend/src/liner/core/tolerances.ts` | Numerical tolerances | Consistency for curved geometry precision |
| `frontend/src/liner/core/station/stationRules.ts` | Station rules, `stationAtPoint` | Stationing along curved alignments |

### Road Alignment Schema

| File | Provides | Relevance to Curved Bridge |
|---|---|---|
| `frontend/src/liner/schema/types.ts` | `AlignmentBundleDraft`, `HorizontalElementDraft`, `StraightElementDraft`, `CircularArcElementDraft`, `ClothoidElementDraft`, `alignments`, `activeAlignmentId`, `activeLineId` | Foundation types for curved bridge layout input |

### Road Alignment UI

| File | Provides | Relevance to Curved Bridge |
|---|---|---|
| `frontend/src/liner/components/CurveSamplingControl.tsx` | Curve sampling / density control | Sampling curved girders |
| `frontend/src/liner/components/HorizontalElementEditor.tsx` | Horizontal element editing | Editing curved alignment elements |
| `frontend/src/liner/components/AlignmentManager.tsx` | Alignment management | Multiple alignment management for curved bridges |
| `frontend/src/liner/components/AlignmentLineManager.tsx` | Line management | Curved bridge line management |
| `frontend/src/liner/components/bridgeLayoutSkew.ts` | Skew angle layout helper | Skew/pier orientation on curved alignments |
| `frontend/src/liner/components/offsetLineOrdering.ts` | Offset line ordering | Offset girder ordering on curves |
| `frontend/src/liner/components/VerticalProfileChart.tsx` | Vertical profile chart | Vertical profile of curved bridge |

### Road Alignment Tests

| File | Provides | Relevance to Curved Bridge |
|---|---|---|
| `frontend/src/liner/core/__tests__/horizontalCurveGolden.test.ts` | Golden tests for horizontal curves | Curve geometry regression baseline |
| `frontend/src/liner/core/__tests__/clothoid.test.ts` | Clothoid behavior tests | Clothoid verification |
| `frontend/src/liner/core/__tests__/coordinate3d.test.ts` | 3D coordinate tests | 3D point evaluation on curves |
| `frontend/src/liner/core/__tests__/geometry.test.ts` | Geometry evaluation tests | Curve geometry verification |
| `frontend/src/liner/core/__tests__/continuity.test.ts` | C0/C1 continuity tests | Continuity on curved layouts |
| `frontend/src/liner/core/__tests__/goldenFixture.test.ts` | Golden fixture harness | Reusable golden test harness |
| `frontend/src/liner/core/__tests__/multiAlignmentIsolation.test.ts` | Multi-alignment isolation | Multiple alignments for curved bridge |
| `frontend/src/liner/core/__tests__/station.test.ts` | Stationing tests | Stationing along curves |
| `frontend/src/liner/core/__tests__/crossSectionGolden.test.ts` | Cross-section golden tests | Cross-section on curved alignment |
| `frontend/src/liner/core/__tests__/verticalGolden.test.ts` | Vertical golden tests | Vertical profile verification |

### Bridge Layout (Liner)

| File | Provides | Relevance to Curved Bridge |
|---|---|---|
| `frontend/src/liner/core/bridge/pierLineGeometry.ts` | `pierLineDirectionFromSkew`, `pierLinePointAtOffset` | Pier line / skew direction math on curved alignments |
| `frontend/src/liner/core/bridge/bridgeLayoutEvaluation.ts` | `validateBridgeLayout`, `evaluateBridgeLayout` | Bridge layout evaluation (straight-only today) |
| `frontend/src/liner/components/bridgeLayoutSkew.ts` | Skew layout helper | Skew orientation for curved piers/bearings |

### Bridge Layout Schema

| Schema type (`frontend/src/liner/schema/types.ts`) | Provides | Relevance to Curved Bridge |
|---|---|---|
| `SpanDraft` | Span start/end physical distance | Span definition on curved bridge |
| `PierDraft` | `physicalDistance`, `skewAngleRad`, `bearingOffsets` | Pier placement on curved bridge |
| `CrossBeamDraft` | Cross-beam definition (schema only) | Cross-beam on curved bridge |
| `PierBearingOffsetDraft` | Bearing offset (scalar only, no direction vector) | Requires curve-aware bearing direction |

### Apollo Bridge Structure

| File | Provides | Relevance to Curved Bridge |
|---|---|---|
| `frontend/src/apollo/bridgeStructure/types.ts` | Apollo structure type definitions | Structural entity typing |
| `frontend/src/apollo/bridgeStructure/geometryFormulas.ts` | Pure-geometry formulas | Geometry math for girders |
| `frontend/src/apollo/bridgeStructure/sectionProperties.ts` | Section properties (NOT_AUTHORIZED design semantics) | Section props for curved girders |
| `frontend/src/apollo/bridgeStructure/quantities.ts` | Quantity calculations | Curved bridge quantities |
| `frontend/src/apollo/bridgeStructure/crossFrameAttachmentModel.ts` | Cross-frame attachment model | Cross-frame on curved girders |
| `frontend/src/apollo/bridgeStructure/crossFrameAttachmentTypes.ts` | `ApolloCrossFrameAttachmentDraft`, `CrossFramePattern` | Curved cross-frame definition |
| `frontend/src/apollo/bridgeStructure/haunchModel.ts` / `haunchGeometry.ts` / `haunchTypes.ts` | Haunch appurtenance | Haunch on curved girders |
| `frontend/src/apollo/bridgeStructure/pavementModel.ts` / `pavementGeometry.ts` / `pavementTypes.ts` | Pavement appurtenance | Pavement on curved superelevation |
| `frontend/src/apollo/bridgeStructure/appurtenanceModel.ts` / `Geometry.ts` / `Types.ts` | Appurtenance model | Appurtenances on curved bridge |
| `frontend/src/apollo/bridgeStructure/validation.ts` | Structure validation | Curved structure validation |
| `frontend/src/apollo/bridgeStructure/layoutInput.ts` | Layout input | Curved layout input |

### Apollo Analysis

| File | Provides | Relevance to Curved Bridge |
|---|---|---|
| `frontend/src/apollo/analysis/appurtenanceHaunchAnalysisAdapter.ts` | Haunch analysis adapter | Analysis data adapter pattern |

### Apollo STL Export

| File | Provides | Relevance to Curved Bridge |
|---|---|---|
| `frontend/src/apollo/export/apolloStlExport.ts` | STL export (`@jscad/modeling` + `@jscad/stl-serializer`) | STL export pattern for curved girders |
| `frontend/src/apollo/export/apolloExportManifest.ts` | Export manifest | Export manifest for curved bridge |

### Apollo Drawing

| File | Provides | Relevance to Curved Bridge |
|---|---|---|
| `frontend/src/apollo/drawing/drawingModel.ts` | Drawing model | Curved bridge drawing model |
| `frontend/src/apollo/drawing/memberArrangementViews.ts` | Member arrangement views | Curved member arrangement drawings |
| `frontend/src/apollo/drawing/supportScheduleViews.ts` | Support schedule views | Curved support schedule |
| `frontend/src/apollo/drawing/stationGenerator.ts` | Station text generator | Station labels on curved bridge |
| `frontend/src/apollo/drawing/drawingSetModel.ts` / `drawingSetExport.ts` | Drawing set model/export | Drawing set for curved bridge |
| `frontend/src/apollo/drawing/memberScheduleModel.ts` | Member schedule | Member schedule for curved bridge |

### Apollo Report

| File | Provides | Relevance to Curved Bridge |
|---|---|---|
| `frontend/src/apollo/report/reportModel.ts` | Report model (straight) | Report model foundation |
| `frontend/src/apollo/report/reportModelContinuous.ts` | Continuous girder report model | Continuous curved report model |
| `frontend/src/apollo/report/reportModelTypes.ts` | Report types | Curved report typing |
| `frontend/src/apollo/report/reportModelValidator.ts` | Report validation | Curved report validation |
| `frontend/src/apollo/report/reportExport.ts` | Report export | Report export for curved bridge |

### Apollo Tests

| File | Provides | Relevance to Curved Bridge |
|---|---|---|
| `frontend/src/apollo/__tests__/simpleSingleSpanWorkflow.test.ts` | Simple span workflow test | Straight workflow baseline |
| `frontend/src/apollo/__tests__/continuousGirderLayout.test.ts` | Continuous girder layout test | Continuous girder baseline |
| `frontend/src/apollo/__tests__/continuousGirderVisualization.test.ts` | Continuous girder visualization test | Visualization baseline |
| `frontend/src/apollo/__tests__/step5r3CrossFrameAttachments.test.ts` | Cross-frame attachments test | Cross-frame baseline |
| `frontend/src/apollo/__tests__/bridgeStructureQuantities.test.ts` | Quantities test | Quantity baseline |
| `frontend/src/apollo/__tests__/sectionProperties.test.ts` | Section properties test | Section props baseline |
| `frontend/src/apollo/__tests__/apolloStlExport.test.ts` | STL export test | STL export baseline |
| `frontend/src/apollo/__tests__/bracingSystemGeometry.test.ts` | Bracing geometry test | Bracing baseline |

### Frame Analysis

| File | Provides | Relevance to Curved Bridge |
|---|---|---|
| `frontend/src/contracts/frameAnalysisResultResource.ts` | 6-component section forces (`fx, fy, fz, mx, my, mz`) | Section force contract for curved members |
| `frontend/src/contracts/bridgeFrameAnalysisDocument.ts` | Frame analysis document | Bridge frame analysis resource |
| `frontend/src/contracts/roadToFrameTransferPackage.ts` | Road → frame transfer | Geometry transfer to frame model |
| `frontend/src/contracts/coordinateContext.ts` | Coordinate context | Coordinate handling for curved models |
| `frontend/src/api/client.ts` | API client | Frame analysis invocation |

### Frame Analysis Docs

| File | Provides | Relevance to Curved Bridge |
|---|---|---|
| `docs/frame/analysis/README.md` | Frame analysis overview | Analysis overview |
| `docs/frame/analysis/influence-analysis.md` | Influence line analysis design | Influence line for curved bridge |
| `docs/frame/analysis/influence-engine.md` | Influence engine MVP | Influence engine baseline |
| `docs/frame/analysis/influence-moving-load.md` | Moving load influence design | Moving load for curved bridge |
| `docs/frame/analysis/envelope-result.md` | Envelope result design | Result envelopes for curved bridge |
| `docs/frame/analysis/live-load-preset.md` | Live load presets | Live loads for curved bridge |
| `docs/frame/analysis/loading-surface-grid.md` | Loading surface grid | Load application on curved bridge |
| `docs/frame/analysis/single-point-moving-load-envelope.md` | Single point moving load envelope | Curved bridge load envelope |

### Frame Contracts

| File | Provides | Relevance to Curved Bridge |
|---|---|---|
| `docs/frame/contracts/04_input_schema.md` | Input schema contract | Frame input for curved model |
| `docs/frame/contracts/06_result_schema.md` | Result schema contract | Frame results for curved model |

### Frame Verification

| File | Provides | Relevance to Curved Bridge |
|---|---|---|
| `docs/frame/verification/verification-framework.md` | Verification framework | Test framework |
| `docs/frame/verification/bridge-model-generator.md` | Bridge model generator | Generating curved bridge models |
| `examples/verification/beam/cantilever_torsion.json` | Torsion verification (straight cantilever) | Torsion verification baseline |

### Viewer

| File | Provides | Relevance to Curved Bridge |
|---|---|---|
| `frontend/src/viewer/Viewer3D.tsx` | 3D viewer component | 3D visualization framework |
| `frontend/src/viewer/SceneBuilder.ts` | Scene building | Building curved bridge scenes |
| `frontend/src/viewer/coordinateTransform.ts` | Coordinate transforms | World/local coordinate handling |
| `frontend/src/viewer/threeUtils.ts` | Three.js utilities | Three.js geometry utilities |
| `frontend/src/viewer/ThreeViewport.tsx` | Three viewport | Viewport rendering |

### Road Docs

| Path | Provides | Relevance to Curved Bridge |
|---|---|---|
| `docs/road/current-capability.md` | Current road capability | Road alignment baseline |
| `docs/road/design/` | Road design docs (geometry_core, coordinate_system_policy, station_rules, etc.) | Geometry/coordinate conventions |
| `docs/road/ui/` | Road UI docs | UI patterns |
| `docs/road/output/` | Output docs (cad_output_spec, dxf_export_design, report_output_spec) | Output/export patterns |
| `docs/road/verification/` | Verification docs (test_plan_geometry) | Verification approach |

### Liner Docs

| Path | Provides | Relevance to Curved Bridge |
|---|---|---|
| `docs/liner/phase3.5/` | Phase 3.5 design docs | Alignment design history |
| `docs/liner/phase4.5/` | Phase 4.5 design docs | Alignment evolution |
| `docs/liner/cad_output_spec.md` | CAD output spec | DXF/CAD for curved bridge |
| `docs/liner/test_plan_geometry.md` | Geometry test plan | Geometry test approach |

### History

| Path | Provides | Relevance to Curved Bridge |
|---|---|---|
| `docs/history/road/phase3.5/` | Historical alignment design documents (`horizontal_curve_completion`, `dxf_stl_curve_export_strategy`, `coordinate_integration_3d_design`, etc.) | Rationale/provenance for curve geometry |

### Bridge Modeler V2

| Path | Provides | Relevance to Curved Bridge |
|---|---|---|
| `docs/bridge-modeler-v2/00_bridge_modeler_v2_master_scope.md` | Master scope | Overall scope |
| `docs/bridge-modeler-v2/01_architecture_and_domain_model.md` | Architecture & domain model | Architecture for curved bridge |
| `docs/bridge-modeler-v2/02_phase1_liner_bridge_interval.md` | Phase 1 bridge interval | Bridge layout phase |
| `docs/bridge-modeler-v2/03_phase2_bridge_structure.md` | Phase 2 bridge structure | Bridge structure phase |
| `docs/bridge-modeler-v2/04_phase3_fem_generation.md` | Phase 3 FEM generation | FEM generation for curved bridge |
| `docs/bridge-modeler-v2/05_phase4_load_surface.md` | Phase 4 load surface | Load surface phase |
| `docs/bridge-modeler-v2/06_phase5_results_drawing_dxf.md` | Phase 5 results/drawing/DXF | Output phase |
| `docs/bridge-modeler-v2/09_test_and_verification_plan.md` | Test & verification plan | Test plan |
| `docs/bridge-modeler-v2/10_implementation_roadmap_and_pr_plan.md` | Roadmap & PR plan | Implementation planning |

### Schemas

| File | Provides | Relevance to Curved Bridge |
|---|---|---|
| `schemas/project.schema.json` | Project input schema (nodes, members, sections, supports, loads) | Frame input for curved model |
| `schemas/result.schema.json` | Result schema (displacements, reactions, memberEndForces) | Frame results for curved model |
| `schemas/bridge-definition.schema.json` | Bridge definition schema | Bridge model definition |
| `schemas/bridge.schema.json` | Bridge schema | Bridge model validation |
| `schemas/contracts/v0.1/` | Contract schemas | Contract versioning |

### Examples

| File | Provides | Relevance to Curved Bridge |
|---|---|---|
| `examples/bridge-2span-3girder.json` | 2-span 3-girder bridge example | Straight bridge example |
| `examples/bridge-simple-2lane.json` | Simple 2-lane bridge example | Straight bridge example |
| `examples/bridge-load-line.json` | Load line example | Load application |
| `examples/verification/beam/cantilever_torsion.json` | Torsion verification | Torsion baseline |
| `examples/portal_frame_verification.json` | Portal frame verification | Frame verification |
| `examples/simple_beam_verification.json` | Simple beam verification | Frame verification |
| `examples/liner/` | Liner golden examples | Alignment golden baselines |
| `examples/verification/` | Verification examples | Verification dataset |

---

## 2. External Sources Not Found

- **Apollo PDF manual** — NOT FOUND at `/mnt/data/01_鋼橋自動設計システム_APOLLO_ユーザーズマニュアル_SuperDesigner_鋼橋の自動設計製図システム.pdf`
- **Japanese design standards** — No Japanese design standards found in repository (e.g. curved girder design manuals, 道路橋示方書, etc.)
- **Curved bridge calculation examples** — No curved bridge calculation examples found
- **Curved bridge verification data** — No curved bridge verification data found

---

## 3. Assessment

| Layer | Status | Notes |
|---|---|---|
| **Road alignment geometry** | Comprehensive, production-ready | Full arc/clothoid/line kernel, local frames, station/offset, 3D evaluation |
| **Bridge structural model** | Straight bridge only, in development | Continuous girder (step9) in progress; curved geometry absent |
| **Frame analysis** | General 3D frame | Can analyze a curved model if geometry is manually defined; no curved torsion/warping |
| **Curved bridge specific** | **ZERO implementation** | No curved girder, curved bearing, curved cross-beam/diaphragm, curved design, curved report/drawing |
| **Design standards** | **ZERO (external)** | Japanese design standards not in repo |
| **Calculation examples** | **ZERO for curved bridges** | None present |

---

## 4. What Can Be Leveraged

- **`arc.ts`, `clothoid.ts`, `horizontal.ts`** — curve geometry mathematics (signed curvature, clothoid Simpson integration, per-point local frames)
- **`coordinate3d.ts`** — station/offset → 3D coordinate transformation
- **`vector.ts`** — local frame construction, offset point computation
- **`pierLineGeometry.ts`** — skew angle math for pier/bearing orientation
- **`frameAnalysisResultResource.ts`** — 6-component section forces contract (`fx, fy, fz, mx, my, mz`)
- **`influence-moving-load.md`** — influence line design for bridge loads
- **`apolloStlExport.ts`** — STL export pattern (jscad modeling + serializer)
- **`Viewer3D.tsx`** — 3D visualization framework
- **`types.ts`** — extensive type definitions for grid, frame, and bridge layout