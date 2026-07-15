# Stage 7: Shared Platform, Target Data Contracts, and Compatibility

> **Authority:** Target decision. Current facts are in [`docs/scoping/`](../../scoping/README.md);
> manuals provide semantic reference only. Proposed contracts are not claims of current support.

Generated: 2026-07-15 (Asia/Tokyo)
Evidence HEAD: 21c8a93c41533f78c66c021db84931cd3aaed5db

1. Executive Summary

Stage 7 fixes a deliberately small shared platform. The two products share value primitives and
infrastructure protocols, but do not share either product's system of record, calculations,
results, or mutable UI state. Shared code may transport or render domain data only through an
owned adapter; it cannot become an alternate write path into RoadDesignDocument or
BridgeFrameAnalysisDocument.

The target data family is:

  EngineeringProject (index and transaction manifest)
    |- roadDesign: DocumentReference<RoadDesignDocument> [0..1]
    |- frameAnalyses: DocumentReference<BridgeFrameAnalysisDocument> [0..n]
    `- transferRecords: DocumentReference<TransferRecord> [0..n]

  RoadDesignDocument                       BridgeFrameAnalysisDocument
          | source snapshot                            ^ apply transaction
          v                                            |
  RoadToFrameTransferPackage --------------> append-only TransferRecord

All target persisted contracts use semantic schema versions, immutable document/revision IDs,
SHA-256 content checksums, explicit CoordinateContext and UnitContext where engineering values
occur, and a preservation envelope for unknown input. Unsupported future-major or invalid input
is quarantined in full and is never silently discarded. It is rejected for operational use,
migration apply, and Road-to-Frame apply until an explicit adapter exists.

The current assets do not provide that guarantee. The ProjectModel schema is generally strict
(`additionalProperties: false`), its top-level migration only supplies schemaVersion, LINER
migration rejects unrecognized fixed-Z keys, and BridgeProject reconstruction writes only known
fields. Therefore legacy compatibility is classified per persistence/runtime/parser layer and is
never described as lossless by default.

OD6-03 is resolved: transfer v1 has a fixed geometry collection shape, explicit capability flags,
empty collections rather than fabricated geometry, and a stricter `bridge-frame-v1` apply profile.
OD6-01 and OD6-02 remain P0 implementation gates with apply-block defaults. They do not prevent
Stage 8 from defining verification evidence. Stage 7 is complete and ready for Stage 8.

2. Scope

IN:
- Shared-platform ownership and prohibited sharing boundaries.
- Conceptual target contracts, required/optional fields, identity, revision, checksum, versions,
  migrations, and unknown-field handling.
- Compatibility classifications for ProjectModel, frontend runtime state, backend engine Model,
  BridgeProject, BridgeDefinition, LINER draft, importer projects, routes, and deep links.
- Migration transaction boundary, legacy read/write policy, and rollback preconditions.
- Resolution of RoadToFrameTransferPackage v1 geometry cardinality.

OUT:
- Source, schema, migration, route, UI, solver, storage, or test implementation.
- Concrete archive file layout and remote repository protocol; references support embedded or URI
  resources but the physical packaging choice is an implementation concern.
- Numerical tolerances and test corpus contents (Stage 8).
- Asset disposition (Stage 9) and implementation phases/PRs (Stage 10).
- Any change to Stage 6 product, source-of-truth, coordinate, ID, revision, or transfer decisions.

3. Inputs Reviewed

Accepted planning inputs:
- [Stage 6 target architecture](./stage6_target_architecture.md)
- [decision log](./decision_log.md)
- [open decisions](./open_decisions.md)
- [Stage 0-5 scoping index](../../scoping/README.md) and its indexed current-fact documents.

Primary contract and migration evidence:
- schemas/project.schema.json:1-215 and nested definitions
- frontend/src/types.ts:158-210
- frontend/src/projectMigration.ts:3-15
- frontend/src/liner/schema/version.ts:1-27
- frontend/src/liner/schema/projectLinerMigration.ts:17-55,133-184,423-466
- frontend/src/liner/schema/linerDraftSchema.vNext.json
- frontend/src/liner/importer/migration/migrationRegistry.ts:1-58
- frontend/src/liner/importer/storage/jsonImportExport.ts:1-95
- frontend/src/liner/importer/storage/importerStorage.ts:49-91
- frontend/src/bridge/types.ts and backend/engine/bridge_model.py:13-134,142-259
- frontend/src/bridgeDefinition/types.ts:33-190
- backend/engine/model.py:17-239

Primary shared-platform and route evidence:
- frontend/src/liner/drawing/model/document.ts:8-51
- frontend/src/liner/drawing/model/primitives.ts:3-80
- frontend/src/liner/dxf/model/types.ts:6-126 and dxf/serializer/**
- frontend/src/viewer/types.ts:1-168
- frontend/src/main.tsx:10-34
- frontend/src/liner/uiPreparation.ts:7-41,290-315
- frontend/src/liner/importer/routes.ts:1-127
- frontend/src/timeHistory/routeRedirect.ts:1-21

No additional manual sections were needed: Stage 7 concerns internal contracts and compatibility,
not new target-function semantics. Stage 6 manual citations remain the functional ownership input.

4. Current Facts Used

CF7-01. `schemas/project.schema.json` is strict at the root and most nested objects, uses an
integer top-level schemaVersion plus project.schemaVersion `1.0.0`, and permits arbitrary fields
only in limited result payloads. This is not a uniform target version contract.

CF7-02. `migrateProject` only copies the object and defaults a missing top-level schemaVersion to
1. It does not provide stepwise migration, pre/post validation, checksums, lineage, or nested
unknown-field preservation.

CF7-03. LINER recognizes draft versions 0.1.0, 0.2.0, and 0.3.0. The fixed-Z recognizer uses an
allow-list and rejects additional keys; the vNext JSON Schema is also strict. Existing migration
tests establish selected known-version conversions, not general forward-compatible preservation.

CF7-04. Importer JSON input parses, version-checks, migrates through a registry, and validates.
The current registry has only the current identity path unless later entries are registered;
unsupported paths reject. Storage is JSON stringify/parse and has no preservation sidecar.

CF7-05. ProjectModel has three distinct layers: persisted frontend contract, transient React
runtime/result state, and backend solver Model. Runtime state is not evidence of persisted data;
backend Model is a typed computation input, not a storage system of record.

CF7-06. BridgeProject parsing and `to_dict` reconstruct known fields. Unknown fields are not
round-tripped. It mixes road geometry, load semantics, and frame generation references.

CF7-07. BridgeDefinition is typed as upstream design intent but includes loads, material/section
references, bearing types, mesh settings, and a legacy FEM feature flag. It must be split by
ownership during compatibility import.

CF7-08. DrawingDocument and DXF contain reusable low-level document/primitives/serialization
concepts. Drawing viewport kinds and station axes are currently road-oriented, so the current
module is not adopted wholesale as a neutral shared domain.

CF7-09. Viewer types currently reference ProjectModel, AnalysisResult, selection, result display,
and camera/render state together. Only low-level rendering protocols are shareable; the current
Viewer model is not a shared engineering document.

CF7-10. `/pro` is the only root route mounted by main.tsx. Road/importer and time-history routing
is implemented within application code, and root `/th/**`/`/compare` redirect logic is currently
unreachable before the `/pro` gate. Direct-load compatibility requires a pre-dispatch registry.

5. Decisions

D7-01 | DECIDED | Minimal shared kernel
Share only immutable value primitives and infrastructure protocols. Domain documents, road
calculations, solver results, Viewer state, and domain mutation commands remain product-owned.
Reason: reuse must not create a third source of truth. Impact: every shared service accepts owned
adapters or value snapshots. Compatibility: existing mixed modules are split conceptually before
reuse. Verification: dependency/lint tests must reject forbidden imports and mutation paths.
Revisit: only if an item is proven domain-neutral and has no ownership or persistence semantics.

D7-02 | DECIDED | Independent document envelopes and references
Each persisted target document has its own documentId, revision, schemaVersion, content checksum,
and documentKind. EngineeringProject stores exact DocumentReferences and transaction membership;
it does not inline mutable engineering truth. A reference contains documentId, revisionId,
documentKind, checksum, and optional URI/embedded-resource key. Reason: Stage 6 independent SoTs.
Impact: save and transfer use optimistic revision preconditions. Compatibility: legacy single-file
imports can emit multiple documents atomically. Verification: independent save/reload/ref integrity.
Revisit: if storage is always single-file; independent identities and revisions still remain.

D7-03 | DECIDED | Semantic version policy
All target schemaVersion values are SemVer strings. Major is incompatible, minor is additive and
backward-readable within that major, patch changes validation clarification without meaning change.
Writers emit only their current target version. Reason: current mixed integer/string versions are
ambiguous. Impact: explicit per-document registries. Compatibility: legacy versions are adapter
identifiers, not relabeled target versions. Verification: version classification matrix.
Revisit: only if a formal standard replaces SemVer with equivalent compatibility ordering.

D7-04 | DECIDED | Raw preservation and unknown-field policy
The ingestion layer stores original bytes and SHA-256 before parsing. Same-major future-minor
unknown fields are preserved by JSON Pointer and re-injected on save; computation ignores them with
a warning. Unsupported future-major, missing/invalid version, or structurally invalid input is
quarantined in full and rejected for operational use. A collision between a formerly unknown field
and a new known field blocks target save/apply until an explicit migration resolves it. Reason:
strict existing schemas can otherwise lose data. Impact: UnknownFieldStore and quarantine store are
required infrastructure. Compatibility: rejection never implies deletion. Verification: byte/raw,
pointer, collision, and future-version tests. Revisit: only if a lossless standardized codec is used.

D7-05 | DECIDED | Pure stepwise migration transactions
Migration is detect -> preserve raw/checksum -> validate source -> classify -> copy-migrate each
registered step -> validate target -> coordinate/ID gates -> atomic commit. It is deterministic,
idempotent, never in-place, records source/target checksums and diagnostics, and retains original
input. Reason: migration must be reversible and auditable. Impact: no dual write. Compatibility:
legacy export is an explicit separate command. Verification: repeat migration, failure rollback,
and unchanged-source checksum tests. Revisit: if an event replay framework proves equivalent rules.

D7-06 | DECIDED | Coordinate and ID uncertainty are apply gates
Unknown legacy coordinate authority permits read-only preview/quarantine but blocks migration commit
to an applyable package and blocks Road-to-Frame apply with `COORDINATE_CONTEXT_UNKNOWN`. ID
collision or ambiguous semantic identity blocks apply with `STABLE_ID_COLLISION`; no FEM ID is
promoted. Reason: OD6-01/02 P0 risks. Impact: diagnostics are first-class contract fields.
Compatibility: source remains readable and preserved. Verification/evidence gates are retained in
Open Decisions. Revisit: when those evidence gates resolve OD6-01/02.

D7-07 | DECIDED | RoadToFrameTransferPackage v1 geometry shape
The package has fixed arrays for alignment references, station references, substructures, bearing
lines, spans, main-girder candidates, cross-beam candidates, surface regions, road regions, and
load-placement candidate regions. Arrays may be empty and capability flags explain absence; no
geometry default is fabricated. Generic Point3/Polyline3/Polygon3/StationRange primitives encode
sampled geometry; parametric source references/provenance may accompany them. The apply profile
`bridge-frame-v1` requires resolved coordinate/unit contexts, dependency-closed stable IDs, at least
one alignment reference, supports/bearing lines, a span, and a main-girder candidate. Advanced
deck/pavement/haunch/road/load regions are optional capabilities. Reason: resolves OD6-03 without
pretending current missing features exist. Impact: preview and apply validity are distinct.
Compatibility: BridgeDefinition maps only owned fields. Verification: schema examples and curved,
skew, asymmetric, one-to-many cases. Revisit: new profiles may add requirements without changing v1.

D7-08 | DECIDED | Append-only TransferRecord contract
TransferRecord records package identity/checksum, source revision/checksum, target before/after
revisions, transform, stable-ID-to-frame-ID mappings, selected/rejected operations, conflicts,
diagnostics, status, actor/time, and rollback material. It is immutable and append-only. Reason:
Stage 6 audit/re-import policy. Impact: a failed apply also produces a record with no after revision.
Compatibility: legacy provenance can seed a non-authoritative baseline record. Verification:
tamper/checksum, status transition, one-to-many mapping, inverse transaction tests. Revisit: an
append-only event store may replace the representation, not the information.

D7-09 | DECIDED | Shared drawing/DXF/viewer boundaries
Drawing primitives, paper/sheet primitives, affine transforms, low-level DXF model/validation/
serialization, and render lifecycle/camera/picking primitives are shareable. Road station axes,
road drawing builders, frame DRAFT builders, drawing standards, layer mappings, model/result
adapters, selection semantics, and Viewer persistence are domain-owned. Reason: current modules mix
generic mechanism with road/frame meaning. Impact: adapters are required. Compatibility: existing
code is a reuse candidate, not a target namespace decision. Verification: neutral fixture tests and
forbidden-import checks. Revisit: Stage 9 asset evidence can change disposition, not ownership.

D7-10 | DECIDED | Route compatibility before dispatch
Canonical entries are `/pro/road` and `/pro/frame`. Compatibility aliases are normalized before
product mounting, preserve query/hash and entity IDs, use replaceState for redirects, and dispatch
popstate against the same registry. Unknown paths show explicit not-found. Reason: current root gate
makes some redirects unreachable. Impact: one route registry must own canonicalization.
Compatibility: `/pro` retains frame behavior and legacy routes remain aliases. Verification: direct
load, internal navigation, back/forward, encoding, query/hash table. Revisit: OD6-04 only governs
retirement, not initial behavior.

D7-11 | DECIDED | Legacy read, target write, no dual write
Legacy ProjectModel/BridgeProject/BridgeDefinition/LINER/importer contracts remain read-only import
sources with preserved raw payloads and fixtures. Once a target document is committed, normal save
writes only target contracts. No target save silently rewrites a legacy file and no cross-document
dual-write period is allowed. Reason: dual truth would defeat Stage 6. Impact: explicit legacy export
where needed. Compatibility: adapters stay until retirement evidence exists. Verification: write-
path tests and legacy-source immutability. Revisit: never for ordinary migration convenience.

D7-12 | DECIDED | Result and Viewer ownership
Persisted analysis results, when supported, are optional frame-owned resources bound to exact model,
load, solver, and schema checksums. They are not shared-platform data. Viewer state is session/user
preference data and is never embedded in an engineering document or transfer package. Reason:
current runtime/results separation and Stage 6 ownership. Impact: result persistence requires its
own validity policy later. Compatibility: current transient results may not be recoverable.
Verification: stale-result invalidation and document-domain negative tests. Revisit: Stage 10 can
schedule persistence but cannot move ownership.

6. Recommended Items

R7-01 | RECOMMENDED | Define target JSON Schemas from the conceptual field tables below, with a
single envelope vocabulary and per-domain payload schemas. Do not retrofit ProjectModel in place.

R7-02 | RECOMMENDED | Store `originalPayload` as immutable bytes/blob plus an indexed
UnknownFieldStore. A sidecar alone is insufficient because invalid JSON/version cases need complete
recovery evidence.

R7-03 | RECOMMENDED | Use SHA-256 over a specified canonical serialization for content identity,
while retaining the raw-input SHA-256 separately. Do not use revisionId as an implicit hash.

R7-04 | RECOMMENDED | Implement architecture tests around dependency directions:
shared-platform -> no road/frame imports; road and frame -> shared-platform; integration -> both
through public contracts; neither domain imports the other's document mutation APIs.

R7-05 | RECOMMENDED | Treat existing DrawingDocument, DXF, Viewer, and migration utilities as
evidence/reuse candidates only. Stage 9 must decide KEEP/MOVE/SPLIT/REWRITE using tests.

7. Open Decisions

OD6-01 | OPEN | P0 | Legacy coordinate authority
Default: preview/quarantine only; migration commit to an applyable transfer and apply are blocked.
Owner: road geometry domain owner plus contract/migration owner.
Evidence gate: legacy sample classification; explicit CRS/datum/local transform; asymmetric,
non-zero-Z golden cases; explicit unknown behavior; serialized audit. Decision required before any
legacy source can emit or apply an applyable transfer package.

OD6-02 | OPEN | P0 | Stable ID migration and collision aliases
Default: retain demonstrably unique persisted road IDs; never promote FEM N/M IDs; ambiguity or
collision blocks apply and requires an explicit alias decision stored in migration evidence.
Owner: stable-ID contract owner plus migration owner; Stage 10 assigns implementation ownership.
Evidence gate: collision/recreated-ID corpus, idempotent mapping, alias persistence, reorder tests,
one-to-many transfer, and rollback. Decision required before affected legacy apply.

OD6-04 | OPEN | P2 | Redirect retirement window
Default: aliases remain indefinitely and cannot be removed during initial migration.
Owner: product/release owner. Evidence gate: route telemetry or explicit release policy, migration
notice, and no critical saved-link dependency. This does not block Stage 8-10 planning.

OD6-03 | RESOLVED BY D7-07 | Transfer v1 exact geometry cardinality.

No new major Stage 7 design question is left open. Concrete archive transport and result retention
are implementation details constrained by the decided contracts, not architecture choices.

8. Main Matrices / Architecture

8.1 Shared Platform Responsibility Matrix

Area | Shared Portion | Domain-Owned / Prohibited Portion | Decision
Coordinate/unit | typed values, conversions, contexts, validation | inferred authority without evidence; domain defaults | SHARE PRIMITIVES
Stable ID | namespace, semantic ID, alias record, uniqueness API | road identity policy; FEM numbering; silent remap | SHARE PRIMITIVES
Revision/provenance | metadata, refs, checksums, causal links | domain change meaning; mutable revision fields | SHARE PRIMITIVES
Validation | result/diagnostic/code/path/entity refs | road/FEM rule definitions | SHARE PROTOCOL
Drawing | Point2, primitives, paper/sheet, affine transform | station axes, road/GDRAW builders, frame DRAFT builders/standards | SPLIT
DXF | low-level document, entity validation, serializer, file I/O | road/frame mapping, layers, units policy, presets | SPLIT
Viewer | scene lifecycle, camera, picking, coordinate display API | ProjectModel/result adapters, selection meaning, persisted state | SPLIT
File I/O | envelope, atomic write, checksums, raw/quarantine store | domain payload construction | SHARE INFRASTRUCTURE
Error/log | structured error, correlation/audit metadata, redaction | domain severity/rule ownership | SHARE PROTOCOL
Command/history | transaction, undo precondition, append-only record API | domain commands, cross-SoT mutation | SHARE PROTOCOL
Table editing | grid, selection, clipboard, parsing hooks | columns, units, formulas, domain validation | SHARE UI INFRASTRUCTURE
Migration | registry, version classifier, raw preservation, transaction | individual road/frame/legacy mappings | SHARE FRAMEWORK
Road document | none | authoritative road state/calculations | NEVER SHARE AS MUTABLE TRUTH
Frame document | none | FEM/load/analysis/result state | NEVER SHARE AS MUTABLE TRUTH
Solver results | checksum reference primitive only | values, combinations, validity | FRAME OWNED
Viewer state | no engineering persistence | camera/selection/display preferences | SESSION/USER OWNED

8.2 Target Contract List and Required/Optional Fields

Contract | Required Fields | Optional Fields | Owner / Mutability
EngineeringProject | schemaVersion, projectId, revision, metadata, document index, roadDesign ref (nullable), frameAnalyses[], transferRecords[], contentChecksum | attachments[], extensions, external resource URIs | container owner; revisioned
DocumentReference<T> | documentKind, documentId, revisionId, contentChecksum | uri, embeddedResourceKey, mediaType | shared value; immutable
RoadDesignDocument | schemaVersion, documentKind, documentId, revision, coordinateContexts[], unitContext, stableIdRegistry, alignments[], stationing, profiles[], crossSections[], bridges[], contentChecksum | LDIST/HAUNCH/HOSO results, drawings, sourceRefs, attachments, extensions, unknownFieldStoreRef | road SoT; revisioned
BridgeFrameAnalysisDocument | schemaVersion, documentKind, documentId, revision, coordinateContexts[], unitContext, structuralModel, loadDefinitions[], analysisSettings, transferBindings[], contentChecksum | persistedResultRefs, reportRefs, draftRefs, attachments, extensions, unknownFieldStoreRef | frame SoT; revisioned
RoadToFrameTransferPackage | schemaVersion, packageId, createdAt, sourceDocumentRef/revision/checksum, coordinateContext, unitContext, capabilityFlags, selection, geometry collections, provenance[], contentChecksum | parametricSourceRefs, diagnostics, extensions, unknownFieldStoreRef | immutable road snapshot
TransferRecord | schemaVersion, recordId, package ref/checksum, source ref/revision/checksum, target document, beforeRevision, status, transform, mappings[], accepted/rejected operations, conflicts[], diagnostics[], actor/time, contentChecksum | afterRevision, inversePatchRef, approval, failure, extensions | append-only integration record
CoordinateContext | schemaVersion, contextId, frameType, handedness=`right`, axes, zDirection=`up`, origin, horizontalDatum status, verticalDatum status, sourceToWorld status/matrix, stationOffsetConvention | EPSG/CRS identifiers, geoid, notes | shared value; explicit unknown allowed but apply-blocking
UnitContext | schemaVersion, contextId, length=`m`, angle=`rad`; force/moment/area/inertia/modulus for mechanical payloads | sourceUnits, conversion factors for provenance | shared value; immutable
RevisionMetadata | schemaVersion, documentId, revisionId, createdAt, contentChecksum | parentRevisionIds[], sequence, actor, reason, migrationRecordRef | shared value; immutable
StableGeometryId | namespace, id, entityKind | aliases[], sourceRef | road-owned identity using shared primitive
ValidationResult | schemaVersion, status, diagnostics[] | evaluatedRevision/checksum, ruleSetVersion | shared protocol; immutable result
Diagnostic | code, severity, messageKey/message, jsonPointer | entityKind/entityId, sourcePointer, remediation | shared shape/domain code owner
UnknownFieldStore | sourceRawChecksum, sourceVersion classification, entries[] | rawPayloadRef, collision records | preservation infrastructure; immutable evidence
MigrationRecord | migrationId, adapterId/version, source raw/content checksums, source/target versions, target checksums, diagnostics, time | operator, approvals, split-document refs | append-only audit

8.3 Package v1 Geometry Collections

Collection | Shape | Cardinality in Package | `bridge-frame-v1` Apply
alignmentRefs | stable ID + parametric/reference metadata | required array, may be empty | >=1
stationRefs | stable ID + physical/display station ref | required array, may be empty | dependency-closed refs
substructures | semantic geometry + Point3/Polyline3 | required array, may be empty | support geometry required
bearingLines | Polyline3 + support ref | required array, may be empty | >=1 per required support line
spans | endpoints/support refs + length provenance | required array, may be empty | >=1
mainGirderCandidates | stable IDs + Polyline3/span refs | required array, may be empty | >=1
crossBeamCandidates | Polyline3/girder refs | required array, may be empty | optional capability
surfaceRegions | Polygon3; role deck/pavement/haunch/other | required array, may be empty | optional capability
roadRegions | Polygon3; role carriageway/sidewalk/median/other | required array, may be empty | optional capability
loadPlacementCandidates | Polygon3/Polyline3 + road refs | required array, may be empty | optional; never a frame load case

Point3 is finite x/y/z in the declared CoordinateContext. Polyline3 has >=2 ordered points.
Polygon3 has a closed, non-self-contradictory boundary; optional tessellation is derived evidence,
not the authoritative boundary. Every reference is a stable road ID, and all selected dependencies
must be present. Capability flags distinguish `available`, `not_available`, `not_requested`, and
`unsupported_source`; empty arrays alone are not interpreted as geometry.

8.4 Target Source-of-Truth Matrix

Data | Source of Truth | Shared Platform Role | Cross-Product Rule
Road geometry/stationing/profile/cross-section | RoadDesignDocument | primitives/validation only | immutable package snapshot
Bridge road-side geometry/regions/drawings | RoadDesignDocument | drawing/geometry primitives | package candidate data
FEM nodes/members/materials/sections/support mechanics | BridgeFrameAnalysisDocument | IDs/units only | never transferred as road truth
Loads/combinations/solver settings/results | BridgeFrameAnalysisDocument | envelope/checksum only | never road-mutated
Transfer history/mappings/conflicts | TransferRecord sequence | append/audit infrastructure | neither domain edits old records
Project membership | EngineeringProject | reference/transaction infrastructure | exact revisions/checksums
Viewer preferences | user/session store | render infrastructure | no domain persistence

9. Compatibility

9.1 Compatibility Matrix

Legacy Asset / Layer | Read | Target Mapping | Lossless Claim | Write Policy | Blocking Conditions
ProjectModel persisted JSON | YES via versioned adapter | Frame doc; valid liner extension may also seed Road doc; legacy trace becomes provenance | NO: mixed versioning/results/unknowns | target only; raw retained | invalid schema, unknown coordinate/ID for transfer
Frontend React runtime state | session only | no document migration; persisted result candidates require explicit adapter | NO | never serialized as target by assumption | stale/no checksum binding
Backend engine Model | recreated parser input | constructed from Frame doc for solve | N/A, not persistence | no migration write path | parser/solver validation failure
BridgeProject | YES via dedicated split adapter | geometry/cross-section/spans/lines -> Road candidate; loads/impact/material/section/mesh refs -> Frame/import configuration | NO: known-field reconstruction drops unknowns and line semantics can be ambiguous | target docs only; raw retained | ambiguous line ownership, coordinate/ID gaps
BridgeDefinition | YES via ownership-filter adapter | alignment/station/span/support/girder/cross-beam/deck geometry -> Road/package candidate; loads/bearing mechanics/material/section/mesh -> Frame | NO: mixed ownership and partial geometry | target docs only; raw retained | unresolved refs, coordinate/ID gaps
LINER draft 0.1/0.2/0.3 | YES for proven supported forms | Road doc with adapter version and source hash provenance | PARTIAL only; current strict unknown handling and no prior revision lineage | target only; original retained | unsupported/free-form draft, coordinate/ID gaps
Importer project current schema | YES if migration+validation pass | Road source/project candidate; bridge and conversion logs become provenance/attachments as classified | PARTIAL; UUID stability and strict schemas require evidence | target only; original retained | unsupported version, UUID collision, incomplete mapping review
Unsupported future target minor | read known fields + preserve unknown | same major target envelope | YES only for preserved bytes/pointers, not understood meaning | re-inject unknown unless collision | collision with newly known field
Unsupported future major/invalid | quarantine only | none until adapter | raw preservation only | no operational write/apply | adapter absent
Transfer package/record | exact schema/version read | no legacy reinterpretation | checksum-verifiable | immutable/append-only | checksum/version/context/ID failure

9.2 Unknown Field / Version Matrix

Input Classification | Preserve | Interpret | Operational Use | Save/Apply
Current exact version, valid | raw checksum + declared extensions/unknown store | all known | allowed | target write; unknown re-injected
Same major, future minor | raw bytes + JSON-Pointer unknown entries | known compatible fields only | read-only/preview with warning until validation policy permits | no apply if unknown touches dependencies; preserve on save
Supported older target version | immutable raw + migration record | after stepwise adapter | migrated copy only | atomic target commit after gates
Supported legacy format | immutable raw + adapter record | explicitly mapped subset | preview/migration only | target commit after gates; no legacy overwrite
Unsupported future major | entire raw payload | metadata/version only | quarantine | reject save-as-current and apply
Missing/invalid version or invalid JSON/schema | entire raw payload and parse diagnostics | none beyond safe sniffing | quarantine | reject
Unknown/new-known collision | raw + collision record | neither side silently wins | blocked resolution view | reject target save/apply until explicit migration

9.3 Route Compatibility Matrix

Incoming | Canonical | Direct Load / popstate | Query/Hash and IDs | Retirement
/pro/road | same | mount Road product | preserve | canonical
/pro/frame | same | mount Frame product | preserve | canonical
/pro | /pro/frame behavior | pre-dispatch alias; replaceState canonicalization may be deferred for saved behavior | preserve | OD6-04 policy
/pro/linear-coordinate | /pro/road | pre-dispatch redirect / same registry on popstate | preserve | OD6-04
/pro/liner | /pro/road/liner | pre-dispatch redirect | preserve | OD6-04
/pro/liner/setup, /edit, /result | matching /pro/road/liner suffix | direct/popstate equivalent | preserve | OD6-04
/pro/importer/** | /pro/road/importer/** | direct/popstate equivalent | preserve query/hash; percent-decode once and re-encode entity IDs | OD6-04
/pro/th/** | /pro/frame/th/** | direct/popstate equivalent | preserve | OD6-04
/pro/compare | /pro/frame/compare | direct/popstate equivalent | preserve | OD6-04
/th/output-targets, /th/run | /pro/frame/th matching suffix | redirect before `/pro` product gate | preserve | OD6-04
/compare | /pro/frame/compare | redirect before `/pro` product gate | preserve | OD6-04
unknown path | explicit not-found | never lobby fallback | retain path for diagnostics | N/A

Redirects use replaceState so an alias does not create an extra history entry; user navigation to a
new canonical screen uses pushState. The registry must canonicalize both initial location and every
popstate. Query and hash strings are byte-preserved; path entity IDs are decoded exactly once and
encoded on canonical output. Redirect loops and double encoding are rejected.

9.4 Migration Boundary

1. Detect format and version without mutating input.
2. Store original bytes, raw SHA-256, media type, source identifier, and detection diagnostics.
3. Validate against the exact source schema where available; classify unknowns/version.
4. Quarantine unsupported future-major, invalid, or ambiguous source; do not discard it.
5. Run a named, versioned, pure adapter on a copy. Split mixed legacy data by Stage 6 ownership.
6. Preserve unmapped fields in UnknownFieldStore and whole raw input; never fabricate engineering
   geometry, coordinate authority, stable identity, material, stiffness, or load meaning.
7. Validate each target contract, reference closure, checksums, coordinate context, ID uniqueness,
   and revision preconditions.
8. Show diagnostics/diff. Require explicit approval for warnings classified by the adapter.
9. Atomically commit all new target documents, EngineeringProject reference update, and
   MigrationRecord; on failure commit none.
10. Rollback is an inverse/new revision transaction. The immutable legacy source and migration
    record remain. There is no in-place downgrade and no dual write.

Legacy adapter ownership:
- ProjectModel adapter: frame domain, with road adapter invoked only for independently valid liner.
- BridgeProject and BridgeDefinition split adapters: integration boundary with road/frame validators.
- LINER/importer adapters: road domain.
- Backend Model: frame runtime adapter, not a migration source.
- Route aliases: application shell compatibility, no document conversion.

10. Risks

P0-7-01. Unknown legacy coordinate authority can create numerically plausible but wrong geometry.
Gate: D7-06/OD6-01 block apply; Stage 8 asymmetric benchmarks; no inferred default.

P0-7-02. Unstable/colliding IDs can overwrite or merge distinct geometry on re-import.
Gate: D7-06/OD6-02 block apply; alias evidence and one-to-many verification.

P0-7-03. Unknown-field loss during strict-schema migration can destroy future or vendor data.
Gate: D7-04 raw preservation before parse, collision block, atomic migration rollback.

P0-7-04. A dual-write or direct-mutation compatibility shortcut can create diverging truths.
Gate: D7-01/D7-11, forbidden dependency/write-path tests, exact revision preconditions.

P1-7-05. Mixed BridgeProject/BridgeDefinition ownership can route loads/mechanics into road truth
or geometry into frame truth. Gate: dedicated split adapters and negative ownership tests.

P1-7-06. Transfer preview could be mistaken for applyable completeness when advanced geometry is
absent. Gate: capability states plus named apply profile and explicit preflight.

P1-7-07. Current root routing can break saved time-history/compare links. Gate: pre-dispatch route
registry and full direct-load/popstate matrix.

P2-7-08. Indefinite aliases accumulate maintenance burden. Gate: OD6-04 release/telemetry evidence;
do not trade compatibility for an unevidenced cleanup.

11. Dependencies

Stage 8 depends on:
- D7-02 through D7-08 exact invariants for persistence, migration, and transfer matrices.
- OD6-01/02 evidence requirements as test categories, even though the decisions remain open.
- Route and unknown-field matrices for backward compatibility acceptance.

Stage 9 depends on:
- D7-01 and D7-09 to decide which current shared-looking modules are SPLIT/MOVE/REUSE.
- Compatibility rows remaining separated by persistence/runtime/parser layer.

Stage 10 depends on:
- P0 gates before any legacy-to-transfer or re-import phase.
- Migration framework, route compatibility, and no-dual-write preceding feature expansion.
- OD6-04 only before route removal, not before implementation begins.

12. Verification

Stage 7 defines the following contract-level verification obligations for Stage 8:
- Schema: required/optional, exact kind/version, finite values, reference closure, no domain leaks.
- Serialization: deterministic canonical checksum, raw checksum, save/reload, extensions/unknowns.
- Versioning: current, older supported, same-major future minor, future major, missing/invalid.
- Migration: source unchanged, repeat/idempotence, step failure, atomic split commit, rollback.
- Identity/revision: reorder, collision, alias, parent lineage, stale precondition, one-to-many.
- Coordinate/unit: non-zero-Z, skew/asymmetric, signs, m/rad, unresolved-context block.
- Transfer: empty capability collections, apply-profile preflight, dependencies, conflict, rollback.
- Ownership: negative tests for mechanics/results/viewer in road/package and road direct frame writes.
- Routes: canonical/alias/direct-load/popstate/query/hash/encoding/unknown/redirect-loop.
- Shared platform: dependency-direction checks plus drawing/DXF/viewer neutral fixtures.

## Stage Verdict

The shared platform, target document/transfer contracts, version and unknown-field policy,
migration boundary, route compatibility, and legacy asset policy are decided. The remaining P0
coordinate/ID choices have explicit fail-closed defaults and evidence gates and can be carried into
Stage 8 verification planning without reopening Stage 7 architecture.

STAGE7_VERDICT: COMPLETE
READY_FOR_STAGE8: YES
