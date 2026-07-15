# Stage 10: Gap Closure, Migration, and Implementation Sequence

> **Authority:** Target implementation plan. It authorizes Phase 0 and explicitly non-destructive
> preparation only under `CONDITIONAL_GO`; it does not enable migration, transfer apply, Autosave,
> legacy contraction, or any product capability by itself.

Generated: 2026-07-15 (Asia/Tokyo)
Evidence HEAD: 21c8a93c41533f78c66c021db84931cd3aaed5db

1. Executive Summary

Stage 10 converts the decided architecture, contracts, verification strategy, and asset disposition
into an implementation sequence. The critical path is fixed:

  Data boundary
    -> coordinate/unit/stable-ID/revision/checksum contracts
    -> compatibility, raw preservation, migration, target persistence, redirects
    -> shared platform extraction
    -> Road-to-Frame package/record/diff/apply
    -> road feature slices and frame feature slices
    -> reports/drawings
    -> performance/recovery/autosave release hardening
    -> evidence-based legacy contraction

P0 work is in Phase 0/1. Source-of-truth boundaries, coordinate and ID fail-closed rules, raw and
unknown-field preservation, atomic target persistence, legacy redirects, result persistence/binding,
and Road-to-Frame overwrite protection are explicit gaps and exit gates. Autosave remains disabled
until target persistence, recovery fault injection, result validity, and G7 budgets pass. Legacy
compatibility is read-old/write-target with no dual write; no legacy REMOVE or branch deletion is
planned.

Implementation readiness is not uniform:

- Foundation contracts, fixtures, architecture guards, and raw-quarantine infrastructure: GO.
- Legacy read adapters, redirect registry, dry-run migration, and target-writer development:
  CONDITIONAL_GO behind non-destructive exposure.
- Affected legacy migration commit and Road-to-Frame apply: NO_GO until OD6-01 coordinate,
  OD6-02 stable ID, and OD9-01 ambiguous legacy classification gates pass.
- Road/frame feature implementation: CONDITIONAL_GO after interface/migration freezes; release is
  NO_GO until each Stage 8 gate passes.
- Reports/drawings, production performance, visual acceptance, Autosave, and legacy contraction:
  NO_GO until their upstream contracts/features and G6/G7/open evidence pass.

Overall implementation readiness is CONDITIONAL_GO: begin Phase 0 and non-destructive portions of
Phase 1 now; do not enable migration/apply/release behavior prematurely.

2. Scope

IN:
- Final Gap Matrix for road, frame, shared platform, compatibility, transfer, outputs, and NFR.
- Migration and backward-compatibility plans with read-old/write-target/no-dual-write rules.
- Implementation dependency graph and interface-freeze gates.
- Phase 0-8 roadmap with purpose, scope, dependencies, deliverables, tests, migration, acceptance,
  rollback, PR breakdown, parallel workstream, and exit gate.
- Reviewable PR slices, parallel ownership/merge order, acceptance and rollback plans.
- Scope-specific and overall implementation readiness.

OUT:
- Source/schema/test/dependency/route/feature implementation.
- Exact release calendar, named human assignees, or unsupported numerical/performance thresholds.

3. Inputs Reviewed

Accepted Stage inputs:
- [Stage 6 target architecture](./stage6_target_architecture.md): products, SoT, transfer, contexts.
- [Stage 7 shared platform and contracts](./stage7_shared_platform_and_contracts.md): contracts,
  shared boundaries, unknown handling, migration, and compatibility.
- [Stage 8 verification plan](./stage8_verification_plan.md): O1-O6, tolerance governance,
  R8/F8/T8/M8/O8/N8, and G0-G7.
- [Stage 9 asset mapping](./stage9_asset_mapping.md): SPLIT/MOVE/DEPRECATE and legacy disposition.
- [decision log](./decision_log.md) through D9-14.
- [open decisions](./open_decisions.md) through the Stage 9 update.

Repository fact inputs remain the Stage 0-5 `docs/scoping/**` freeze at HEAD
21c8a93c41533f78c66c021db84931cd3aaed5db. No new implementation fact or proposal body is introduced
in Stage 10.

4. Current Facts Used

CF10-01. Target EngineeringProject, RoadDesignDocument, BridgeFrameAnalysisDocument,
RoadToFrameTransferPackage, TransferRecord, and raw-preserving migration do not exist.

CF10-02. Current ProjectModel/BridgeProject/BridgeDefinition persistence and direct generators do not
provide independent document revisions, three-way transfer, conflict protection, or atomic rollback.

CF10-03. Coordinate authority and stable legacy IDs remain P0 open gates. BridgeProject lines and
arbitrary BridgeDefinition params remain P1 ambiguous; guessing is prohibited.

CF10-04. Existing road core algorithms and frame numerical algorithms are reusable candidates, but
multiple alignment/branch/merge/widening and many road/frame modules are absent/partial.

CF10-05. Result persistence is inconsistent: time-history has a persisted path, most runtime results
are transient, and no target checksum binding/staleness policy is implemented.

CF10-06. Existing route aliases are incomplete before root dispatch; legacy direct links require an
early registry before canonical entries can safely replace them.

CF10-07. Autosave is not enabled as a complete product capability. Atomic target persistence,
recovery, migration, and result validity are prerequisites, not work to combine into one feature PR.

CF10-08. Stage 8 tolerance values, SPACER/independent corpus, performance budgets, and visual
environment remain open. Each blocks only its affected acceptance/release claim.

CF10-09. Stage 9 approved no REMOVE and no wholesale REWRITE. Legacy raw input, readers, schemas,
fixtures, routes, and rollback controls remain until evidence-based contraction.

5. Decisions

D10-01 | DECIDED | Nine ordered implementation phases
Decision: Phase 0 data/contracts; P1 compatibility/migration/persistence; P2 shared platform;
P3 Road-to-Frame; P4 road features; P5 frame features; P6 output; P7 hardening/autosave; P8 legacy
contraction. Rationale: downstream features must not create new persistence/integration debt.
Impact: critical-path PR dependencies are mandatory. Compatibility: legacy read remains early.
Verification: phase exit gates G0-G7. Revisit by splitting phases, not bypassing order.

D10-02 | DECIDED | Conditional overall GO and scoped readiness
Decision: GO for foundation; conditional for non-destructive compatibility/shared/feature development;
NO_GO for affected migration/apply/releases until their gates. Rationale: design is complete but P0
legacy evidence and implementation do not exist. Impact: Phase 0 begins without enabling target
mutation. Compatibility: no old writer is disabled. Verification: readiness matrix. Revisit after
each interface/gate record, not by blanket readiness promotion.

D10-03 | DECIDED | Phase 0 freezes SoT and contract interfaces
Decision: freeze document ownership, envelope/reference, coordinate/unit, stable ID, revision/
provenance/checksum, validation, and dependency direction before target persistence or transfer.
Rationale: these are P0 and affect every migration. Impact: additive schemas/contracts and tests,
no production write exposure. Compatibility: legacy remains untouched. Verification: G0/IF0.
Revisit encoded fields by versioned change only.

D10-04 | DECIDED | Read-old/write-target with atomic migration, never dual write
Decision: preserve raw before parse, classify/migrate a copy, validate, commit target docs and records
atomically, and leave legacy source unchanged. Rationale: D7/D9 and P0 data-loss risk. Impact: target
writer and legacy reader are separate PRs. Compatibility: explicit export only. Verification: M8/N8
G2/G7. Revisit: dual write rejected.

