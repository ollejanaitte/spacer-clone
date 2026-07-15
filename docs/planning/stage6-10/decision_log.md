# Stage 6-10 Decision Log

> **Authority:** Accepted target decisions `D6-*` through `D10-*`. Each entry records rationale,
> impact, compatibility, verification, and revisit condition. Current implementation facts remain in
> [`docs/scoping/`](../../scoping/README.md).

Generated: 2026-07-15
Evidence HEAD: 21c8a93c41533f78c66c021db84931cd3aaed5db

Each record includes status, rationale, impact, compatibility, verification, and revisit condition.

D6-01 | DECIDED | Two independent documents under EngineeringProject
Decision: RoadDesignDocument and BridgeFrameAnalysisDocument are separate systems of record;
EngineeringProject is a reference/transaction container.
Rationale: current BridgeProject/BridgeDefinition/ProjectModel overlap is a P1 risk
(docs/scoping/responsibility_split.md:35-64; risks_and_unknowns.md:17-25).
Impact: storage, navigation, migrations, APIs, and audit must be document-aware.
Compatibility: legacy files are adapted; they are not declared target documents in place.
Verification: independent save/reload/revision tests and cross-document mutation tests.
Revisit only if transactional persistence cannot keep document identities and revisions independent.

D6-02 | DECIDED | Road module ownership
Decision: LINER owns road geometry; LDIST distance/overhang; HAUNCH haunch; HOSO pavement;
GDRAW road drawings; TOOL road calculators.
Rationale: JIP-LINER manual sections 1.2 p.2, 1.5 p.7, 5.8 pp.122-124,
6 pp.125-136, 7 pp.137-142, 8 pp.143-156; current gaps in stage4_road_design_scope.md:90-99.
Impact: those outputs remain road-owned even when referenced by frame analysis.
Compatibility: current LINER/drawing/DXF assets remain candidates for reuse; disposition is Stage 9.
Verification: Stage 8 road benchmark and drawing matrices.
Revisit if licensed product semantics require a different module name; ownership does not change.

D6-03 | DECIDED | Frame module ownership
Decision: CONTROL orchestrates; STATICS owns mechanics/static solve; INFLOAD owns frame live-load
analysis; R-SPECTRUM dynamics; PRINT result combinations/reports; DRAFT formal frame drawings.
Rationale: SPACER manual section 2.1 p.2 and sections 6.1-6.6 pp.19-177; current capability facts
in stage5_frame_analysis_scope.md:10-21.
Impact: road regions are candidate input only; load definitions and results remain frame-owned.
Compatibility: existing Viewer is not relabeled as complete DRAFT.
Verification: Stage 8 per-module acceptance matrix.
Revisit if PRINT/DRAFT are split into services; domain ownership remains frame side.

D6-04 | DECIDED | Versioned immutable transfer package
Decision: use RoadToFrameTransferPackage snapshot and append-only TransferRecord. Reject direct
cross-document mutation.
Rationale: current adapters directly generate/merge ProjectModel and lack re-import transaction
semantics (fromLinerBridge.ts:83-152; frameModelMapper.ts:270-318).
Impact: new contract, diff engine, audit, and apply transaction required.
Compatibility: BridgeDefinition and linerTrace can seed adapters/audit.
Verification: serialization, hash, no-mutation, repeat-import idempotence tests.
Revisit only if an equivalent immutable event contract proves all audit/rollback properties.

D6-05 | DECIDED | Transfer payload ownership filter
Decision: transfer road geometry/candidate regions; never transfer authoritative mechanics,
FEM IDs, frame loads/combinations/settings/results, or Viewer state.
Rationale: responsibility_split.md:11-31 and current mixed BridgeDefinition fields at
bridgeDefinition/types.ts:103-190.
Impact: adapter must filter existing mixed legacy models.
Compatibility: existing material/section/load fields route to frame legacy migration, not package.
Verification: negative contract tests and unchanged-frame-field re-import tests.
Revisit only if a new cross-product feature has an explicitly assigned owner and versioned contract.

D6-06 | DECIDED | Coordinate and unit contract
Decision: right-handed z-up package world coordinates; m/rad canonical; explicit CoordinateContext
and UnitContext; station/offset refs retained; Viewer transform excluded.
Rationale: coordinate_convention.md:8-52,94-112 and P0 risk at risks_and_unknowns.md:8-13.
Impact: adapters need explicit transforms; missing context blocks apply.
Compatibility: coordinatePolicyId is retained as provenance but not sufficient authorization.
Verification: asymmetric non-zero-Z roundtrip and sign/unit tests.
Revisit if a standards-based CRS library changes field encoding, not semantics.

