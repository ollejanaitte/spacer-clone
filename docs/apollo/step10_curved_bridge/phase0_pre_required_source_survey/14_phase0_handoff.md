# Phase 0 Handoff: Pre-Required Source Survey to Phase 0

This document defines the handoff from Phase 0-PRE (current survey) to Phase 0 (formal curved bridge implementation).

## 1. Phase 0-PRE Accomplishments

- Surveyed spacer-clone repository for curved bridge capability
- Created repository capability inventory (`01_repository_curved_capability_inventory.md`)
- Created required source categories (`02_required_source_categories.md`)
- Created requirement documents (03-09)
- Created existing source inventory (`10_existing_source_inventory.md`)
- Created missing source register (`11_missing_source_register.md`)
- Created user search guide (`12_user_search_guide.md`)
- Created scope progression analysis (`13_scope_progression_by_source_availability.md`)
- Created handoff documents (this file and `handoff/integration_plan.md`)

## 2. P0 Missing Sources (User Must Search)

List all 9 P0 sources from the missing source register with search keywords.

## 3. P1 Missing Sources (User Should Search)

List all 5 P1 sources.

## 4. Capabilities Ready for Phase 0 (No Sources Required)

- Curved alignment input UI
- Curved girder line visualization
- Non-numeric curved bridge validation
- Curved bridge 3D preview / STL
- Curved bridge model save/load
- Zero-curvature straight bridge regression
- Curved bridge schema definition

## 5. Phase 0 Code Re-verification Checklist

When Phase 0 starts, re-verify:

- [ ] `frontend/src/liner/core/geometry/arc.ts` - circular arc represents curvature with sign
- [ ] `frontend/src/liner/core/geometry/clothoid.ts` - clothoid curvature interpolation
- [ ] `frontend/src/liner/core/geometry/horizontal.ts` - alignment evaluation, validation
- [ ] `frontend/src/liner/core/coordinate3d.ts` - station/offset to 3D
- [ ] `frontend/src/liner/core/vector.ts` - `localFrameFromAzimuth`, `offsetPoint`
- [ ] `frontend/src/liner/core/bridge/` - `pierLineGeometry`, `bridgeLayoutEvaluation`
- [ ] `frontend/src/liner/core/grid/` - `gridGeneration`, `crossfallResolution`
- [ ] `frontend/src/liner/core/types.ts` - `GridPointResult`, `LocalFrame`, `PierResult`, etc.
- [ ] `frontend/src/liner/schema/types.ts` - `HorizontalElementDraft`, `PierDraft`, `CrossBeamDraft`
- [ ] `frontend/src/apollo/` - continuous girder patterns
- [ ] `frontend/src/apollo/export/apolloStlExport.ts` - STL export pattern
- [ ] `frontend/src/viewer/` - 3D visualization patterns
- [ ] `docs/frame/analysis/` - influence line, moving load design
- [ ] `examples/` - verification patterns

## 6. Source Re-scan Procedure

When new sources are found:

1. Update `10_existing_source_inventory.md` with source details
2. Update `11_missing_source_register.md` (move from MISSING to AVAILABLE)
3. Update `missing_source_register.csv` status
4. Update `13_scope_progression_by_source_availability.md` (update readiness)
5. Update `14_phase0_handoff.md` (update GO/NO-GO conditions)
6. Re-evaluate GO/NO-GO for each phase

## 7. GO Conditions for Phase 0

- Repository inventory complete: **YES**
- Missing source register complete: **YES**
- Non-numeric geometry readiness: **GO_NO_NUMERIC_GEOMETRY_READINESS**
- Non-numeric model readiness: **GO_WITH_RESTRICTIONS**
- Analysis readiness: **BLOCKED_ANALYSIS** (until sources found)
- Design check readiness: **BLOCKED_DESIGN_CHECK** (until sources found)
- Report readiness: **BLOCKED_REPORT** (until sources found)
- Drawing readiness: **BLOCKED_DRAWING** (until sources found)

## 8. NO-GO Conditions

- If repository is found to have curved bridge features that contradict this survey → re-survey
- If `spacer-clone` repository is modified during the search → restart survey
- If user cannot find ANY P0 sources → consider reducing scope to non-numeric geometry only
- If user finds that 6DOF solver is fundamentally insufficient for curved bridges → reconsider analysis approach