D10-05 | DECIDED | Open legacy gates block apply, not foundations
Decision: OD6-01/02 and OD9-01 block affected migration commit/transfer apply, but not contract,
fixture, raw quarantine, reader, preview, or diagnostic implementation. Rationale: useful safe work
can proceed fail-closed. Impact: capability/status is explicit. Compatibility: preview/quarantine
available. Verification: M8-10/T8 and gate record. Revisit when evidence resolves each source class.

D10-06 | DECIDED | Result persistence precedes output and Autosave
Decision: implement versioned frame result resources bound to model/load/solver/schema checksums in
P1; integrate new analyses in P5. Stale results cannot render/export as authoritative. Autosave stays
off until P7 atomic recovery passes. Rationale: result/data corruption is P0. Impact: output depends
on validity service. Compatibility: legacy transient results get no lossless claim. Verification:
M8-11/N8-01/02/05 G2/G7. Revisit storage backend only.

D10-07 | DECIDED | Transfer preview precedes atomic apply
Decision: package schema/serialization and preview/dry-run land before diff/conflict/apply. Apply
requires IF0/IF1, resolved source gates, dependency closure, overwrite protection, TransferRecord,
and rollback. Rationale: avoids exposing unsafe mutation. Impact: feature exposure is staged.
Compatibility: direct generators remain comparison-only. Verification: T8/G3. Revisit only with
equivalent transaction guarantees.

D10-08 | DECIDED | Road and frame workstreams cannot bypass critical path
Decision: road/frame feature teams may prepare fixtures/algorithms after IF0, but target integration
merges only after IF1 and relevant shared/transfer interfaces. Rationale: parallel speed cannot create
shadow schemas or adapters. Impact: interface owners approve imports/contracts. Compatibility: old
paths remain isolated. Verification: architecture/contract checks. Revisit merge order, not gates.

D10-09 | DECIDED | Small PRs separate contract, adapter, test, and feature exposure
Decision: no PR combines schema introduction, legacy dual behavior, migration cutover, and user
feature. Each PR records dependency, change area, tests/gate, rollback, and exposure. Rationale:
reviewability and reversible rollout. Impact: PR-00 through PR-47 plan. Compatibility: flags are
rollback/exposure only, not dual-write. Verification: PR checklist. Revisit by splitting further.

D10-10 | DECIDED | Reports/drawings follow authoritative domain results
Decision: GDRAW/PRINT/DRAFT and Viewer release after Road/Frame documents/results are stable; shared
Drawing/DXF/render mechanisms may land earlier. Rationale: output cannot be the source of truth.
Impact: P6 depends on P4/P5 and G6. Compatibility: current outputs remain until replacements pass.
Verification: O8/G6. Revisit individual output sequence only.

D10-11 | DECIDED | Autosave is last-write feature, not persistence foundation
Decision: keep Autosave disabled until manual target save, atomic recovery, migration, result binding,
conflict policy, performance and recovery tests pass. Enable behind independent exposure control.
Rationale: automatic frequency increases corruption/conflict blast radius. Impact: PR-44 depends on
P1/P3/P7 gates. Compatibility: manual save remains rollback. Verification: N8/G7. Revisit only after
evidence, never by default-on migration.

D10-12 | DECIDED | Rollback creates/reselects valid states, never erases history
Decision: additive contract PRs disable exposure; migration/apply rollback uses new inverse revisions
or restores manifest references with preconditions; solver/output rolls back implementation while
invalidating incompatible results; Autosave rolls back to manual save. Rationale: audit and no data
loss. Impact: every phase/PR has rollback. Compatibility: raw source and records persist.
Verification: M8/T8/N8. Revisit only with stronger event-store semantics.

D10-13 | DECIDED | Legacy contraction is evidence-only and non-destructive
Decision: P8 may disable normal writes/entries after usage, retention, migration and rollback evidence;
read adapters and aliases remain by default. REMOVE and branch deletion are outside the plan.
Rationale: OD6-04 and D9-14. Impact: no cleanup on critical path. Compatibility: re-enable route/
legacy-only writer for unmigrated source if approved. Verification: G2/G7 and policy record.
Revisit only through a separate removal decision.

6. Recommended Items

R10-01 | RECOMMENDED | Use interface freeze records `IF0` (target contracts), `IF1` (migration/
persistence), `IF2` (transfer), and `IF3` (result/output) with schema hashes and owner approvals.

R10-02 | RECOMMENDED | Maintain a machine-readable gap/PR/gate manifest so CI can reject a feature
PR whose dependency or acceptance suite is absent.

R10-03 | RECOMMENDED | Use additive feature exposure controls per target capability. Controls must
not choose between two writers for the same document during ordinary operation.

R10-04 | RECOMMENDED | Assign named humans before implementation starts, but preserve role ownership
and merge order in this plan if staffing changes.

7. Open Decisions

Critical carried gates:
- OD6-01 OPEN P0 coordinate authority: blocks affected G2/G3 apply, not P0/P1 scaffolding.
- OD6-02 OPEN P0 stable ID aliases: blocks affected G2/G3 apply.
- OD9-01 OPEN P1 ambiguous legacy lines/params: blocks affected G2/G3/G4 migration/apply.

Release-scoped carried items:
- OD6-04 OPEN P2 redirect retirement: blocks only alias removal/P8 contraction.
- OD8-01 OPEN P1 numeric tolerance values: blocks affected G1/G3/G4/G5 release.
- OD8-02 OPEN P1 independent/SPACER corpus: blocks parity/broad compatibility claim.
- OD8-03 OPEN P1 performance budgets: blocks performance G7 claim and Autosave production enable.
- OD8-04 OPEN P2 visual environments: blocks visual G6 release.
- OD9-02 OPEN P3 STL ownership: blocks disposition of that asset only.

OD10-01 | OPEN | P1 | Physical atomic persistence backend
Question: which implementation provides multi-document atomic commit/recovery for embedded archive,
local directory/database, and backend storage while preserving logical document references?
Default: target repository interface and in-memory/fault-injection implementation may proceed; no
production target writer or Autosave exposure until one backend passes N8-01/05.
Owner: storage/platform owner with migration owner.
Evidence: crash matrix, fsync/rename or database transaction semantics, cross-platform behavior,
backup/recovery, checksum verification, and performance baseline.
Decision gate: PR-07 production adapter, IF1, and G2/G7.

OD10-02 | OPEN | P1 | Legacy retention and normal-write disable policy
Question: what usage window, retention duration, migration success rate, rollback period, and support
policy allow each legacy writer/entry to contract?
Default: retain readers/raw/schemas/fixtures/aliases indefinitely; do not disable writes solely by
date; no REMOVE.
Owner: product/release/data-governance owners.
Evidence: telemetry or explicit inventory, migration outcomes, support policy, restore drill.
Decision gate: P8 PR-46/47 and any later removal proposal.

8. Main Matrices / Architecture

8.1 Final Gap Matrix

