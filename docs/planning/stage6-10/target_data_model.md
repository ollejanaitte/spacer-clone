# Target Data Model

## Design Rules

- Target contracts are versioned independently and referenced by ID, revision, and checksum.
- Domain documents are immutable revisions for persistence/audit purposes.
- `EngineeringProject` is a reference container, not a copy of domain content.
- Raw bytes and unknown fields are preserved before parse or migration.
- Migrations are pure, stepwise, idempotent, validated, and committed atomically.
- Missing/ambiguous coordinate or stable-ID authority blocks affected mutation.
- A target writer never ordinary-dual-writes a legacy source.

## Common Envelope

| Field | Required | Meaning | Validation/migration rule |
|---|---|---|---|
| `schemaId` | Yes | Contract family | Exact supported identifier |
| `schemaVersion` | Yes | Contract SemVer | Registry has each supported step; unknown major fails closed |
| `documentId` / `artifactId` | Yes | Namespaced stable identity | Unique in contract namespace |
| `revision` | Documents/records | Monotonic or immutable revision identity | Independent per document; never inferred from timestamp |
| `contentChecksum` | Yes | Canonical content identity | Verified before use; excludes mutable transport metadata by rule |
| `createdAt`, `createdBy` | Yes | Audit provenance | Preserved across migration as source provenance |
| `updatedAt`, `updatedBy` | Documents | Revision provenance | New revision receives new audit values |
| `producer` | Yes | Product/tool/algorithm version | Used for compatibility and reproduction |
| `extensions` | Optional | Namespaced unknown/optional data | Preserve byte/semantic representation; critical unknown blocks use |
| `migrationProvenance` | Migrated artifacts | Source format/checksum/steps | Append each pure step and warnings |

Checksums are defined per contract with canonical ordering and numeric representation. A legacy
source hash may seed provenance but never substitutes for target content checksum without proof.

## EngineeringProject

### Required conceptual fields

| Field | Cardinality | Meaning |
|---|---|---|
| common envelope | 1 | Project artifact identity/version/checksum |
| `name` | 1 | User label; not identity |
| `roadDesignRef` | 1 | Exact RoadDesignDocument ID/revision/checksum |
| `frameAnalysisRefs` | 0..n | Exact BridgeFrameAnalysisDocument references |
| `transferRecordRefs` | 0..n | Ordered references to append-only records |
| `projectRevisionMetadata` | 1 | Manifest/reference change provenance |

### Optional fields

Project tags, user notes, external file references, and product entry preferences may be stored only
when they do not copy road/frame domain state or Viewer session state.

Changing a referenced document produces a new EngineeringProject manifest revision. Document saves
and manifest/reference updates use one atomic repository transaction when both change.

## RoadDesignDocument

### Required conceptual fields

| Field group | Contents |
|---|---|
| envelope/revision | document ID, schema version, revision, checksum, provenance |
| coordinate/unit | explicit `CoordinateContext`, `UnitContext`, station convention |
| alignments | one or more stable-ID horizontal/vertical alignments and station equations |
| cross-section system | crossfall, widening, cross-section composition and stable references |
| validation | versioned document/domain ValidationResults or exact refs |

### Optional capability blocks

| Block | Examples | Capability state required |
|---|---|---|
| topology | multiple alignment, branch, merge | supported/absent/unknown |
| bridge geometry | abutment/pier/bearing/span/girder/deck/road region geometry | supported/partial/absent |
| `LDIST` | distance/overhang calculations and inputs | supported/absent |
| `HAUNCH` | typed haunch definitions/regions/results | supported/absent |
| `HOSO` | pavement definitions/regions/results | supported/absent |
| drawing intent | road/bridge semantic drawing selections | supported/absent |
| importer provenance | raw source ref, classifier, mapping diagnostics | imported documents only |

The road document does not contain frame materials, stiffness, supports, FEM numbering, analysis
cases/results, or frame Viewer state. Derived road results identify inputs/algorithm/version and can
be recomputed; authoritative editable inputs remain distinguishable from derived output.

## BridgeFrameAnalysisDocument

### Required conceptual fields

| Field group | Contents |
|---|---|
| envelope/revision | document ID, schema version, revision, checksum, provenance |
| coordinate/unit | explicit engineering coordinate/unit/sign conventions |
| model | stable frame-owned nodes, members, materials, sections, supports |
| analysis catalog | load cases and analysis types with typed settings |
| result references | versioned result IDs and validity/staleness status |
| validation | document, pre-run, solver and result validation references |

### Optional capability blocks

