# Stage 6-10 Target Architecture and Implementation Plan

## Purpose

This directory fixes the target architecture, data boundaries, verification strategy, asset
disposition, migration plan, and implementation order for two top-level products:

- Road Design Tool
- Bridge Frame Analysis Tool

It is a design and planning baseline. It does not claim that target documents, transfer contracts,
migrations, missing features, or release gates are implemented.

## Authority Labels

| Source | Authority | Allowed use |
|---|---|---|
| [`docs/scoping/`](../../scoping/README.md) | **CURRENT FACT** | Evidence about the implementation at `21c8a93c41533f78c66c021db84931cd3aaed5db` |
| LINER/SPACER manuals | **SEMANTIC REFERENCE** | Feature names, processing units, workflows, and benchmark candidates |
| This directory | **TARGET DECISION / PLAN** | Future ownership, contracts, acceptance, migration, and sequence |
| Legacy design/handover and uncommitted future proposals | **HISTORICAL / FUTURE PROPOSAL** | Re-evaluation input only; never current fact or automatic target authority |

Where these sources disagree, current behavior is described only by `docs/scoping/`; future behavior
is governed by accepted decisions in this directory. Manual or proposal text must not be copied into
implementation requirements without an explicit decision and verification path.

## Product Boundary

```text
EngineeringProject (reference container)
  roadDesign       -> RoadDesignDocument revision
  frameAnalyses[]  -> BridgeFrameAnalysisDocument revisions
  transferRecords[]-> TransferRecord revisions

RoadDesignDocument --immutable RoadToFrameTransferPackage--> BridgeFrameAnalysisDocument
                     preview/diff/conflict/apply
                     append-only TransferRecord
```

The two documents are independent sources of truth. `EngineeringProject` stores references and
project-level metadata, not copied road/frame domain truth. Road-to-Frame carries road-owned geometry
and placement candidates; it never transfers materials, stiffness, support mechanics, FEM numbering,
analysis cases/results, or Viewer state.

## Stage Verdicts

| Stage | Verdict | Readiness to continue | Primary result |
|---|---|---|---|
| 6 | `COMPLETE` | `READY_FOR_STAGE7: YES` | Product, source-of-truth, transfer, coordinate/unit/ID/revision boundary |
| 7 | `COMPLETE` | `READY_FOR_STAGE8: YES` | Shared platform, target contracts, compatibility and migration boundary |
| 8 | `COMPLETE` | `READY_FOR_STAGE9: YES` | O1-O6 oracles, benchmark/acceptance matrices, G0-G7 |
| 9 | `COMPLETE` | `READY_FOR_STAGE10: YES` | Current-to-target asset disposition and Bridge Modeler split |
| 10 | `COMPLETE` | `IMPLEMENTATION_READINESS: CONDITIONAL_GO` | Gaps, P0-P8, PR-00..47, workstreams, rollback and gates |

## Implementation Readiness

`CONDITIONAL_GO` is scope-specific:

| Scope | Readiness |
|---|---|
| Phase 0 contracts, architecture guards, raw fixture infrastructure | `GO` |
| Legacy readers, aliases, quarantine, dry-run migration | `CONDITIONAL_GO`, non-destructive exposure only |
| Production target writer | `CONDITIONAL_GO` after `OD10-01`, G2 and relevant G7 |
| Affected legacy migration commit | `NO_GO` until `OD6-01`, `OD6-02`, and `OD9-01` pass per source class |
| Transfer contract and preview | `GO` after IF0/IF1 |
| Transfer apply | `NO_GO` until source gates, IF2, and G3 pass |
| Road/frame implementation | `CONDITIONAL_GO` after IF0/IF1; release only per feature gate |
| Reports/drawings | `NO_GO` until authoritative inputs/results and G6 |
| Production Autosave | `NO_GO` until P7/G7 and performance/persistence decisions |
| Legacy contraction | `NO_GO` until P8 retention, telemetry, migration, and restore evidence |

## Phase Index

| Phase | Purpose | Exit |
|---|---|---|
| P0 | Data boundary and contracts | IF0 / G0 |
| P1 | Compatibility, migration, target persistence, result binding | IF1 / G2 and relevant G7 |
| P2 | Neutral shared platform mechanisms | SP1 / G0 and semantic G6 foundation |
| P3 | Road-to-Frame package, preview, diff, apply, record, rollback | IF2 / G3 per source class |
| P4 | Road design feature slices | G1 per capability, G3/G6 where applicable |
| P5 | Frame analysis feature slices and persisted results | IF3 / G4/G5 per capability |
| P6 | GDRAW, PRINT, formal DRAFT, Viewer/output adapters | G6 per output/platform |
| P7 | Performance, recovery, concurrency, optional Autosave | G7 |
| P8 | Evidence-based legacy contraction without deletion | Policy approval plus G2/G7 |

## Document Index

| Document | Contents |
|---|---|
| [stage6_target_architecture.md](./stage6_target_architecture.md) | Two-product architecture, source of truth, target responsibility, transfer and routes |
| [stage7_shared_platform_and_contracts.md](./stage7_shared_platform_and_contracts.md) | Shared kernel/platform, target contracts, migration and compatibility |
| [stage8_verification_plan.md](./stage8_verification_plan.md) | O1-O6, tolerances, R8/F8/T8/M8/O8/N8, G0-G7 and traceability |
| [stage9_asset_mapping.md](./stage9_asset_mapping.md) | Required seven-column asset mapping, Bridge split, test/docs disposition |
| [stage10_gap_migration_sequence.md](./stage10_gap_migration_sequence.md) | 46 ten-column gaps, P0-P8, PR-00..47, parallel plan and readiness |
| [road_to_frame_contract.md](./road_to_frame_contract.md) | Package, record, fields, forbidden transfer, import/re-import/apply semantics |
| [target_data_model.md](./target_data_model.md) | Conceptual target documents, envelopes, references, version/checksum/unknown migration |
| [responsibility_matrix.md](./responsibility_matrix.md) | Road/frame/shared/integration/legacy ownership and forbidden mutation |
| [compatibility_matrix.md](./compatibility_matrix.md) | Legacy layers, routes, read-old/write-target, quarantine, retention and rollback |
| [implementation_dependency_graph.md](./implementation_dependency_graph.md) | Critical path, interface freezes, PR groups and parallel workstreams |
| [decision_log.md](./decision_log.md) | Accepted D6-D10 decisions with required decision metadata |
| [open_decisions.md](./open_decisions.md) | Major open decisions with owner, evidence, gate, and default |
| [risks_and_gates.md](./risks_and_gates.md) | P0-P3 risk register, G0-G7, rollback triggers and release rules |

## Non-Goals and Safety

- No source, UI, Solver, schema, migration, route, test, dependency, lockfile, snapshot, feature flag,
  Autosave, or real data was changed by this planning change.
- `docs/scoping/` and pre-existing proposal material are unchanged.
- Read old, write target, and never dual-write ordinary state.
- Preserve raw input and unknown fields before parse/migration.
- Coordinate/ID/ambiguous-field uncertainty fails closed.
- Rollback creates or reselects valid revisions; it does not erase raw input or audit history.
- No current asset is removed by this plan.

## Evidence Baseline

Target decisions were supervised against `21c8a93c41533f78c66c021db84931cd3aaed5db`, the merge commit
of PR #140. The Stage 0-5 facts and Stage 6-10 reports were reviewed at that same source baseline.
Implementation must revalidate facts and rerun applicable gates when the source baseline changes.