Gap ID | Current State | Target State | Priority | Dependencies | Migration Impact | Verification | Recommended Phase | Parallelizable | Blocker
S-001 | LINER/ProjectModel/BridgeProject/BD overlap | independent Road/Frame docs under EngineeringProject | P0 | D6-01,D7-02 | atomic split and no dual truth | M8-07,N8-01,G0/G2 | P0 | NO critical path | YES until IF0
S-002 | mixed/incomplete coordinates, Viewer transforms | explicit right-handed z-up CoordinateContext and m/rad UnitContext | P0 | S-001,OD6-01 | unknown legacy quarantines | R8,T8-01/02,M8-10,G0/G2/G3 | P0 | NO | OD6-01 for affected apply
S-003 | unstable/recreated/FEM IDs | road semantic IDs separate from FEM IDs and aliases | P0 | S-001,OD6-02 | collisions block; one-to-many recorded | T8-03/04,M8-05/10,G2/G3 | P0 | NO | OD6-02 for affected apply
S-004 | source hash only and mixed versions | independent revision/provenance/checksum lineage | P0 | S-001 | legacy hash seeds content checksum only | M8-01/06,N8-08,G0/G2 | P0 | YES after S-001 | NO
S-005 | fragmented diagnostics/validation | shared versioned ValidationResult and domain rules | P1 | S-002..004 | map legacy codes, preserve paths | F8-01,M8,T8,G0 | P0 | YES | NO
S-006 | strict schemas can reject/drop unknowns | raw bytes, unknown store, classification/quarantine | P0 | S-001,S-004 | preserve before parse | M8-01..05,G2 | P1 | NO | production backend OD10-01
S-007 | non-transactional/mixed saves | atomic target repository, recovery and manifest refs | P0 | S-001,S-004,S-006 | target commit leaves old source unchanged | M8-07/09,N8-01/05,G2/G7 | P1 | NO | OD10-01 for production
S-008 | legacy integer/string versions | per-contract SemVer and stepwise migration registry | P0 | S-004,S-006 | pure copy migration/idempotence | M8-02..06,G2 | P1 | YES after S-006 | NO
S-009 | generic/domain infrastructure mixed | neutral Drawing/DXF/file/log/history/table/migration platforms | P1 | IF0,dependency rules | facades preserve current callers | O8,N8,G0/G6 | P2 | YES | IF0
C-001 | root legacy redirects incomplete | pre-dispatch canonical/alias registry preserving deep links | P0 | D7-10 | aliases unchanged during cutover | M8-12,N8-06,G7 | P1 | YES | NO
C-002 | ProjectModel/Bridge/BD legacy writes | read-old/write-target, no dual write | P0 | S-006..008 | raw/read adapter and target-only writer | M8-06..10,N8-01,G2 | P1 | NO | IF1
C-003 | no evidence-based contraction | retained readers/aliases and gated normal-write disable | P2 | all migration/release evidence,OD10-02 | no deletion; rollback re-enables legacy entry | M8-12,N8-06/08,G7 | P8 | NO | OD6-04/OD10-02
C-004 | old save formats and browser/backend paths | target save/load plus explicit legacy import/export | P0 | S-006,S-007 | original unchanged, exact refs | M8,N8-01/05/06,G2/G7 | P1 | NO | OD10-01
T-001 | direct mappers/generators | immutable versioned RoadToFrameTransferPackage | P0 | IF0,S-002..005 | legacy adapter produces preview/capabilities | T8-01..05/12/13,G3 | P3 | NO | source gates for apply
T-002 | linerTrace/none | append-only TransferRecord/audit/mappings | P0 | T-001,S-004 | seed baseline without false history | T8-04/05/10/13,N8-08,G3 | P3 | YES after T-001 | NO
T-003 | no three-way diff/conflict | baseline/new/current ChangeSet and preserve-frame default | P0 | T-001,T-002 | prevents overwrite | T8-06..08,G3 | P3 | NO | IF2
T-004 | direct/full merge | dependency-closed atomic partial apply | P0 | T-003,S-007 | invalid selection commits none | T8-09/13,G3 | P3 | NO | OD6-01/02/OD9-01 affected
T-005 | no stale/rollback transaction | stale/unverified policy and inverse revision | P0 | T-002..004 | old records retained | T8-10/11,N8-08,G3/G7 | P3 | NO | IF2
T-006 | ambiguous Bridge lines/BD params | explicit classifier or quarantine | P1 | S-006,OD9-01 | no guessed package/load | M8-07/10,T8-08,G2/G3/G4 | P1/P3 | YES fixture work | OD9-01
R-001 | multiple alignment partial/schema only | multiple independent road alignments | P1 | IF0,road IDs | migrate road drafts without collision | R8-09,G1 | P4 | YES road lane | IF1
R-002 | branch/merge absent | versioned branch/merge topology and geometry | P1 | R-001,S-003 | new fields additive; legacy unaffected | R8-10,G1 | P4 | YES after R-001 | OD8-01 release
R-003 | widening incomplete | linear/quartic and transition widening | P1 | R-001,road geometry | preserve old offsets, explicit migration | R8-11,G1 | P4 | YES | OD8-01 release
R-004 | LDIST absent | distance/overhang module | P2 | bridge/girder geometry | none for old docs; new optional block | R8-12,G1 | P4 | YES | no foundation blocker
R-005 | HAUNCH absent | typed haunch calculation/regions | P2 | bridge/deck geometry,R-003 | optional new road block | R8-13,G1 | P4 | YES | tolerance/sample evidence release
R-006 | HOSO absent | typed pavement thickness/regions | P2 | profile/crossfall/bridge surface | optional new road block | R8-14,G1 | P4 | YES | tolerance/sample evidence release
R-007 | GDRAW partial | complete road/bridge formal drawings and DXF | P2 | S-009,R-001..006 | current output remains until G6 | R8-15,O8-01..05,G6 | P6 | YES after IR freeze | OD8-04 visual release
R-008 | TOOL absent | approved road calculator catalog | P2 | Shared units,road station/geometry | none; target-only optional tools | R8-16,G1 | P4 | YES | catalog/tolerance release
R-009 | Importer partial/strict 0.1 | reviewed target RoadDocument importer with raw/provenance | P1 | S-002/003/006..008 | atomic raw-preserving migration | R8-17,M8,G1/G2 | P4 | YES after IF1 | source coordinate/ID cases
R-010 | bridge geometry incomplete/mixed | road-owned abutment/pier/bearing lines/spans/girder/deck/regions | P1 | R-001..003,S-002/003 | field-classified Bridge/BD migration | R8-08/10/11,T8,M8,G1/G2/G3 | P4 | NO for transfer binding | OD9-01 affected
F-001 | CONTROL partial/orchestration in App | FrameDocument-aware run/validation/result lifecycle | P1 | IF0/IF1,result binding | legacy project run adapter retained | F8-01,N8-02,G4/G7 | P5 | YES frame lane | IF1
F-002 | springs absent | diagonal/coupled/node-member spring model/solver | P1 | F-001,runtime schema | old models unaffected | F8-06,G4 | P5 | YES | OD8-01 release
F-003 | member-end release absent | typed releases and assembly/recovery | P1 | F-001 | additive target field | F8-07,G4 | P5 | YES separate PR | OD8-01 release
F-004 | rigid offset absent | typed end offsets and transformed response | P1 | F-001,F-003 interfaces | additive target field | F8-08,G4 | P5 | YES after interface | OD8-01 release
F-005 | fixed load partial | complete declared fixed-load catalog | P1 | F-001,units | legacy loads migrate explicitly | F8-04/09,G4 | P5 | YES | catalog/tolerance release
F-006 | single-point moving-load MVP | full INFLOAD lanes/axles/vehicles/distribution | P1 | T-001 geometry refs,F-005 | legacy line loads classified/quarantine | F8-10..12,G5 | P5 | YES after interfaces | OD8-01/02 claim
F-007 | static combinations absent | signed factor combinations | P1 | F-001,F-005,result binding | legacy cases unchanged | F8-15,G4 | P5 | YES | NO implementation blocker
F-008 | envelope/max-min incomplete | signed extrema and governing provenance | P1 | F-006,F-007,result schema | new result resources | F8-16,G4/G5 | P5 | YES after inputs | NO
F-009 | most results transient/time-history special | versioned checksum-bound persisted results/staleness | P0 | S-004,S-007,IF1 | partial legacy results classified, no false recovery | M8-11,N8-01/02,G2/G7 | P1 then P5 | NO critical path | OD10-01 production
F-010 | PRINT partial; missing some result sections | complete versioned reports/CSV/PDF | P2 | F-008/F-009,S-009 | keep old output until G6 | F8-17,O8-06..08,G6 | P6 | YES | OD8-04 visual/OD8-01 numeric
F-011 | Viewer partial, formal DRAFT absent | formal structure/load/result/influence drawings | P1 | F-009,S-009 | Viewer remains separate | F8-18,O8-01..05/09/10,G6 | P6 | YES | OD8-04 visual
F-012 | validation fragmented | complete frame document/pre-run/result validation | P1 | S-005,F-001 | map legacy codes/paths | F8-01,G0/G4 | P0/P5 | YES | NO
F-013 | performance unqualified | measured budgets for large frame/live/dynamic workflows | P1 | implemented features | no schema migration | N8-04/07,G7 | P7 | YES measurement | OD8-03 release
F-014 | Autosave disabled/incomplete | opt-in atomic target autosave with recovery/conflict/result validity | P1 | S-007,T-003,F-009,NFR budgets | never writes legacy; manual save fallback | N8-01/02/05/07,G7 | P7 | NO | OD8-03,OD10-01
N-001 | road scale/performance unqualified | measured road/import/drawing budgets | P1 | P4/P6 features | none | N8-03/07,G7 | P7 | YES | OD8-03
N-002 | recovery incomplete across target workflows | crash-safe save/migrate/apply/autosave recovery | P0 | S-007,T-005 | preserves old/new complete states | N8-05/08,G7 | P1/P7 | NO | OD10-01
N-003 | visual environment unspecified | controlled fonts/DPI/PDF/CAD/Viewer matrix | P2 | P6 outputs | none | O8-03/05/07/10,G6 | P7 | YES | OD8-04