D6-07 | DECIDED | Separate road stable IDs from FEM IDs
Decision: immutable semantic road IDs, separate frame IDs, one-to-many mapping in TransferRecord.
Rationale: id_policy.md:8-28,55-78; current mapper trace at frameModelMapper.ts:46-66.
Impact: ID migration/alias and uniqueness validation required.
Compatibility: existing persisted unique IDs may be retained; N/M counters cannot be road IDs.
Verification: reorder/save/load/re-import/collision/one-to-many tests.
Revisit if a universal ID service preserves the same ownership and alias guarantees.

D6-08 | DECIDED | Revision lineage boundary
Decision: source revision ID + content hash + optional parent; independent frame revision;
TransferRecord links source and before/after frame revisions.
Rationale: current sourceRevision is only a SHA-256 content hash
(sourceRevision.ts:3-20); runtime results are separate (App.tsx:91-177).
Impact: Stage 7 RevisionMetadata and transaction schema required.
Compatibility: current LINER hash populates contentHash.
Verification: lineage, stale, concurrent apply, and rollback precondition tests.
Revisit if event sequence replaces parentRevisionId with an equivalent causal token.

D6-09 | DECIDED | Three-way re-import and preserve-by-default conflicts
Decision: compare accepted baseline/new source/current frame; source+frame changes conflict;
preserve frame by default; deletions are proposals.
Rationale: automatic overwrite is P0 data loss risk and no current conflict engine exists.
Impact: ownership metadata, ChangeSet UI/API, and conflict resolver required.
Compatibility: first legacy import establishes baseline without claiming earlier history.
Verification: concurrent edit matrix and deletion cascade tests.
Revisit only if domain-specific merge rules are proven lossless and auditable.

D6-10 | DECIDED | Partial apply is dependency-closed and atomic
Decision: stable-ID operations can be selected only as a valid dependency closure; one transaction.
Rationale: partial per-field mutation can leave dangling spans/girders/supports.
Impact: dependency graph and preflight validation required.
Compatibility: legacy all-or-nothing import is represented as selecting the full ChangeSet.
Verification: invalid subset rejection, transaction rollback, reference integrity.
Revisit if schema constraints make an operation independent; atomicity remains.

D6-11 | DECIDED | Stale and rollback policy
Decision: accessible stale source blocks apply; inaccessible source is unverified/explicit approval;
rollback is a new inverse transaction with preconditions.
Rationale: sourceRevision exists but history/rollback does not; silent stale import is unsafe.
Impact: TransferRecord stores inverse patch and revision preconditions.
Compatibility: old transfers without records cannot promise rollback.
Verification: stale/unverified cases, later unrelated edits, inverse apply.
Revisit if append-only full snapshots replace inverse patches with equivalent safety.

D6-12 | DECIDED | BridgeDefinition is compatibility intermediate, not target package
Decision: reuse geometry concepts through adapters; filter mixed loads/mechanics/mesh settings.
Rationale: type explicitly says upstream intent but embeds loads and generation settings
(bridgeDefinition/types.ts:166-190).
Impact: no fourth target system of record.
Compatibility: feature-flagged path remains readable during migration.
Verification: legacy-to-package mapping and ownership-filter tests.
Revisit if BridgeDefinition is split and versioned to exactly match the target package contract.

D6-13 | DECIDED | Canonical entries and redirects
Decision: /pro/road and /pro/frame canonical; /pro retains frame behavior; existing road/frame and
root legacy paths redirect before dispatch with query/hash preserved; unknown routes are explicit.
Rationale: current routing and broken root redirects at main.tsx:30-33 and routeRedirect.ts:1-21.
Impact: route registry and early redirect adapter required later; no route implementation now.
Compatibility: existing deep links remain valid.
Verification: direct-load/popstate/query/hash/unknown route matrix.
Revisit if product branding changes slugs; compatibility aliases must remain for declared period.

======================================================================
Stage 7 Decision Log
Generated: 2026-07-15
Evidence HEAD: 21c8a93c41533f78c66c021db84931cd3aaed5db

D7-01 | DECIDED | Minimal shared kernel
Decision: share immutable coordinate/unit/ID/revision/provenance/validation primitives and generic
infrastructure protocols only. Do not share road/FEM systems of record, road calculations, solver
results, Viewer state, or domain mutation commands.
Rationale: reuse must not create a third engineering truth or cross-document write path.
Impact: domains consume shared services through owned adapters and value snapshots.
Compatibility: current drawing/DXF/Viewer modules must be split before neutral reuse.
Verification: dependency-direction and forbidden-import/mutation tests.
Revisit only when an item is proven domain-neutral and persistence-free.

