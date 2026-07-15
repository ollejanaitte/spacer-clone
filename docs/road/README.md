# Road Design Tool

**Authority:** NAVIGATION
**Status:** ACTIVE
**Current fact:** [`../scoping/stage4_road_design_scope.md`](../scoping/stage4_road_design_scope.md)
**Target decisions:** [`../planning/stage6-10/README.md`](../planning/stage6-10/README.md)

This is the canonical documentation entry point for the Road Design Tool. `RoadDesignDocument` is the target source of truth. Road and Frame documents remain separate; exchange occurs through the versioned [Road-to-Frame contract](../transfer/README.md).

## Design Areas

| Area | Scope |
| --- | --- |
| [Design](design/README.md) | Geometry, stationing, profile, calculation, validation, and performance references |
| [UI](ui/README.md) | Road editing, preview, state, and interaction references |
| [Output](output/README.md) | Drawing, DXF, CAD, and report references |
| [Verification](verification/README.md) | Geometry and output verification plans |
| [Legacy integration](legacy-integration/README.md) | Compatibility evidence for prior persistence and direct frame-generation designs |

## Governing Boundaries

- [Current capability crosswalk](current-capability.md)
- Current road capability facts: [`../scoping/stage4_road_design_scope.md`](../scoping/stage4_road_design_scope.md)
- Target responsibility split: [`../planning/stage6-10/responsibility_matrix.md`](../planning/stage6-10/responsibility_matrix.md)
- Target data model: [`../planning/stage6-10/target_data_model.md`](../planning/stage6-10/target_data_model.md)
- Transfer contract: [`../planning/stage6-10/road_to_frame_contract.md`](../planning/stage6-10/road_to_frame_contract.md)
- Transfer topic crosswalk: [../transfer/contract-index.md](../transfer/contract-index.md)
- Retained road history: [`../history/road/`](../history/road/)
- Legacy path compatibility: [`../liner/README.md`](../liner/README.md)

## Related Products

- [Bridge Frame Analysis Tool](../frame/README.md)
- [Architecture crosswalk](../architecture/README.md)
- [Documentation home](../README.md)