8.2 Implementation Dependency Graph

  [P0-A SoT/doc envelopes] ---> [P0-B coordinate/unit]
             |                         |
             +--> [P0-C ID/revision/checksum] --> [IF0 contract freeze]
                                                   |
                    +------------------------------+------------------+
                    v                                                 v
       [P1 raw/quarantine/version]                        [P2 shared primitives]
                    |
       [P1 legacy readers + target writer + redirects + result binding]
                    |
                 [IF1 migration/persistence freeze]
                    |
       [P3 package -> record -> preview -> diff/conflict -> atomic apply/rollback]
                    |
                 [IF2 transfer freeze]
                    |
          +---------+-------------------------+
          v                                   v
  [P4 Road features]                    [P5 Frame features]
          +------------------+----------------+
                             v
                    [IF3 result/output freeze]
                             |
                    [P6 GDRAW/PRINT/DRAFT]
                             |
                [P7 performance/recovery/autosave]
                             |
              [P8 evidence-based legacy contraction]

Hard blocks:
- OD6-01/02 and OD9-01 -> affected P1 migration commit and P3 apply only.
- OD8-01/02/03/04 -> corresponding release claims, not IF0/raw/quarantine development.
- OD10-01 -> production target writer, recovery, Autosave; repository interfaces/tests may proceed.

8.3 Phase Roadmap

Phase P0 - Data Boundary and Contract Foundation
Purpose: make ownership, identity, coordinates, versions, and dependency direction executable.
In Scope: EngineeringProject/document envelopes/references; Road/Frame skeleton schemas; Coordinate/
UnitContext; stable ID namespace/aliases; RevisionMetadata/provenance/checksum; ValidationResult;
architecture tests; raw fixture classification contracts.
Out of Scope: production writer, legacy migration commit, transfer apply, feature calculations.
Dependencies: D6-D9 only; no implementation phase.
Deliverables: versioned contract package, schemas/examples, interface-freeze IF0 record, negative
ownership/import tests, open-gate diagnostics.
Tests: schema/serialization/checksum/required-optional/forbidden-field and dependency tests; G0.
Migration: detect/classify fixtures only; no write or mutation.
Acceptance Criteria: G0 passes; exact schema hashes; OD6-01/02 unknown/collision states fail closed;
no road/frame direct mutation API.
Rollback: remove exposure/import usage or revert additive contract consumer; no data was written.
PR Breakdown: PR-00..04.
Parallel Workstream: WS-A contracts and WS-F verification; other teams prepare fixtures only.
Exit Gate: IF0 approved by architecture, road, frame, migration, and verification owners.

Phase P1 - Compatibility, Migration, Persistence, and Result Safety
Purpose: read old safely, preserve raw, write target atomically, maintain routes, bind results.
In Scope: raw/quarantine store; version classifier/registry; legacy ProjectModel/Bridge/BD/LINER/
Importer readers; target repository abstraction/backend; atomic split/rollback; canonical redirects;
target manual save; result resources/checksum/staleness; audit migration record.
Out of Scope: Road-to-Frame apply, normal legacy write disable, Autosave, domain feature gaps.
Dependencies: IF0; OD10-01 before production backend exposure.
Deliverables: read-old/write-target paths, dry-run migration UI/API, target writer, recovery tooling,
route registry, result validity service, IF1 record.
Tests: M8-01..12, N8-01/02/05/06/08, G2/G7; fault injection.
Migration: affected ambiguous/coordinate/ID sources remain quarantine/dry-run; safe classified sources
may commit only after their evidence record and production storage gate.
Acceptance Criteria: raw before parse, idempotent pure migrations, atomic all-or-none commit, legacy
source byte unchanged, no dual write, redirects preserve direct/popstate/query/hash.
Rollback: disable target writer/exposure; restore manifest reference/new inverse revision; retain all
raw/migration evidence; legacy-only writer only for unmigrated legacy source.
PR Breakdown: PR-05..11.
Parallel Workstream: WS-B migration/storage, WS-A contract review, WS-F fault/compat tests.
Exit Gate: IF1 plus G2; production writer also needs OD10-01/N8-05.

