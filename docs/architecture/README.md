# Architecture

**Authority:** NAVIGATION
**Status:** ACTIVE
**Governing CURRENT FACT:** [../scoping/architecture_current.md](../scoping/architecture_current.md)
**Governing TARGET DECISION:** [../planning/stage6-10/stage6_target_architecture.md](../planning/stage6-10/stage6_target_architecture.md)

公開向け概要は [../../ARCHITECTURE.md](../../ARCHITECTURE.md) です。このディレクトリは現行事実と目標アーキテクチャの横断インデックスです。Stage 表や決定本文は複製しません。

## Authority Crosswalk

| Concern | CURRENT FACT | TARGET DECISION / PLAN | Legacy / semantic reference |
| --- | --- | --- | --- |
| System architecture | [Current architecture](../scoping/architecture_current.md) | [Target architecture](../planning/stage6-10/stage6_target_architecture.md) | [Legacy MVP architecture](legacy-mvp-architecture.md) |
| Shared platform / contracts | [../scoping/stage0-3_system_fact.md](../scoping/stage0-3_system_fact.md) | [../planning/stage6-10/stage7_shared_platform_and_contracts.md](../planning/stage6-10/stage7_shared_platform_and_contracts.md) | — |
| Product / ownership split | [../scoping/responsibility_split.md](../scoping/responsibility_split.md) | [../planning/stage6-10/responsibility_matrix.md](../planning/stage6-10/responsibility_matrix.md) | — |
| Target data model | [System facts](../scoping/stage0-3_system_fact.md) | [Target data model](../planning/stage6-10/target_data_model.md) | [Legacy input schema](../frame/contracts/04_input_schema.md), [legacy result schema](../frame/contracts/06_result_schema.md) |
| Compatibility / migration | [../scoping/feature_gap_matrix.md](../scoping/feature_gap_matrix.md) | [../planning/stage6-10/compatibility_matrix.md](../planning/stage6-10/compatibility_matrix.md), [../planning/stage6-10/stage10_gap_migration_sequence.md](../planning/stage6-10/stage10_gap_migration_sequence.md) | — |
| Accepted decisions | — | [../planning/stage6-10/decision_log.md](../planning/stage6-10/decision_log.md), [../planning/stage6-10/open_decisions.md](../planning/stage6-10/open_decisions.md) | — |
| Road Design Tool | [../scoping/stage4_road_design_scope.md](../scoping/stage4_road_design_scope.md) | Stage 6–10 via [../road/README.md](../road/README.md) | [../liner/README.md](../liner/README.md) |
| Bridge Frame Analysis Tool | [Frame Stage 5](../scoping/stage5_frame_analysis_scope.md) | Stage 6–10 via [Frame index](../frame/README.md) | [Legacy design paths](../design/README.md), MVP `05`–`10` specs |
| Road-to-Frame boundary | [Current responsibility split](../scoping/responsibility_split.md) | [Target transfer contract](../planning/stage6-10/road_to_frame_contract.md) via [Transfer index](../transfer/README.md) | [Legacy integration](../road/legacy-integration/integration_with_frame_model.md), [legacy mapping](../road/legacy-integration/frame_model_mapping.md) (superseded for target write model) |

## Non-negotiable Target Boundaries

- `RoadDesignDocument` and `BridgeFrameAnalysisDocument` remain separate sources of truth.
- Road-to-Frame uses an explicit immutable versioned transfer package; see [../transfer/README.md](../transfer/README.md).
- Direct mutation of the other product’s authoritative document is forbidden in the target design.
- Viewer is not formal Frame.DRAFT.
- Untracked `docs/bridge-modeler-v2/**` is FUTURE PROPOSAL only.

## Related Indexes

- [Authority and evolution](authority-and-evolution.md) — current/target/history crosswalk
- [Architecture decisions](decisions/README.md) — D6-D10 and OD6-OD10 topic index
- [../README.md](../README.md) — docs home
- [../planning/stage6-10/README.md](../planning/stage6-10/README.md) — Stage 6–10 index
- [../scoping/README.md](../scoping/README.md) — Stage 0–5 index
- [../development/documentation-governance.md](../development/documentation-governance.md) — authority rules
