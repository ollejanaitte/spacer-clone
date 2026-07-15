# Stage 6-10 Open Decisions

> **Authority:** Unresolved target choices and their fail-closed defaults. An open item blocks only
> the scope named by its owner/evidence/gate fields; it never permits inference, direct cross-document
> mutation, dual write, or destructive cleanup.

Generated: 2026-07-15

Only major unresolved choices are listed. Stage 6 product and ownership architecture is not open.

OD6-01 | OPEN | P0 | Legacy coordinate authority
Question: What authoritative CRS/datum/local-to-world transform must be assigned when legacy
LINER/BridgeProject data has only coordinatePolicyId, bridge-local station/offset, or no datum?
Known evidence: importer has horizontal/vertical datum fields
(frontend/src/liner/importer/types.ts:42-56), while BridgeDefinition policy can be only a frame and
sign (bridgeDefinition/types.ts:33-49), and legacy FEM is z=0.
Default until decided: package preview allowed; apply blocked with COORDINATE_CONTEXT_UNKNOWN.
Owner: Stage 7 contract/migration lead with road geometry domain owner.
Decision gate: before any migration or Road-to-Frame implementation PR.
Resolution evidence required: legacy sample classification, asymmetric transform golden cases,
explicit unknown/no-transform behavior, and audit serialization.

OD6-02 | OPEN | P0 | Stable ID migration and collision aliases
Question: What exact deterministic rule maps duplicate/recreated importer UUIDs, BridgeDefinition
IDs, and generated N/M IDs to immutable road semantic IDs without conflating distinct geometry?
Known evidence: importer UUID creation is not reconstruction-stable; FEM counters are order/input
dependent (docs/scoping/id_policy.md:8-28,32-40,55-63).
Default until decided: retain unique persisted road IDs; never promote FEM IDs; collision blocks
apply and requires explicit migration alias.
Owner: Stage 7 ID contract owner, finalized in Stage 10 migration plan.
Decision gate: before legacy data can emit an applyable transfer package.
Resolution evidence required: collision corpus, idempotent migration, alias persistence, rollback.

OD6-03 | OPEN | P1 | Transfer v1 exact geometry cardinality
Question: Which fields are mandatory versus optional in v1 for 3D bearing lines, deck/pavement/
haunch surfaces, and road/load-placement regions, and what representation is used (parametric,
polyline, polygon mesh, or referenced geometry)?
Known evidence: current code has stations/grid/points and scalar deck width; pavement/haunch are
absent (fromLinerBridge.ts:347-407; stage4_road_design_scope.md:90-99).
Default until decided: alignment/stations/spans/supports and CoordinateContext are mandatory;
advanced regions are optional with capability flags and diagnostics, never fabricated defaults.
Owner: Stage 7 data-contract owner with Stage 8 verification owner.
Decision gate: Stage 7 target schema acceptance.
Resolution evidence required: schema examples, one-to-many references, unknown-field behavior,
and representative curved/skew/asymmetric geometry.

OD6-04 | OPEN | P2 | Redirect retirement window
Question: How long are old /pro/liner, /pro/importer, /pro/th, /compare, and /th paths supported,
and what usage threshold permits retirement?
Known evidence: old direct links exist and root legacy redirects are currently unreachable.
Default until decided: keep redirects indefinitely; do not delete aliases in initial migration.
Owner: product/release owner; implementation scheduling in Stage 10.
Decision gate: only before a removal/deprecation PR, not before Stage 7.
Resolution evidence required: route telemetry or explicit release policy, documented migration notice,
and zero critical saved-link dependency.

======================================================================
Stage 7 Open Decision Update
Generated: 2026-07-15
Evidence HEAD: 21c8a93c41533f78c66c021db84931cd3aaed5db

OD6-01 | OPEN | P0 | Legacy coordinate authority
Stage 7 disposition: remains OPEN. Target CoordinateContext permits explicit unknown status, but
unknown authority blocks migration commit to an applyable package and blocks Road-to-Frame apply
with `COORDINATE_CONTEXT_UNKNOWN`. Read-only preview and raw quarantine are allowed.
Owner: road geometry domain owner plus contract/migration owner.
Decision gate: before any affected legacy source can emit or apply an applyable transfer package.
Resolution evidence: legacy sample classification; explicit CRS/datum/local-to-world rule;
asymmetric non-zero-Z golden cases; unknown/no-transform behavior; audit serialization.