Springs, member-end releases, rigid offsets, fixed-load families, influence/live-load lanes/vehicles,
static combinations/envelopes, modal, response spectrum, and formal output configurations are
versioned optional blocks. Absence is explicit; a legacy parser must not synthesize mechanics from
road geometry or ambiguous legacy fields.

Frame geometry accepted from Road-to-Frame stores mapping/provenance and becomes part of a new frame
revision. Later frame edits remain frame-owned and are protected during re-import.

## Persisted Result Resource

| Field | Required | Rule |
|---|---|---|
| result ID/schema version/checksum | Yes | Immutable versioned result artifact |
| frame document ID/revision/checksum | Yes | Exact model binding |
| load case/combination IDs and checksums | Yes | Exact analysis-definition binding |
| solver/algorithm/version/settings checksum | Yes | Reproduction and invalidation |
| result type/quantity/unit/sign convention | Yes | No presentation-only inference |
| status and validation evidence | Yes | completed/failed/partial/stale with residual/equilibrium evidence |
| data/index mapping | Yes | Stable frame IDs, not Viewer indices |
| provenance/timestamps | Yes | Run actor/environment where required |

A mismatch in any binding marks the result stale. Viewer, PRINT, and DRAFT may display stale results
only as explicitly non-authoritative diagnostics; they cannot export them as current engineering
results. Result migration never invents lost transient data.

## RoadToFrameTransferPackage and TransferRecord

The focused contract is [road_to_frame_contract.md](./road_to_frame_contract.md). Both use the common
envelope pattern. The package is immutable; the record is append-only and atomically references the
before/after frame revisions. Capability and apply-profile versions are explicit.

## CoordinateContext

| Field | Required | Meaning |
|---|---|---|
| `contextId`, `version` | Yes | Stable context contract identity |
| `referenceType/name` | Yes | Local/project/external CRS description |
| `origin` | Yes | Explicit coordinates in declared source units |
| `axisOrder`, `axisDirections` | Yes | Engineering axis mapping |
| `handedness`, `verticalAxis` | Yes | Target requires right-handed z-up after conversion |
| `transformToCanonical` | Yes | Deterministic transform and version |
| `verticalDatum` | When elevations cross contexts | Elevation authority |
| `stationConvention` | Road/station geometry | Tangent/normal, offset/elevation signs, equations |
| `confidence/status` | Legacy/migrated | verified/unknown/conflicted; unknown blocks mutation |

## UnitContext

| Field | Required | Meaning |
|---|---|---|
| linear/angular units | Yes | Canonical target is m/rad |
| force/moment/stress/mass/time units | Frame/loads/results | Exact typed units per quantity |
| sign conventions | Affected quantities | Crossfall, rotation, force/moment/result orientation |
| conversion version | Yes | Deterministic library/contract version |

Numeric serialization must not depend on locale or display rounding. UI display units are preferences,
not stored engineering values unless the contract explicitly stores presentation metadata separately.

## RevisionMetadata and References

Every cross-artifact reference includes target schema family, artifact/document ID, exact revision,
and checksum. A floating "latest" reference is prohibited in persisted engineering/audit data.
Revision metadata contains parent revision(s), actor, command/reason, timestamp, producer version, and
optional migration/transfer record reference. Branch/merge history, if introduced, is explicit rather
than inferred from integer ordering.

## Unknown Fields and Raw Preservation

1. Persist raw source bytes and source checksum before parse.
2. Classify format/version/capabilities without modifying raw input.
3. Parse known fields into an intermediate value that retains unknown paths/values.
4. Reject or quarantine unknown critical fields; preserve optional non-critical fields round-trip.
5. Run pure migration on a copy and emit warnings/decisions with paths.
6. Validate target schema, references, coordinates, IDs, units, and forbidden cross-domain fields.
7. Commit target documents, references, and migration record atomically; leave raw/legacy unchanged.

`additionalProperties: false` is not evidence that data may be discarded. A strict target schema can
coexist with a separate raw/unknown preservation store and namespaced extension contract.

## Schema Version and Migration

- Each contract uses SemVer and its own migration registry.
- Minor migrations are additive/compatible only when readers preserve unknown optional data.
- Major incompatibility fails closed and leaves the source readable/quarantined.
- A migration step is deterministic, pure, idempotent, and has a reverse/recovery policy.
- Read old and write target; normal operations never dual write old and target forms.
- Save/reload, repeated migration, partial-write/crash, concurrent writer, and checksum corruption are
  mandatory M8/N8 cases.
- The physical atomic backend remains `OD10-01`; production target write is blocked until proven.
