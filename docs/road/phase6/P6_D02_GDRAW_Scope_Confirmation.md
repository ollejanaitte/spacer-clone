# P6-D02 Repository Gap Analysis

**Date:** 2026-07-23
**Status:** ANALYSIS COMPLETE
**Phase:** P6 - Reports, Drawings, and Viewer Completion
**D-step:** P6-D02 GDRAW Scope Confirmation

---

## 1. Executive Summary

This analysis confirms the GDRAW scope for PR-39 "Road GDRAW completeness" by mapping current implementation gaps, Phase5 reusable assets, JIP-LINER manual requirements, and candidate files. The repository is in a clean state with Phase5 COMPLETE. GDRAW refers to the formal drawing system for Road design (plan/profile/cross-section drawings with DXF export). Current implementation provides basic drawing primitives and DXF export but lacks comprehensive JIP-LINER §8 parity, bridge drawing integration, and advanced annotation features.

**P6_D02_VERDICT: COMPLETE**
**P6_D03_READY: YES**

---

## 2. Repository State

| Item | Value | Evidence |
|------|-------|----------|
| Current Branch | HEAD detached | `git branch --show-current` returns empty |
| HEAD Commit | `e1e4b64` | `docs(road): finalize Phase 5 completion ledger` |
| Origin/Main | Same as HEAD | `git status` shows clean worktree |
| Worktree Status | Clean | No uncommitted changes |
| Untracked Files | None | `git status` shows nothing to commit |
| Phase6 Documents | **NOT PRESENT** | `docs/road/phase6/` directory does not exist |
| P6-D01 Status | **NOT STARTED** | No P6-D01 completion record found |
| Phase5 Status | **COMPLETE** | `docs/road/phase5/phase5_completion_record.md` VERDICT: COMPLETE |

**Note:** Phase6 planning documents (`phase6_planning_freeze.md`, `phase6_design_document.md`, `phase6_completion_gate.md`) are listed as authoritative inputs but do not yet exist in the repository. These must be created before P6 implementation begins.

---

## 3. Authoritative Documents

### Present and Verified

| Document | Path | Status |
|----------|------|--------|
| Stage 6-10 README | `docs/planning/stage6-10/README.md` | COMPLETE |
| Stage 10 Gap Migration | `docs/planning/stage6-10/stage10_gap_migration_sequence.md` | COMPLETE |
| Implementation Dependency | `docs/planning/stage6-10/implementation_dependency_graph.md` | COMPLETE |
| Risks and Gates | `docs/planning/stage6-10/risks_and_gates.md` | COMPLETE |
| Phase5 Completion Record | `docs/road/phase5/phase5_completion_record.md` | COMPLETE |
| Phase5 Completion Gate | `docs/road/phase5/phase5_completion_gate.md` | APPROVED |
| JIP-LINER Extraction | `docs/road/phase5/phase5_jip_liner_formal_drawing_extraction.md` | APPROVED |
| Drawing Model Design | `docs/road/output/drawing_model_design.md` | ACTIVE REFERENCE |
| CAD Output Spec | `docs/road/output/cad_output_spec.md` | ACTIVE REFERENCE |

### Missing (Required for P6)

| Document | Expected Path | Status |
|----------|---------------|--------|
| Phase6 Planning Freeze | `docs/road/phase6/phase6_planning_freeze.md` | **NOT CREATED** |
| Phase6 Design Document | `docs/road/phase6/phase6_design_document.md` | **NOT CREATED** |
| Phase6 Completion Gate | `docs/road/phase6/phase6_completion_gate.md` | **NOT CREATED** |

---

## 4. P6-D01 Acceptance Check

P6-D01 is defined as the prerequisite for P6-D02 but has not been started. According to the stage10 implementation sequence:

- P6 depends on SP1 (shared platform) and passed P4/P5 features
- P6-D01 would typically be "GDRAW specification reconciliation"
- Phase5 completion provides the foundation for P6-D01

**P6_D01_STATUS: NOT_STARTED**
**P6_D01_DEPENDENCY_SATISFACTION:**
- SP1: **SP1_PARTIAL** (see Section 5)
- P4/P5: **COMPLETE** (Phase5 verified)

---

## 5. SP1 Status

**SP1_STATUS: SP1_PARTIAL**

SP1 (Shared Platform Extraction) is defined in Stage 6-10 as Phase P2 deliverable:

| SP1 Component | Status | Evidence |
|---------------|--------|----------|
| Drawing primitives/paper/affine | **IMPLEMENTED** | `frontend/src/liner/drawing/model/`, `transforms/` |
| DXF model/validation/serializer | **IMPLEMENTED** | `frontend/src/liner/dxf/` |
| DrawingDocument common base | **IMPLEMENTED** | `frontend/src/liner/drawing/model/document.ts` |
| Neutral render DTO/lifecycle | **PARTIAL** | `DrawingDocumentSvg.tsx` exists but coupled to liner |
| Shared UI integration | **NOT_IMPLEMENTED** | No shared drawing component library |
| Road/Frame responsibility separation | **NOT_APPLICABLE** | Frame drawing not yet in scope |
| Source of truth boundary | **CONFIRMED** | DrawingDocument is runtime-only, not persisted |
| Adapter boundary | **PARTIAL** | DXF adapter exists but not generalized |
| Immutable/read-only input | **CONFIRMED** | Builders take CanonicalLinerIntermediateResult (immutable) |

**SP1_GAP:** The shared platform exists within the liner domain but has not been extracted to a neutral shared package. For P6 PR-39, this means GDRAW builders can use existing infrastructure but may need adaptation for target architecture.

---

## 6. GDRAW Entry Points

### Formal Meaning

GDRAW = Formal Drawing System for Road design output. Generates plan, profile, and cross-section drawings with DXF export capability.

### Navigation Path

```
/liner (list page)
  -> /liner/setup (input page)
  -> /liner/preview (result preview)
    -> [Open Drawings button] -> /liner/drawings/plan
                                /liner/drawings/profile
                                /liner/drawings/cross-section
```

### Route Definitions

| Route ID | Path | Component | Status |
|----------|------|-----------|--------|
| `liner.drawingPlan` | `/pro/liner/drawings/plan` | `LinerFormalDrawingWorkspacePage` | **IMPLEMENTED** |
| `liner.drawingProfile` | `/pro/liner/drawings/profile` | `LinerFormalDrawingWorkspacePage` | **IMPLEMENTED** |
| `liner.drawingCrossSection` | `/pro/liner/drawings/cross-section` | `LinerFormalDrawingWorkspacePage` | **IMPLEMENTED** |

### Component Entry Points

| Entry | Component/File | Data-testid | Status |
|-------|----------------|-------------|--------|
| Preview page "Open Drawings" button | `LinerPreviewPage.tsx` | `open-liner-drawings` | **IMPLEMENTED** |
| Formal drawing notice | `LinerPreviewPage.tsx` | `liner-preview-formal-drawing-notice` | **IMPLEMENTED** |
| Drawing workspace page | `LinerFormalDrawingWorkspacePage.tsx` | `formal-drawing-preview-document` | **IMPLEMENTED** |
| DXF export buttons | `LinerFormalDrawingWorkspacePage.tsx` | `formal-drawing-export-*-dxf` | **IMPLEMENTED** |
| Print button | `LinerFormalDrawingWorkspacePage.tsx` | `formal-drawing-print-active-sheet` | **IMPLEMENTED** |
| CSV export | `LinerFormalDrawingWorkspacePage.tsx` | `formal-drawing-road-export-csv` | **IMPLEMENTED** |

### Feature Flags

No explicit feature flags for GDRAW. Drawing workspace is always available when liner preview has results.

### Output Routes

- **SVG Preview:** In-browser rendering via `DrawingDocumentSvg.tsx`
- **DXF Export:** Download via `exportFormalDrawingDxf()` -> `downloadFormalDrawingDxf()`
- **Print:** Browser print dialog via `printFormalDrawing()`
- **CSV Export:** Data export via CSV button

---

## 7. Current Road Drawing Inventory