OD6-02 | OPEN | P0 | Stable ID migration and collision aliases
Stage 7 disposition: remains OPEN. Retain only demonstrably unique persisted road semantic IDs;
never promote FEM N/M numbering. Ambiguity/collision blocks apply with `STABLE_ID_COLLISION` and
requires an explicit alias decision recorded in migration evidence.
Owner: stable-ID contract owner plus migration owner; implementation owner assigned in Stage 10.
Decision gate: before affected legacy data can emit or apply an applyable transfer package.
Resolution evidence: duplicate/recreated-ID corpus, idempotent mapping, alias persistence, reorder,
one-to-many mapping, and rollback tests.

OD6-03 | RESOLVED | P1 | Transfer v1 exact geometry cardinality
Resolution: D7-07 defines fixed required arrays (empty allowed), explicit capability states,
Point3/Polyline3/Polygon3/StationRange sampled primitives with optional source references, and the
minimum `bridge-frame-v1` apply profile. Advanced surface/road/load regions are optional and never
fabricated. Preview validity and apply validity are separate.
Resolved by: Stage 7 data-contract decision D7-07.
Verification gate: Stage 8 curved/skew/asymmetric examples, dependency closure, capabilities,
schema roundtrip, and one-to-many references.
Reopen only if a required representative bridge cannot be expressed without changing ownership.

OD6-04 | OPEN | P2 | Redirect retirement window
Stage 7 disposition: remains OPEN. All declared aliases are pre-dispatch compatible and remain
indefinitely by default. No route removal belongs in initial migration.
Owner: product/release owner.
Decision gate: before any route removal/deprecation PR, not before Stage 8-10 planning.
Resolution evidence: route telemetry or explicit release policy, documented migration notice, and
no critical saved-link dependency.

No new major Stage 7 design decision is open.

======================================================================
Stage 8 Open Decision Update
Generated: 2026-07-15
Evidence HEAD: 21c8a93c41533f78c66c021db84931cd3aaed5db

OD6-01 | OPEN | P0 | Legacy coordinate authority
Stage 8 disposition: remains OPEN. G2/G3 fail closed for affected sources until a real legacy corpus,
authoritative CRS/datum/local transform rules, and asymmetric non-zero-Z O1/O2 goldens pass.
Owner: road geometry domain owner plus migration/contract owner.
Default: raw preservation and preview/quarantine only; no applyable transfer.

OD6-02 | OPEN | P0 | Stable ID migration and collision aliases
Stage 8 disposition: remains OPEN. G2/G3 require duplicate/recreated-ID, reorder, alias persistence,
one-to-many, and rollback evidence before affected apply.
Owner: stable-ID contract owner plus migration owner.
Default: retain only demonstrably unique road IDs; collisions block; FEM N/M IDs are not promoted.

OD6-04 | OPEN | P2 | Redirect retirement window
Stage 8 disposition: remains OPEN. All declared aliases stay in the M8-12/N8-06 compatibility suite
indefinitely. Removal requires telemetry/release evidence and a revised accepted route matrix.
Owner: product/release owner.

OD8-01 | OPEN | P1 | Production numerical tolerance register values
Question: what reviewed bands apply per coordinate/station/elevation, transfer coordinate, FEM
response/residual, eigen/subspace, and spectrum quantity?
Default: existing constants are evidence candidates; unset values block the affected G1/G3/G4/G5.
Owner: relevant road/solver numerical lead with verification owner.
Resolution evidence: O1/O2/O3 distributions across representative scale, conditioning, and supported
platforms; documented abs/rel/scaleFloor and boundary failures.
Decision gate: before the affected feature release gate.