Phase P2 - Shared Platform Extraction
Purpose: extract neutral mechanisms without creating shared domain truth.
In Scope: Drawing primitives/paper/affine; DXF model/validation/serializer; file I/O utilities;
error/log; command/history transaction protocol; table infrastructure; migration framework helpers;
neutral render DTO/lifecycle; dependency facades.
Out of Scope: Road.GDRAW builders, Frame.DRAFT builders, ProjectModel/result adapters, Viewer state.
Dependencies: IF0; storage helpers affecting commits also IF1.
Deliverables: shared packages, compatibility facades, import-direction tests, neutral fixtures.
Tests: O8 semantic core, G0/G6 foundations; existing callers unchanged.
Migration: no document semantic change; facade-first import movement.
Acceptance Criteria: shared modules import neither Road nor Frame; road/frame adapters preserve current
semantic tests; no persistence/state leakage.
Rollback: switch callers back through compatibility facade; target docs unchanged.
PR Breakdown: PR-12..14.
Parallel Workstream: WS-C shared, road/frame adapter reviewers; merge after IF0 in listed order.
Exit Gate: shared API freeze `SP1`; G0 dependency checks.

Phase P3 - Road-to-Frame Transfer
Purpose: replace direct generators/mutations with versioned preview, diff, apply, audit, rollback.
In Scope: package schema/serializer; capability/apply profiles; TransferRecord; Road exporter; Frame
preflight/import; one-to-many mappings; three-way diff/conflict; dependency-closed partial apply;
stale/unverified; overwrite protection; atomic apply/inverse revision.
Out of Scope: guessing unresolved legacy coordinates/IDs/fields; road/frame feature algorithms.
Dependencies: IF0, IF1, SP1; source-specific OD6-01/02/OD9-01 before apply.
Deliverables: package/record APIs, preview/dry-run, conflict resolver, apply service, rollback/audit,
IF2 record; old direct paths comparison-only.
Tests: T8-01..13, N8-08, G3 with asymmetric/nonzero-Z/fault fixtures.
Migration: legacy adapters may create non-applyable preview; baseline records never claim earlier
history. Apply creates new frame revision and record only.
Acceptance Criteria: contexts/units/IDs/checksums exact; mechanics/results/Viewer unchanged; conflict
preserves frame; invalid subset/tamper/stale commits none; rollback is preconditioned new revision.
Rollback: disable apply while leaving preview; inverse accepted transfer; retain record/package/raw;
re-enable legacy path only for legacy source and without target dual write.
PR Breakdown: PR-15..20.
Parallel Workstream: WS-D exporter and WS-E importer can start after PR-15/16 interfaces; WS-B owns
transaction, WS-F owns adversarial suite. Diff/apply merges after both adapters.
Exit Gate: IF2 and full G3 for each source class; unresolved sources stay NO_GO.

Phase P4 - Road Design Feature Slices
Purpose: complete target road design on RoadDesignDocument without frame coupling.
In Scope: road target adapters; multiple alignment; branch/merge; widening; bridge geometry;
Importer target workflow; LDIST; HAUNCH; HOSO; TOOL calculation domains.
Out of Scope: frame mechanics, transfer overwrite shortcuts, formal output completion (P6).
Dependencies: IF0/IF1; transfer-bound bridge geometry uses IF2; shared primitives as applicable.
Deliverables: independent feature slices with schemas/commands/UI/calculation/fixtures.
Tests: R8-01..14/16/17 and G1; O1/O2 benchmarks; migration/save-reload per feature.
Migration: additive RoadDocument minor versions, pure step migrations, old source unchanged.
Acceptance Criteria: feature-specific G1 passes; no frame IDs/mechanics; OD8-01 values approved for
released numerical quantities; Importer coordinate/ID gates pass affected corpus.
Rollback: hide capability, reopen previous RoadDocument revision/read adapter; preserve new fields in
unknown/extensions when older reader cannot interpret; no data deletion.
PR Breakdown: PR-21..30.
Parallel Workstream: WS-D sublanes after shared contracts; merge schema first, then algorithm/test,
then UI/exposure per feature. Bridge lane cannot bypass IF2.
Exit Gate: G1 per feature; road product release includes only passed capabilities.

Phase P5 - Frame Analysis Feature Slices
Purpose: complete FrameDocument lifecycle and missing mechanics/live-load/results.
In Scope: CONTROL lifecycle; runtime adapter; spring; release; rigid offset; fixed loads; static
combinations/envelopes; full INFLOAD; result persistence integration; validation/performance hooks.
Out of Scope: final PRINT/DRAFT (P6), Autosave enable (P7), legacy contraction.
Dependencies: IF0/IF1; geometry-linked INFLOAD uses IF2; OD8 tolerance/corpus for release claims.
Deliverables: reviewable solver/model/result slices, schema migrations, FrameDocument UI, result
binding for every analysis.
Tests: F8-01..16, M8-11, G4/G5; residual/equilibrium/MAC/subspace/reference suites.
Migration: legacy frame fields map explicitly; absent features remain defaults only when semantically
neutral and documented; stale results invalidated, never silently upgraded.
Acceptance Criteria: G4 per static feature, G5 per live/dynamic feature, result checksums/staleness,
no road geometry ownership leak.
Rollback: disable feature/case type, use previous solver adapter, invalidate incompatible persisted
results, retain input fields/read capability and prior revisions.
PR Breakdown: PR-31..38.
Parallel Workstream: WS-E mechanics/load/result sublanes after runtime interfaces; schema/assembly
changes serialize through owner; verification WS-F independent.
Exit Gate: G4/G5 per feature and IF3 result contract freeze.

Phase P6 - Reports, Drawings, and Viewer Completion
Purpose: deliver authoritative user outputs from passed road/frame data and results.
In Scope: GDRAW road/bridge drawings; complete PRINT CSV/PDF; formal Frame DRAFT; domain adapters to
shared Drawing/DXF; Viewer result adapters/staleness; semantic and controlled visual suites.
Out of Scope: using output as source of truth, Autosave, alias removal.
Dependencies: SP1, passed P4/P5 features, IF3, OD8-04 for visual release.
Deliverables: complete output catalogs, unit/sign/provenance labels, page/scale/clipping rules,
external DXF interoperability and Viewer fallback.
Tests: R8-15,F8-17/18,O8-01..10,G6.
Migration: current output routes/templates remain until replacement passes; no engineering data
migration from rendered artifacts.
Acceptance Criteria: semantic source equality plus visual/interoperability approval; stale result
cannot export; Viewer is not DRAFT.
Rollback: route output command to previous implementation for supported current scope; retain new
output as non-authoritative artifact; no document rollback needed.
PR Breakdown: PR-39..42.
Parallel Workstream: WS-C shared adapters, WS-D GDRAW, WS-E PRINT/DRAFT/Viewer, WS-F visual lane;
shared IR changes merge before domain builders.
Exit Gate: G6 per output and supported visual platform.

Phase P7 - Performance, Recovery, and Autosave Hardening
Purpose: qualify production scale/recovery and only then expose Autosave.
In Scope: declared performance environments/budgets; large road/frame models; save/migrate/apply
crash drills; audit restore; visual environment; Autosave opt-in/manual-save fallback/conflict policy.
Out of Scope: feature semantics changes, legacy removal.
Dependencies: P1/P3/P4/P5/P6 applicable gates; OD8-03, OD10-01; OD8-04 for visual claim.
Deliverables: benchmark baselines, budgets, recovery runbook/tooling, Autosave exposure control and
telemetry, release evidence bundle.
Tests: N8-01..08,O8 visual,G7 and feature regression suites.
Migration: Autosave writes target only; never touches legacy source; existing manual target state is
backup/rollback anchor.
Acceptance Criteria: approved median/tail/memory budgets; every fault point yields old/new complete
state; result validity enforced; Autosave conflict/recovery and opt-out pass.
Rollback: turn Autosave off, return to manual save, recover last verified target revision/manifest;
retain audit/logs; rollback performance optimization separately.
PR Breakdown: PR-43..45.
Parallel Workstream: WS-G performance/recovery with WS-F; Autosave PR merges last and cannot parallel
merge with persistence/transfer transaction changes.
Exit Gate: full G7 for production environment; Autosave remains off otherwise.

