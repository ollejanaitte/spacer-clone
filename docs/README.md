# Documentation

このディレクトリは `spacer-clone` の詳細ドキュメント置き場です。GitHub の入口は [README.md](../README.md)、公開向けアーキテクチャ概要は [ARCHITECTURE.md](../ARCHITECTURE.md)、今後の計画は [ROADMAP.md](../ROADMAP.md) を参照してください。

**Authority:** NAVIGATION
**Status:** ACTIVE
**Governing baselines:** [scoping/README.md](scoping/README.md) (CURRENT FACT), [planning/stage6-10/README.md](planning/stage6-10/README.md) (TARGET DECISION / PLAN)

## Authority Hierarchy

Documentation authority is **temporal**, not a single winner-takes-all priority between the two baselines:

- **CURRENT FACT** ([scoping/](scoping/README.md)) governs claims about the **current implementation** at the stated scoping baseline.
- **TARGET DECISION / PLAN** ([planning/stage6-10/](planning/stage6-10/README.md)) governs **future** target design, ownership, contracts, acceptance, migration, and decision IDs.
- Neither overwrites the other: do not rewrite current facts from target design, and do not rewrite target decisions from current implementation.

Supporting classes (subordinate to the baselines above):

| Class | Location | Use |
| --- | --- | --- |
| ACTIVE REFERENCE | Product design indexes below | Detailed design / algorithm reference (not implementation truth) |
| HISTORICAL | [history/](history/README.md) and phase / handover / PR notes | Delivery evidence; not automatic current requirements or target truth |
| FUTURE PROPOSAL | Untracked `docs/bridge-modeler-v2/**` | Excluded; never current fact or target authority |

長い Stage 表はここへ複製しません。Governance details: [development/documentation-governance.md](development/documentation-governance.md)

## Product Entry Points

| Product / boundary | Index | Current fact (1 hop) | Target decision (1 hop) |
| --- | --- | --- | --- |
| Road Design Tool | [road/README.md](road/README.md) | [scoping/stage4_road_design_scope.md](scoping/stage4_road_design_scope.md) | [planning/stage6-10/stage6_target_architecture.md](planning/stage6-10/stage6_target_architecture.md) |
| Bridge Frame Analysis Tool | [frame/README.md](frame/README.md) | [scoping/stage5_frame_analysis_scope.md](scoping/stage5_frame_analysis_scope.md) | [planning/stage6-10/stage6_target_architecture.md](planning/stage6-10/stage6_target_architecture.md) |
| Road-to-Frame transfer | [transfer/README.md](transfer/README.md) | [scoping/responsibility_split.md](scoping/responsibility_split.md) | [planning/stage6-10/road_to_frame_contract.md](planning/stage6-10/road_to_frame_contract.md) |

Target rule: `RoadDesignDocument` and `BridgeFrameAnalysisDocument` are separate sources of truth. Road-to-Frame uses an immutable versioned transfer package. Direct mutation of the other product’s authoritative document is forbidden in the target design. Viewer is not formal Frame.DRAFT.

## Recommended Reading

1. [../README.md](../README.md) — project overview and how to run
2. [scoping/README.md](scoping/README.md) — CURRENT FACT baseline
3. [planning/stage6-10/README.md](planning/stage6-10/README.md) — TARGET DECISION / PLAN
4. [road/README.md](road/README.md) and [frame/README.md](frame/README.md) — product maps
5. [transfer/README.md](transfer/README.md) — integration boundary
6. [architecture/README.md](architecture/README.md) — architecture crosswalk
7. [development/README.md](development/README.md) — contributor / docs governance
8. [development/quality-gates.md](development/quality-gates.md) — PR quality criteria

## Documentation Map

