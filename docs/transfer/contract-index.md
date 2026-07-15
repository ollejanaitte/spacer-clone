# Road-to-Frame Contract Index

**Authority:** NAVIGATION / NON-NORMATIVE CROSSWALK
**Status:** ACTIVE

The formal accepted target contract remains [Road-to-Frame Contract](../planning/stage6-10/road_to_frame_contract.md). This index defines no schema field, default, migration rule, acceptance value, or decision.

`RoadDesignDocument` and `BridgeFrameAnalysisDocument` remain separate systems of record. The immutable package and append-only record connect revisions without permitting direct mutation of the other product document.

## Authority and Systems of Record

`RoadDesignDocument` owns the exported Road revision; `BridgeFrameAnalysisDocument` owns accepted Frame revisions and mechanics; the immutable package and append-only record connect revisions without creating shared mutable truth.

- [Contract status and boundary](../planning/stage6-10/road_to_frame_contract.md#status-and-boundary)
- [Contract roles](../planning/stage6-10/road_to_frame_contract.md#contract-roles)
- [RoadDesignDocument](../planning/stage6-10/target_data_model.md#roaddesigndocument)
- [BridgeFrameAnalysisDocument](../planning/stage6-10/target_data_model.md#bridgeframeanalysisdocument)
- [RoadToFrameTransferPackage and TransferRecord](../planning/stage6-10/target_data_model.md#roadtoframetransferpackage-and-transferrecord)
- [Responsibility rules and mutation boundary](../planning/stage6-10/responsibility_matrix.md)
- [Accepted decisions D6-01 and D6-04](../planning/stage6-10/decision_log.md)

## Contract Topic Crosswalk

| Topic | Governing section | Related decision/status source |
| --- | --- | --- |
| Package role, identity, version, checksum, and capabilities | [Contract Roles](../planning/stage6-10/road_to_frame_contract.md#contract-roles), [Package Envelope](../planning/stage6-10/road_to_frame_contract.md#package-envelope), [Common Envelope](../planning/stage6-10/target_data_model.md#common-envelope), [Schema Version and Migration](../planning/stage6-10/target_data_model.md#schema-version-and-migration) | [D6-04, D7-02, D7-03, D7-07](../planning/stage6-10/decision_log.md) |
| CoordinateContext | [Coordinate and Unit Contract](../planning/stage6-10/road_to_frame_contract.md#coordinate-and-unit-contract), [CoordinateContext](../planning/stage6-10/target_data_model.md#coordinatecontext) | [D6-06, D7-06](../planning/stage6-10/decision_log.md), [OD6-01](../planning/stage6-10/open_decisions.md) |
| UnitContext | [Coordinate and Unit Contract](../planning/stage6-10/road_to_frame_contract.md#coordinate-and-unit-contract), [UnitContext](../planning/stage6-10/target_data_model.md#unitcontext) | [D6-06](../planning/stage6-10/decision_log.md), [OD8-01](../planning/stage6-10/open_decisions.md) |
| Stable Road geometry IDs and Frame IDs | [ID, Revision, and Provenance Contract](../planning/stage6-10/road_to_frame_contract.md#id-revision-and-provenance-contract), [Product and Platform Ownership](../planning/stage6-10/responsibility_matrix.md#product-and-platform-ownership) | [D6-07, D7-06](../planning/stage6-10/decision_log.md), [OD6-02](../planning/stage6-10/open_decisions.md) |
| Source revision, checksum, lineage, and provenance | [Package Envelope](../planning/stage6-10/road_to_frame_contract.md#package-envelope), [ID, Revision, and Provenance Contract](../planning/stage6-10/road_to_frame_contract.md#id-revision-and-provenance-contract), [RevisionMetadata and References](../planning/stage6-10/target_data_model.md#revisionmetadata-and-references) | [D6-08, D7-02, D7-08](../planning/stage6-10/decision_log.md) |
| TransferRecord, mapping, history, and audit | [TransferRecord](../planning/stage6-10/road_to_frame_contract.md#transferrecord), [History and Rollback](../planning/stage6-10/road_to_frame_contract.md#history-and-rollback), [target model](../planning/stage6-10/target_data_model.md#roadtoframetransferpackage-and-transferrecord) | [D7-08](../planning/stage6-10/decision_log.md) |
| Compatibility, raw preservation, unknowns, and migration | [Compatibility policy and matrices](../planning/stage6-10/compatibility_matrix.md), [Unknown Fields and Raw Preservation](../planning/stage6-10/target_data_model.md#unknown-fields-and-raw-preservation), [Schema Version and Migration](../planning/stage6-10/target_data_model.md#schema-version-and-migration) | [D7-04, D7-05, D7-06](../planning/stage6-10/decision_log.md), [OD9-01, OD10-01](../planning/stage6-10/open_decisions.md) |

OPEN identifiers above are status pointers only. Their questions, defaults, evidence, owners, and gates remain solely in [Open Decisions](../planning/stage6-10/open_decisions.md).

## Transfer and Non-Transfer Boundary

| Concern | Governing source |
| --- | --- |
| Transferable Road-owned geometry and candidates | [Transferable Geometry and Candidates](../planning/stage6-10/road_to_frame_contract.md#transferable-geometry-and-candidates), [Product and Platform Ownership](../planning/stage6-10/responsibility_matrix.md#product-and-platform-ownership) |
| Prohibited authoritative Frame or session data | [Prohibited Transfer](../planning/stage6-10/road_to_frame_contract.md#prohibited-transfer), [Mutation Boundary](../planning/stage6-10/responsibility_matrix.md#mutation-boundary) |

Road geometry and regions are candidates or references only where the formal contract says so. Frame-owned mechanics, analysis data, results, and session state remain governed by the formal ownership and prohibited-transfer sections.

## Import, Re-import, and Apply Lifecycle

| Lifecycle concern | Governing section |
| --- | --- |
| Initial import, preflight, and preview | [First Import](../planning/stage6-10/road_to_frame_contract.md#first-import) |
| Re-import, accepted baseline, and three-way diff | [Re-import and Three-Way Diff](../planning/stage6-10/road_to_frame_contract.md#re-import-and-three-way-diff) |
| Conflict classification and Frame-edit preservation | [Re-import and Three-Way Diff](../planning/stage6-10/road_to_frame_contract.md#re-import-and-three-way-diff) |
| Partial acceptance and dependency closure | [Partial Acceptance](../planning/stage6-10/road_to_frame_contract.md#partial-acceptance) |
| Overwrite protection and target revision preconditions | [Overwrite Protection](../planning/stage6-10/road_to_frame_contract.md#overwrite-protection) |
| Stale, tampered, unsupported, and unknown inputs | [Stale, Tampered, and Unsupported Inputs](../planning/stage6-10/road_to_frame_contract.md#stale-tampered-and-unsupported-inputs) |
| Append-only history and rollback | [History and Rollback](../planning/stage6-10/road_to_frame_contract.md#history-and-rollback) |

[Stage 10 Phase P3 and PR-15 through PR-20](../planning/stage6-10/stage10_gap_migration_sequence.md) govern implementation sequence only. Preview/diff is not apply; a changed target precondition returns the workflow to preview/diff. No lifecycle step mutates Road or the package. Exact behavior remains defined by the formal contract.

## Compatibility and Migration Navigation

- [Governing Policy and Legacy Layer Matrix](../planning/stage6-10/compatibility_matrix.md)
- [Migration Pipeline](../planning/stage6-10/compatibility_matrix.md#migration-pipeline)
- [Preservation Classification](../planning/stage6-10/compatibility_matrix.md#preservation-classification)
- [Entry, Exit, Rollback, and Retention](../planning/stage6-10/compatibility_matrix.md#entry-exit-rollback-and-retention)
- [Stage 10 migration and compatibility sequence](../planning/stage6-10/stage10_gap_migration_sequence.md)
- [Open source-specific and retention decisions](../planning/stage6-10/open_decisions.md)

Legacy ProjectModel, BridgeProject, BridgeDefinition, LINER direct mapping, and current adapters are compatibility inputs or evidence. They are not relabeled in place as target documents or packages. This index makes no claim that a legacy source class is currently safe to apply.

## Verification and Gates

| Evidence scope | Governing source |
| --- | --- |
| Contract, schema, and ownership preconditions | [Stage 8 verification plan](../planning/stage6-10/stage8_verification_plan.md), [G0](../planning/stage6-10/risks_and_gates.md#acceptance-gates) |
| Legacy migration and compatibility | [Stage 8 M8](../planning/stage6-10/stage8_verification_plan.md), [G2](../planning/stage6-10/risks_and_gates.md#acceptance-gates) |
| Road-to-Frame transaction behavior | [T8-01 through T8-13](../planning/stage6-10/stage8_verification_plan.md), [G3](../planning/stage6-10/risks_and_gates.md#acceptance-gates) |
| Persistence, fault, audit, and recovery | [Stage 8 N8](../planning/stage6-10/stage8_verification_plan.md), [G7](../planning/stage6-10/risks_and_gates.md#acceptance-gates) |
| Coordinate, unit, ID, and tolerance evidence | [Stage 8](../planning/stage6-10/stage8_verification_plan.md), [applicable open decisions](../planning/stage6-10/open_decisions.md) |

See also [formal acceptance traceability](../planning/stage6-10/road_to_frame_contract.md#acceptance-traceability) and [Stage 10 P3 readiness](../planning/stage6-10/stage10_gap_migration_sequence.md). Current regression tests do not constitute target G3 completion.

## Accepted Decisions and Open Items

Accepted decision groups in the [Decision Log](../planning/stage6-10/decision_log.md):

- Systems of record and package boundary: D6-01, D6-04, D6-05, D6-12
- Coordinate, ID, revision, diff/apply, stale, and rollback: D6-06 through D6-11
- Versioning, raw preservation, migration, package profile, and record: D7-02 through D7-08

OPEN status groups in [Open Decisions](../planning/stage6-10/open_decisions.md):

- Apply/source blockers: OD6-01, OD6-02, OD9-01, OD10-01
- Transfer tolerance/performance release evidence: OD8-01, OD8-03
- Compatibility/legacy contraction only: OD6-04, OD10-02

OD6-03 is resolved by D7-07. This index changes no scope, owner, evidence requirement, default, or gate in the governing open-decision record.

## Product and Legacy Navigation

- [Road Design Tool](../road/README.md)
- [Bridge Frame Analysis Tool](../frame/README.md)
- [Legacy Road integration evidence](../road/legacy-integration/README.md)
- [Legacy mixed Frame modeler evidence](../frame/modeler/README.md)
- [Architecture crosswalk](../architecture/README.md)