Phase P8 - Legacy Contraction
Purpose: reduce normal legacy entry/write surface only after evidence, without deletion.
In Scope: usage/inventory review; migration notices; read-only mode; normal legacy writer disable;
feature-flag/entry contraction; support/runbook updates; continued reader/alias/raw retention.
Out of Scope: REMOVE, branch deletion, raw/schema/fixture deletion, forced migration.
Dependencies: G2/G3/G7, OD6-04, OD10-02, restore drill, migration/support policy.
Deliverables: per-surface contraction decision, telemetry/inventory evidence, re-enable procedure,
support notice, retained compatibility matrix.
Tests: M8-12,N8-06/08 and rollback drill.
Migration: no automatic rewrite; unmigrated legacy remains readable; target remains target-only write.
Acceptance Criteria: explicit entry/exit/retention approval per surface, no critical dependency,
restore succeeds, no dual write.
Rollback: re-enable alias/legacy-only entry or writer for unmigrated legacy source; do not revert or
overwrite migrated target docs.
PR Breakdown: PR-46..47.
Parallel Workstream: release/data-governance with WS-B/WS-F; one surface at a time.
Exit Gate: policy approval and G7; readers/aliases remain unless separately approved later.

8.4 PR Breakdown

PR | Phase | Depends | Change Area | Tests/Gate | Rollback / Feature Exposure
PR-00 architecture decision/index guards | P0 | D6-D10 | docs/architecture manifest + dependency test skeleton | G0 manifest checks | docs/test only, no exposure
PR-01 coordinate/unit primitives | P0 | PR-00 | shared typed contexts/conversion/unknown state | T8-01/02 unit tests,G0 | additive API unused
PR-02 stable ID/revision/provenance/checksum | P0 | PR-00 | shared identity/revision contracts | T8-03/04,M8 checksum,G0 | additive API unused
PR-03 target document envelopes/schemas | P0 | PR-01/02 | Engineering/Road/Frame/ref schemas/examples | schema roundtrip/forbidden fields,G0 | no writer; revert consumers
PR-04 validation/architecture contract tests + IF0 | P0 | PR-03 | ValidationResult, dependency rules, freeze hashes | G0 full | no production exposure
PR-05 raw/quarantine/version classifier | P1 | IF0 | ingestion/raw checksum/unknown store | M8-02..05,G2 | read-only; disable importer path
PR-06 migration registry + legacy readers | P1 | PR-05 | pure adapters for ProjectModel/LINER/Importer | M8-04/06/08,G2 | keep existing readers; no target write
PR-07 target repository + atomic backend | P1 | IF0,OD10-01 | manual save/manifest/transaction/recovery | N8-01/05,G2/G7 | exposure off; recover prior manifest
PR-08 ProjectModel split migration | P1 | PR-06/07 | Frame/Road split adapter and audit | M8-06/07/09/11,G2 | dry-run first; source unchanged
PR-09 BridgeProject/BD split migration | P1 | PR-06/07 | field classifier/quarantine/road+frame adapters | M8-07/10,T8-08,G2 | ambiguous no commit; source unchanged
PR-10 canonical route/legacy redirect registry | P1 | IF0 | shell route normalization/aliases | M8-12,N8-06,G7 | restore old dispatch; aliases retained
PR-11 result resource/binding/staleness core + IF1 | P1 | PR-07/08 | persisted result schema/repository/validity | M8-11,N8-02,G2/G7 | disable persistence; transient path retained
PR-12 shared Drawing primitives/IR facade | P2 | IF0 | geometry/paper/affine/neutral document | O8-01/02,G0/G6 | callers use facade/old module
PR-13 shared DXF model/serializer facade | P2 | PR-12 | DXF types/validation/serialization | O8-04/05,G6 | old import facade
PR-14 shared file/error/history/table/render protocols + SP1 | P2 | IF0/IF1 as needed | infrastructure interfaces only | dependency/neutral fixtures,G0 | no domain exposure
PR-15 transfer package schema/serializer | P3 | IF0/SP1 | package/profile/capability contract | T8-01..05/12/13 contract,G3 | preview disabled
PR-16 TransferRecord/audit/mapping schema | P3 | PR-15,IF1 | append-only record/one-to-many | T8-04/05/10/13,N8-08 | additive store no apply
PR-17 Road exporter + preview | P3 | PR-15/16 | RoadDocument to package, no defaults | T8-01..05/12,G3 preview | disable exporter; no mutation
PR-18 Frame importer preflight/dry-run | P3 | PR-15/16 | validation/transform/dependency dry-run | T8-01..05/08/09,G3 | dry-run only
PR-19 three-way diff/conflict UI/API | P3 | PR-17/18 | ChangeSet/baseline/conflict/preserve default | T8-06..09/11,G3 | hide resolver; no apply
PR-20 atomic apply/rollback + IF2 | P3 | PR-07,PR-16/19,source gates | revision apply/inverse/stale/tamper | T8-05..13,N8-08,G3 | apply flag off; inverse revision
PR-21 RoadDocument current LINER adapter | P4 | IF1 | road core target repository/commands | R8-01..08,M8/N8,G1 | old road reader; target revision rollback
PR-22 multiple alignment slice | P4 | PR-21 | schema+algorithm+UI+tests | R8-09,G1 | capability hidden; additive field retained
PR-23 branch/merge slice | P4 | PR-22 | topology/schema/algorithm/UI | R8-10,G1 | capability hidden
PR-24 widening slice | P4 | PR-21 | linear/quartic/schema/UI | R8-11,G1 | capability hidden
PR-25 bridge geometry slice | P4 | PR-22/24,IF2 for binding | substructure/bearing line/span/girder/deck regions | R8-08/10/11,T8,G1/G3 | feature hidden; prior revision
PR-26 target Importer slice | P4 | IF1,PR-21 | reviewed import/raw/provenance/target save | R8-17,M8,G1/G2 | retain legacy importer/read source
PR-27 LDIST slice | P4 | PR-25 | domain calc/schema/UI/tests | R8-12,G1 | optional capability off
PR-28 HAUNCH slice | P4 | PR-24/25 | domain calc/schema/UI/tests | R8-13,G1 | optional capability off
PR-29 HOSO slice | P4 | PR-24/25 | domain calc/schema/UI/tests | R8-14,G1 | optional capability off
PR-30 TOOL slices/catalog | P4 | PR-21 | calculators one reviewable tool group at time | R8-16,G1 | tool menu capability off
PR-31 FrameDocument runtime/CONTROL adapter | P5 | IF1 | Frame doc to runtime/model/run lifecycle | F8-01,M8-11,G4 | old ProjectModel run adapter
PR-32 spring slice | P5 | PR-31 | schema/assembly/recovery/UI | F8-06,G4 | reject/hide spring models in old solver
PR-33 release slice | P5 | PR-31 | schema/assembly/recovery/UI | F8-07,G4 | feature off; input retained
PR-34 rigid offset slice | P5 | PR-31/33 interfaces | schema/transform/recovery/UI | F8-08,G4 | feature off; input retained
PR-35 fixed load catalog slices | P5 | PR-31 | one load family per sub-PR if needed | F8-04/09,G4 | family exposure off
PR-36 static combinations/envelope | P5 | PR-31/35,PR-11 | factor/result/provenance | F8-15/16,G4 | case type off; results invalidated
PR-37 full INFLOAD slices | P5 | IF2,PR-31/35 | lanes/axles/distribution/live result | F8-10..12,G5 | full feature off; MVP retained
PR-38 all-analysis result persistence + IF3 | P5 | PR-11,PR-31..37 | binding/save/reload/staleness per result | M8-11,N8-01/02,G4/G5/G7 | persistence off per result; recompute
PR-39 Road GDRAW completeness | P6 | SP1,passed P4 | road/bridge builders and DXF adapter | R8-15,O8-01..05,G6 | previous output path
PR-40 Frame PRINT completeness | P6 | IF3,passed P5 | CSV/PDF/report catalog | F8-17,O8-06..08,G6 | previous report path
PR-41 formal Frame DRAFT | P6 | SP1,IF3 | structure/load/result/influence builders | F8-18,O8-01..05,G6 | hide formal DRAFT
PR-42 Viewer target adapters/staleness/output UI | P6 | IF3,SP1 | Frame result/render/session adapters | O8-09/10,N8-02,G6 | old Viewer adapter; no state migration
PR-43 performance/budget harness | P7 | stable P4-P6 slices | benchmark env/metrics/budgets | N8-03/04/07,G7 | no feature exposure effect
PR-44 Autosave opt-in | P7 | PR-07/20/38/43,OD8-03 | target-only scheduler/conflict/recovery | N8-01/02/05/07,G7 | default/off; manual save
PR-45 recovery/visual/release evidence bundle | P7 | PR-39..44 | restore drills/platform captures/runbooks | O8/N8,G6/G7 | release held; no data change
PR-46 per-surface legacy read-only/write-disable | P8 | G2/G3/G7,OD10-02 | one Bridge/Project/LINER writer per PR | M8/N8 restore drill | re-enable legacy-only writer
PR-47 legacy entry/notice/support contraction | P8 | PR-46,OD6-04/OD10-02 | entry flags/notices/support docs; no delete | M8-12,N8-06/08,G7 | re-enable route/entry