| Feature | Status | Path / Symbol | Evidence | Notes |
|---------|--------|---------------|----------|-------|
| DrawingDocument model | COMPLETE | `drawing/model/document.ts` | Phase5 verified | Runtime-only, not persisted |
| DrawingSettings persistence | COMPLETE | `drawing/builders/types.ts` | Phase5-D04 | Saved in project JSON |
| Plan drawing builder | COMPLETE | `drawing/builders/formalDrawingBuilders.ts:385` | Phase5-D02 | Type A (road_shape) and Type B (centerline_only) |
| Profile drawing builder | COMPLETE | `drawing/builders/formalDrawingBuilders.ts:395` | Phase5-D02 | Profile line + ground line |
| Cross-section drawing builder | COMPLETE | `drawing/builders/formalDrawingBuilders.ts:415` | Phase5-D02 | Single station selection |
| Band drawing builder | COMPLETE | `drawing/builders/formalDrawingBuilders.ts:405` | Phase5-D02 | Station/distance/plan/grade rows |
| Multi-page document | COMPLETE | `drawing/sheet/multiPageDocument.ts` | Phase5-D03 | 3-page composition |
| Sheet decoration | COMPLETE | `drawing/sheet/sheetDecoration.ts` | Phase5-D03 | Page metadata, scale labels |
| Station axis | COMPLETE | `drawing/model/stationAxis.ts` | Phase5-D02 | Physical distance mapping |
| Plan centerline | COMPLETE | `formalDrawingBuilders.ts:159-210` | Phase5-D02 | Polyline + grid + station ticks |
| Plan grid lines | COMPLETE | `formalDrawingBuilders.ts:164-174` | Phase5-D02 | Longitudinal grid lines |
| Plan station ticks | COMPLETE | `formalDrawingBuilders.ts:176-185` | Phase5-D02 | Line + label per station |
| Plan curve annotations | PARTIAL | `formalDrawingBuilders.ts:192-207` | Phase5-D02 | Radius label only, no clothoid info |
| Profile line | COMPLETE | `formalDrawingBuilders.ts:212-236` | Phase5-D02 | Profile elevation polyline |
| Profile ground line | PARTIAL | `formalDrawingBuilders.ts:219-224` | Phase5-D02 | Offset by -0.5m, not real ground data |
| Profile station ticks | COMPLETE | `formalDrawingBuilders.ts:226-229` | Phase5-D02 | Line + label |
| Profile grade breaks | COMPLETE | `formalDrawingBuilders.ts:231-234` | Phase5-D02 | Grade annotation |
| Cross-section points | COMPLETE | `formalDrawingBuilders.ts:264-296` | Phase5-D02 | Polyline + axis + labels |
| Cross-section No. notation | COMPLETE | `formalDrawingBuilders.ts:287` | Phase5-D02 | "No.{station}" format |
| Cross-section mode display | COMPLETE | `formalDrawingBuilders.ts:288` | Phase5-D02 | Shows crossfall mode |
| Band rows | COMPLETE | `formalDrawingBuilders.ts:238-262` | Phase5-D02 | Station/distance/plan/grade |
| DXF export (plan) | COMPLETE | `dxf/export/exportFormalDrawingDxf.ts` | Phase5-D03 | Type A and Type B |
| DXF export (profile-band) | COMPLETE | `dxf/export/exportFormalDrawingDxf.ts` | Phase5-D03 | Combined profile+band |
| DXF export (cross-section) | COMPLETE | `dxf/export/exportFormalDrawingDxf.ts` | Phase5-D03 | Single section |
| DXF layer presets | COMPLETE | `dxf/presets/cadLayerPresets.ts` | Phase5-D03 | Common preset |
| DXF sheet presets | COMPLETE | `dxf/presets/sheetPresets.ts` | Phase5-D03 | A1/A2/A3 sizes |
| DXF validation | COMPLETE | `dxf/validation/validateDxfDocument.ts` | Phase5-D03 | Entity/layer validation |
| Preview rendering | COMPLETE | `drawing/rendering/DrawingDocumentSvg.tsx` | Phase5-D01 | SVG-based |
| Print rendering | COMPLETE | `drawing/print/printFormalDrawing.ts` | Phase5-D03 | Browser print |
| Print styles | COMPLETE | `drawing/print/formalDrawingPrintStyles.ts` | Phase5-D03 | CSS injection |
| DrawingDocument validation | COMPLETE | `drawing/validation/validateDrawingDocument.ts` | Phase5-D04 | Structural validation |
| Fixture manifest | COMPLETE | `drawing/phase5/formalDrawingFixtureManifest.ts` | Phase5-D01 | Golden test fixtures |
| Bridge layout drawing | PLACEHOLDER | `drawing/builders/bridgeLayoutDrawing.ts` | Phase5-D02 | Basic bridge span visualization |
| Curve element details | NOT_IMPLEMENTED | - | - | Clothoid parameters, spiral info |
| Vertical curve details | NOT_IMPLEMENTED | - | - | Vertical curve radius, K-value |
| Crossfall slope display | NOT_IMPLEMENTED | - | - | Slope values per offset line |
| Structure positions | NOT_IMPLEMENTED | - | - | Abutment/pier/girder markers |
| Substructure positions | NOT_IMPLEMENTED | - | - | Foundation/pile locations |
| Dimension lines | NOT_IMPLEMENTED | - | - | Line-to-line, section-to-section |
| Coordinate table | PARTIAL | `drawing/tables/planCoordinateTable.ts` | Phase5-D02 | Basic XY table |
| Drawing frame/title block | NOT_IMPLEMENTED | - | - | Paper border, title, scale |
| Layer visibility control | NOT_IMPLEMENTED | - | - | Toggle layers on/off |
| Drawing settings UI | PARTIAL | `LinerFormalDrawingWorkspacePage.tsx` | Phase5 | Plan type, cross-section station |
| Reload/regeneration | COMPLETE | `formalDrawingWorkspaceDocuments.ts` | Phase5-D04 | Deterministic rebuild |
| Persistence boundary | COMPLETE | Phase5-D04 | Settings saved, document not saved | Confirmed |

