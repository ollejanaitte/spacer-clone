# Stage 9: Current Asset Mapping and Disposition

> **Authority:** Target disposition applied to current assets documented by
> [`docs/scoping/`](../../scoping/README.md). Local-only Bridge Modeler V2 proposal material is
> outside the evidence baseline, is not committed in this planning branch, and was not copied.

Generated: 2026-07-15 (Asia/Tokyo)
Evidence HEAD: 21c8a93c41533f78c66c021db84931cd3aaed5db

1. Executive Summary

Stage 9 maps current code, schemas, tests, examples, and documentation to the Stage 6/7 target
architecture without changing ownership. Disposition describes how an asset is migrated; it does
not declare a system of record. In particular, REUSE means an algorithm, fixture, or mechanism can
be used after qualification. It never means the current document becomes target truth.

The main result is that the current mixed bridge paths cannot move intact:

- `frontend/src/bridge/**` combines road cross-section/spans/lines with impact/load/FEM workflows.
- `frontend/src/bridgeDefinition/types.ts` combines road geometry references with support/bearing
  mechanics, material/section references, loads, and mesh settings.
- BridgeDefinition adapters fabricate some defaults, and its generator turns unknown elevation into
  z=0 while directly emitting ProjectModel.
- `frontend/src/liner/**` contains strong road algorithms but also frame-generation hints, direct
  ProjectModel mapping/merge, Viewer adapters, and legacy ProjectModel persistence extensions.
- `frontend/src/viewer/**` combines reusable rendering mechanism with ProjectModel/AnalysisResult,
  frame result semantics, selection/camera state, and a compatibility axis swap.
- frontend ProjectModel persistence, React runtime state, and backend engine Model remain three
  separate assets and receive different dispositions.

Therefore BridgeProject, BridgeDefinition, direct LINER-to-ProjectModel mappers, and mixed backend
bridge generation are SPLIT. Their legacy contracts remain read-only adapter inputs while target
writes use RoadDesignDocument, BridgeFrameAnalysisDocument, RoadToFrameTransferPackage, and
TransferRecord. No current asset is approved for REMOVE, because retention windows, target rollout,
and migration evidence are not complete. No source asset requires a wholesale REWRITE decision at
this stage; new target contracts are new modules, while existing mixed assets are split behind
compatibility adapters. `linerFrameStl` is UNKNOWN because no approved target product ownership or
retention requirement was found.

The local-only Bridge Modeler V2 material, including `Bridge_Modeler_V2_改良方針案.txt`, was reviewed
only as a future proposal outside the evidence baseline. It is not committed in this planning branch
and is not current implementation fact or governing target design. Compatible concepts may be
re-evaluated, but D6-D10 supersede conflicting ownership, document, migration, test, and roadmap
proposals.

Stage 9 is complete and ready for Stage 10 sequencing.

2. Scope

IN:
- Current-to-target mapping for road, frame, integration, shared platform, and compatibility assets.
- File/subdirectory-level disposition for LINER, Bridge, BridgeDefinition, Viewer, exports,
  frontend persistence/runtime, backend parser/solver/result/API, and schemas.
- Field-level Bridge Modeler split between road geometry and frame mechanics/FEM.
- Legacy read/write/route/document/schema deprecation entry/exit/rollback/retention.
- Stage 8-qualified reuse classification for tests, examples, drawings, DXF, reports, and manuals.
- Documentation disposition, including reviewed future Bridge Modeler V2 proposal material outside
  the evidence baseline and not committed in this planning branch.

OUT:
- Any source, test, schema, route, dependency, feature flag, or formal-doc change.
- Stage 10 implementation phases, PR order, or readiness verdict.
- Deletion of any legacy or proposal material.

3. Inputs Reviewed

Accepted decisions and verification inputs:
- [Stage 6 target architecture](./stage6_target_architecture.md)
- [Stage 7 shared platform and contracts](./stage7_shared_platform_and_contracts.md)
- [Stage 8 verification plan](./stage8_verification_plan.md)
- [decision log](./decision_log.md)
- [open decisions](./open_decisions.md)
- [current architecture](../../scoping/architecture_current.md),
  [current responsibility split](../../scoping/responsibility_split.md),
  [current feature gaps](../../scoping/feature_gap_matrix.md),
  [Stage 4 road facts](../../scoping/stage4_road_design_scope.md),
  [Stage 5 frame facts](../../scoping/stage5_frame_analysis_scope.md), and
  [current risks and unknowns](../../scoping/risks_and_unknowns.md)