D7-02 | DECIDED | Independent envelopes and exact references
Decision: every target document has documentKind, documentId, schemaVersion, RevisionMetadata, and
content checksum. EngineeringProject stores exact revision/checksum references and transaction
membership, not mutable engineering truth.
Rationale: enforces D6-01 and independent revision lineages.
Impact: saves and transfers use optimistic revision preconditions; legacy single files may split.
Compatibility: references may resolve embedded or external resources without changing identity.
Verification: independent save/reload, stale reference, and atomic split tests.
Revisit only if storage packaging changes; identities/revisions remain independent.

D7-03 | DECIDED | Semantic target schema versions
Decision: all target schemaVersion fields are SemVer strings: major incompatible, minor additive
within a readable major, patch non-semantic clarification. Writers emit current target versions.
Rationale: current integer/string version mix is not a coherent compatibility contract.
Impact: each target document/package/record has an explicit migration registry.
Compatibility: legacy versions remain adapter identifiers, never relabeled in place.
Verification: version classification and writer-version tests.
Revisit if an equivalent formal compatibility ordering replaces SemVer.

D7-04 | DECIDED | Preserve raw input and classify unknown fields
Decision: checksum/store original bytes before parse. Preserve same-major unknown fields by JSON
Pointer and re-inject them; quarantine and operationally reject future-major, invalid, or missing-
version input. New-known collisions block save/apply pending explicit migration.
Rationale: current strict schemas and known-field reconstruction can discard data.
Impact: UnknownFieldStore plus full raw quarantine are required shared infrastructure.
Compatibility: reject never means delete; computation ignores only preserved compatible unknowns.
Verification: byte preservation, future-version, pointer reinjection, and collision tests.
Revisit only if a standardized codec proves equivalent lossless behavior.

D7-05 | DECIDED | Pure, stepwise, atomic migration
Decision: detect, preserve, validate, classify, copy-migrate registered steps, post-validate, apply
coordinate/ID gates, and atomically commit. Record adapter/version/checksums/diagnostics; never
migrate in place or dual-write.
Rationale: migration must remain auditable, repeatable, and rollback-capable.
Impact: mixed legacy input can produce multiple target documents in one transaction.
Compatibility: legacy export, if required, is explicit and separate.
Verification: idempotence, unchanged source, step failure, atomic rollback.
Revisit if event replay implements the same invariants.

D7-06 | DECIDED | Fail closed on coordinate and ID ambiguity
Decision: unresolved legacy coordinate authority or semantic-ID collision permits preserved read-only
preview but blocks applyable package commit and Road-to-Frame apply with explicit diagnostics.
Rationale: OD6-01/02 are P0 numerical/data-overwrite risks.
Impact: coordinate/ID diagnostics and approval gates are contract fields.
Compatibility: unique persisted road IDs may be retained; FEM numbering is never promoted.
Verification: OD6-01/02 evidence gates and Stage 8 asymmetric/collision matrices.
Revisit when OD6-01/02 are resolved with the required evidence.

D7-07 | DECIDED | RoadToFrameTransferPackage v1 geometry profile
Decision: v1 has required (possibly empty) arrays for alignment/station refs, substructures,
bearing lines, spans, girder/cross-beam candidates, surface/road/load-placement regions, with
capability states and no fabricated defaults. `bridge-frame-v1` apply requires resolved contexts,
closed IDs, alignment/support/span/main-girder minimums; advanced regions remain optional.
Rationale: resolves OD6-03 while distinguishing preview shape from apply completeness.
Impact: packages can represent unavailable future road features honestly.
Compatibility: legacy adapters map only evidenced road-owned fields.
Verification: schema examples, curved/skew/asymmetric geometry and capability/preflight tests.
Revisit through a new apply profile, not a silent v1 requirement change.

D7-08 | DECIDED | Immutable append-only TransferRecord
Decision: record package/source/target checksums and revisions, before/after revision, transform,
one-to-many mappings, accepted/rejected operations, conflicts, diagnostics, actor/time, status, and
rollback material. Existing records are immutable.
Rationale: D6-04/D6-08 through D6-11 require audit and causal rollback.
Impact: failures produce auditable records without an after revision.
Compatibility: legacy provenance may seed a non-authoritative baseline only.
Verification: tamper, status, mapping, stale, and inverse-transaction tests.
Revisit if an append-only event store retains all required information.