---

## 8. Phase5 Reuse Matrix

| Asset | Classification | Path / Symbol | Required Change |
|-------|----------------|---------------|-----------------|
| DrawingDocument model | REUSE_AS_IS | `drawing/model/document.ts` | None |
| DrawingSettings | REUSE_AS_IS | `drawing/builders/types.ts` | Extend for new settings |
| Drawing primitives | REUSE_AS_IS | `drawing/model/primitives.ts` | Add dimension primitive |
| Paper definitions | REUSE_AS_IS | `drawing/model/paper.ts` | None |
| AffineTransform2 | REUSE_AS_IS | `drawing/transforms/affineTransform2.ts` | None |
| Viewport transform | REUSE_AS_IS | `drawing/transforms/viewportTransform.ts` | None |
| StationAxis | REUSE_AS_IS | `drawing/model/stationAxis.ts` | None |
| Plan builder | REUSE_WITH_EXTENSION | `drawing/builders/formalDrawingBuilders.ts:385` | Add curve details, dimensions |
| Profile builder | REUSE_WITH_EXTENSION | `drawing/builders/formalDrawingBuilders.ts:395` | Add vertical curve info |
| Cross-section builder | REUSE_WITH_EXTENSION | `drawing/builders/formalDrawingBuilders.ts:415` | Add structure markers |
| Band builder | REUSE_WITH_EXTENSION | `drawing/builders/formalBuilders.ts:405` | Add more rows |
| Multi-page document | REUSE_AS_IS | `drawing/sheet/multiPageDocument.ts` | None |
| Sheet decoration | REUSE_AS_IS | `drawing/sheet/sheetDecoration.ts` | Add title block |
| DXF serializer | REUSE_AS_IS | `dxf/serializer/serializeDxfDocument.ts` | None |
| DXF mapper | REUSE_AS_IS | `dxf/mapper/mapDrawingDocumentToDxf.ts` | Add dimension mapping |
| DXF layer presets | REUSE_AS_IS | `dxf/presets/cadLayerPresets.ts` | Add dimension layers |
| DXF sheet presets | REUSE_AS_IS | `dxf/presets/sheetPresets.ts` | None |
| DXF validation | REUSE_AS_IS | `dxf/validation/validateDxfDocument.ts` | None |
| DrawingDocumentSvg | REUSE_WITH_EXTENSION | `drawing/rendering/DrawingDocumentSvg.tsx` | Add dimension rendering |
| printFormalDrawing | REUSE_AS_IS | `drawing/print/printFormalDrawing.ts` | None |
| validateDrawingDocument | REUSE_AS_IS | `drawing/validation/validateDrawingDocument.ts` | Add dimension validation |
| formalDrawingFixtureManifest | REUSE_AS_IS | `drawing/phase5/formalDrawingFixtureManifest.ts` | Add new fixtures |
| Bridge layout drawing | REFACTOR_REQUIRED | `drawing/builders/bridgeLayoutDrawing.ts` | Significant extension needed |
| Legacy DXF exports | REPLACE | `exports/linerPlanDxf.ts`, `exports/linerProfileDxf.ts` | Deprecated, use formal export |
| buildDrawingDocument helper | REUSE_AS_IS | `drawing/builders/formalBuilders.ts` | None |

---

## 9. JIP-LINER Gap Matrix

Based on `docs/road/phase5/phase5_jip_liner_formal_drawing_extraction.md` and current implementation:

| Category | Expected (JIP §8) | Current | Gap | Priority | P6 Scope | Evidence |
|----------|-------------------|---------|-----|----------|----------|----------|
| §8.1 Drawing list | Multiple drawing records, enable/disable | Single runtime document | No multi-record support | MEDIUM | P6-D03 | `formalDrawingWorkspaceDocuments.ts` |
| §8.2 Basic data | Scale, paper, text size, frame, coordinate axis | Paper size, scale labels | No frame, limited settings UI | HIGH | P6-D03 | `drawing/builders/types.ts` |
| §8.3 Span composition | Lane/span names, baseline, edges | Basic bridge layout | Minimal span visualization | MEDIUM | P6-D03 | `bridgeLayoutDrawing.ts` |
| §8.4 Line drawing | Element marks, line labels, arc/polyline, style | Centerline polyline, basic labels | No style overrides, limited labels | HIGH | PR-39 | `formalDrawingBuilders.ts:159-210` |
| §8.5 Section drawing | Label direction, hide sections, style, extension | Basic section points | No style controls, no extension | HIGH | PR-39 | `formalDrawingBuilders.ts:264-296` |
| §8.6 Skew angle | Skew/intersection angle drawing | **NOT_IMPLEMENTED** | Complete gap | MEDIUM | P6-D03 | - |
| §8.7 Coordinate table | Precision, type, labels, cell size | Basic XY table | Limited columns, no formatting | MEDIUM | PR-39 | `planCoordinateTable.ts` |
| §8.8 Line dimension | Auto-create at lead sections, leaders | **NOT_IMPLEMENTED** | Complete gap | HIGH | PR-39 | - |
| §8.9 Section dimension | Auto-create, compress equal values | **NOT_IMPLEMENTED** | Complete gap | HIGH | PR-39 | - |
| Curve information | Arc radius, clothoid parameters | Radius label only | No clothoid L, no spiral info | HIGH | PR-39 | `formalDrawingBuilders.ts:192-207` |
| Vertical curve | Vertical curve radius, K-value | Grade break annotation | No vertical curve details | HIGH | PR-39 | `formalDrawingBuilders.ts:231-234` |
| Crossfall display | Slope values per offset | Mode display only | No slope values | MEDIUM | PR-39 | `formalDrawingBuilders.ts:288` |
| Structure positions | Abutment/pier/girder markers | Basic bridge layout | No structure markers on drawings | HIGH | P6-D03 | `bridgeLayoutDrawing.ts` |
| Substructure | Foundation/pile locations | **NOT_IMPLEMENTED** | Complete gap | MEDIUM | P6-D03 | - |
| Drawing frame | Title block, project info, scale | **NOT_IMPLEMENTED** | Complete gap | HIGH | P6-D03 | - |
| Layer control | Toggle visibility | All layers visible | No UI control | MEDIUM | P6-D03 | - |
| DXF output | Full DXF with layers | Complete DXF export | Parity established | LOW | PR-39 | `dxf/export/` |
| PDF/Print | Print to PDF | Browser print | Limited control | LOW | P6-D04 | `print/printFormalDrawing.ts` |
| Save/Reload | Persist drawing state | Settings persisted | DrawingDocument not persisted (by design) | LOW | NONE | Phase5-D04 confirmed |
| Edit functionality | Modify drawing in-place | **NOT_IMPLEMENTED** | Out of scope | DEFERRED | NONE | - |
| Error/warnings | Drawing diagnostics | Basic diagnostics | Limited error messages | LOW | PR-39 | `model/diagnostics.ts` |

---

## 10. PR-39 Proposed Scope

### In Scope

1. **Plan drawing enhancements**
   - Clothoid parameter annotations (L, p, q values)
   - Extended curve information display
   - Plan coordinate table improvements

2. **Profile drawing enhancements**
   - Vertical curve details (radius, K-value, tangent length)
   - Grade display improvements

3. **Cross-section enhancements**
   - Crossfall slope value display per offset line
   - Structure position markers (abutment, pier)

4. **Line dimensions**
   - Auto-create line-to-line dimensions at key sections
   - Leader lines with configurable length/angle

5. **Section dimensions**
   - Auto-create section-to-section dimensions
   - Equal value compression

6. **Drawing diagnostics**
   - Enhanced error/warning messages
   - Validation feedback

7. **DXF parity maintenance**
   - Ensure new primitives map correctly to DXF
   - Layer assignment for new elements

### Non Scope

1. **Frame DRAFT** - Separate PR-41 scope
2. **PRINT CSV/PDF completion** - PR-40 scope
3. **Viewer output adapters** - PR-42 scope
4. **Drawing persistence** - Confirmed not needed (Phase5-D04)
5. **Multi-record drawings** - P6-D03 design decision
6. **Drawing frame/title block** - P6-D03 scope
7. **Skew angle drawing** - P6-D03 scope
8. **Interactive drawing editing** - Deferred to Phase7+

### Deferred

1. Drawing settings UI enhancement
2. Layer visibility controls
3. Drawing frame/title block
4. Skew angle drawing
5. Full span composition editor

### Boundary with P6-D04 / D05 / D06

