# Compatibility and Migration Matrix

## Governing Policy

The compatibility boundary is **read old, write target, no ordinary dual write**. Before parsing an
old artifact, preserve its raw bytes and checksum. A pure migration produces target revisions and an
audit record without overwriting the source. Unknown/ambiguous critical data is quarantined; it is not
discarded or guessed. Reverse conversion, where supported, is an explicit export operation.

## Legacy Layer Matrix

| Legacy layer | Entry/read | Target write | Preserve | Quarantine/reject | Exit gate | Rollback | Retention |
|---|---|---|---|---|---|---|---|
| LINER draft 0.1/0.2/0.3 | Versioned reader/importer | RoadDesignDocument only | Raw, unknown fields, coordinate/station provenance, IDs | Ambiguous coordinate/ID or unsupported critical field | G2; affected G1 | Keep source/reader, reselect prior target manifest | Reader/raw retained through P8 policy |
| Importer 0.1/local storage | Reader/export/migrate | Target repository only | Original key/data, raw checksum, diagnostics | Unknown version/context/ID collision | G2/G7 | Disable target writer; old key untouched | Reader/key retained; normal entry policy `OD10-02` |
| ProjectModel JSON | Legacy frame reader and comparison path | BridgeFrameAnalysisDocument/result resources | Raw, unknown fields, legacy IDs, result classification | Mixed road/frame ownership, unrecoverable transient result | G2/G4/G7 | Old run/read path and raw source remain | Reader/schema/fixtures retained |
| BridgeProject | Split reader/classifier | Road geometry and frame impacts to separate target docs | Raw lines/fields, creation provenance | Ambiguous `lines`, coordinate, load/mechanics meaning (`OD9-01`) | G2/G3/G4 | No commit or inverse target manifest; source unchanged | Raw/reader retained |
| BridgeDefinition | Compatibility intermediate reader | Split target docs/package only after classification | Raw params, geometry/mechanics provenance | Arbitrary params or inferred ownership | G2/G3/G4 | Keep BD reader/parity path | Reader/fixtures retained; target contract deprecated |
| Legacy bridge generators | Comparison-only facade | Package exporter or Frame apply/model builder, never both | Input/output fixtures and mappings | Direct mutation, implicit mechanics/defaults | G3/G4 | Disable target path; retain comparison path | Deprecate only after replacement gates |
| Backend legacy routes | Compatibility controllers | Exact target repository/analysis services | Request/version semantics and errors | Unsupported/ambiguous payload | G2/G4/G7 | Restore compatibility controller exposure | Retain during support policy |
| Browser/local project save | Legacy reader/export | Target manifest/documents atomically | Original keys/files and recovery record | Partial/unknown/corrupt source | G2/G7 | Prior complete manifest/manual save | Retain raw/reader per policy |
| Time-history persisted result | Typed legacy result reader/classifier | Versioned target result if exact bindings proven | Raw result, model/settings/version provenance | Missing model/load/solver binding | G2/G5/G7 | Recompute or retain legacy-only view | No false migration claim |
| Other transient results | Runtime legacy behavior | New target result only after recompute | Inputs and any raw export evidence | Claim of lossless result migration | G4/G5/G7 | Recompute through old supported path | No fabricated persisted result |
| Drawing/DXF/PDF/CSV | Existing output path | New product output after G6 | Existing templates/fixtures and semantics | Stale result, missing unit/sign/provenance | G6 | Route output to prior implementation | Retain until replacement passes |
| Viewer state | Session compatibility adapter | Session store only | Display-axis preference if needed | Domain-document/result migration | G0/G6 | Use old session adapter | Never domain truth |

## Route and Deep-Link Matrix