D7-09 | DECIDED | Split shared drawing, DXF, and Viewer mechanisms
Decision: share low-level drawing/paper/transform primitives, DXF model/validation/serializer, and
render lifecycle/camera/picking protocols. Keep road station/builders, frame DRAFT, domain mappings,
model/result adapters, selection semantics, and Viewer persistence domain-owned.
Rationale: current modules combine generic mechanism with road/frame meaning.
Impact: neutral APIs and domain adapters are required before reuse.
Compatibility: existing assets remain Stage 9 reuse/disposition candidates.
Verification: neutral fixtures and forbidden dependency tests.
Revisit in Stage 9 only for asset disposition, not ownership.

D7-10 | DECIDED | Pre-dispatch route compatibility registry
Decision: canonical `/pro/road` and `/pro/frame`; normalize declared aliases before mounting; preserve
query/hash/entity IDs; use replaceState for redirects; apply the same registry on popstate; unknown
paths are explicit not-found.
Rationale: current `/pro` gate makes some root legacy redirects unreachable.
Impact: one application-shell registry owns direct load and history behavior.
Compatibility: `/pro` retains frame behavior; aliases remain until OD6-04 permits removal.
Verification: canonical/alias/direct/popstate/encoding/query/hash/loop matrix.
Revisit only canonical slugs; declared compatibility still needs a release policy.

D7-11 | DECIDED | Read legacy, write target, never dual-write
Decision: ProjectModel, BridgeProject, BridgeDefinition, LINER draft, and importer formats remain
read-only adapter inputs with raw preservation. Normal saves after migration write target contracts
only; explicit legacy export is separate.
Rationale: dual-write creates divergent systems of record.
Impact: adapter fixtures remain until deprecation gates; source files are not overwritten.
Compatibility: supported legacy reads remain while target evolves.
Verification: write-path, source-immutability, and adapter fixture tests.
Revisit: rejected for ordinary migration convenience.

D7-12 | DECIDED | Frame result ownership and non-domain Viewer state
Decision: persisted analysis results, when implemented, are optional frame-owned resources bound to
exact model/load/solver/schema checksums. Viewer state is session/user preference and never belongs
in target engineering documents or transfer packages.
Rationale: current persisted/runtime/backend layers differ and D6 ownership excludes results/state.
Impact: result persistence needs explicit validity; transient results may not migrate.
Compatibility: no lossless claim for current runtime state.
Verification: stale-result invalidation and domain-leak negative tests.
Revisit: implementation can change storage, not ownership.

======================================================================
Stage 8 Decision Log
Generated: 2026-07-15
Evidence HEAD: 21c8a93c41533f78c66c021db84931cd3aaed5db

D8-01 | DECIDED | Oracle hierarchy and independence
Decision: rank exact/closed-form/hand calculation (O1), independent implementation (O2), controlled
SPACER export (O3), qualified golden (O4), property/metamorphic relation (O5), and semantic/visual
review (O6). O4 must derive from approved O1/O2/O3 evidence.
Rationale: the same implementation through two routes can reproduce the same defect.
Impact: benchmark manifests record source/version/checksum and independence.
Compatibility: existing goldens are candidates until provenance is qualified.
Verification: manifest completeness and review gate.
Revisit only for a stronger certified benchmark standard.

D8-02 | DECIDED | Quantity-specific tolerance register
Decision: select exact, absolute, relative, or combined comparison per quantity. Combined uses
abs(error) <= max(absTol, relTol*max(abs(expected),scaleFloor)). Register values, units, evidence,
owner, and review; unset numeric values block the affected gate.
Rationale: coordinate, force, displacement, eigen, and layout scales cannot share one band.
Impact: tolerance changes are reviewed artifacts, not automatic snapshot updates.
Compatibility: existing tolerances seed evidence but are not universal.
Verification: zero/scale/boundary/fail tests.
Revisit per quantity when standards or conditioning evidence changes.

D8-03 | DECIDED | Unit and sign before magnitude
Decision: assert canonical unit and axis/local-global convention before numeric comparison; nonzero
sign mismatch fails. Compare components explicitly; vector norms alone are insufficient.
Rationale: P0 coordinate/sign errors can preserve magnitudes.
Impact: asymmetric fixtures and permutation/sign/unit negative tests are mandatory.
Compatibility: Viewer transforms remain display-only.
Verification: transformed/metamorphic cases.
Revisit only with a governing coordinate-contract change.

D8-04 | DECIDED | Separate current and planned acceptance
Decision: classify suites CURRENT-CANDIDATE, CURRENT-PARTIAL, or PLANNED. A green current suite does
not satisfy a planned target feature row.
Rationale: LDIST/HAUNCH/HOSO/TOOL, springs/releases/offsets/combinations and transfer transactions
are not currently implemented.
Impact: Stage 10 phase exits require planned suites to exist and pass.
Compatibility: current fixtures/tests remain reuse candidates.
Verification: traceability completeness rejects absent suite IDs.
Revisit after implementation/evidence review promotes a row.