Current source/schema inventory reviewed:
- frontend/src/liner/{schema,core,adapters,mapper,headless,importer,drawing,dxf,exports,components,pages}
- frontend/src/bridge/{types,conversion,api,BridgeWizard,steps,viewer}
- frontend/src/bridgeDefinition/{types,adapters,generator,semanticParity,featureFlags,goldens,fixtures}
- frontend/src/viewer/{types,SceneBuilder,renderers,coordinateTransform,animation,comparison,controls}
- frontend/src/exports/**
- frontend/src/types.ts, App.tsx, api/client.ts, projectMigration.ts, main.tsx
- backend/engine/**, backend/app/**
- schemas/{project,bridge,bridge-definition,generated-fem,result}.schema.json

Test/example/document inventory reviewed:
- 162 frontend source test/spec files, 5 frontend E2E specs, and 28 backend pytest files by path
- examples/** including liner, verification, dynamic, bridge, and spacer-reference groups
- docs/liner/**, docs/design/**, docs/verification/**, docs/handover/**, root MVP specs
- JIP-LINER and SPACER manuals as semantic references only
- Local-only Bridge Modeler V2 proposal material, reviewed solely as a future proposal outside the
  evidence baseline and not committed in this planning branch

Important source evidence:
- `liner/core/types.ts` includes road geometry plus `FrameGenerationHintResult` and frame preparation.
- `liner/mapper/frameModelMapper.ts:14-103,270-318` creates frame drafts/trace from road output.
- `liner/headless/**` imports ProjectModel and removes/merges frame entities directly.
- `bridge/types.ts:1-100` combines road geometry, loads, generation summary, ProjectModel/result.
- `bridgeDefinition/types.ts:33-190` combines geometry, mechanics refs, loads, mesh settings.
- `fromLinerBridge.ts:28-35,65-74,122-151` can use default deck width/settings/context.
- `structuralModelGenerator.ts:183-188,194-321` reports incomplete coordinate handling, sets z=0,
  generates numbered nodes/members, mechanics/loads, and emits ProjectModel.
- `backend/engine/bridge_model.py:13-134` reconstructs known BridgeProject fields.
- `backend/app/main.py` contains project, analysis, reporting, bridge CRUD, FEM generation, viewer,
  and application-shell endpoints in one module.

4. Current Facts Used

CF9-01. LINER is the strongest current road-domain implementation, but its types/pipeline are not
purely road-owned because frame-generation hints and direct FEM preparation coexist.

CF9-02. ProjectModel references appear in LINER project adapters, Viewer adapter, headless merge,
validation, and STL export. These paths implement direct road-to-frame mutation/generation and do
not satisfy D6/D7 transfer transaction semantics.

CF9-03. Importer has distinct domain types/normalization/validation, storage/migration/recovery,
UI/routes/services, preview, and Phase 3.5/export adapters. It must not be disposed as one glob.

CF9-04. Drawing low-level geometry/primitives/paper/affine transforms and DXF document/serializer
are reusable mechanisms. StationAxis, formal road builders, presets, and layer mappings carry road
meaning. This confirms D7-09 SPLIT boundaries.

CF9-05. BridgeProject fields `crossSection` and `spans` are road geometry; impact/load/generation
fields are frame-owned. `lines` mixes traffic/load/reference semantics and requires per-record
classification. `generatedFem` is derived legacy summary/cache, not target truth.

CF9-06. BridgeDefinition support `kind` and bearing `type` express mechanics, while station/skew/
substructure position express road geometry. Girder/crossBeam geometry and material/section refs are
mixed within the same records. The interface cannot become either target document unchanged.

CF9-07. BridgeDefinition adapters are pure/deterministic in useful ways, but they can fabricate a
10 m deck width, bridge-local context, generation defaults, or missing arrays. Such output is not an
applyable transfer oracle under D7-07 without capability/diagnostic conversion.

CF9-08. Both BridgeDefinition and backend BridgeProject generators directly emit ProjectModel and
choose FEM/material/section/load behavior. The target sequence requires package export, frame-side
apply, explicit mechanics, and TransferRecord instead.

CF9-09. Viewer renderers know ProjectModel and AnalysisResult, and coordinateTransform carries
display-only axis swap/localStorage compatibility. Low-level Three.js/render mechanisms can be
shared; frame result adapters and Viewer session state cannot be domain/shared truth.

CF9-10. ProjectModel persistence in `types.ts`, React runtime/result/session state in App, and
backend typed Model/parser are distinct. Current backend Model is runtime solve input and remains
useful after a target FrameDocument adapter; it is not itself a persistence migration destination.

CF9-11. Backend static/dynamic/influence/moving-load algorithms and result/report code are separable
frame assets, but `model.py`, bridge generator/model, and monolithic `app/main.py` mix parsing,
validation, compatibility, application, and runtime responsibilities.

CF9-12. Existing tests/examples have unequal oracle quality per Stage 8. Beam closed-form fixtures
are O1 candidates; semantic parity is a transitional O5/regression asset; portal/truss/L-frame lack
complete independent expected values; spacer-reference has no actual result corpus.

CF9-13. The local-only Bridge Modeler V2 proposal, outside the evidence baseline and not committed in
this planning branch, describes future implementation and proposes its own document/layers/roadmap/
locked decisions. It is future-design material, not current fact.
Some separation/testing concepts align with D6-D8, while a unified bridge document, ProjectModel
generation, ownership details, locked decisions, and PR sequence require reconciliation.

5. Decisions

D9-01 | DECIDED | Target module taxonomy
Decision: map assets to `Road.Domain`, `Road.App`, `Frame.Domain`, `Frame.Engine`, `Frame.App`,
`Integration.RoadToFrame`, `Shared.Platform`, or `Compatibility.Legacy`. These names are conceptual
ownership modules, not required filesystem paths. Rationale: disposition needs a stable target map.
Impact: every asset row has one primary target and explicit dependencies. Compatibility: legacy
adapters may depend on both public contracts but own neither. Verification: dependency-direction
tests under G0/G2/G3. Revisit only for namespace naming, not ownership.

D9-02 | DECIDED | Mixed assets default to SPLIT
Decision: any asset containing road truth plus frame mechanics, domain plus Viewer state, generic
mechanism plus domain mapping, or target plus legacy write behavior is SPLIT. Whole MOVE/KEEP needs
single-responsibility evidence. Rationale: D6/D7 prohibit responsibility leakage. Impact: Bridge,
BridgeDefinition, direct LINER mapping, Viewer, backend model/API, and mixed schemas split.
Compatibility: legacy facade may remain while internals separate. Verification: G0 forbidden imports
and T8-08 ownership negatives. Revisit only with evidence that the asset is actually single-purpose.

D9-03 | DECIDED | Preserve road algorithms, remove frame hints from road core
Decision: MOVE qualified horizontal/station/vertical/cross-section algorithms to Road.Domain;
SPLIT frame-generation hints/preparation into transfer geometry candidates and deprecated direct
FEM mapping. Rationale: road calculations are strong but frame preparation violates D6 boundary.
Impact: road outputs gain target IDs/context/revision; frame IDs leave road core. Compatibility:
legacy mapper remains read/compare path during migration. Verification: R8 and T8 suites.
Revisit in Stage 9 only if a type is proven road-only.

D9-04 | DECIDED | Split Importer by domain, infrastructure, and export boundary
Decision: road extraction/normalization/review/UI move to Road.App; generic raw storage/migration
mechanisms move to Shared.Platform; importer version adapters remain Compatibility.Legacy; output to
frame becomes RoadToFrame package generation, not ProjectModel. Rationale: current importer spans
four responsibilities. Impact: preserve reviewed source/provenance and raw bytes. Compatibility:
current 0.1 reader stays. Verification: R8-17 and M8 suites. Revisit only per submodule evidence.

D9-05 | DECIDED | Drawing and DXF split at domain mapping
Decision: MOVE low-level drawing geometry/paper/affine and DXF model/validation/serializer to shared
platform. MOVE road formal builders/station axes/presets to Road.GDRAW; future frame DRAFT owns its
builders. SPLIT shared document types only where current enums/station data are road-specific.
Rationale: D7-09 and current imports. Impact: both products share mechanisms without sharing domain
drawings. Compatibility: current road output remains supported. Verification: O8/G6.
Revisit Stage 9 disposition only with dependency evidence.

D9-06 | DECIDED | BridgeProject becomes split legacy input
Decision: SPLIT BridgeProject geometry to road migration, loads/impact/generation to frame migration,
and ambiguous lines to quarantine/classification. Deprecate target writes only after target writers
and migration pass. Rationale: same object mixes product ownership and known-field serialization can
drop unknowns. Impact: raw retention and atomic multi-document split. Compatibility: read adapter
and legacy UI rollback window remain. Verification: M8-02..10, T8-08. Revisit only if a field mapping
is corrected with evidence; BridgeProject never becomes target SoT.

D9-07 | DECIDED | BridgeDefinition is split compatibility intermediate
Decision: SPLIT road geometry/provenance from mechanics/material/section/load/mesh fields. Keep its
reader and parity assets for migration/regression, but DEPRECATE it as a target package/generator
contract. Rationale: D6-12 and mixed field evidence. Impact: no fourth target document; arbitrary
params and ambiguous mechanics are quarantined. Compatibility: feature-flag path remains until G2/
G3/G4 parity gates. Verification: Bridge split, M8 and T8. Revisit only if a new schema exactly
implements D7 package, which would be a new versioned contract rather than this interface unchanged.

D9-08 | DECIDED | Split direct generators into export/apply/runtime adapters
Decision: extract road-owned geometry mapping into package exporter, frame-owned discretization into
frame apply/model builder, and audit mapping into TransferRecord. Deprecate direct LINER/Bridge/
BridgeDefinition-to-ProjectModel mutation paths after target transfer passes. Rationale: current
generators mix defaults, IDs, mechanics, and mutation. Impact: new preflight/conflict/rollback layer.
Compatibility: direct paths remain comparison-only behind rollout control. Verification: T8/G3 and
F8/G4. Revisit only with an equivalent immutable transaction architecture.

D9-09 | DECIDED | Separate ProjectModel persistence, App runtime, and backend Model
Decision: ProjectModel persistence becomes a read-only legacy contract; target frame fields migrate
to BridgeFrameAnalysisDocument. App runtime/session/result state moves to Frame.App/UserSession and
is not migrated by assumption. Backend Model remains a frame runtime structure constructed through
a target adapter; split its legacy ProjectModel parser from runtime validation/types.
Rationale: D7 compatibility rows and current layer evidence. Impact: no runtime-as-persistence claim.
Compatibility: legacy JSON remains readable. Verification: M8/N8 and F8. Revisit only storage shape,
not layer distinction.

D9-10 | DECIDED | Split backend API and bridge generator boundaries
Decision: MOVE solver algorithms to Frame.Engine; SPLIT `model.py` parser/runtime; SPLIT bridge model/
generator into legacy reader, road/frame migration adapters, and frame model builder candidates;
SPLIT `app/main.py` by application controllers and compatibility endpoints. Rationale: monolithic
API and mixed bridge generator violate target module direction. Impact: target endpoints transact
documents/revisions; old endpoints deprecate. Compatibility: facade routes remain until exit gates.
Verification: F8, M8, N8 and G0/G2/G4/G7. Revisit only after dependency graph evidence.

D9-11 | DECIDED | Viewer and exports remain frame adapters, not shared truth
Decision: SPLIT Viewer core/render mechanisms from ProjectModel/result adapters and session state;
MOVE result CSV/PDF/member-force reporting to Frame.PRINT. Viewer is not formal DRAFT. Road previews
consume shared drawing/render primitives via road adapters. Rationale: D7-09/D7-12. Impact: result
checksum/staleness enforced before export/render. Compatibility: axis-swap preference remains a
legacy display setting. Verification: O8 and N8-02. Revisit only output implementation, not ownership.

D9-12 | DECIDED | Test and example disposition follows Stage 8 oracle class
Decision: REUSE O1/O2-qualified assets; retain O5/regression assets with explicit limitations;
do not label unqualified goldens or proposal fixtures as numerical truth. Rationale: Stage 8 D8-01/
D8-04/D8-10. Impact: test moves follow target module, while compatibility fixtures stay with
adapters. Compatibility: no golden deletion. Verification: benchmark manifest and traceability.
Revisit after oracle qualification changes a fixture class.

D9-13 | DECIDED | Documentation authority hierarchy
Decision: `docs/scoping` remains immutable current fact; formal Stage 6-10 docs will govern target
architecture. Existing specs/design/handover remain historical/current-module references. Untracked
Bridge Modeler V2 proposals are retained as proposals, with compatible content re-evaluated and
conflicts superseded; their locked status is not authoritative for this scope. Manuals remain
semantic references, not numerical oracles. Rationale: prevent current/target/proposal mixing.
Impact: future docs link or mark supersession rather than copy proposal bodies. Compatibility:
history retained. Verification: documentation index and decision-ID crosswalk.
Revisit only by an explicit approved documentation-governance decision.

D9-14 | DECIDED | No REMOVE or wholesale REWRITE in Stage 9
Decision: no current asset is REMOVE because substitute, migration, retention, and exit evidence are
not all complete. No asset receives wholesale REWRITE; mixed assets SPLIT and new target contracts
are implemented as new modules. Use UNKNOWN where ownership/requirement evidence is absent.
Rationale: destructive disposition without gates risks data/history loss. Impact: Stage 10 schedules
deprecation/retention, not deletion. Compatibility: rollback assets remain. Verification: legacy
matrix exit gates. Revisit REMOVE only after all listed criteria pass; REWRITE needs an asset-specific
proof that contract/algorithm/tests cannot be safely extracted.

6. Recommended Items

R9-01 | RECOMMENDED | Build architecture dependency checks before moving code: Road.Domain imports
Shared only; Frame.Domain/Engine imports Shared only; Integration consumes public Road/Frame
contracts; Compatibility adapters cannot expose mutation APIs as target services.

R9-02 | RECOMMENDED | Create legacy adapter manifests at field level with raw JSON pointers,
ownership result, target pointer, confidence, diagnostic, and migration-suite case.

R9-03 | RECOMMENDED | Move tests with the owned algorithm, but duplicate no fixture silently.
Compatibility tests keep original raw files; target tests reference a qualified benchmark manifest.

R9-04 | RECOMMENDED | Treat old feature flags as rollback controls only during bounded transition.
Do not use flags to dual-write BridgeProject/BridgeDefinition/ProjectModel and target documents.

7. Open Decisions

Carried decisions keep their Stage 8 status:
- OD6-01 P0 coordinate authority: affected adapters default quarantine/apply block.
- OD6-02 P0 stable ID aliases: collision/default generated IDs block apply.
- OD6-04 P2 route retirement: aliases remain indefinitely.
- OD8-01 P1 tolerance register, OD8-02 P1 reference corpus, OD8-03 P1 performance budgets,
  OD8-04 P2 visual environments: owners/evidence/gates unchanged.

OD9-01 | OPEN | P1 | Ambiguous legacy bridge field semantics
Question: how are each BridgeProject `lines` record and arbitrary BridgeDefinition
`superstructure.params`/mechanics-like values classified without guessing road region versus frame
load/mechanics meaning?
Default: retain raw input; classify known `reference` geometry as road candidate only with coordinate
evidence; quarantine ambiguous traffic/load lines and arbitrary params; do not emit applyable package
or frame loads from them.
Owner: road bridge-geometry owner plus frame load/model owner and migration owner.
Evidence gate: representative legacy corpus, field provenance/UI creation path, sign/unit mapping,
and approved M8-07/M8-10/T8-08 cases.
Decision gate: before affected BridgeProject/BridgeDefinition migration exits G2/G3/G4.

OD9-02 | OPEN | P3 | LINER frame STL product ownership and retention
Question: is `frontend/src/liner/exports/linerFrameStl.ts` a supported road preview, frame export,
developer diagnostic, or obsolete spike?
Default: UNKNOWN; retain untouched and exclude from target release claims.
Owner: road/frame product owner.
Evidence gate: usage/route/API references, user requirement, replacement format, and fixture purpose.
Decision gate: before moving, deprecating, or removing the asset.

8. Main Matrices / Architecture

8.1 Target Module Legend

Module | Owns
Road.Domain | RoadDesignDocument, LINER/LDIST/HAUNCH/HOSO/GDRAW/TOOL calculations and road bridge geometry
Road.App | Road UI, importer/review, road persistence commands, drawing workflows
Frame.Domain | BridgeFrameAnalysisDocument, FEM/material/section/support mechanics/load/result semantics
Frame.Engine | STATICS/INFLOAD/R-SPECTRUM numerical runtime and runtime Model
Frame.App | CONTROL, Viewer frame adapters/session UI, PRINT/DRAFT workflows
Integration.RoadToFrame | package export/import, diff/conflict/apply, TransferRecord, mapping/rollback
Shared.Platform | coordinate/unit/ID/revision/validation primitives; Drawing/DXF/file/migration/render mechanisms
Compatibility.Legacy | read adapters, raw/quarantine, legacy routes/facades/schemas; no target ownership

8.2 Migration Risk / Stage 10 Dependency Legend

Risk | Priority | Stage 8 evidence/gate | Required Stage 10 dependency
MR0-C coordinate/unit | P0 | R8/T8-01/02/M8-10; G0/G2/G3 | S10-CONTRACT before migration/transfer
MR0-I identity/revision | P0 | T8-03/04/M8-05/10; G2/G3 | S10-CONTRACT before transfer
MR0-D raw/unknown/data loss | P0 | M8-01..09/N8-01/05; G2/G7 | S10-MIG before target write enable
MR0-O overwrite/direct mutation | P0 | T8-06..10/13; G3 | S10-XFER before re-import
MR0-T dual truth/atomicity | P0 | M8-07/08/N8-08; G2/G7 | S10-DATA then S10-MIG
MR1-M mixed ownership | P1 | T8-08/M8-07; G0/G2/G3 | S10-DATA before domain features
MR1-N numerical behavior | P1 | F8/R8; G1/G4/G5 | S10-ROAD or S10-FRAME after contracts
MR1-R routes/API compatibility | P1 | M8-12/N8-06; G7 | S10-MIG before canonical entry cutover
MR1-X output/render | P1 | O8; G6 | S10-OUTPUT after domain result contracts
MR1-P performance/recovery | P1 | N8; G7 | every phase rollback plus release gate

8.3 Current-to-Target Mapping Matrix

Current Responsibility | Current Primary Assets | Target Owner | Migration Boundary | Status
Road alignment/station/profile/cross-section | liner/core, liner/schema | Road.Domain/LINER | strip frame hints; add target document envelope | SPLIT/MOVE
Road bridge geometry/import review | liner/importer, BridgeProject/Definition geometry | Road.Domain + Road.App | field-level legacy adapters, raw retained | SPLIT
Road drawing | liner/drawing formal builders | Road.Domain/GDRAW + Road.App | shared IR below road builders | SPLIT/MOVE
Low-level drawing/DXF | liner/drawing model, liner/dxf model/serializer | Shared.Platform | neutralize road enums/mappings | SPLIT/MOVE
Legacy direct road-to-FEM | liner/mapper, liner/headless, BD adapters/generator | Integration + Frame.App | package/apply/record replaces direct mutation | SPLIT/DEPRECATE
Road-to-Frame history | linerTrace/sourceRevision/parity reports | Integration.RoadToFrame | seed provenance only; new append-only record | SPLIT/REUSE
Bridge Wizard document/UI | bridge/**, backend bridge CRUD | Road.App + Frame.App + Compatibility | atomic split; old UI facade retained temporarily | SPLIT
BridgeDefinition intermediate | bridgeDefinition/types/schema | Compatibility + Road/Frame migrations | not a target SoT/package; raw retained | SPLIT/DEPRECATE
FEM persisted model | ProjectModel types/schema/files | Frame.Domain + Compatibility | migrate to FrameDocument; read old schema | SPLIT/DEPRECATE
Frontend runtime/results/session | App state, Viewer state/localStorage | Frame.App/UserSession | no assumed lossless persistence migration | SPLIT/MOVE
Backend runtime model/parser | engine/model.py | Frame.Engine + Compatibility | target adapter constructs runtime; old parser retained | SPLIT
Static solver | dof/element/assembly/solver/results | Frame.Engine/STATICS | extend behind FrameDocument adapter | MOVE
Influence/live load | influence.py/moving_load.py | Frame.Engine STATICS/INFLOAD | keep MVP separate from full INFLOAD gaps | MOVE/SPLIT
Dynamics | mass/eigen/response_spectrum/time_history | Frame.Engine/R-SPECTRUM | target settings/result contracts | MOVE
Reports | backend reports, frontend exports | Frame.App/PRINT | bind to exact result revision/checksums | MOVE
Viewer/formal drawing | viewer/** | Shared render + Frame.App Viewer/DRAFT | Viewer state excluded; formal DRAFT separate | SPLIT
App/API routing/storage | main.tsx, App, api/client, backend/app/main.py | product shells + Shared I/O + Compatibility | canonical routes/target transactions/aliases | SPLIT
Schemas | project/bridge/BD/generated/result | target domain schemas + Compatibility | legacy read schemas retained; new target schemas | SPLIT/DEPRECATE/REUSE

8.4 Asset Disposition Matrix

Asset | Current Responsibility | Target Module | Disposition | Dependency | Migration Risk | Test Asset
frontend/src/liner/schema/types.ts + linerDraftSchema.vNext.json | ProjectLiner extension, road draft, bridge/frame sampling settings | Road.Domain + Compatibility.Legacy | SPLIT | target RoadDocument schema; legacy reader | MR0-D,MR1-M; S10-DATA/MIG | liner schema/migration tests CURRENT-PARTIAL
frontend/src/liner/schema/version.ts + projectLinerMigration.ts + validators | LINER 0.1/0.2/0.3 recognition/migration/strict validation | Compatibility.Legacy + Shared migration framework | SPLIT | D7 version/raw policy | MR0-D; S10-MIG | M8-02/04/06 planned; current idempotence reuse
frontend/src/liner/core horizontal/arc/clothoid/vector/line | horizontal road geometry | Road.Domain/LINER | MOVE | Shared coordinate primitives; OD8-01 | MR0-C,MR1-N; S10-CONTRACT/ROAD | R8-01..04; analytical tests REUSE
frontend/src/liner/core station/vertical/crossfall/cross-section/grid | station/profile/section road calculations | Road.Domain/LINER | MOVE | RoadDocument IDs/revision | MR0-C,MR1-N; S10-ROAD | R8-05..08; current goldens REUSE
frontend/src/liner/core/types.ts frame hints/preparation + frame.ts | road result mixed with FEM generation hints | Road.Domain + Integration.RoadToFrame | SPLIT | D7 package geometry/capabilities | MR0-I,MR1-M; S10-DATA/XFER | T8-03/04/12; mapper tests reuse-limited
frontend/src/liner/core pipeline/sourceRevision/diagnostics/tolerances | road orchestration, hash, diagnostics, mixed tolerance policy | Road.Domain + Shared.Platform | SPLIT | target RevisionMetadata/ValidationResult/tolerance registry | MR0-C,MR0-I; S10-CONTRACT | R8 + D8 tolerance tests
frontend/src/liner/adapters/linerUiAdapter + linerPreviewAdapter | UI/preview conversion from road draft/result | Road.App | MOVE | target RoadDocument application service | MR1-M; S10-ROAD | adapter tests REUSE
frontend/src/liner/adapters/linerProjectDraft + linerViewerAdapter | ProjectModel LINER persistence and Viewer/FEM preview | Compatibility.Legacy + Road.App + Frame.App | SPLIT | target road persistence; public Viewer adapter | MR0-D,MR0-T; S10-MIG | save/reload/Viewer tests CURRENT-PARTIAL
frontend/src/liner/mapper/frameModelMapper.ts + frameIds.ts + preview | direct road intermediate to frame drafts/numbered IDs/trace | Integration.RoadToFrame + Compatibility.Legacy | SPLIT | package exporter, frame apply, TransferRecord | MR0-I,MR0-O; S10-XFER | T8 planned; existing mapper property tests REUSE
frontend/src/liner/headless/** | direct ProjectModel entity removal/merge/default mechanics | Integration + Frame.App + Compatibility | SPLIT | transactional apply; frame-owned defaults | MR0-O,MR0-T,MR1-M; S10-XFER | T8-06..13 planned; current no-mutation reuse
frontend/src/liner/importer/types/normalization/validation/renderability | imported road/bridge review domain and diagnostics | Road.App + Road.Domain + Shared primitives | SPLIT | target road IDs/contexts/provenance | MR0-C,MR0-I,MR0-D; S10-CONTRACT/MIG | R8-17/M8; GC fixtures REUSE-limited
frontend/src/liner/importer storage/migration/json/recovery | local storage, 0.1 migration, import/export, recovery | Shared.Platform + Compatibility.Legacy | SPLIT | raw/quarantine/atomic I/O framework | MR0-D,MR0-T; S10-MIG/SHARED | storage/migration tests CURRENT-PARTIAL
frontend/src/liner/importer pages/components/routes/services | importer UI, editing, navigation | Road.App/Importer | MOVE | canonical road routes; target repository | MR1-R,MR0-D; S10-MIG/ROAD | UI/routes tests REUSE
frontend/src/liner/importer Phase35/export/ConversionLog adapters | importer to LINER/ProjectModel-era output/provenance | Road.App + Compatibility + Integration | SPLIT | RoadDocument migration/package exporter | MR0-D,MR1-M; S10-MIG/XFER | adapter/conversion-log tests REUSE-limited
frontend/src/liner/drawing/model geometry/primitives/paper/affine | generic 2D drawing values and paper transforms | Shared.Platform/Drawing | MOVE | neutral document/version/validation contract | MR1-X; S10-SHARED | O8-01/02; foundation tests REUSE
frontend/src/liner/drawing document/stationAxis/validation | DrawingDocument mixed with road viewport/station semantics | Shared.Platform + Road.Domain/GDRAW | SPLIT | neutral IR plus road station adapter | MR1-M,MR1-X; S10-SHARED/ROAD | drawing tests REUSE
frontend/src/liner/drawing formal builders/layout/SVG pages | road plan/profile/cross/band generation/render | Road.Domain/GDRAW + Road.App | MOVE | shared Drawing IR; RoadDocument | MR1-X; S10-ROAD/OUTPUT | O8-01..03; current formal tests CURRENT-PARTIAL
frontend/src/liner/dxf model/validation/serializer/writer | generic DXF IR, finite validation, serialization | Shared.Platform/DXF | MOVE | Shared units/file I/O | MR0-C,MR1-X; S10-SHARED | O8-04/05; parser tests REUSE
frontend/src/liner/dxf mappers/presets/formal export | Drawing-to-DXF mapping plus road layers/sheets | Shared.Platform + Road.GDRAW | SPLIT | neutral mapper hook and road presets | MR0-C,MR1-X; S10-SHARED/OUTPUT | mapper/formal DXF tests REUSE
frontend/src/liner/exports linerPlan/ProfileDxf | older specialized road DXF paths | Compatibility.Legacy + Road.GDRAW | DEPRECATE | formal DrawingDocument->DXF replacement must pass G6 | MR1-X; S10-OUTPUT/LEGACY | existing tests retained as regression
frontend/src/liner/exports makerDxfSpike | experimental Maker.js DXF path | Compatibility.Legacy | DEPRECATE | formal DXF alternative + retention decision | MR1-X; S10-LEGACY | spike roundtrip test retained
frontend/src/liner/exports linerFrameStl | ProjectModel member STL diagnostic/export | UNKNOWN | UNKNOWN | OD9-02 evidence | MR1-M; no schedule until decision | existing two tests retained
frontend/src/liner/components + pages except mapping review | road edit/preview/drawing UI | Road.App | MOVE | RoadDocument command/history/table services | MR1-P; S10-ROAD | component/page tests REUSE
frontend/src/liner/pages/LinerMappingReviewPage | commit/open Viewer for direct frame-mapped project | Integration + Road.App + Frame.App | SPLIT | package preview/conflict/apply UI | MR0-O,MR1-M; S10-XFER | current confirmation test reuse-limited; T8 E2E planned
frontend/src/bridge/types.ts | BridgeProject geometry/load/generation/result/viewer payload types | Road/Frame/Integration + Compatibility | SPLIT | field migration manifest; raw retention | MR0-D,MR1-M; S10-DATA/MIG | wizard/schema tests reuse as legacy
frontend/src/bridge steps 1 RoadCondition + 2 SpanSetting | road cross-section and span UI | Road.App bridge geometry | MOVE | RoadDocument bridge section; legacy facade | MR0-C,MR1-M; S10-ROAD | BridgeWizard tests reuse-limited
frontend/src/bridge step 3 ImpactFactor + 5 LoadSetting | impact and frame load intent UI | Frame.App/INFLOAD | MOVE | FrameDocument load contracts | MR1-N,MR1-M; S10-FRAME | current UI tests plus F8-09/11 planned
frontend/src/bridge step 4 LineSetting | traffic/load/reference polyline editing | Road.App + Frame.App | SPLIT | OD9-01 field classifier; load placement candidate contract | MR0-C,MR1-M; S10-DATA/MIG | M8-07/T8-08 planned
frontend/src/bridge BridgeWizard/state + step6 generation | mixed six-step orchestration and direct FEM commit | product shells + Integration + Compatibility | SPLIT | target product entries/package/apply | MR0-O,MR0-T,MR1-R; S10-XFER/MIG | wizard E2E reuse-limited
frontend/src/bridge conversion.ts + api.ts | BridgeProject CRUD, FEM generation, ProjectModel conversion, BD flag path | Compatibility + Road/Frame repositories + Integration | SPLIT | target APIs and legacy facade | MR0-D,MR0-O,MR1-R; S10-MIG/XFER | API/conversion tests legacy; M8/T8 planned
frontend/src/bridge/viewer/BridgeThreeViewer.tsx | BridgeWizard-specific geometry preview | Road.App preview + Shared render | DEPRECATE | unified road preview/shared render alternative | MR1-X; S10-SHARED/LEGACY | existing UI coverage limited
frontend/src/bridgeDefinition/types.ts | canonical intermediate mixing geometry/mechanics/load/mesh | Compatibility + Road/Frame migration | SPLIT | D6-12, field split matrix | MR0-C,MR0-D,MR1-M; S10-DATA/MIG | schema/adapter tests reuse as legacy
frontend/src/bridgeDefinition/adapters/fromLinerBridge.ts | LINER bridge to mixed BD with defaults | Compatibility + Integration package exporter candidate | SPLIT | D7 capability/no-fabrication rules | MR0-C,MR0-I,MR1-M; S10-XFER | adapter tests reuse; T8-12 planned
frontend/src/bridgeDefinition/adapters/fromBridgeProject.ts | mixed BridgeProject to mixed BD | Compatibility.Legacy migration | SPLIT | OD9-01 classifier/raw preservation | MR0-D,MR1-M; S10-MIG | adapter tests/current warnings reuse
frontend/src/bridgeDefinition/generator/** | BD validation, FEM numbering, material/section/load/defaults, ProjectModel | Frame.App model builder + Integration + Compatibility | SPLIT | target apply/profile/FrameDocument; coordinate/ID gates | MR0-C,MR0-I,MR0-O,MR1-N; S10-XFER/FRAME | generator tests/parity reuse-limited; F8/T8 planned
frontend/src/bridgeDefinition/featureFlags.ts | legacy vs BD direct generator selection | Compatibility rollout | DEPRECATE | target rollout/rollback without dual write | MR0-T; S10-MIG/LEGACY | flag tests/route parity retained
frontend/src/bridgeDefinition/semanticParity + fixtures/goldens | compares legacy/BD topology/geometry/load/result | Compatibility verification | REUSE | D8 oracle manifest/limitations | MR1-N; S10-MIG/FRAME | O5/regression CURRENT-PARTIAL, not independent oracle
frontend/src/viewer/types.ts | ProjectModel/result props plus render/session state | Shared render + Frame.App + UserSession | SPLIT | neutral render DTOs and frame adapters | MR1-M,MR1-X; S10-SHARED/OUTPUT | Viewer type/render tests REUSE
frontend/src/viewer threeUtils/SceneBuilder/renderers | Three.js scene building tied to frame model/results | Shared render + Frame.App Viewer | SPLIT | public scene DTO and result staleness guard | MR0-C,MR1-X; S10-SHARED/OUTPUT | O8-09/10; render tests REUSE
frontend/src/viewer coordinateTransform/settings | display axis swap and persisted preference | Shared render + Compatibility/UserSession | SPLIT | D6 coordinate boundary; no domain persistence | MR0-C; S10-CONTRACT/MIG | transform/asymmetric tests REUSE
frontend/src/viewer animation/comparison/member-force/color/labels | frame result visualization and comparison | Frame.App/Viewer | MOVE | FrameResult contract/checksum binding | MR1-N,MR1-X; S10-FRAME/OUTPUT | current tests REUSE
frontend/src/viewer Viewer3D/controls/fallback/compare UI | frame Viewer UI/session interactions | Frame.App/Viewer | MOVE | canonical frame entry/shared render | MR1-R,MR1-X; S10-FRAME/OUTPUT | UI/fallback/E2E CURRENT-PARTIAL
frontend/src/exports resultCsvExport/resultPdfReport/memberForceReport | frame result reporting | Frame.App/PRINT | MOVE | result version/staleness; full result catalog | MR1-N,MR1-X; S10-OUTPUT | O8-06..08; current tests CURRENT-PARTIAL
frontend/src/types.ts ProjectModel (persistence fields) | legacy FEM project JSON with mixed version/result/LINER extension | Compatibility.Legacy + Frame.Domain migration | DEPRECATE | target FrameDocument and Road split adapters | MR0-D,MR0-T; S10-DATA/MIG | project schema/API/save tests; M8 planned
frontend/src/types.ts AnalysisResult/result-related types | frame analysis result contract | Frame.Domain/Results | MOVE | version/checksum/staleness expansion | MR1-N; S10-FRAME | backend/frontend result schema tests REUSE
frontend/src/types.ts ValidationResponse/StructuredMessage | generic validation response shape | Shared.Platform/Validation | MOVE | D7 ValidationResult adapter/version | MR0-D; S10-SHARED | validation/API tests REUSE
frontend/src/App.tsx runtime state lines 91-177 | active ProjectModel, analysis results, UI/Viewer/session orchestration | Frame.App + product shell/UserSession | SPLIT | separate target repos and session store | MR0-T,MR1-M; S10-DATA | component/integration tests CURRENT-PARTIAL
frontend/src/App.tsx save/load lines 521-538 + api/client project I/O | browser/backend ProjectModel persistence commands | Shared I/O + Frame.App + Compatibility | SPLIT | atomic target docs, raw legacy read | MR0-D,MR0-T; S10-MIG | API/save/load tests; N8 planned
backend/engine/model.py | runtime dataclasses, ProjectModel parser, validation | Frame.Engine + Compatibility.Legacy | SPLIT | FrameDocument-to-runtime adapter | MR0-D,MR1-N; S10-MIG/FRAME | schema/engine validation tests REUSE
backend/engine dof/element/assembly/solver.py | static frame formulation/solve | Frame.Engine/STATICS | MOVE | runtime model extension for spring/release/offset | MR1-N; S10-FRAME | O1 beam/solver tests REUSE
backend/engine results.py + result/time-history result modules | runtime result assembly/serialization | Frame.Domain/Results + Frame.Engine | SPLIT | target persisted result binding | MR0-D,MR1-N; S10-FRAME | result schema/persistence tests REUSE
backend/engine influence.py + moving_load.py | influence and single-point moving load | Frame.Engine STATICS + INFLOAD | SPLIT | full INFLOAD orchestration | MR1-N; S10-FRAME | F8-10..12 current/partial tests REUSE
backend/engine mass/eigen/response_spectrum/time_history* | dynamic analysis algorithms/models | Frame.Engine/R-SPECTRUM | MOVE | target settings/results/tolerance registry | MR1-N,MR1-P; S10-FRAME | eigen/spectrum/time-history tests REUSE
backend/engine bridge_model.py + bridge_fem_generator.py | mixed BridgeProject parse/known-field write/FEM/load generation | Compatibility + Road/Frame migration + Frame model builder | SPLIT | raw retention, target package/apply | MR0-C,MR0-D,MR0-I,MR1-M; S10-MIG/XFER | bridge tests legacy; M8/T8/F8 planned
backend/app/main.py project/analysis/bridge/viewer/report routes | monolithic API, filesystem stores, solve orchestration, legacy bridge CRUD | product controllers + Shared I/O + Compatibility | SPLIT | target document/revision APIs and route aliases | MR0-D,MR0-T,MR1-R; S10-MIG/FRAME | API tests REUSE; route/migration planned
backend/app/reports.py | CSV report generation across analysis types | Frame.App/PRINT service | MOVE | target result contract and completeness | MR1-N,MR1-X; S10-OUTPUT | report tests REUSE/current-partial
schemas/project.schema.json | strict legacy ProjectModel with integer/string versions/LINER/results | Compatibility.Legacy | DEPRECATE | target separate schemas and read adapter | MR0-D,MR0-T; S10-DATA/MIG | schema tests retained; M8 planned
schemas/bridge.schema.json | legacy mixed BridgeProject schema | Compatibility.Legacy | DEPRECATE | field split/raw migration | MR0-D,MR1-M; S10-MIG | bridge schema tests retained
schemas/bridge-definition.schema.json | mixed BD schema | Compatibility.Legacy | DEPRECATE | target package/road/frame schemas | MR0-D,MR1-M; S10-MIG | BD schema/parity tests retained
schemas/generated-fem.schema.json | generated ProjectModel/FEM validation | Frame.Domain validation candidate | REUSE | adapt to FrameDocument/runtime boundary | MR0-D,MR1-N; S10-FRAME | generator/schema tests REUSE
schemas/result.schema.json | analysis result validation | Frame.Domain/Results | MOVE | result version/checksum/staleness | MR1-N; S10-FRAME | result schema tests REUSE

8.5 Bridge Modeler Split Matrix

Current Asset/Field | Road Target | Frame Target | Integration/Legacy Action | Disposition/Risk
BridgeProject id/name/description/timestamps | Road/Frame document metadata only after explicit split | same, independent IDs/revisions | retain legacy source identity in MigrationRecord | SPLIT; MR0-I/MR0-T
BridgeProject crossSection lane/median/sidewalk/barrier widths | Road bridge/road regions and cross-section | no authoritative mechanics | map with coordinate/unit evidence | SPLIT to Road; MR0-C
BridgeProject spans length/offset | road span geometry candidate | frame span references only through accepted transfer | derive endpoints only with evidence; no fabricated position | SPLIT; MR0-C
BridgeProject impactFactor | none | INFLOAD/load settings | migrate with formula/version provenance or quarantine | SPLIT to Frame; MR1-N
BridgeProject lines type=reference | reference/road geometry candidate when provenance known | none by default | OD9-01 classification/raw retention | SPLIT/UNKNOWN per record; MR1-M
BridgeProject lines type=traffic/load | road/load-placement region only if semantic provenance proves it | frame load path/target intent only after explicit acceptance | never infer from name; quarantine ambiguous | SPLIT; MR0-C/MR1-M
BridgeProject loads | none | load definitions/cases in FrameDocument | resolve line refs/units/sign; no road package load | SPLIT to Frame; MR1-N
BridgeProject generationSettings mesh | none | frame discretization settings | migrate explicit known values; target default separately approved | SPLIT to Frame; MR1-N
BridgeProject generationSettings materialId/sectionId | none | Frame material/section references | missing refs block or explicit frame choice | SPLIT to Frame; MR1-M
BridgeProject generatedFem | none | derived cache candidate, not model truth | preserve raw; accept only with binding/checksum, otherwise stale | DEPRECATE cache; MR0-D
BridgeDefinition source | RoadDocument/source provenance | Frame migration provenance only | MigrationRecord/TransferRecord source ref | SPLIT; MR0-I
BridgeDefinition coordinatePolicy | source road context candidate | accepted transform reference | insufficient authority triggers OD6-01 block | SPLIT to contract/legacy; MR0-C
BridgeDefinition alignmentRefs/stations | RoadDesignDocument alignment/station refs | transfer bindings only | stable-ID migration and package exporter | SPLIT to Road/Integration; MR0-I
BridgeDefinition spans | road span geometry | accepted span binding, not mechanics | validate endpoint/dependency closure | SPLIT; MR0-C/MR0-I
BridgeDefinition supports station/skew/substructure/transverse position | abutment/pier geometry and bearing-line position | no support mechanics | split current record fields | SPLIT to Road; MR1-M
BridgeDefinition supports kind fixed/pinned/roller | none | support/bearing mechanics intent | must not travel as road geometry; validate target support | SPLIT to Frame; MR1-N
BridgeDefinition superstructure kind/params | girder/deck geometry candidate where typed/evidenced | structural system/material/stiffness intent where typed | arbitrary params OD9-01 quarantine | SPLIT/UNKNOWN; MR1-M
BridgeDefinition girders id/label/role/offset/spanIds | main/edge girder geometry candidates | accepted transfer binding | road stable IDs separate from FEM IDs | SPLIT to Road/Integration; MR0-I
BridgeDefinition girder materialRefId/sectionRefId | none | Frame material/section assignment | remove from transfer package; migrate frame side | SPLIT to Frame; MR1-M
BridgeDefinition crossBeams station/girderIds | cross-beam geometry candidates | accepted binding | dependency-closed transfer | SPLIT to Road/Integration; MR0-I
BridgeDefinition crossBeam sectionRefId | none | Frame section assignment | frame migration only | SPLIT to Frame; MR1-M
BridgeDefinition bearings id/support relation | road bearing-line identity/geometry only when derivable | bearing mechanical entity identity | current lack of line geometry is a capability gap | SPLIT; MR0-C/MR1-M
BridgeDefinition bearing type | none | bearing mechanics | never transferred as road geometry | SPLIT to Frame; MR1-N
BridgeDefinition deck width/geometry thickness hints | deck/slab/pavement/haunch region candidates | accepted geometry reference only | no default width; capability flag if absent | SPLIT to Road; MR0-C
BridgeDefinition deck kind/structural interpretation | optional road provenance only | structural deck/material/stiffness meaning | ambiguous interpretation requires explicit mapping | SPLIT; MR1-M
BridgeDefinition loads/targets/impact | none | Frame load cases/definitions/INFLOAD | target refs resolved after accepted geometry mapping | SPLIT to Frame; MR1-N
BridgeDefinition generationSettings | none | frame mesh/material/section/runtime settings | no road package fields; explicit frame choice | SPLIT to Frame; MR1-N
fromLinerBridge adapter | road geometry extraction candidate | none | replace fabricated defaults with capability diagnostics/package | SPLIT; MR0-C/MR0-I
fromBridgeProject adapter | field-classified road migration | field-classified frame migration | atomic split/raw quarantine | SPLIT; MR0-D/MR1-M
structuralModelGenerator/facade | none | discretization/model-builder algorithms candidate | package apply + TransferRecord; deprecate direct ProjectModel path | SPLIT; MR0-C/MR0-I/MR0-O
backend bridge_fem_generator | none | FEM/load generation candidate | legacy BridgeProject facade until target apply | SPLIT; MR0-D/MR1-N
BridgeWizard steps/UI | road bridge geometry workflow | frame load/model workflow | product navigation and legacy facade | SPLIT; MR0-T/MR1-R
BridgeThreeViewer | road geometry preview candidate | not authoritative Frame Viewer | shared render mechanism; deprecate duplicate | DEPRECATE/SPLIT; MR1-X
Formal bridge drawings | Road.GDRAW bridge general/geometry drawings | Frame.DRAFT structure/load/result drawings | shared Drawing/DXF only | new separate builders; MR1-X

9. Compatibility

9.1 Legacy Deprecation Matrix

Legacy Surface | Entry Criteria for Deprecation | Supported During Deprecation | Exit Criteria | Rollback | Retention
ProjectModel read adapter | target FrameDocument schema+reader and G0/G2 fixtures exist | read/import/raw quarantine; explicit legacy export if approved | migration corpus passes M8; usage policy; no critical unread files | disable target rollout; keep migrated targets and raw source, no dual write | original raw + adapter/version fixtures indefinite per policy
ProjectModel normal write path | target writer/save/reload N8-01 and atomic recovery pass | old file remains unchanged; no automatic write | target save G2/G7, user migration path, rollback tested | re-enable legacy-only workflow for unmigrated source; never write both | writer code until rollback window closes
BridgeProject read/API | split adapter and raw preservation M8-07 exist | GET/list/read/import; old CRUD facade scoped | all representative lines/params classified or quarantined; target product entries available | route to old read-only UI/service | raw bridge files and schema retained
BridgeProject create/update/delete write | target Road/Frame writers and atomic split pass | existing legacy projects may remain; creation/update warning then read-only phase | G2/G3/G4 plus release usage policy and rollback | legacy write mode only for legacy project before target migration; no target dual write | code/schema through rollback window; data retained
BridgeDefinition reader/schema | ownership-filter migration and package/frame schemas exist | parse/validate/migrate/compare | M8/T8 corpus and feature path no longer required for rollback | restore compatibility read/compare flag | raw inputs/schema/fixtures retained
BridgeDefinition direct generator + feature flag | target package/apply/frame builder reaches parity gates | comparison-only path; no target write authority | G3/G4 and no required fallback; release decision | switch target rollout off and use legacy path on legacy source only | generator/parity fixtures through rollback window
Direct LINER mapper/headless ProjectModel merge | package exporter/apply/record implemented | preview/compare only; no new target mutation | T8-01..13 pass, mapping review migrated | restore legacy workflow for unmigrated legacy project only | mapper fixtures and original behavior tests retained
LINER draft 0.1/0.2/0.3 readers | target RoadDocument migration/raw store exists | read/migrate/preview | M8 supported corpus, no critical unsupported drafts, policy window | open original through legacy reader | raw versions, schemas, fixtures indefinite
Importer schema 0.1/storage | target importer/RoadDocument repository exists | read/migrate/export raw; no silent localStorage loss | R8-17/M8/N8 recovery plus user migration | retain old store key/read service; avoid dual write | original storage export and migration fixture retained
Legacy project/bridge schemas | target schemas registered | validation for legacy reads only | associated reader exits and retention policy approves archive | restore reader with schema version | schemas and fixtures retained with adapter
Legacy route aliases | canonical routes deployed and M8-12 passes | direct load/popstate/query/hash/IDs | OD6-04 telemetry/release evidence and notice | restore alias registry entry | route table/history docs retained
Viewer axis-swap preference | canonical contexts/display adapter passes asymmetric O8 | read existing preference as user/session compatibility | product policy plus migrated display preference if needed | restore preference resolver | key decoder/tests retained; never migrate into domain doc

Deprecation rules:
- No dual write at any stage.
- A rollback changes routing/feature selection for legacy source; it does not erase target revisions.
- Original raw source, migration records, checksums, schemas, and minimum reader fixtures outlive the
  normal write path.
- REMOVE is a later explicit decision only after substitute, migration, retention, usage, G2/G7,
  and rollback-window criteria all pass.

9.2 Test Asset Reuse Matrix

Asset | Stage 8 Class/Oracle | Target Suite | Disposition | Qualification / Limitation
liner/core analytical and golden tests | CURRENT-CANDIDATE O1/O2-like | R8-01..08 G1 | REUSE/MOVE with algorithms | independent expected generation and OD8-01 tolerance metadata
liner schema/adapters save-reload tests | CURRENT-PARTIAL O5 | M8/N8 G2/G7 | REUSE in Compatibility/Road | add raw/unknown/quarantine/target envelope cases
GC-01/GC-06 domain/expected examples | CURRENT-PARTIAL O4 candidate | R8-17 G1 | REUSE | mapping-review provenance does not prove source PDF semantics fully
Importer built-in samples/tests | CURRENT-PARTIAL O5/O6 | R8-17/M8 | REUSE | UUID/coordinate/raw preservation gaps remain
liner mapper/headless tests | CURRENT-PARTIAL O5 | T8 G3 | REUSE in Compatibility | direct merge behavior is regression, not target transaction acceptance
BridgeWizard/BridgeProject tests | legacy regression O5/O6 | M8-07 and product UI | REUSE | field ownership and unknown preservation absent
BridgeDefinition adapter/generator tests | legacy/current regression O5 | M8/T8/F8 | REUSE | fabricated defaults/direct ProjectModel path cannot be target oracle
BridgeDefinition semanticParity/goldens | CURRENT-PARTIAL O5/O4-unqualified | compatibility parity | REUSE | shared logic and generated goldens are not independent numerical proof
backend closed-form beam/torsion tests/examples | CURRENT-CANDIDATE O1 | F8-02..05 G4 | REUSE/MOVE | add benchmark manifests/solver residual and approved tolerances
backend influence/moving/eigen/spectrum tests | CURRENT-PARTIAL O1/O5 | F8-10..14 G5 | REUSE/MOVE | expand multi-DOF/full INFLOAD/independent corpus
portal/truss/L-frame examples | PLANNED qualification; O5 only | F8-05 G4 | REUSE as fixtures | null/to-be-determined expected values; never create from first clone run
time-history tests/ground motions | CURRENT-PARTIAL O1/O5 | Frame R-SPECTR/N8 | REUSE/MOVE | preserve data provenance and performance environment
Drawing tests | CURRENT-PARTIAL O1/O6 semantic | O8-01..03 G6 | REUSE/SPLIT | road builders separate from shared IR; visual environment OD8-04
DXF parser/roundtrip/formal tests | CURRENT-PARTIAL O1/O2-parser | O8-04/05 G6 | REUSE/MOVE/SPLIT | external CAD and target frame DRAFT cases still planned
PDF/CSV/member force tests | CURRENT-PARTIAL O1 semantic fixture | O8-06..08 G6 | REUSE/MOVE | supplied fixture values do not validate solver; missing result sections
Viewer transform/render/fallback tests | CURRENT-PARTIAL O1/O6 | O8-09/10 G6 | REUSE/SPLIT | Viewer state/domain boundary and formal DRAFT remain separate
frontend E2E specs | CURRENT-PARTIAL O6 | product route/output G6/G7 | REUSE | add canonical entries, direct load/popstate, transfer transaction E2E
backend API/schema/save/load tests | CURRENT-PARTIAL O1/O5 | G0/G2/G4/G7 | REUSE/SPLIT | target document APIs and revision/atomicity cases planned
examples/spacer-reference/README.md | no O3 corpus | OD8-02 | KEEP acquisition template | contains no actual results; no parity claim
JIP-LINER/SPACER manuals | semantic reference only O6 | R8/F8 catalog trace | KEEP | not numerical oracle; do not copy bulk text

9.3 Documentation Disposition

Documentation | Nature | Disposition | Target Use / Constraint
docs/scoping/** | frozen current implementation facts | KEEP | immutable evidence baseline; do not rewrite as target design
docs/planning/stage6-10/** | formal target decision and plan | KEEP | governs D6-D10; implementation facts remain in docs/scoping
docs/02_mvp_scope.md through docs/12_quality_gate.md | current MVP architecture/schema/test specs | SPLIT | retain historical/current-module facts; supersede target contracts explicitly
docs/liner core specs (domain/geometry/station/profile/pipeline/validation) | current LINER design/evidence | REUSE | road implementation reference; revalidate against RoadDocument/D8
docs/liner project_file/schema_migration/integration/frame_model_mapping | legacy persistence/direct integration design | DEPRECATE | compatibility history; target D6/D7 docs supersede write/integration model
docs/liner phase3.5/3.6/4.5 implementation/scope/closeout logs | historical phase design and work logs | KEEP | audit/history and asset evidence only, not target authority
docs/liner phase5 drawing/DXF specs | current road drawing design | REUSE | Road.GDRAW/shared Drawing-DXF extraction input; O8 governs acceptance
docs/design/** and docs/verification/** | current feature design/verification evidence | SPLIT | reuse current algorithm/test evidence; target gaps/acceptance supersede claims
docs/handover/**, release notes, PR docs | historical delivery evidence | KEEP | audit/reference; no target decision authority
docs/manual/** plus JIP-LINER/SPACER PDFs | user/semantic reference | KEEP | semantic catalog and page citations only; not O1-O3 numeric oracle
Bridge Modeler V2 architecture/contracts group | reviewed future proposal outside evidence baseline; not committed in this planning branch | SPLIT | re-evaluate compatible concepts only; D6/D7 overrides conflicting unified docs/ownership/defaults
Bridge Modeler V2 test/acceptance group | reviewed future proposal outside evidence baseline; not committed in this planning branch | REUSE | candidate test ideas only; map to D8 oracle/tolerance/gates, no inherited pass claim
Bridge Modeler V2 roadmap/release group | reviewed future proposal outside evidence baseline; not committed in this planning branch | DEPRECATE | Stage 10 dependency/PR plan supersedes it; no current-fact or governing status
Bridge Modeler V2 trace/risk group | reviewed future proposal outside evidence baseline; not committed in this planning branch | SPLIT | crosswalk compatible risks only; D6-D10 IDs and priorities govern
Bridge Modeler V2 audit/governance group | reviewed future proposal outside evidence baseline; not committed in this planning branch | DEPRECATE | navigation leads only; revalidate against committed HEAD/scoping before any citation

10. Risks

P0-9-01. Moving a mixed asset intact can make road geometry or frame mechanics an accidental shared
truth. Controls: D9-02, Bridge split, MR1-M/T8-08/G0/G3; Stage 10 S10-DATA first.

P0-9-02. Direct LINER/BD/Bridge generators can overwrite frame edits, emit unstable IDs, or apply
unknown coordinates/z=0. Controls: D9-03/07/08, MR0-C/I/O, T8/G3; S10-CONTRACT then S10-XFER.

P0-9-03. Deprecating legacy writers before raw-preserving atomic split can lose unknown fields and
leave half-migrated documents. Controls: D9-06/09/10, MR0-D/T, M8/N8 G2/G7; S10-MIG before cutover.

P0-9-04. Treating ProjectModel persistence, App runtime, and backend Model as one asset can migrate
session state as data or discard persisted results. Controls: D9-09, distinct matrix rows, M8/N8.

P1-9-05. Ambiguous BridgeProject lines or arbitrary BridgeDefinition params can be guessed into the
wrong product. Controls: OD9-01 quarantine, M8-07/10 and T8-08 before G2/G3/G4.

P1-9-06. Reusing semantic parity/goldens as independent numerical proof can preserve generator
defects. Controls: D9-12 and Stage 8 O1-O6/D8-10 qualification.

P1-9-07. Splitting Viewer/Drawing/DXF at the wrong layer can leak frame results into shared truth or
duplicate road/frame output semantics. Controls: D9-05/11, O8/G6, dependency checks.

P1-9-08. Monolithic backend API split can break legacy direct loads/saved files if routes and stores
move before adapters. Controls: D9-10, legacy matrix, M8-12/N8-06 G7; S10-MIG first.

P1-9-09. Future proposal documents may be mistaken for current facts or governing target decisions.
Controls: D9-13 documentation hierarchy; no proposal body copied; formal Stage 6-10 docs supersede.

11. Dependencies

Stage 10 must schedule disposition in this order:

1. S10-DATA: create independent target document boundaries and prohibit direct mutation.
2. S10-CONTRACT: coordinate/unit/stable-ID/revision/checksum/validation primitives and P0 gates.
3. S10-MIG: raw/quarantine framework, legacy readers, target writers, route/API compatibility,
   atomic multi-document migration and rollback.
4. S10-SHARED: extract neutral Drawing/DXF/render/file/migration primitives with dependency tests.
5. S10-XFER: split mappers/generators into package export, frame apply, diff/conflict, TransferRecord.
6. S10-ROAD: move/reuse road algorithms/UI/importer and implement planned road gaps.
7. S10-FRAME: move/reuse frame engine/UI/report inputs and implement mechanics/live-load gaps.
8. S10-OUTPUT: Road.GDRAW, Frame.PRINT/DRAFT, Viewer and output completeness.
9. S10-LEGACY: disable normal legacy writes/routes only after matrices/gates; no removal without a
   later explicit decision.

Parallelism constraints:
- Road core algorithm moves and frame solver moves can run after shared contracts, but neither may
  bypass S10-MIG/XFER boundaries.
- Shared Drawing/DXF extraction can run parallel with target document schemas after ownership APIs
  are fixed; domain builders remain in road/frame workstreams.
- Compatibility adapter/test work begins before feature work and remains until rollback windows end.
- Proposal-doc reconciliation is documentation-only and cannot authorize code ownership changes.

12. Verification

Stage 9 completeness checks:
- every required source group is represented at subdirectory/major-file responsibility granularity;
- `ProjectModel` persistence, App runtime, and backend Model are separate rows;
- every BridgeProject/BridgeDefinition mixed field has road/frame/integration disposition;
- every SPLIT has target sides and legacy action; every MOVE has single-responsibility evidence;
- no REWRITE/REMOVE lacks the required evidence (none selected);
- UNKNOWN has an owner/evidence gate (OD9-02);
- legacy entries specify deprecation entry/exit/rollback/retention and no dual write;
- tests/examples/manuals map to Stage 8 oracle/current/planned limits;
- each P0/P1 risk maps to D8 suites/gates and Stage 10 dependency codes;
- proposal documentation remains labeled future proposal and not current fact.

## Stage Verdict

The current-to-target allocation, asset dispositions, Bridge Modeler field split, legacy deprecation,
test/example reuse, documentation hierarchy, and risk/dependency connections are complete. The two
new ambiguous-asset questions fail closed and can be scheduled as Stage 10 evidence gates without
reopening product ownership.

STAGE9_VERDICT: COMPLETE
READY_FOR_STAGE10: YES