PR review rules:
- A row may split into smaller PRs; it may not merge upward into a schema+migration+feature cutover.
- Schema PRs add readers/tests before writers. Writers land disabled before exposure.
- Feature exposure is the final commit/PR in a slice and names its rollback control.
- Every PR stages only explicit paths, runs relevant G0-G7 suites, and records unrelated worktree state.

8.5 Parallel Workstream Plan

Workstream | Owner Role | Scope | Contract/Freeze | Branch Prefix | Start/Merge Order | Conflict Avoidance
WS-A Contracts | architecture/data-contract owner | P0 schemas, IDs, revision, validation, freezes | owns IF0/IF1 hashes | impl/p0-contract-* | starts first; PR-00->04; reviews all schema changes | only WS-A edits shared contract files until freeze
WS-B Migration/Storage | migration/storage owner | raw, readers, writers, routes, audit, rollback | consumes IF0, owns migration API/IF1 with WS-A | impl/p1-migration-* | fixtures after PR-00; merge PR-05->11 | adapter-per-format files; serialized repository changes
WS-C Shared Platform | platform owner | Drawing/DXF/file/log/history/render protocols | consumes IF0/SP1 | impl/p2-shared-* | PR-12->14 after interface review | facade-first; no domain imports; domain owners review adapters
WS-D Road | road domain owner | RoadDocument, Importer, road/bridge features, GDRAW exporter | consumes IF0/IF1/IF2 | impl/p4-road-* | fixtures early; target merges PR-21 onward | feature-owned schema fragments; no shared contract edits
WS-E Frame | frame domain/solver owner | FrameDocument runtime, mechanics, INFLOAD, results, PRINT/DRAFT | consumes IF0/IF1/IF2/IF3 | impl/p5-frame-* | fixtures early; PR-31 onward after IF1 | assembly/model interface owner serializes solver core
WS-F Verification | independent verification owner | benchmark manifests, adversarial, E2E, visual, gate reports | verifies G0-G7, no contract ownership | test/gate-* | starts fixtures at P0; gate report after each slice | expected values cannot import production oracle path
WS-G Performance/Recovery | performance/release owner | environments, fault injection, budgets, Autosave evidence | consumes stable releases/G7 | perf/p7-* | harness early; Autosave merge last | no concurrent persistence transaction merge
WS-H Release/Data Governance | product/release/data owner | legacy usage/retention/notices/contraction | OD6-04/OD10-02 | release/p8-legacy-* | evidence during all phases; merge P8 only | one legacy surface per decision/PR

Merge protocol:
1. Rebase/merge from the approved phase base; do not merge feature branches directly into each other.
2. Interface proposal goes through WS-A and affected domain owners before implementation branch work.
3. IF0/IF1/IF2/IF3 hashes are updated only in dedicated contract PRs with migration notes/tests.
4. Road/frame branches cannot add shadow coordinate/ID/revision/package schemas.
5. Shared files have a single owner PR at a time; domain adapters live in domain directories.
6. No branch deletion is included; branch lifecycle follows repository policy in later Git work.

8.6 Acceptance and Rollback Gates

Phase | Required Gate | Exposure Allowed | Rollback Evidence
P0 | G0 + IF0 | contract APIs only, no writes | additive consumer disable, schema hash record
P1 | G2 and relevant G7 + IF1 | read/dry-run; target manual write only after storage gate | raw recovery, atomic fault matrix, manifest inverse
P2 | G0 shared dependency + semantic G6 foundation | shared facades | caller facade fallback
P3 | G3 + IF2 per source class | preview first; apply only resolved source classes | inverse revision, stale/tamper/no-partial tests
P4 | G1 per road capability | only passed capability | prior Road revision and feature off
P5 | G4/G5 per frame capability + IF3 | only passed analysis/case/result types | solver adapter fallback, result invalidation
P6 | G6 semantic and applicable visual | passed output/platform only | previous output route, no data rollback
P7 | G7 and applicable G6 | production performance; Autosave last/opt-in | manual save, verified target revision, restore drill
P8 | G2/G7 + OD policy | one legacy surface contraction | re-enable legacy-only entry/writer, retained reader/raw

Universal stop/rollback triggers:
- checksum, unknown-field, coordinate, ID, or revision precondition failure;
- partial atomic commit, raw-source mutation, dual-write observation, or missing audit record;
- frame-owned mechanics/result/Viewer mutation during transfer;
- solver residual/equilibrium/nonfinite or schema validation failure;
- failing required G0-G7 check, unexpected staged file, dependency change, or worktree change;
- performance/visual variance only blocks its affected release unless it exposes corruption.

9. Compatibility

9.1 Migration Plan