D8-05 | DECIDED | Multi-metric solver correctness
Decision: independently assess response, equilibrium, element/node consistency, normalized residual,
finite values, and conditioning. Do not widen response tolerances silently for ill conditioning.
Rationale: matching selected response scalars does not prove a stable correct solve.
Impact: well-conditioned and near-singular fixtures have distinct expectations.
Compatibility: existing theory tests remain valid evidence.
Verification: theory, residual/equilibrium, scale and warning/error cases.
Revisit thresholds when solver/environment changes; metrics remain.

D8-06 | DECIDED | Dynamic mode and spectrum comparison
Decision: compare eigenvalues/frequencies numerically, modes by sign-invariant MAC, repeated modes by
subspace, with normalization/effective mass/residual separate. Verify SRSS/CQC modal inputs,
correlation properties, combined response, and envelope semantics.
Rationale: raw eigenvector sign/order is not stable, especially for repeated modes.
Impact: independent multi-DOF reference fixtures are required.
Compatibility: current SDOF/property tests are partial evidence.
Verification: SDOF, distinct/repeated mode, interpolation and combination suites.
Revisit only if declared normalization changes.

D8-07 | DECIDED | Fail-closed non-mutating transfer acceptance
Decision: require asymmetric non-origin non-zero-Z fixtures; exact context/unit/ID/revision/checksum
preflight; expected three-way ChangeSets; unchanged frame mechanics/results/Viewer; atomic rejection
for stale/ambiguous/collision/invalid dependency subsets.
Rationale: D6/D7 P0 boundary and overwrite risks.
Impact: transaction-level integration and fault-injection suites are mandatory.
Compatibility: legacy preview may remain non-applyable.
Verification: T8-01 through T8-13.
Revisit: rejected for compatibility shortcuts.

D8-08 | DECIDED | Migration preservation is an acceptance result
Decision: accept migration only when original raw checksum is recoverable, mappings are correct,
unknown classification passes, rerun is idempotent, split commit is atomic, legacy source is
unchanged, and rollback creates a valid new revision.
Rationale: target schema validity alone cannot prove no data loss.
Impact: future-version/collision and fault-injection fixtures are required.
Compatibility: current LINER migration tests are partial candidates.
Verification: M8-01 through M8-12.
Revisit only for equivalent formal preservation guarantees.

D8-09 | DECIDED | Semantic and visual output gates are separate
Decision: validate Drawing/DXF/PDF/CSV/Viewer entities, values, units, coordinates, scale/page and
clipping semantically; validate legibility/layout through controlled visual/interoperability review.
Neither substitutes for the other.
Rationale: parsers and screenshots detect different failure classes.
Impact: user-facing formal output needs both applicable gates.
Compatibility: existing drawing/DXF/report/Viewer tests are semantic candidates.
Verification: O8-01 through O8-10.
Revisit if a certified semantic renderer proves both dimensions.

D8-10 | DECIDED | Govern golden creation and update
Decision: every golden records fixture/oracle/version/checksum, creation method, reviewer, tolerance,
and reason. Updating code and its golden requires independent evidence and explicit approval.
Rationale: self-generated expected values can bless regressions.
Impact: current goldens need provenance qualification before O4 status.
Compatibility: unqualified goldens remain regression signals, not top-level oracles.
Verification: CI metadata/checksum policy.
Revisit only for stronger governance.

D8-11 | DECIDED | Measured performance baseline and approved budget
Decision: record hardware/OS/runtime/build, warmup/repetitions, dimensions, median/tail, memory,
output size and baseline commit. Owners approve budgets from evidence; missing budgets block the
performance release gate rather than inventing thresholds.
Rationale: performance values without environment and distribution are not reproducible.
Impact: controlled scheduled/release lane and OD8-03.
Compatibility: manual size limits are fixture candidates, not automatic target promises.
Verification: N8-03/04/07.
Revisit with supported-environment or algorithm changes and new baseline.

D8-12 | DECIDED | Layered acceptance and traceability gates
Decision: use G0 contract, G1 road, G2 migration, G3 transfer, G4 frame static/model, G5 dynamics/
live load, G6 outputs, and G7 nonfunctional/release gates. Map every D6/D7 P0/P1 to suites and gate.
Rationale: one aggregate green status cannot identify proven product invariants.
Impact: Stage 10 phases/PRs reference specific gates.
Compatibility: existing suites are assigned without overclaiming target completion.
Verification: traceability completeness check.
Revisit by adding evidence/gates, not collapsing them.

