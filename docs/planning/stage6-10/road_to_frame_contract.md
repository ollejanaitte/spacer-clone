# Road-to-Frame Contract

## Status and Boundary

`RoadToFrameTransferPackage` is an immutable, versioned integration artifact. `TransferRecord` is an
append-only audit and mapping artifact. Neither is a shared mutable document, persistence shortcut,
or complete FEM model. The road document remains authoritative for exported road geometry; the frame
document becomes authoritative for accepted frame geometry and all frame mechanics.

An implementation must pass schema/contract G0, migration/compatibility G2, and transfer G3 before
apply is exposed for a source class. Coordinate, stable-ID, or ambiguous-field uncertainty produces
preview/quarantine diagnostics and blocks mutation.

## Contract Roles

| Contract | Producer | Consumer | Mutability | Identity |
|---|---|---|---|---|
| `RoadToFrameTransferPackage` | Road exporter | Frame preflight/diff/apply | Immutable | schema version + package ID + content checksum |
| `TransferRecord` | Transfer service | Audit, re-import, rollback | Append-only | record ID + exact source/package/target revisions |
| `ChangeSet` | Three-way diff | User/command apply selection | Ephemeral or audit-attached | baseline/new/current checksums |
| `ApplyProfile` | Frame policy | Preflight/apply | Versioned | profile ID/version/checksum |

## Package Envelope

### Required

| Field | Meaning | Rule |
|---|---|---|
| `schemaId` | Contract family | Exact supported identifier |
| `schemaVersion` | Package SemVer | Major incompatibility fails closed |
| `packageId` | Stable package artifact ID | Unique; never reused with different contents |
| `sourceDocumentId` | RoadDesignDocument ID | Road namespace only |
| `sourceRevision` | Exact exported road revision | Immutable provenance and stale check |
| `sourceChecksum` | Exact source content checksum | Covers canonical target-relevant content |
| `createdAt` | Export timestamp | Informational; not identity authority |
| `createdBy` | Actor/tool provenance | Required audit subject |
| `coordinateContext` | CRS/origin/axes/handedness/vertical datum | Explicit; no apply-time inference |
| `unitContext` | Linear/angular/load conventions | Canonical target conversion must be exact |
| `capabilities` | Present/absent/unsupported/deferred feature declarations | Consumers must not infer omitted capability |
| `geometry` | Versioned geometry collections | Every entity has stable road geometry ID |
| `contentChecksum` | Canonical package checksum | Verification precedes parse/apply |

### Optional

| Field | Meaning | Rule |
|---|---|---|
| `sourceProjectRef` | EngineeringProject reference | Reference only; no copied project truth |
| `parentPackageId` | Prior package lineage | Used for re-export history, not acceptance baseline alone |
| `stationReference` | Named alignment/station system and equations | Required when any entity uses station/offset |
| `recommendedApplyProfile` | Compatible frame apply policy | Consumer may reject or substitute explicitly |
| `extensions` | Namespaced optional contract extensions | Unknown preserved; critical unknown blocks affected apply |
| `notes` | Non-authoritative user note | Excluded from engineering identity unless contract says otherwise |

Required/optional is capability-aware: a declared absent capability is different from an older
producer that cannot report it. A consumer records `SUPPORTED`, `UNSUPPORTED`, `ABSENT`, `DEFERRED`,
or `UNKNOWN` per capability before preview.

## Transferable Geometry and Candidates

| Category | Examples | Ownership after acceptance |
|---|---|---|
| Alignment/station reference | alignment ID, station equation reference, local tangent/normal | Road remains source; Frame stores accepted reference/mapping |
| Coordinate/unit context | CRS/name, origin, axes, handedness, vertical datum, m/rad conversion | Contract context; not editable during apply |
| Substructure geometry | abutment/pier reference axes, faces, elevations | Accepted frame geometry may diverge through later frame revisions |
| Bearing-line geometry | line/plane, orientation, stable road ID | Geometry only; mechanics remain Frame |
| Span candidates | ordered support references and measured spans | Candidate/reference, not a solver constraint |
| Girder/cross-girder candidates | axes/curves, ordering, topology hints | Candidate only; discretization and section remain Frame |
| Deck/pavement/haunch regions | boundaries, thickness-region candidates if explicitly road-owned | Region geometry only, not material/stiffness/load |
| Road/sidewalk regions | lane/roadway/sidewalk boundaries | Placement range candidate |
| Load placement ranges | geometric lane/range candidates | Not a load case, vehicle, factor, or combination |
| Provenance | source entity/revision/algorithm/version | Retained in record and mappings |