| Input route/surface | Target behavior | Compatibility rule | Exit/retirement |
|---|---|---|---|
| Canonical road entry | `/pro/road` | Direct canonical dispatch | Permanent product entry |
| Canonical frame entry | `/pro/frame` | Direct canonical dispatch | Permanent product entry |
| Existing road aliases/deep links | Normalize in pre-dispatch registry | Preserve query/hash/encoded project reference where valid | Retain by default; removal needs `OD6-04` |
| Existing frame/analysis aliases/deep links | Normalize before root/feature dispatch | Never let root fallback consume a declared alias | Retain by default; removal needs `OD6-04` |
| Legacy bridge modeler/wizard entry | Compatibility notice/read/migrate or legacy-only route | Do not silently redirect an unmigrated/blocked source into target writer | P8 only with `OD10-02` and restore drill |
| Unknown route | Existing not-found/fallback policy | Must not be mistaken for a declared legacy alias | Normal shell behavior |

Alias tests preserve query, hash, encoded IDs, refresh/direct navigation, back/forward, and unsupported
payload behavior under M8-12/N8-06. Route compatibility is independent of whether an old writer is
eventually disabled.

## Migration Pipeline

| Step | Action | Failure behavior |
|---|---|---|
| M0 Inventory | Identify source format/version/location and intended target | Unknown stays unmodified |
| M1 Raw preserve | Store bytes/value, checksum, source locator and access metadata | Stop before parse if preservation fails |
| M2 Classify | Determine known version/capabilities and critical unknowns | Quarantine unsupported/ambiguous source |
| M3 Pure parse | Parse known fields while retaining unknown paths/values | Emit structured diagnostics; raw remains |
| M4 Context/ID gate | Resolve coordinates, units, stable IDs, references, ownership | `OD6-01/02/OD9-01` blocks affected commit |
| M5 Step migration | Apply deterministic version steps to a copy | No source mutation; repeated run identical |
| M6 Validate/dry-run | Target schema/domain/reference/forbidden-field validation and preview | No commit; report exact paths and severity |
| M7 Atomic commit | Write target docs, project refs, migration/transfer records together | Old or new complete state only (`OD10-01`) |
| M8 Normal target write | Subsequent save writes target format only | Disable exposure/reselect prior target revision |
| M9 Audit/verify | Save/reload, checksums, raw recovery, result binding, telemetry | Hold release; retain all evidence |

## Preservation Classification

| State | Meaning | Permitted action |
|---|---|---|
| `PRESERVE` | Known legacy content not yet migrated or retained for recovery | Read/checksum/export; no destructive normalization |
| `MIGRATE` | Semantics, coordinate, ID, units and target mapping proven | Dry-run then atomic target commit |
| `QUARANTINE` | Content is intact but critical semantics are unknown/ambiguous | Diagnostics/preview only; no affected target mutation |
| `REJECT` | Tampered/corrupt/unsupported major or forbidden critical content | Keep raw and explain; no target use |
| `DEPRECATE` | Replacement exists and gates pass, but compatibility remains | Hide/notice only under policy; reader/raw retained |
| `REMOVE` | Not authorized in Stage 6-10 | Requires a separate evidence-backed decision |

## Entry, Exit, Rollback, and Retention

Compatibility behavior enters before target feature exposure: raw store, readers, version registry,
route registry, dry-run, target writer, then migration. It exits only one surface at a time in P8.
Every exit requires migrated/blocked inventory, usage/deep-link telemetry, declared support window,
user communication, restore/re-enable drill, and named owner (`OD10-02`).

Rollback disables target exposure or creates/reselects a complete target manifest revision. It does
not restore by overwriting the legacy source, delete a migration record, or select between ordinary
legacy and target writers for the same document. Unmigrated/blocked sources retain an approved
legacy-only path. Readers, aliases, raw data, schemas, and fixtures remain by default.

## Acceptance

The compatibility baseline is M8-01..12 plus N8-01/02/05/06/08 under G2/G7. Each supported legacy
fixture covers raw preservation, unknown fields, idempotence, version path, coordinates/IDs, split
ownership, atomicity/fault injection, save/reload, result classification, route/deep link, and
rollback. Passing one format does not authorize another source class.