======================================================================
Stage 9 Decision Log
Generated: 2026-07-15
Evidence HEAD: 21c8a93c41533f78c66c021db84931cd3aaed5db

D9-01 | DECIDED | Target module taxonomy
Decision: map assets to Road.Domain/App, Frame.Domain/Engine/App, Integration.RoadToFrame,
Shared.Platform, or Compatibility.Legacy. Names are conceptual ownership, not fixed paths.
Rationale: disposition needs a stable target without reopening D6/D7 ownership.
Impact: every asset has one primary target and explicit dependencies.
Compatibility: legacy adapters own no engineering truth.
Verification: dependency-direction G0/G2/G3 checks.
Revisit only namespace naming.

D9-02 | DECIDED | Mixed assets default to SPLIT
Decision: SPLIT assets combining road/frame, domain/session, generic/domain mapping, or target/legacy
write behavior. Whole MOVE/KEEP requires single-responsibility evidence.
Rationale: intact mixed moves recreate responsibility leakage.
Impact: Bridge, BridgeDefinition, LINER mapping, Viewer, backend model/API and schemas split.
Compatibility: legacy facades may remain temporarily.
Verification: forbidden imports and T8-08.
Revisit only with contrary dependency evidence.

D9-03 | DECIDED | Move road algorithms, split frame hints
Decision: MOVE qualified road geometry/station/profile/cross-section algorithms; SPLIT frame hints,
preparation, IDs and direct FEM mapping into package candidates and compatibility paths.
Rationale: strong road code is mixed with forbidden direct frame preparation.
Impact: target road outputs use target IDs/context/revision; frame IDs leave road core.
Compatibility: legacy mapper remains comparison/read path.
Verification: R8 and T8.
Revisit per proven road-only type.

D9-04 | DECIDED | Split Importer responsibilities
Decision: road extraction/review/UI to Road.App, generic raw/migration mechanisms to Shared.Platform,
version adapters to Compatibility, and frame output to versioned transfer package.
Rationale: Importer currently spans domain, UI, persistence, migration, and integration.
Impact: preserve source/raw/provenance; stop direct ProjectModel output as target path.
Compatibility: current 0.1 reader stays.
Verification: R8-17 and M8.
Revisit per submodule evidence.

D9-05 | DECIDED | Split Drawing/DXF at domain mapping
Decision: low-level drawing/paper/affine and DXF model/validation/serialization move shared; road
station/builders/presets stay Road.GDRAW; frame DRAFT owns separate builders.
Rationale: generic mechanisms are evidenced, while current document/mappings carry road meaning.
Impact: shared mechanism cannot become shared drawing truth.
Compatibility: current road outputs remain.
Verification: O8/G6.
Revisit only with dependency evidence.

D9-06 | DECIDED | BridgeProject is split legacy input
Decision: road geometry and frame impact/load/generation fields migrate separately; ambiguous lines
quarantine; target writes wait for atomic raw-preserving migration.
Rationale: mixed ownership and known-field serialization risk data loss.
Impact: multi-document migration and read adapter required.
Compatibility: legacy facade/raw files retained through rollback window.
Verification: M8-02..10 and T8-08.
Revisit field mapping only, not target status.

D9-07 | DECIDED | BridgeDefinition is split compatibility intermediate
Decision: SPLIT geometry/provenance from mechanics/material/section/load/mesh. Retain reader/parity;
deprecate as target package/generator contract.
Rationale: D6-12 and field-level mixed ownership.
Impact: no fourth target document; ambiguous params quarantine.
Compatibility: feature path remains until G2/G3/G4 gates.
Verification: M8/T8 and split matrix.
Revisit only through a new D7-conforming contract, not this interface unchanged.

D9-08 | DECIDED | Split direct generators into package/apply/runtime
Decision: road mapping becomes package export, frame discretization becomes frame apply/model builder,
and mapping/audit becomes TransferRecord; deprecate direct ProjectModel mutations after gates.
Rationale: current generators mix defaults, IDs, mechanics and cross-document mutation.
Impact: preflight/diff/conflict/rollback needed.
Compatibility: comparison-only legacy paths remain temporarily.
Verification: T8/G3 and F8/G4.
Revisit only for equivalent immutable transaction semantics.

D9-09 | DECIDED | Separate three ProjectModel-related layers
Decision: legacy ProjectModel persistence deprecates to read adapter; App runtime/session/result state
stays application/session; backend Model remains runtime solve structure with separate target adapter.
Rationale: persistence, runtime, and parser/solver input are not one asset.
Impact: no runtime-as-persistence migration claim.
Compatibility: legacy JSON remains readable.
Verification: M8/N8/F8.
Revisit only storage representation, not layer distinction.