Each geometry entity carries a road stable ID, type, coordinate representation, source path or
provenance, and dependency references. Optional names/labels never replace stable identity.

## Prohibited Transfer

The package must not contain or default any of the following as authoritative frame data:

- material actual values or constitutive behavior;
- section stiffness or frame analysis section assignment;
- bearing/support mechanics, constraints, springs, releases, or rigid offsets;
- FEM node/member IDs, numbering, mesh density, or solver ordering;
- load cases, load combinations, vehicle/axle mechanical definitions, or analysis factors;
- solver/control settings, analysis conditions, convergence settings, or result selection;
- static/modal/spectrum/influence/moving-load results;
- Viewer camera, selection, clipping, coloring, display axis, or application session state.

A prohibited field is a G0/G3 contract violation. The consumer rejects the package; it must not
silently ignore a critical prohibited value and continue apply.

## Coordinate and Unit Contract

Target canonical engineering coordinates are right-handed, z-up. Linear canonical unit is metre;
angular canonical unit is radian. The package must declare:

- coordinate reference name/type and optional external CRS identifier;
- origin and translation relative to the declared source frame;
- axis order, directions, handedness, and vertical axis;
- vertical datum/elevation basis when relevant;
- station/offset/elevation convention and station equations;
- exact transform to target canonical coordinates, including transform version;
- source units for every non-canonical quantity and deterministic conversion;
- sign convention for crossfall, offset, rotations, and load-placement orientation.

Validation uses asymmetric, nonzero-Z, rotated, translated, mixed-unit fixtures. Display transforms
and Viewer preferences never become engineering transforms. A missing, inconsistent, or ambiguous
context is `UNKNOWN` and blocks apply under `OD6-01`; preview may show only clearly labeled raw and
candidate interpretations.

## ID, Revision, and Provenance Contract

- Road stable geometry IDs use a road namespace and survive reorder/save/load/re-export.
- FEM node/member IDs use a frame namespace and are created/owned by Frame.
- Mappings are explicit `roadGeometryId -> frameEntityId[]`; neither side changes namespace.
- Re-created/colliding road IDs require alias/collision evidence. Collision blocks apply under
  `OD6-02`; order/index/hash proximity is not identity.
- Every package names the exact source document ID, revision, and checksum.
- Every apply preconditions the exact current frame document ID, revision, and checksum.
- Provenance includes producer/tool/algorithm versions and source entity lineage.
- One road geometry may map to zero, one, or many frame entities; the record explains why.

## TransferRecord

### Required fields

| Field | Purpose |
|---|---|
| `recordId`, `schemaVersion` | Append-only record identity/version |
| `packageId`, `packageChecksum` | Exact verified package |
| `sourceDocumentId`, `sourceRevision`, `sourceChecksum` | Exact road origin |
| `baselineRecordId` | Previous accepted baseline, absent only for first import |
| `targetDocumentId`, `targetBeforeRevision`, `targetBeforeChecksum` | Exact frame precondition |
| `targetAfterRevision`, `targetAfterChecksum` | Result of accepted mutation; absent for preview/reject |
| `status` | previewed, rejected, partially accepted, accepted, conflicted, stale, rolled back |
| `capabilityAssessment` | Producer/consumer support and blocked capabilities |
| `entityMappings` | Stable road ID to frame entity IDs and mapping disposition |
| `acceptedChanges`, `rejectedChanges`, `conflicts` | Field/entity-level decision and reason |
| `coordinateTransformId`, `applyProfileId` | Exact reviewed policies |
| `actor`, `timestamp`, `toolVersion` | Audit provenance |
| `rollbackOf` / `supersedes` | Lineage without record mutation |

