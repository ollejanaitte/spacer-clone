# Bridge Frame Analysis Tool

**Authority:** NAVIGATION
**Status:** ACTIVE

This is the canonical documentation entry point for the Bridge Frame Analysis Tool. Current capability is governed by [Stage 5](../scoping/stage5_frame_analysis_scope.md). Target ownership, data contracts, gaps, and acceptance are governed by [Stage 6-10](../planning/stage6-10/README.md). `BridgeFrameAnalysisDocument` is the target Frame source of truth.

## Design Areas

| Area | Scope |
| --- | --- |
| [Contracts](contracts/README.md) | Legacy wire/API references and current feature schemas, distinct from target documents/results |
| [Analysis](analysis/README.md) | Static, influence/live-load, modal, spectrum, envelope, and time-history references |
| [Modeler](modeler/README.md) | Legacy mixed BridgeProject, wizard, and FEM generator evidence |
| [Viewer](viewer/README.md) | Presentation and interaction; Viewer is not formal Frame.DRAFT |
| [Output](output/README.md) | Current report/drawing references; PRINT and DRAFT remain Stage-governed |
| [UI](ui/README.md) | Frame UI and runtime workflow references |
| [Verification](verification/README.md) | Current procedures and constraints; Stage 8 governs target acceptance |

## Baseline Modules

| Module | Current/target navigation |
| --- | --- |
| CONTROL | Current PARTIAL and target gaps: [Stage 5](../scoping/stage5_frame_analysis_scope.md), [Stage 10](../planning/stage6-10/stage10_gap_migration_sequence.md) |
| STATICS | [Analysis](analysis/README.md), [Modeler](modeler/README.md); springs, releases, rigid offsets, loads, and combinations remain Stage-governed |
| INFLOAD | [Influence and live-load references](analysis/README.md); current single-point MVP is not full INFLOAD |
| R-SPECTRUM | [Eigen and response-spectrum references](analysis/README.md) |
| PRINT | [Output references](output/README.md); current output is partial |
| DRAFT | [Output references](output/README.md); formal DRAFT is distinct from Viewer |

Time-history is indexed as an existing extension. It is not relabeled as one of these six baseline modules, and its current persistence does not establish the target result-resource contract.

## Governing Boundaries

- [Current capability crosswalk](current-capability.md)
- [Gap and acceptance crosswalk](gap-and-acceptance.md)
- [Target responsibility matrix](../planning/stage6-10/responsibility_matrix.md)
- [Target data model](../planning/stage6-10/target_data_model.md)
- [Verification and acceptance](../planning/stage6-10/stage8_verification_plan.md)
- [Gap and migration sequence](../planning/stage6-10/stage10_gap_migration_sequence.md)
- Road-to-Frame navigation: [../transfer/README.md](../transfer/README.md)
- Transfer topic crosswalk: [../transfer/contract-index.md](../transfer/contract-index.md)
- [Retained Frame history](../history/frame/README.md)

## Related Indexes

- [Road Design Tool](../road/README.md)
- [Architecture crosswalk](../architecture/README.md)
- [Documentation home](../README.md)