D9-10 | DECIDED | Split backend runtime/API boundaries
Decision: solver algorithms move Frame.Engine; model parser/runtime, bridge model/generator and
monolithic app routes split into target controllers/adapters and compatibility facades.
Rationale: parser/application/solver/legacy bridge responsibilities are currently mixed.
Impact: target APIs transact exact revisions; old endpoints deprecate behind adapters.
Compatibility: route/store facades remain until exit gates.
Verification: F8/M8/N8 and G0/G2/G4/G7.
Revisit per dependency evidence.

D9-11 | DECIDED | Viewer/exports are adapters, not shared truth
Decision: SPLIT render mechanisms from frame model/result adapters and session state; MOVE result
CSV/PDF/member-force reports to Frame.PRINT. Viewer remains distinct from formal DRAFT.
Rationale: D7-09/D7-12 and current type dependencies.
Impact: result checksum/staleness before render/export.
Compatibility: legacy display-axis preference remains session compatibility.
Verification: O8 and N8-02.
Revisit output implementation only.

D9-12 | DECIDED | Stage 8 oracle governs test/example reuse
Decision: REUSE O1/O2-qualified assets, retain O5/regression with limitations, and never promote
unqualified goldens/proposals to independent truth.
Rationale: asset reuse must not overclaim target verification.
Impact: tests move with algorithms; raw compatibility fixtures stay with adapters.
Compatibility: no golden deletion.
Verification: benchmark manifests and traceability.
Revisit when oracle qualification changes.

D9-13 | DECIDED | Documentation authority hierarchy
Decision: scoping is immutable current fact; formal Stage6-10 docs govern target; old specs/design/
handover remain references/history; untracked BMV2 material stays future proposal; manuals semantic.
Rationale: current fact, target decision, and proposal must not be mixed.
Impact: compatible proposal concepts are re-evaluated, conflicting locked decisions superseded.
Compatibility: history retained without copying proposal bodies.
Verification: artifact index and decision crosswalk.
Revisit only through explicit documentation governance.

D9-14 | DECIDED | No REMOVE or wholesale REWRITE
Decision: select no REMOVE until substitute/migration/retention/usage/rollback evidence passes; select
no wholesale REWRITE because mixed assets can be split and target contracts are new modules.
Rationale: premature destructive disposition risks data/history loss.
Impact: Stage10 schedules deprecation, not deletion; UNKNOWN requires evidence gate.
Compatibility: rollback assets remain.
Verification: legacy deprecation matrix.
Revisit REMOVE/REWRITE only with asset-specific required evidence.

======================================================================
Stage 10 Decisions
Generated: 2026-07-15
Evidence HEAD: 21c8a93c41533f78c66c021db84931cd3aaed5db

D10-01 | DECIDED | Nine ordered implementation phases
Decision: use P0 data/contracts, P1 compatibility/migration/persistence, P2 shared platform,
P3 Road-to-Frame, P4 road features, P5 frame features, P6 outputs, P7 hardening/Autosave,
and P8 evidence-based legacy contraction.
Rationale: downstream work must not create new persistence or integration debt.
Impact: critical-path dependencies and phase exit gates are mandatory.
Compatibility: legacy read support lands early; contraction is last.
Verification: IF0-IF3 and G0-G7.
Revisit by splitting a phase, never by bypassing its prerequisites.

D10-02 | DECIDED | Conditional overall implementation readiness
Decision: foundations are GO; non-destructive adapters and feature preparation are conditional;
affected migration/apply/release remains NO_GO until its evidence gate passes.
Rationale: design is complete, but P0 legacy evidence and implementation are not.
Impact: Phase 0 can start without enabling target mutation.
Compatibility: no old writer is disabled by foundation work.
Verification: scope-specific readiness matrix.
Revisit after recorded interface freezes and gate results.

D10-03 | DECIDED | Freeze source-of-truth and contracts in Phase 0
Decision: freeze document ownership, envelope/reference, coordinate/unit, stable ID,
revision/provenance/checksum, validation and dependency direction before target persistence/transfer.
Rationale: these P0 contracts affect every migration and apply operation.
Impact: Phase 0 is additive and has no production write exposure.
Compatibility: legacy persistence remains untouched.
Verification: G0 and IF0.
Revisit encoded fields only through versioned contract change.

D10-04 | DECIDED | Read old, write target, migrate atomically, never dual write
Decision: preserve raw before parse, classify/migrate a copy, validate and atomically commit target
documents/records while leaving the legacy source unchanged.
Rationale: prevents partial conversion, unknown-field loss and split truth.
Impact: target writer and legacy reader are separate review units.
Compatibility: reverse conversion is explicit export only.
Verification: M8/N8 under G2/G7.
Revisit: ordinary dual write remains REJECTED.