Step | Action | Apply Gate | Rollback
M0 Inventory | detect format/version/source, usage and ownership without mutation | none | no change
M1 Preserve | store original bytes/media/source/raw SHA-256 before parse | M8-04 | retain original; abort
M2 Classify | exact/current/older/future-minor/future-major/invalid and unknown pointers | M8-01..05 | quarantine/read-only
M3 Adapt Copy | run named pure step adapters; split road/frame/records | M8-06/07 | discard copy, source unchanged
M4 P0 Gates | coordinate/unit/ID/revision/reference closure and ambiguous field classification | M8-10,OD gates | preview/quarantine only
M5 Validate | target schemas, ownership negatives, checksum and document refs | G0/G2 | no commit
M6 Review | show diff/diagnostics/unknowns/approvals | product policy | no commit
M7 Atomic Commit | target documents, EngineeringProject refs, MigrationRecord in one transaction | OD10-01,N8-05 | old or new complete; inverse manifest revision
M8 Target Write | subsequent normal save writes target only | N8-01/G7 | disable writer; prior target revision
M9 Audit/Verify | save-reload, result bindings, raw recovery, telemetry | N8-01/02/08 | hold release, preserve evidence

Migration order by legacy type:
1. Target-native empty/new documents and controlled fixtures.
2. ProjectModel sources without LINER/Bridge mixed extensions.
3. Supported LINER 0.1/0.2/0.3 and Importer 0.1 with resolved context/IDs.
4. Mixed ProjectModel with valid LINER extension through atomic Road/Frame split.
5. BridgeProject/BridgeDefinition only per classified fields; ambiguous records remain quarantined.
6. No bulk/forced migration until per-class G2 evidence exists.

9.2 Backward Compatibility Plan

Surface | Read | Normal Write | Target Behavior | Exit/Retention
ProjectModel JSON | legacy adapter retained | target only after migration; old file unchanged | split Frame/Road where valid | retain raw/schema/reader; OD10-02 contraction
BridgeProject | raw+field classifier | legacy writer remains until target path/gates, then read-only | atomic Road/Frame split | ambiguous quarantine; retain indefinitely by default
BridgeDefinition | read/validate/compare | no target write authority | ownership-filter split, never package unchanged | retain reader/schema/parity through rollback
LINER 0.1/0.2/0.3 | supported readers | target RoadDocument after migration | pure step migration/raw retained | readers/fixtures retained
Importer 0.1/local storage | read/export/migrate | target repository after migration | preserve raw/recovery/provenance | old key/reader retained through policy
Backend runtime Model | constructed from legacy or target adapter | not a persistence writer | Frame runtime only | legacy parser retained as adapter
Legacy routes/deep links | pre-dispatch aliases | N/A | canonical Road/Frame with query/hash/ID preserved | aliases indefinite until OD6-04
Legacy outputs | current route retained | artifacts only | target output after G6 | previous generator remains rollback for supported scope
Viewer preference | session compatibility reader | session only | no domain-document migration | decoder/tests retained

Compatibility invariants:
- read-old/write-target, no dual write;
- unsupported future major/invalid data is preserved and rejected, not discarded;
- migration never overwrites legacy source;
- rollback never deletes MigrationRecord/TransferRecord/raw input;
- aliases/readers contract only after evidence; REMOVE is not scheduled.

10. Risks

P0-10-01. Implementing target writers before IF0/raw/atomic backend can create another incompatible
truth. Control: P0/P1 order, PR-03/05/07, G0/G2/G7, OD10-01.

P0-10-02. Resolving open coordinate/ID/ambiguous fields with defaults can silently misplace or
overwrite geometry. Control: D10-05; preview/quarantine; source-specific NO_GO.

P0-10-03. Transfer apply without record/conflict/dependency/rollback can overwrite frame mechanics.
Control: PR-15..20 order, T8/G3, apply exposure last.

P0-10-04. Autosave before recovery/result validity can multiply corrupt/stale writes.
Control: D10-06/11, PR-44 last, default off, N8/G7.

P1-10-05. Parallel road/frame work can fork contracts. Control: IF freezes, WS-A ownership, branch/
merge protocol, dependency tests.

P1-10-06. Large PRs can conceal schema/migration/feature coupling. Control: PR table and explicit
review rule; split further when change areas cross more than one exposure boundary.

P1-10-07. Unresolved tolerance/corpus/performance/visual evidence can be mistaken for foundation
blockers or ignored at release. Control: scope-specific readiness and gate mapping.

P1-10-08. Early legacy contraction can strand saved files/deep links. Control: P8 only,
OD6-04/OD10-02, retained readers/aliases/restore drill.

P1-10-09. Result schema changes can make persisted results appear current. Control: exact model/load/
solver/schema checksums, IF3, stale invalidation, M8-11/N8-02.

11. Dependencies

Critical path:
  PR-00 -> PR-01/02 -> PR-03 -> PR-04(IF0)
  -> PR-05/06 -> PR-07 -> PR-08/09/10/11(IF1)
  -> PR-15/16 -> PR-17/18 -> PR-19 -> PR-20(IF2)
  -> target road/frame binding -> IF3 -> outputs -> hardening -> contraction.

Non-critical safe preparation:
- O1/O2 fixtures, legacy corpus inventory, route matrix, performance harness design, and semantic
  drawing fixtures can start after PR-00 without merging shadow contracts.
- Road algorithms and frame solver algorithms can be isolated/tested after IF0; integration waits
  for IF1/IF2 as listed.
- Shared Drawing/DXF extraction can parallel P1 after IF0, but storage helpers touching commits wait
  for IF1 ownership.

12. Verification

Stage 10 planning acceptance checks:
- every required Gap has all ten mandatory columns and a Phase/Gate;
- all minimum road/frame/shared gaps appear explicitly;
- P0 SoT, coordinate, ID, migration, redirect, result persistence and overwrite protection are P0/P1;
- each Phase has all eleven required planning fields;
- every PR has dependency, area, tests/gate, rollback/exposure;
- G0-G7 map to phases and release scopes;
- open items block only affected apply/release;
- parallel branches cannot bypass freezes or edit shared contracts concurrently;
- compatibility preserves read-old/write-target/no-dual-write and no REMOVE;
- Autosave is last, disabled by default, with manual-save rollback.

## Stage Verdict

Scope-specific readiness:
- Foundation contracts/architecture/raw fixture infrastructure: GO.
- Compatibility readers/redirect/dry-run/target repository development: CONDITIONAL_GO.
- Production target writer: CONDITIONAL_GO after OD10-01/G2/G7.
- Affected legacy migration commit: NO_GO pending OD6-01/02/OD9-01 per source class.
- Road-to-Frame contract/preview: GO after IF0/IF1; apply: NO_GO pending source gates and G3.
- Road feature implementation: CONDITIONAL_GO after IF0/IF1; release: NO_GO until G1 per feature.
- Frame feature implementation: CONDITIONAL_GO after IF0/IF1; release: NO_GO until G4/G5.
- Output/nonfunctional/Autosave release: NO_GO until G6/G7 and OD8/OD10 evidence.
- Legacy contraction: NO_GO until P8 evidence and policy gates.

STAGE10_VERDICT: COMPLETE
IMPLEMENTATION_READINESS: CONDITIONAL_GO