OD8-02 | OPEN | P1 | Independent and SPACER reference corpus
Question: which independent-solver and licensed SPACER raw results can be stored/reproduced?
Known evidence: examples/spacer-reference contains only README.md; no result CSV/metadata corpus.
Default: no SPACER parity claim; O1/O2-qualified feature acceptance may proceed.
Owner: product/licensing owner plus verification owner.
Resolution evidence: raw exports, exact product/solver versions/settings, model/sign/unit mapping,
checksums, independent review.
Decision gate: before a SPACER-parity or broad compatibility release claim.

OD8-03 | OPEN | P1 | Performance and large-model budgets
Question: what supported hardware/runtime and time/memory/output budgets govern each workflow?
Default: collect reproducible baselines but make no pass claim; missing budget blocks G7 performance.
Owner: performance/release owner with road/frame product owners.
Resolution evidence: declared environment/build, warmup/repetitions, model sizes, median/tail/memory,
baseline commit, and user workflow target.
Decision gate: before production performance acceptance.

OD8-04 | OPEN | P2 | Controlled visual baseline environments
Question: which browser/Electron/fonts/DPI/PDF engine/CAD viewers and visual-diff bands are supported?
Default: semantic automation plus controlled manual review; no cross-platform pixel-equivalence claim.
Owner: drawing/report QA plus release owner.
Resolution evidence: supported platform matrix, approved captures, font/package provenance, and
documented allowed variation.
Decision gate: before GDRAW/PRINT/DRAFT visual release gate G6.

No Stage 6/7 ownership or contract decision is reopened by these verification details.

======================================================================
Stage 9 Open Decision Update
Generated: 2026-07-15
Evidence HEAD: 21c8a93c41533f78c66c021db84931cd3aaed5db

OD6-01 | OPEN | P0 | Legacy coordinate authority
Stage 9 disposition: all affected BridgeProject/BridgeDefinition/LINER/importer adapters retain raw
and block target apply. No asset MOVE/SPLIT authorizes coordinate inference.
Owner/evidence/gate: unchanged; S10-CONTRACT before S10-MIG/XFER.

OD6-02 | OPEN | P0 | Stable ID migration/collision aliases
Stage 9 disposition: frame numbering/default-generated IDs remain compatibility data, never road
stable IDs. Collision blocks migration/transfer.
Owner/evidence/gate: unchanged; S10-CONTRACT before S10-XFER.

OD6-04 | OPEN | P2 | Redirect retirement
Stage 9 disposition: aliases and route tests are retained; no REMOVE disposition.
Owner/evidence/gate: unchanged; only S10-LEGACY after OD6-04 evidence.

OD8-01 | OPEN | P1 | Production tolerance register values
Stage 9 disposition: road/frame algorithms and tests may MOVE/REUSE, but affected feature gates remain
blocked until their quantity-specific tolerances are approved.

OD8-02 | OPEN | P1 | Independent/SPACER reference corpus
Stage 9 disposition: spacer-reference README is retained as acquisition template; no test/example
asset is classified as current O3 parity.

OD8-03 | OPEN | P1 | Performance/large-model budgets
Stage 9 disposition: performance assets move with workflows, but G7 release remains blocked without
declared environment/budgets.

OD8-04 | OPEN | P2 | Visual baseline environments
Stage 9 disposition: Drawing/DXF/PDF/Viewer semantic tests are reusable; visual release remains
blocked until controlled environments are approved.

OD9-01 | OPEN | P1 | Ambiguous legacy bridge field semantics
Question: how are each BridgeProject `lines` record and arbitrary BridgeDefinition
`superstructure.params`/mechanics-like values classified without guessing road versus frame meaning?
Default: preserve raw; map only proven reference geometry; quarantine ambiguous traffic/load lines
and arbitrary params; emit neither applyable road package nor frame load from ambiguity.
Owner: road bridge-geometry owner, frame load/model owner, migration owner.
Resolution evidence: representative legacy corpus, UI/provenance creation path, sign/unit mapping,
and approved M8-07/M8-10/T8-08 cases.
Decision gate: before affected migration exits G2/G3/G4; Stage10 S10-MIG/XFER.