The record contains checksums of accepted inputs and selections. It must be committed atomically with
the new frame revision. A rejected or preview record may be appended without a frame mutation.

## First Import

1. Verify envelope, checksum, schema version, capabilities, coordinate/unit context, stable IDs, and
   prohibited fields before interpreting geometry.
2. Resolve or fail closed on all dependencies and reference targets.
3. Produce a dry-run preview containing proposed frame geometry, mappings, defaults (none implicit),
   warnings, blocked items, and exact current target precondition.
4. Require explicit acceptance of a dependency-closed selection.
5. Create a new FrameDocument revision and append TransferRecord in one atomic transaction.
6. Do not modify the RoadDocument, package, legacy source, or any frame mechanics not accepted.

If an existing FrameDocument is not empty, first import still uses a three-way-safe policy: there is
no license to replace current frame-owned fields merely because no baseline record exists.

## Re-import and Three-Way Diff

The comparison is:

```text
last accepted source/package baseline
            vs new package
            vs current FrameDocument revision
```

For each mapped entity/field, classify `UNCHANGED`, `SOURCE_ONLY`, `FRAME_ONLY`, `SAME_CHANGE`,
`CONFLICT`, `ADDED`, `REMOVED`, `UNMAPPED`, `STALE`, or `BLOCKED`. Default policy preserves
`FRAME_ONLY` edits. A `CONFLICT` requires explicit resolution; it never defaults to source overwrite.
Deleted road geometry does not automatically delete frame entities that have mechanics, references,
loads, results, or user edits.

## Partial Acceptance

- Selection is at declared entity/field granularity and must include its full dependency closure.
- A selection that leaves a dangling support/span/girder/region reference is invalid.
- Coordinate context, unit context, identity namespace, and package provenance are atomic and cannot
  be partially substituted.
- Mechanics, results, Viewer state, and other prohibited fields are never selectable.
- Validation failure commits neither target revision nor accepted TransferRecord state.
- Accepted and rejected fields are recorded so the next re-import can distinguish intent.

## Overwrite Protection

Apply requires all of the following:

- exact package and source checksums;
- exact current target revision/checksum precondition;
- accepted baseline lineage for re-import;
- no unresolved coordinate, unit, ID, schema, dependency, or ambiguous-field blocker;
- explicit conflict resolutions and dependency-closed selection;
- proof that the selection contains only transfer-owned geometry fields;
- atomic persistence capability and rollback plan.

Any mismatch restarts preview/diff. The service must not retry by applying to a newer frame revision.

## Stale, Tampered, and Unsupported Inputs

| Condition | Behavior |
|---|---|
| New road revision exists after export | Mark package stale; require re-export or explicit reviewed stale policy; no automatic apply |
| Package checksum mismatch | Reject as tampered/corrupt |
| Unsupported major schema | Preserve raw, reject apply |
| Unknown critical extension/capability | Preserve, quarantine affected scope |
| Unknown optional non-critical extension | Preserve round-trip; continue only if contract declares it non-critical |
| Missing baseline for claimed re-import | Treat as unverified/first-import preview; no inferred history |
| Target revision changed after preview | Reject precondition and recompute diff |

## History and Rollback

History is append-only. Rollback never edits/deletes a package, record, or historical frame revision.
It creates a new inverse FrameDocument revision or reselects a prior valid manifest reference with the
same concurrency preconditions, then appends a record referencing the operation being reversed.
Rollback failure leaves the current valid revision selected and records diagnostics; partial inverse
state is forbidden.

## Acceptance Traceability

The minimum transfer suite is `T8-01..T8-13` and G3, including asymmetric coordinates, mixed units,
stable-ID reorder/collision/one-to-many, prohibited fields, first import, re-import, frame-only edits,
conflicts, dependency closure, rollback, stale/tampered packages, save/reload, and fault injection.
Migration-related sources additionally pass M8 and G2; persistence/recovery passes relevant N8/G7.