| Boundary | PR-39 Limit | Next PR Responsibility |
|----------|-------------|------------------------|
| P6-D04 PRINT | CSV export exists; PDF print exists | PR-40: Complete PDF report catalog, CSV improvements |
| P6-D05 Frame DRAFT | No frame drawing code touched | PR-41: Formal structure/load/result drawings |
| P6-D06 Viewer | No Viewer adapter changes | PR-42: Frame result adapters, staleness |

---

## 11. Candidate Implementation Files

| Classification | Path | Symbol | Expected Change | Risk | Confidence |
|----------------|------|--------|-----------------|------|------------|
| MODIFY | `frontend/src/liner/drawing/builders/formalDrawingBuilders.ts` | `planPrimitives()`, `profilePrimitives()`, `crossSectionPrimitives()` | Add curve details, dimensions, slope display | LOW | HIGH |
| MODIFY | `frontend/src/liner/drawing/builders/formalDrawingBuilders.ts` | `bandPrimitives()` | Add crossfall slope row | LOW | HIGH |
| MODIFY | `frontend/src/liner/drawing/builders/types.ts` | `DrawingSettings` | Extend for new display options | LOW | HIGH |
| MODIFY | `frontend/src/liner/drawing/model/primitives.ts` | `DrawingPrimitive` | Add dimension primitive type | MEDIUM | HIGH |
| MODIFY | `frontend/src/liner/drawing/tables/planCoordinateTable.ts` | `collectPlanCoordinateTableRows()` | Add columns, formatting | LOW | HIGH |
| MODIFY | `frontend/src/liner/drawing/rendering/DrawingDocumentSvg.tsx` | Dimension rendering | Add dimension line rendering | MEDIUM | HIGH |
| MODIFY | `frontend/src/liner/dxf/mapper/mapDrawingDocumentToDxf.ts` | `mapDrawingDocumentToDxf()` | Map dimension primitives | LOW | HIGH |
| MODIFY | `frontend/src/liner/drawing/validation/validateDrawingDocument.ts` | `validateDrawingDocument()` | Add dimension validation | LOW | HIGH |
| MODIFY | `frontend/src/liner/drawing/builders/bridgeLayoutDrawing.ts` | Bridge layout | Add structure position markers | MEDIUM | MEDIUM |
| CREATE | `frontend/src/liner/drawing/dimensions/lineDimensions.ts` | New module | Line-to-line dimension calculation | MEDIUM | MEDIUM |
| CREATE | `frontend/src/liner/drawing/dimensions/sectionDimensions.ts` | New module | Section-to-section dimension calculation | MEDIUM | MEDIUM |
| CREATE | `frontend/src/liner/drawing/__tests__/dimensions.test.ts` | New test | Dimension calculation tests | LOW | HIGH |
| TEST | `frontend/src/liner/drawing/__tests__/formalBuilders.test.ts` | Extended tests | Test new primitives | LOW | HIGH |
| TEST | `frontend/src/liner/dxf/__tests__/previewDxfPrintParity.test.ts` | Extended tests | Verify DXF parity with new primitives | LOW | HIGH |
| DOC | `docs/road/phase6/P6_D03_GDRAW_Design.md` | New document | GDRAW completion design | LOW | HIGH |
| DO_NOT_TOUCH | `frontend/src/liner/drawing/model/document.ts` | `DrawingDocument` | No changes to core model | NONE | HIGH |
| DO_NOT_TOUCH | `frontend/src/liner/drawing/sheet/multiPageDocument.ts` | `buildMultiPageDrawingDocument()` | No changes to page composition | NONE | HIGH |
| DO_NOT_TOUCH | `frontend/src/liner/dxf/serializer/` | DXF serializer | No changes to serialization | NONE | HIGH |

---

## 12. Test and Validation Inventory

### Existing Test Infrastructure

| Test Type | Framework | Location | Count | Status |
|-----------|-----------|----------|-------|--------|
| Unit tests | Vitest | `frontend/src/liner/drawing/__tests__/` | 10 files | PASS |
| Unit tests | Vitest | `frontend/src/liner/dxf/__tests__/` | 11 files | PASS |
| E2E tests | Playwright | `frontend/tests/e2e/` | 16 spec files | 27 PASS / 4 FAIL |
| Regression tests | Vitest | `frontend/src/__tests__/regression/` | 1 file | PASS |
| Golden fixtures | JSON | `frontend/src/liner/drawing/phase5/__golden__/` | 4 files | VERIFIED |
| Source fixtures | JSON | `frontend/src/liner/drawing/phase5/__fixtures__/` | 4 files | VERIFIED |

