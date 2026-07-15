# Stage 6: Target Architecture, Responsibility, and Road-to-Frame Contract

> **Authority:** Target decision. Current implementation facts remain authoritative only in
> [`docs/scoping/`](../../scoping/README.md). Manuals are semantic references, not implementation
> evidence. This document contains no source implementation.

Generated: 2026-07-15 (Asia/Tokyo)
Evidence HEAD: 21c8a93c41533f78c66c021db84931cd3aaed5db

1. Executive Summary

Stage 6 fixes the target as two product domains under one optional portfolio container:

  EngineeringProject
    |- roadDesign: RoadDesignDocument
    |- frameAnalyses: BridgeFrameAnalysisDocument[]
    `- transferRecords: RoadToFrameTransferRecord[]

RoadDesignDocument and BridgeFrameAnalysisDocument are separate systems of record. Neither
document is embedded as a mutable subtree of the other. EngineeringProject is an index and
transaction boundary, not a third engineering truth. Road-to-Frame integration is an explicit,
immutable, versioned RoadToFrameTransferPackage plus an append-only TransferRecord. Direct
mutation of the road document by the frame tool, and direct mutation of the frame document by
the road tool, are rejected.

The existing BridgeDefinition is useful evidence and a compatibility adapter input, but it is
not adopted as the target package unchanged: it mixes geometry, loads, material/section refs,
and mesh generation settings (frontend/src/bridgeDefinition/types.ts:140-190). The target
package transfers road-owned geometry and candidate regions only. Materials, stiffness,
bearing mechanics, springs, FEM numbering, load cases/combinations, analysis settings/results,
and Viewer state stay frame-owned.

Stage 6 architecture decisions are complete. Exact JSON Schema shapes, migration encoding,
and legacy coordinate inference tables remain Stage 7 work; numerical acceptance is Stage 8.

2. Scope

IN:
- Logical product split: Road Design Tool and Bridge Frame Analysis Tool.
- Ownership and source-of-truth boundaries for LINER/LDIST/HAUNCH/HOSO/GDRAW/TOOL and
  CONTROL/STATICS/INFLOAD/R-SPECTRUM/PRINT/DRAFT.
- Versioned Road-to-Frame package, first import, re-import, diff, conflict, partial adoption,
  one-to-many mapping, history, stale detection, and rollback policy.
- Coordinate, unit, stable geometry ID, revision, and provenance boundaries.
- Product entry and legacy/deep-link compatibility policy.

OUT:
- Source, UI, solver, schema, migration, route, feature flag, autosave, and test implementation.
- Final Stage 7 JSON Schema and migration codec.
- Numerical acceptance tolerances (Stage 8), asset disposition (Stage 9), implementation phases
  and PRs (Stage 10).

3. Inputs Reviewed

Planning authority in this directory:
- [decision_log.md](./decision_log.md)
- [open_decisions.md](./open_decisions.md)

Fact-freeze documents (all reviewed):
- [scoping README](../../scoping/README.md)
- [Stage 0-3 system facts](../../scoping/stage0-3_system_fact.md)
- [Stage 4 road scope](../../scoping/stage4_road_design_scope.md)
- [Stage 5 frame scope](../../scoping/stage5_frame_analysis_scope.md)
- [current architecture](../../scoping/architecture_current.md)
- [coordinate convention](../../scoping/coordinate_convention.md)
- [ID policy](../../scoping/id_policy.md)
- [feature gap matrix](../../scoping/feature_gap_matrix.md)
- [current responsibility split](../../scoping/responsibility_split.md)
- [current risks and unknowns](../../scoping/risks_and_unknowns.md)
- [scoping artifact index](../../scoping/SCOPING_ARTIFACT_INDEX.md)

Primary code/schema evidence:
- frontend/src/types.ts:3-196; schemas/project.schema.json:1-215
- frontend/src/App.tsx:86-177,208-250,521-538
- frontend/src/api/client.ts:54-63,173-224; frontend/src/projectMigration.ts:1-15
- backend/engine/model.py:17-239,317-513
- backend/app/main.py:27-41,84-119,307-421,924-1062
- frontend/src/liner/schema/types.ts:18-111,264-389
- frontend/src/liner/core/types.ts:20-25,127-185,221-486
- frontend/src/liner/core/pipeline/sourceRevision.ts:3-20
- frontend/src/liner/mapper/frameModelMapper.ts:14-103,270-318
- frontend/src/liner/importer/types.ts:14-153,186-274,341-347
- frontend/src/bridge/types.ts:1-100; backend/engine/bridge_model.py:13-134
- frontend/src/bridgeDefinition/types.ts:1-190
- frontend/src/bridgeDefinition/adapters/fromLinerBridge.ts:18-152,186-233,235-434
- frontend/src/bridgeDefinition/adapters/fromBridgeProject.ts:19-149,176-223
- frontend/src/bridgeDefinition/generator/structuralModelGenerator.ts:194-273
- frontend/src/main.tsx:10-34; frontend/src/timeHistory/routeRedirect.ts:1-21
- frontend/src/liner/uiPreparation.ts:7-41,290-315
- frontend/src/liner/importer/routes.ts:1-127

Manual references (target-function reference only, no bulk reuse):
- JIP-LINER manual: section 1.2 p.2 (program composition); section 1.5 p.7
  (LINER/HAUNCH/HOSO/GDRAW/LDIST data blocks); sections 5.2-5.8 pp.33-124
  (alignment, stations, height, piers, spans/girders, coordinate conversion, LDIST);
  section 6 pp.125-136 (HAUNCH); section 7 pp.137-142 (pavement thickness/HOSO);
  section 8 pp.143-156 (drawing/GDRAW); section 3.6 pp.27-29 (tools).
- SPACER operation manual: section 2.1 p.2 (six module switchers); section 6.1
  pp.19-33 (CONTROL/execution order/load combinations); section 6.2 pp.34-64
  (STATICS fixed load/influence generation, supports, node/member springs and releases);
  section 6.3 pp.65-101 (INFLOAD, grid, span, line, bearing line, road/sidewalk and live loads);
  section 6.4 pp.102-110 (R-SPECTRUM); section 6.5 pp.111-128 (PRINT combination/extraction);
  section 6.6 pp.129-177 (DRAFT drawings).

4. Current Facts Used

F1. Current ProjectModel persistence contract is the JSON shape in frontend/src/types.ts:158-196
and schemas/project.schema.json:1-215. Manual browser save serializes the ProjectModel state
directly (App.tsx:521-538); backend save/load stores and returns an opaque project dict
(backend/app/main.py:307-357). The migration only defaults top-level schemaVersion
(frontend/src/projectMigration.ts:3-15).

F2. Frontend runtime state is a separate layer. ProjectModel is one React state value, while
analysis result, comparison result, exports, selection, validation, running state, logs, panels,
and Viewer selections are separate useState values (App.tsx:91-138). commitProject clears
runtime results and selections (App.tsx:161-177). Only timeHistory is copied into ProjectModel
(App.tsx:148-158; frontend/src/types.ts:188-191).

F3. Backend engine Model is a parsed solver input, not the persistence source of truth. It omits
units, schemaVersion, liner metadata/trace, and most frontend state, while parsing model arrays
into frozen dataclasses (backend/engine/model.py:17-165,184-239). API requests copy/extract the
project before solver execution (backend/app/main.py:84-103).

F4. LINER has road geometry, stationing, profile, crossfall, cross sections, spans, piers,
cross beams, width points, sourceRevision, and provenance. Evidence:
frontend/src/liner/schema/types.ts:91-111,264-389 and
frontend/src/liner/core/types.ts:181-185,221-486.

F5. sourceRevision is SHA-256 of canonical JSON excluding computedAt/cachedIntermediate/uiState
(frontend/src/liner/core/pipeline/sourceRevision.ts:3-20). It is a content identity, not a full
revision lineage or transaction history.

F6. Existing LINER frame mapping already emits trace entries containing sourceRevision,
coordinatePolicyId, grid IDs, station, offset, span/pier, and generated frame entity ID
(frontend/src/liner/mapper/frameModelMapper.ts:46-66,98-103,270-318). This is a reusable
provenance seed but currently maps directly into ProjectModel entities.

F7. The LinerBridge adapter maps alignment refs, stations, spans, supports, girders, cross beams,
and a deck-width derivative; it leaves bearings and loads empty and uses default generation
settings (fromLinerBridge.ts:112-152,296-380). It flattens geometry into bridge-local semantics.

F8. BridgeProject mixes cross-section geometry, spans, lines, loads, impact factor, mesh, and
material/section IDs (frontend/src/bridge/types.ts:1-63). BridgeDefinition also mixes geometry,
loads, material/section refs, and mesh settings (bridgeDefinition/types.ts:103-190).

F9. The structural generator creates FEM node/member IDs from traversal counters and collapses
z to zero (structuralModelGenerator.ts:214-250). Legacy generator is also planar. FEM IDs are
not stable road geometry IDs (docs/scoping/id_policy.md:8-28,55-63).

F10. Viewer coordinate swapping is display-only; it must not enter transfer data
(docs/scoping/coordinate_convention.md:45-52,81-90).

F11. Root routing only sends /pro paths to App; root legacy redirects execute inside App and are
therefore unreachable for /th/run and /compare (main.tsx:30-33;
timeHistory/routeRedirect.ts:1-21; docs/scoping/risks_and_unknowns.md:8-14).

F12. Current roads support alignment/station/profile/crossfall/cross sections/drawing, while
LDIST/HAUNCH/HOSO/TOOL and multi-alignment/branching are absent or partial
(docs/scoping/stage4_road_design_scope.md:23-35,38-68,90-112).

F13. Current frame analysis has partial CONTROL/STATICS/INFLOAD/PRINT/DRAFT; springs, releases,
rigid offsets, full INFLOAD, static combinations, and most result persistence are absent
(docs/scoping/stage5_frame_analysis_scope.md:10-21,57-94,111-175,192-208).

5. Decisions

D6-01 [DECIDED] Two independent document truths.
- RoadDesignDocument owns road and bridge geometry design intent.
- BridgeFrameAnalysisDocument owns FEM mechanics, loads, analysis, results, and formal frame
  output intent.
- EngineeringProject references them and transfer records but cannot merge their mutation
  authority.

D6-02 [DECIDED] Product module responsibility.

Road Design Tool:
| Module | Target responsibility |
| LINER | alignment(s), stationing, profile, crossfall, cross-section composition, road/bridge geometry |
| LDIST | grid/girder distance and overhang calculation derived from road geometry |
| HAUNCH | haunch regions, rules, calculated geometry/thickness |
| HOSO | pavement regions, rules, calculated thickness |
| GDRAW | road/bridge geometry drawings, tables, DrawingDocument and DXF mapping |
| TOOL | road-domain calculators/converters that do not own analysis mechanics |

Bridge Frame Analysis Tool:
| Module | Target responsibility |
| CONTROL | validated execution graph, run selection, progress/cancel/history/stale state |
| STATICS | FEM nodes/members/materials/sections/support mechanics/springs/releases/offsets, fixed loads, static solve |
| INFLOAD | influence-line generation/use, frame-owned vehicle/load definitions, placement and envelopes |
| R-SPECTRUM | eigen/mass/spectrum/damping/modal combination |
| PRINT | frame result combination/extraction and report datasets/PDF/CSV |
| DRAFT | formal FEM/load/result drawings and frame DXF/plot output |

D6-03 [DECIDED] Explicit immutable package, not shared mutation.
RoadToFrameTransferPackage is a versioned road snapshot. Import creates a TransferRecord. Package
creation never changes a frame document; application never changes a road document.

D6-04 [DECIDED] Transfer only road-owned geometry and candidate ranges.
Transferred: alignment/station refs, coordinate/unit context, support/substructure geometry,
bearing-line geometry, spans, girder/cross-beam candidates, deck/pavement/haunch/road/sidewalk
regions when available, load-placement candidate regions, stable road geometry IDs, source
revision, and provenance.

Never transferred as authoritative frame values: material properties, section stiffness,
bearing mechanical constraints, springs, FEM node/member IDs, frame load cases/loads or
combinations, analysis conditions/results, and Viewer state. Road regions may seed candidate
placement but never create authoritative loads without frame-side acceptance.

D6-05 [DECIDED] Coordinate boundary.
- Package geometry is canonical SI, right-handed, z-up, length m, angle rad.
- CoordinateContext declares frameId, axis meanings/directions, origin, horizontal/vertical datum
  or explicit unknown, and the transform from source road coordinates to package world coordinates.
- Station/offset/height references accompany world coordinates where relevant.
- coordinatePolicyId alone is insufficient. Missing datum/transform is explicit, never guessed.
- Frame import performs the sole package-to-frame coordinate transform and records it.
- Viewer transforms are prohibited from package generation/import.

D6-06 [DECIDED] Unit boundary.
- UnitContext is mandatory even when all values are SI.
- Transfer v1 normalizes geometry to m and rad; source units and conversion provenance are recorded.
- Force, moment, modulus, area/inertia conventions are absent because mechanics do not transfer.

D6-07 [DECIDED] Stable geometry ID boundary.
- RoadDesignDocument assigns immutable IDs to transferable semantic geometry (alignment,
  station marker, support line, span, girder candidate, cross beam, region).
- IDs survive reorder, save/load, and recalculation; array indexes and FEM N/M counters are invalid.
- Importer UUIDs can be retained only after persistence and uniqueness validation; deterministic
  migration aliases are recorded for legacy/rebuilt data.
- Frame artifacts retain frame IDs. TransferRecord stores one road geometry ID to zero/one/many
  frame artifact IDs; package never dictates FEM numbering.

D6-08 [DECIDED] Revision boundary.
- Package carries sourceDocumentId, sourceRevisionId, sourceContentHash, parentRevisionId when
  available, createdAt, and package schema version.
- Current LINER sourceRevision can populate sourceContentHash, but cannot alone represent lineage.
- Frame document has its own revision. Applying a package creates a new frame revision and an
  append-only TransferRecord referencing before/after revisions.

D6-09 [DECIDED] First import/re-import/ownership.
- First import validates package/schema/coordinate/IDs, then creates road-derived geometry
  candidates in a dedicated imported-geometry ownership partition.
- Frame materials, stiffness, mechanics, loads, settings, results, and viewer state are preserved.
- Re-import is a three-way comparison: last accepted source baseline vs new package vs current
  frame-owned/imported representation.
- Unchanged source IDs are updated only when their imported geometry was not independently edited.
- Source change plus frame edit is a conflict; default is preserve frame and require explicit choice.
- Source deletion becomes a proposed removal, never an automatic cascade.

D6-10 [DECIDED] Partial adoption and atomicity.
- Diff items are stable-ID keyed add/update/delete operations with dependencies.
- User may accept a dependency-closed subset. The subset is validated and committed atomically.
- Accepted/rejected/conflicted items and reasons are recorded. No direct per-field silent overwrite.

D6-11 [DECIDED] History, stale, and rollback.
- TransferRecord is append-only and records package hash, source/frame revisions, mappings,
  transform, accepted/rejected/conflicted operations, diagnostics, actor/time, and inverse patch.
- A package whose source revision differs from an accessible current road revision is stale and
  blocked by default. Offline/unavailable source is marked unverified and requires explicit approval.
- Rollback is a new frame transaction applying the stored inverse patch after precondition checks;
  it does not rewind or edit the road document and cannot discard later unrelated frame edits.

D6-12 [DECIDED] BridgeDefinition compatibility status.
BridgeDefinition remains a legacy/intermediate adapter source during migration. It is not the
target road truth and not the transfer package. Geometry fields can be reused; loads,
material/section refs, bearing mechanics, and generation settings are filtered or frame-owned.

D6-13 [DECIDED] Route policy.
- Canonical product entries: /pro/road and /pro/frame.
- /pro remains a compatibility alias to /pro/frame (preserves current behavior).
- Existing /pro/linear-coordinate, /pro/liner/**, and /pro/importer/** redirect to equivalent
  /pro/road/** routes, preserving query/hash and entity IDs.
- Existing /pro/th/** and /pro/compare redirect to /pro/frame/**.
- Root legacy /th/output-targets, /th/run, and /compare redirect before Root product dispatch.
- Unknown routes show an explicit not-found/recovery view; they must not silently fall back to Lobby.
- Redirects remain compatibility adapters; deprecation date is an Open Decision, not a reason to
  break existing deep links.

6. Recommended Items

R6-01 [RECOMMENDED] Package conceptual envelope (Stage 7 fixes exact schema):
{
  schemaVersion, packageId, createdAt,
  source: { roadDocumentId, revisionId, contentHash, parentRevisionId },
  coordinateContext, unitContext,
  selection: { bridgeIds, alignmentIds },
  geometry: { alignmentRefs, stations, substructures, bearingLines, spans,
              girderCandidates, crossBeamCandidates, surfaceRegions,
              roadRegions, loadPlacementCandidates },
  provenance[], diagnostics[]
}

R6-02 [RECOMMENDED] Separate geometry payload from operation/diff payload. A package is a snapshot;
the frame importer computes ChangeSet using the last TransferRecord. Do not encode UI decisions
inside the source package.

R6-03 [RECOMMENDED] Make coordinate context and source revision hard validation gates before any
geometry application. Allow preview/diff of invalid packages, but no apply.

R6-04 [RECOMMENDED] Persist the road document and frame document independently even when stored in
one physical EngineeringProject archive; each keeps document ID/schema/revision/checksum.

7. Open Decisions

- OD6-01 (P0, Stage 7 gate): authoritative CRS/datum and local-to-world transform registry for
  legacy LINER/BridgeProject data where coordinatePolicyId is only a string or datum is absent.
- OD6-02 (P0, Stage 7/10 gate): exact deterministic migration/alias algorithm when existing
  importer UUIDs or generated IDs collide or represent the same semantic geometry.
- OD6-03 (P1, Stage 7 gate): exact required/optional fields and cardinalities for the first
  RoadToFrameTransferPackage schema, especially 3D bearing lines and surface-region tessellation.
- OD6-04 (P2, release policy): redirect support duration and telemetry/usage threshold for retiring
  old deep links. Redirect implementation itself is decided and not open.

8. Main Matrices / Architecture

Target source of truth:
| Information | Road SoT | Frame SoT | Transfer behavior |
| Alignment/station/profile/crossfall | RoadDesignDocument | reference only | snapshot/reference |
| Abutment/pier/support-line geometry | RoadDesignDocument | imported candidate + mapping | transfer |
| Span/girder/cross-beam/deck geometry | RoadDesignDocument | imported candidate + mapping | transfer |
| Pavement/haunch/road/sidewalk region | RoadDesignDocument | reference/candidate | transfer when available |
| Load placement range | RoadDesignDocument geometry candidate | accepted placement intent | candidate only |
| Material/section stiffness | none | BridgeFrameAnalysisDocument | never transfer |
| Bearing mechanical condition/spring/release | none | BridgeFrameAnalysisDocument | never transfer |
| FEM nodes/members/numbering | none | BridgeFrameAnalysisDocument | never transfer |
| Load cases/loads/combinations | none | BridgeFrameAnalysisDocument | never transfer |
| Analysis settings/results | none | BridgeFrameAnalysisDocument | never transfer |
| Viewer state | UI/session | UI/session | never transfer |
| Transfer audit/mapping | EngineeringProject TransferRecord | referenced by frame revision | append-only |

Transfer candidate availability classification:
| Candidate | Classification | Current evidence / gap |
| Alignment and station refs | CURRENTLY AVAILABLE | LinerDomainDraft + CanonicalIntermediate; types.ts:91-103, core/types.ts:470-483 |
| Coordinate/unit information | DERIVABLE, INCOMPLETE | CoordinateSystemMarker and importer datum exist; explicit transform/unknown policy needs target fields |
| Abutment/pier geometry | CURRENTLY AVAILABLE, PARTIAL 3D | PierDraft/PierResult and importer supports; full shape not represented |
| Bearing-line geometry | DERIVABLE | Pier supportLinePointIds + grid points/bearingOffsets; canonical bearing-line entity needed |
| Spans | CURRENTLY AVAILABLE | SpanDraft/SpanResult/importer Span |
| Main girder candidates | CURRENTLY AVAILABLE / DERIVABLE | GirderLineSet and longitudinal grid lines/frame hints |
| Cross-beam candidates | CURRENTLY AVAILABLE | CrossBeamDraft/importer CrossBeam |
| Deck region | DERIVABLE, WIDTH-LEVEL | cross sections/width points; current adapter derives scalar width, not full surface |
| Pavement region/thickness | FUTURE ADDITION REQUIRED | HOSO absent in current implementation |
| Haunch region/geometry | FUTURE ADDITION REQUIRED | HAUNCH absent in current implementation |
| Road/sidewalk regions | DERIVABLE | cross-section offset roles include lane/sidewalk; canonical region polygons absent |
| Load placement candidate ranges | DERIVABLE | road/sidewalk roles and importer lines; canonical range entity absent |
| Stable geometry IDs | CURRENTLY AVAILABLE, CONTRACT GAP | IDs/provenance exist; immutability/collision migration not universal |
| Source revision | CURRENTLY AVAILABLE, LINEAGE GAP | SHA-256 sourceRevision exists; parent/history absent |
| Provenance | CURRENTLY AVAILABLE, EXTENSION NEEDED | grid/source refs and linerTrace exist; package-level provenance absent |
| Package/TransferRecord/diff/conflict/rollback | FUTURE ADDITION REQUIRED | no target package or transaction record exists |

9. Compatibility

- Existing project.json opens through current migrateProject before target migration; Stage 7 must
  preserve unknown fields or quarantine them, because current schema often uses additionalProperties
  false while backend save/load is opaque.
- Legacy ProjectModel persistence, React runtime state, and backend Model must remain three distinct
  compatibility layers. A schema adapter must never serialize transient UI state or treat backend
  dataclasses as the complete project archive.
- Existing BridgeProject CRUD files remain readable through an adapter. Their loads/mechanics are
  mapped to the frame side, while geometry becomes a road import or transfer seed; no lossless
  claim is made until Stage 7 matrix proves it.
- Existing BridgeDefinition is accepted through a compatibility adapter with ownership filtering.
- Route redirects preserve query/hash/deep-link identifiers and must execute before product routing.

10. Risks

P0:
- Coordinate ambiguity can rotate/mirror/flatten bridge geometry. Mitigation: mandatory explicit
  CoordinateContext, asymmetric fixtures, transform audit, and no apply on unknown mapping.
- Re-import could overwrite frame edits or cascade deletions. Mitigation: three-way stable-ID diff,
  preserve-by-default conflict, atomic dependency-closed apply, inverse patch, revision preconditions.
- Stable-ID collision/reassignment can make rollback or one-to-many mapping unsafe. Mitigation:
  immutable semantic IDs, migration aliases, uniqueness validation, TransferRecord mapping.
- Existing broken root legacy redirects can strand saved deep links. Mitigation: redirect before Root.

P1:
- BridgeProject/BridgeDefinition/ProjectModel responsibility overlap may cause double truth.
- Road surface representations are currently scalar/line based and insufficient for full 3D regions.
- Exact legacy migration and schema compatibility are not yet fixed (Stage 7 gate).
- Frame results remain mostly runtime-only, but result persistence is frame-owned and not solved by
  Road-to-Frame transfer.

11. Dependencies

Stage 7 must consume D6-01 through D6-13 and fix:
- EngineeringProject/document/package/record schema and migrations.
- CoordinateContext, UnitContext, RevisionMetadata, stable ID and unknown-field contracts.
- compatibility matrix for ProjectModel/BridgeProject/BridgeDefinition/LINER drafts/routes.

Stage 8 depends on Stage 7 schema and must validate asymmetric transforms, units/signs, stable-ID
re-import, conflict/partial apply/rollback/stale, and no-overwrite invariants.

Stage 9 maps current adapters/types/storage/routes to these ownership boundaries.
Stage 10 orders P0 contracts and migrations before feature implementation.

12. Verification

Architecture verification obligations:
- Cross-checked fact-freeze claims against current type/schema/adapter/route code.
- Confirmed manual module/function boundaries by table of contents and relevant sections.
- Distinguished persistence ProjectModel, frontend runtime state, and backend solver Model.
- Classified every requested transfer candidate as available/derivable/future.
- Verified forbidden payload categories do not need road authority.
- Confirmed current sourceRevision, linerTrace, stable-ish IDs, and their gaps.

Stage 8 acceptance requirements carried forward:
- Non-symmetric, non-zero-Z, non-origin coordinate fixtures.
- SI conversion and sign convention assertions at every boundary.
- Stable-ID reorder/save/load/re-import and one-to-many mapping tests.
- Conflict preservation, dependency-closed partial apply, stale block, and rollback preconditions.
- Assertion that frame mechanics/results/viewer state remain unchanged after road re-import.

## Stage Verdict

All Stage 6 conceptual deliverables are decided with evidence. Open items are exact Stage 7
contract/migration details and do not reopen the two-product or ownership architecture.

STAGE6_VERDICT: COMPLETE
READY_FOR_STAGE7: YES