| Area | Location | Authority / note |
| --- | --- | --- |
| Public overview | [../README.md](../README.md) | Public entry |
| Architecture overview | [../ARCHITECTURE.md](../ARCHITECTURE.md) | Public summary; detail via [architecture/](architecture/README.md) |
| Roadmap | [../ROADMAP.md](../ROADMAP.md) | Public summary; target sequence via Stage 10 |
| Contribution | [../CONTRIBUTING.md](../CONTRIBUTING.md) | Development participation |
| Current facts | [scoping/](scoping/README.md) | CURRENT FACT |
| Target decisions | [planning/stage6-10/](planning/stage6-10/README.md) | TARGET DECISION / PLAN |
| Road product | [road/](road/README.md) | ACTIVE REFERENCE with design, UI, output, verification, and legacy-integration indexes |
| Frame product | [frame/](frame/README.md) | ACTIVE REFERENCE with contracts, analysis, modeler, Viewer, output, UI, and verification indexes |
| Transfer boundary | [transfer/](transfer/README.md) | Navigation to formal contract |
| Architecture crosswalk | [architecture/](architecture/README.md) | CURRENT vs TARGET map |
| Development | [development/](development/README.md) | OPERATIONAL |
| Manual | [manual/](manual/README.md) | User docs (many manuals still future work) |
| Images | [images/](images/README.md) | Shared media |
| History | [history/](history/README.md) | Canonical HISTORICAL index for relocated evidence; other historical material may remain in topic directories |
| Legacy LINER namespace | [liner/README.md](liner/README.md) | Compatibility index and required redirect stubs only |
| Legacy MVP specs | [architecture/](architecture/README.md) and [frame/](frame/README.md) | SEMANTIC REFERENCE / LEGACY MVP — not Stage 6-10 target contracts |
| Legacy Frame paths | [design/](design/README.md), [verification/](verification/README.md) | Required redirect stubs only; canonical navigation is [frame/](frame/README.md) |
| Roadmap compatibility | [roadmap/](roadmap/README.md) | Redirect to retained history; Stage 10 governs target sequence |
| FUTURE PROPOSAL (excluded) | `docs/bridge-modeler-v2/**` | Untracked; do not treat as authority |

## Legacy MVP Specs (reference only)

これらの文書は元 MVP / 現行モジュール参照です。目標契約は Stage 6-10 が支配します。

| Document | Role |
| --- | --- |
| [legacy-mvp-scope.md](architecture/legacy-mvp-scope.md) | Original MVP scope |
| [legacy-mvp-architecture.md](architecture/legacy-mvp-architecture.md) | Original MVP architecture |
| [04_input_schema.md](frame/contracts/04_input_schema.md) | Legacy `project.json` input schema |
| [05_analysis_engine_spec.md](frame/analysis/05_analysis_engine_spec.md) | Linear static engine behavior |
| [06_result_schema.md](frame/contracts/06_result_schema.md) | Legacy analysis result JSON |
| [07_api_spec.md](frame/contracts/07_api_spec.md) | Legacy FastAPI contract |
| [08_ui_spec.md](frame/ui/08_ui_spec.md) | Legacy React UI specification |
| [09_3d_view_spec.md](frame/viewer/09_3d_view_spec.md) | Viewer / fallback (Viewer ≠ formal DRAFT) |
| [10_report_spec.md](frame/output/10_report_spec.md) | Report output reference |
| [11_test_spec.md](frame/verification/11_test_spec.md) | Original verification cases |
| [quality-gates.md](development/quality-gates.md) | PR acceptance criteria |

## Runtime and Packaging

- [runtime-ubuntu.md](development/runtime-ubuntu.md)
- [packaging-windows.md](development/packaging-windows.md)
- [../desktop/electron/README.md](../desktop/electron/README.md)
- [development/README.md](development/README.md)

## Documentation Maintenance

- Follow [development/documentation-governance.md](development/documentation-governance.md).
- Validate with [development/documentation-validation.md](development/documentation-validation.md).
- Do not duplicate long Stage 0–10 tables; link the governing baseline.
- Historical notes stay evidence; promote durable decisions only when a governing Stage decision exists.
- Do not edit, adopt, or index untracked `docs/bridge-modeler-v2/**` as current/target authority.