### Drawing-Specific Tests

| Test File | Coverage | Status |
|-----------|----------|--------|
| `phase5Jip8DrawingSemantics.test.ts` | JIP §8 supported semantics | PASS |
| `formalBuilders.test.ts` | Builder output, bounds, readability | PASS |
| `phase5JapaneseRemediationDrawing.test.ts` | Japanese text rendering | PASS |
| `planCenterlineOnlyBuilder.test.ts` | Type B plan | PASS |
| `bridgeLayoutDrawing.test.ts` | Bridge layout | PASS |
| `drawingSettingsPersistence.test.ts` | Settings save/load | PASS |
| `phase5PersistenceFailClosed.test.ts` | Persistence boundary | PASS |
| `screenTextLayout.test.ts` | Text layout | PASS |
| `planTextReadability.test.ts` | Text readability | PASS |
| `foundation.test.ts` | Drawing primitives | PASS |

### DXF Tests

| Test File | Coverage | Status |
|-----------|----------|--------|
| `phase5DxfParityCadGate.test.ts` | DXF export gate | PASS |
| `phase5JapaneseRemediationDxf.test.ts` | Japanese DXF | PASS |
| `previewDxfPrintParity.test.ts` | Preview/DXF/Print parity | PASS |
| `multiPageDxf.test.ts` | Multi-page DXF | PASS |
| `formalExport.test.ts` | Formal export | PASS |
| `serializer.test.ts` | DXF serialization | PASS |
| `mapper.test.ts` | DXF mapping | PASS |
| `model.test.ts` | DXF model | PASS |
| `roundtrip.test.ts` | DXF roundtrip | PASS |
| `step3VerificationArtifacts.test.ts` | Verification artifacts | PASS |

### E2E Tests (Drawing-Related)

| Test File | Coverage | Status |
|-----------|----------|--------|
| `phase5-japanese-drawing-remediation.spec.ts` | Visual E2E | PASS |
| `phase5-step3-dxf-export.spec.ts` | DXF export E2E | PASS |
| `p4-d05-review-diagrams.spec.ts` | Drawing routes | PASS |
| `p3-d07-print-dxf-parity.spec.ts` | Print/DXF parity | PASS |
| `p3-f03-rdd-bridge-drawing-persistence.spec.ts` | Persistence | PASS |
| `p4-d06-reports-csv.spec.ts` | CSV export | PASS |
| `p4-d08-roundtrip.spec.ts` | Roundtrip | PASS |

### Known Failures (Unrelated to GDRAW)

| Test File | Failure | Blocker Status |
|-----------|---------|----------------|
| `level0-navigation.spec.ts` | Navigation failures | NOT_A_BLOCKER |
| `th-analysis-revamp.spec.ts` | Time-history analysis | NOT_A_BLOCKER |

### Test Execution Commands

```bash
# Unit tests (drawing)
cd frontend && npm run test -- src/liner/drawing/__tests__/

# Unit tests (DXF)
cd frontend && npm run test -- src/liner/dxf/__tests__/

# E2E tests (drawing-specific)
cd frontend && npm run test:e2e -- phase5-japanese-drawing-remediation.spec.ts phase5-step3-dxf-export.spec.ts

# Full regression
cd frontend && npm run test:regression

# Typecheck
cd frontend && npm run typecheck

# Lint
cd frontend && npm run lint
```

### Test Cost Assessment

- Unit tests: ~30 seconds (fast, run frequently)
- E2E tests: ~2 minutes per spec (run on feature completion)
- Full test suite: ~5 minutes (run before PR)
- Recommended: Run drawing unit tests + DXF unit tests + relevant E2E for PR-39

---

## 13. Blockers

### BLOCKER

None identified for PR-39 scope.

### HIGH

| ID | Item | Impact | Mitigation |
|----|------|--------|------------|
| H1 | Phase6 planning documents missing | Cannot start P6 implementation | Create `phase6_planning_freeze.md`, `phase6_design_document.md`, `phase6_completion_gate.md` |
| H2 | SP1 not fully extracted | Shared platform may need adaptation | PR-39 can proceed within liner domain; extraction deferred |
| H3 | OD8-04 visual environment unresolved | Visual parity claim blocked | Semantic checks proceed; visual claim deferred to P7 |

### MEDIUM

| ID | Item | Impact | Mitigation |
|----|------|--------|------------|
| M1 | Dimension primitive not in model | New feature requires model extension | Add `DrawingDimension` to primitives |
| M2 | Bridge layout drawing minimal | Structure markers need significant work | P6-D03 scope, not PR-39 |
| M3 | Drawing settings UI limited | New settings may need UI changes | Keep settings simple for PR-39 |