D10-05 | DECIDED | Open legacy gates block affected apply, not safe foundations
Decision: OD6-01, OD6-02 and OD9-01 block affected migration commit and transfer apply, but not
contracts, fixtures, raw quarantine, read adapters, preview or diagnostics.
Rationale: useful work can proceed while remaining fail closed.
Impact: capability and blocked status must be explicit per source.
Compatibility: preview/quarantine is available without target mutation.
Verification: M8-10, T8 and a gate record.
Revisit when evidence resolves each source class.

D10-06 | DECIDED | Result persistence precedes output and Autosave
Decision: persist versioned frame results bound to model/load/solver/schema checksums in P1 and
integrate new analyses in P5; stale results cannot render/export as authoritative.
Rationale: result validity and data preservation are P0 concerns.
Impact: output depends on the result-validity service; Autosave waits for P7 recovery.
Compatibility: no lossless migration claim for legacy transient results.
Verification: M8-11, N8-01/02/05, G2 and G7.
Revisit storage technology only, not checksum binding.

D10-07 | DECIDED | Transfer preview precedes dependency-closed atomic apply
Decision: package schema/serialization and dry-run preview land before diff/conflict/apply; apply
requires IF0/IF1, resolved source gates, dependency closure, overwrite protection, TransferRecord
and rollback.
Rationale: prevents unsafe direct ProjectModel mutation from becoming the target path.
Impact: feature exposure is staged; direct generators remain comparison-only.
Compatibility: old direct generation remains isolated during the comparison window.
Verification: T8 and G3.
Revisit only for equivalent immutable transaction semantics.

D10-08 | DECIDED | Parallel road/frame work cannot bypass the critical path
Decision: teams may prepare fixtures/algorithms after IF0, but target integration merges only after
IF1 and the relevant shared/transfer interface freezes.
Rationale: parallel work must not create shadow contracts or adapters.
Impact: contract owners approve imports and merge order.
Compatibility: legacy paths remain isolated.
Verification: dependency and architecture checks.
Revisit merge order, not gate requirements.

D10-09 | DECIDED | Small PRs separate contracts, adapters, tests and exposure
Decision: no PR combines schema introduction, legacy behavior, migration cutover and user exposure;
each PR records dependency, change area, tests/gate, rollback and exposure.
Rationale: reviewability and reversible rollout.
Impact: use PR-00 through PR-47 as the planning decomposition.
Compatibility: exposure controls cannot select competing ordinary writers.
Verification: PR checklist and dependency manifest.
Revisit by splitting further.

D10-10 | DECIDED | Reports and drawings follow authoritative domain results
Decision: GDRAW/PRINT/DRAFT and Viewer release follows stable road/frame documents and results;
shared Drawing/DXF/render mechanisms may land earlier.
Rationale: output is not a source of truth.
Impact: P6 depends on P4/P5 and G6.
Compatibility: current outputs remain until replacements pass acceptance.
Verification: O8 and G6.
Revisit individual output order only.

D10-11 | DECIDED | Autosave is a last-write feature
Decision: keep Autosave disabled until manual target save, atomic recovery, migration, result
binding, conflict policy, performance and recovery tests pass; enable under independent exposure.
Rationale: automatic write frequency expands corruption/conflict blast radius.
Impact: Autosave PR depends on P1/P3/P7 gates.
Compatibility: manual save is the rollback path.
Verification: N8 and G7.
Revisit only from evidence, never as a migration default.

D10-12 | DECIDED | Rollback preserves history
Decision: disable additive exposure; use new inverse revisions or restore manifest references with
preconditions for migration/apply; invalidate incompatible results; fall back to manual save.
Rationale: rollback must preserve provenance and avoid data erasure.
Impact: every phase and PR has a defined rollback.
Compatibility: raw source and transfer/migration records remain.
Verification: M8, T8 and N8 recovery cases.
Revisit only with stronger event-store semantics.

D10-13 | DECIDED | Legacy contraction is evidence-only and non-destructive
Decision: P8 may disable normal writes/entries after usage, retention, migration and rollback
evidence; read adapters and aliases remain by default. REMOVE and branch deletion are out of scope.
Rationale: OD6-04 and D9-14 prohibit premature cleanup.
Impact: contraction is not on the feature critical path.
Compatibility: approved rollback may re-enable a route/legacy-only writer for unmigrated sources.
Verification: G2/G7 plus an accepted retention policy.
Revisit only through a separate removal decision.