OD9-02 | OPEN | P3 | LINER frame STL product ownership and retention
Question: is linerFrameStl supported road preview, frame export, developer diagnostic, or obsolete?
Default: disposition UNKNOWN, retain untouched, exclude from target release claims.
Owner: road/frame product owner.
Resolution evidence: usage/routes/APIs, user requirement, alternative, and fixture purpose.
Decision gate: before MOVE/DEPRECATE/REMOVE.

No Stage 9 open item changes D6/D7 ownership or permits direct mutation/dual write.

======================================================================
Stage 10 Open Decision Update
Generated: 2026-07-15
Evidence HEAD: 21c8a93c41533f78c66c021db84931cd3aaed5db

OD6-01 | OPEN | P0 | Legacy coordinate authority
Stage 10 disposition: blocks affected migration commit and Road-to-Frame apply in P1/P3. It does not
block Phase 0 contracts, raw preservation, quarantine, reader or dry-run preview.
Default: fail closed; retain raw and produce validation diagnostics.

OD6-02 | OPEN | P0 | Stable ID migration and collision aliases
Stage 10 disposition: blocks affected P1/P3 commit/apply until collision, alias and one-to-many rules
pass G2/G3. Frame node/member numbers never substitute for road stable IDs.
Default: collision blocks mutation and survives as raw/provenance evidence.

OD6-04 | OPEN | P2 | Redirect retirement window
Stage 10 disposition: blocks alias removal and P8 contraction only. Aliases remain in the route
compatibility suite by default.

OD8-01 | OPEN | P1 | Production numerical tolerance register values
Stage 10 disposition: affected road/transfer/frame release gates remain blocked; contract and
algorithm work can proceed with test-local evidence bands that are not presented as production.

OD8-02 | OPEN | P1 | Independent and SPACER reference corpus
Stage 10 disposition: blocks SPACER parity and broad compatibility claims, not O1/O2-qualified
feature work. No current O3 result corpus is claimed.

OD8-03 | OPEN | P1 | Performance and large-model budgets
Stage 10 disposition: blocks G7 performance acceptance and production Autosave enablement. Baseline
collection may proceed without a pass claim.

OD8-04 | OPEN | P2 | Controlled visual baseline environments
Stage 10 disposition: blocks visual G6 release. Semantic Drawing/DXF/PDF/Viewer verification remains
required and can proceed earlier.

OD9-01 | OPEN | P1 | Ambiguous legacy bridge field semantics
Stage 10 disposition: blocks affected P1 migration and P3 apply. Preserve raw and quarantine
ambiguous `lines`/arbitrary params; do not infer road geometry or frame load/mechanics.

OD9-02 | OPEN | P3 | LINER frame STL product ownership and retention
Stage 10 disposition: remains UNKNOWN and retained. It is excluded from P4-P6 target release claims
until its usage and owner are proven.

OD10-01 | OPEN | P1 | Physical atomic persistence backend
Question: which supported file/store technology provides atomic multi-document commit for
EngineeringProject manifest, target documents, TransferRecord/migration record and result metadata?
Default: build the repository interface and fault-injection suite first; use one durable transaction
where available, otherwise staged content-addressed writes plus fsync/checksum and one atomic
manifest-pointer replacement. No target production writer until crash/retry/partial-write G2/G7.
Owner: persistence/platform owner with migration and verification owners.
Resolution evidence: supported platform matrix, atomicity proof/contract, fault-injection results,
recovery drill, idempotency and concurrent-writer behavior.
Decision gate: before PR-10 target writer production exposure and all target migration/apply.

OD10-02 | OPEN | P1 | Legacy retention and normal-write disable policy
Question: what support/telemetry/retention criteria allow normal legacy writes or entries to be
disabled while readers, raw source and aliases remain?
Default: do not disable them; P8 prepares evidence and a reversible policy only. No removal is
authorized. Unmigrated/blocked sources remain operable through their approved legacy-only path.
Owner: product/release owner with support, migration and records owners.
Resolution evidence: migration coverage and blocked inventory, usage/deep-link telemetry, support
window, restore drill, user communication and accepted rollback owner.
Decision gate: before any PR-46/47 exposure change.

No Stage 10 open item reopens D6/D7 source-of-truth, permits cross-document mutation/dual write, or
authorizes output/Autosave/legacy contraction before its affected gate.