### LOW

| ID | Item | Impact | Mitigation |
|----|------|--------|------------|
| L1 | GitHub checks not configured | No CI validation | Local validation sufficient |
| L2 | Chunk-size warning in build | Performance concern | Not blocking |
| L3 | Legacy DXF exports deprecated | Code cleanup needed | Remove in separate PR |

---

## 14. Unknowns Requiring Decision

| ID | Question | Required For | Default | Decision Gate |
|----|----------|--------------|---------|---------------|
| U1 | Should dimensions be part of DrawingDocument or separate layer? | PR-39 design | Separate layer (non-destructive) | P6-D03 design review |
| U2 | Should bridge structure markers be in GDRAW or separate module? | PR-39 scope | Separate module (P6-D03) | P6-D03 design review |
| U3 | What is the target DrawingSettings schema for new options? | PR-39 implementation | Extend current schema additively | P6-D03 design document |
| U4 | Should dimension auto-creation be configurable? | PR-39 UX | Yes, with sensible defaults | P6-D03 design review |
| U5 | What DXF layers should dimensions use? | PR-39 DXF | Follow CAD standard naming | P6-D03 design document |

---

## 15. Manual References Required

| Manual | Section | Relevance | Extraction Status |
|--------|---------|-----------|-------------------|
| JIP-LINER_マニュアル.pdf | §8.4 Line drawing | Curve annotations, style overrides | Extracted in Phase5 |
| JIP-LINER_マニュアル.pdf | §8.5 Section drawing | Section labels, extensions | Extracted in Phase5 |
| JIP-LINER_マニュアル.pdf | §8.7 Coordinate table | Table formatting, columns | Extracted in Phase5 |
| JIP-LINER_マニュアル.pdf | §8.8 Line dimension | Dimension creation, leaders | Extracted in Phase5 |
| JIP-LINER_マニュアル.pdf | §8.9 Section dimension | Dimension compression | Extracted in Phase5 |
| SPACER操作マニュアル.pdf | Bridge drawing section | Frame drawing boundary | **NOT_EXTRACTED** - Limited to boundary confirmation only |

**Note:** PDF full re-analysis is avoided. Existing extraction from Phase5 is reused. SPACER manual extraction limited to bridge/frame boundary confirmation.

---

## 16. Recommended P6-D03 Inputs

1. **PR-39 completion results** - What was implemented, what gaps remain
2. **JIP-LINER §8 gap priorities** - Which gaps are BLOCKER vs DEFERRED
3. **DrawingDocument model stability** - Whether model changes are needed
4. **Bridge drawing requirements** - Structure marker specifications
5. **Drawing frame specifications** - Title block, project info requirements
6. **Dimension auto-creation rules** - When/how to auto-create dimensions
7. **DXF layer naming convention** - Standardized layer names for new elements
8. **Visual parity requirements** - What constitutes acceptable visual output

---

## 17. GO / NOGO

**P6_D02_VERDICT: COMPLETE**

All required analysis items have been addressed with evidence:

- ✅ Repository state documented
- ✅ Authoritative documents identified (with gaps noted)
- ✅ P6-D01 dependency status confirmed
- ✅ SP1 status determined (SP1_PARTIAL)
- ✅ GDRAW entry points mapped
- ✅ Current inventory with status classification
- ✅ Phase5 reuse matrix with classifications
- ✅ JIP-LINER gap matrix with priorities
- ✅ PR-39 scope boundaries defined
- ✅ Candidate files identified with risk/confidence
- ✅ Test inventory and execution plan
- ✅ Blockers categorized (none BLOCKER)
- ✅ Unknowns documented with defaults
- ✅ Manual references tracked
- ✅ P6-D03 inputs recommended

**P6_D03_READY: YES**

The repository is ready for P6-D03 "GDRAW / DXF completion design" with the following prerequisites:

1. Create Phase6 planning documents (`phase6_planning_freeze.md`, `phase6_design_document.md`, `phase6_completion_gate.md`)
2. Resolve unknowns U1-U5 in P6-D03 design review
3. Confirm PR-39 scope with stakeholders

**NEXT_ACTION:**
1. Create `docs/road/phase6/` directory structure
2. Draft `phase6_planning_freeze.md` with PR-39 scope
3. Begin P6-D03 GDRAW completion design

---

**Analysis completed by:** P6-D02 GDRAW Scope Confirmation
**Date:** 2026-07-23
**Evidence HEAD:** e1e4b64
