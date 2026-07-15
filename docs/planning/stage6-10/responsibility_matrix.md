# Target Responsibility Matrix

## Rules

1. `RoadDesignDocument` and `BridgeFrameAnalysisDocument` are separate authoritative documents.
2. `EngineeringProject` owns references, ordering, labels, and project-level audit metadata only.
3. Cross-product data moves only through an immutable package and append-only record.
4. Shared code owns mechanisms and primitives, never either product's domain truth.
5. A product may read a versioned reference owned by the other product; it may not mutate that
   document, copy it as an ordinary second truth, or infer missing coordinate/ID semantics.

## Product and Platform Ownership

| Capability/data | Authoritative owner | Consumer | Source of truth | Allowed operation | Forbidden operation |
|---|---|---|---|---|---|
| Horizontal/vertical alignment, stationing | Road | Road, transfer exporter | RoadDesignDocument | Road commands and versioned save | Frame mutation or FEM-ID substitution |
| Crossfall, cross-section composition, widening | Road | Road, transfer exporter | RoadDesignDocument | Road calculation/edit | Frame-owned override written back to road |
| Abutment/pier geometry, bearing lines, spans | Road | Road drawing, transfer | RoadDesignDocument | Geometry edit and candidate export | Embedding support mechanics in road truth |
| Girder/cross-girder candidates, deck/pavement/haunch/road regions | Road | Transfer, road drawing | RoadDesignDocument | Candidate/region export | Claiming material/stiffness/load truth |
| LDIST, HAUNCH, HOSO, road TOOL calculations | Road | Road UI/output | RoadDesignDocument or derived road result | Versioned road command/result | Direct frame model mutation |
| Materials and section stiffness | Frame | Solver, PRINT/DRAFT | BridgeFrameAnalysisDocument | Frame command and migration | Road package authoring actual values |
| FEM nodes/members and numbering | Frame | Solver, Viewer, output | BridgeFrameAnalysisDocument | Frame discretization/edit | Reusing road IDs as FEM numbers or reverse |
| Support mechanics, springs, releases, rigid offsets | Frame | Solver, output | BridgeFrameAnalysisDocument | Frame edit/validation | Road transfer overwrite/default insertion |
| Load cases, combinations, INFLOAD mechanics | Frame | Solver, results | BridgeFrameAnalysisDocument | Frame analysis definition | Road document becoming load-case truth |
| Solver settings and execution lifecycle | Frame | Engine/controller | BridgeFrameAnalysisDocument + run record | CONTROL/STATICS/R-SPECTRUM | Shared/UI session as persistent truth |
| Analysis results and staleness | Frame | Viewer, PRINT/DRAFT | Versioned result resource | Checksum-bound persist/read/invalidate | Rendering stale result as authoritative |
| Viewer camera/selection/preferences | Application session | Road/Frame viewers | Session store | Read/write session only | Persisting into domain documents |
| Drawing semantics/content selection | Owning product | Drawing/DXF renderer | Product document/result | Build DrawingDocument | Shared renderer choosing engineering truth |
| Drawing/DXF geometry/paper/serialization mechanisms | Shared platform | Road and Frame | Shared contracts | Neutral validation/render/export | Importing Road or Frame domain modules |
| Coordinate/unit primitives and transforms | Shared kernel | All target modules | Versioned contract | Explicit conversion/validation | Guessing legacy authority during apply |
| Stable ID/revision/provenance/checksum primitives | Shared kernel | Documents/migration/transfer | Versioned contract | Namespace/validate/reference | Collapsing road and FEM ID namespaces |
| ValidationResult/error/log/history/file/table mechanisms | Shared platform | Both products | Shared contract/service | Neutral mechanism | Owning domain validation rules or truth |
| Road-to-Frame package | Integration | Frame preflight/apply | Immutable package artifact | Export, verify, preview | Mutation after content identity is assigned |
| TransferRecord and accepted mapping | Integration | Audit, later re-import | Append-only record | Append accepted/rejected/conflict event | Rewriting history or hiding rejected fields |
| Legacy raw bytes/unknown fields | Compatibility | Migration/recovery | Preserved raw store | Read, checksum, classify, quarantine | Drop, normalize destructively, or overwrite |
| Legacy ProjectModel/BridgeProject/BridgeDefinition | Compatibility adapters | Migration, comparison | Original legacy source | Read/export/dry-run | Ordinary dual write or target authority |
| Route aliases/deep links | Compatibility shell | Users/bookmarks | Route registry | Normalize before dispatch | Removing without telemetry/retention gate |

## Target Module Responsibility

| Module | Owns | Does not own |
|---|---|---|
| `Road.Application` | Road workflows, commands, RoadDocument repository use | Solver runtime, frame results |
| `Road.Core` | alignment, station, profile, crossfall/cross-section algorithms | frame mechanics |
| `Road.BridgeGeometry` | road-owned bridge/substructure/bearing/span/region geometry | materials, supports, FEM mesh |
| `Road.Import` | raw-preserving road import and provenance | cross-product apply |
| `Road.Drawing` | road/bridge drawing semantics | shared serializer or frame drawings |
| `Frame.Application` | FrameDocument lifecycle, CONTROL, validation, result lifecycle | road source edits |
| `Frame.Model` | materials, sections, nodes/members, supports, mechanics, loads | road document truth |
| `Frame.Engine` | assembly, statics, modal, spectrum, influence/live-load calculations | persistence document or Viewer session |
| `Frame.Results` | persisted result resources, checksum binding, staleness | drawing truth or camera state |
| `Frame.PRINT` / `Frame.DRAFT` | formal frame reports/drawings from valid results | result calculation/ownership |
| `Integration.Transfer` | package/record, preview/diff/conflict/apply/rollback | road calculation or solver mechanics |
| `Shared.*` | neutral primitives and mechanisms | product documents and algorithms |
| `Compatibility.*` | readers, raw store, migration registry, route aliases | target normal write or inferred truth |

## Mutation Boundary

| Actor | May mutate | May reference | Must not mutate |
|---|---|---|---|
| Road command | New RoadDocument revision | EngineeringProject and prior road revision | FrameDocument/result/TransferRecord history |
| Frame command | New FrameDocument revision | accepted package/record and prior frame revision | RoadDocument/package contents |
| Transfer exporter | New immutable package | exact RoadDocument revision | RoadDocument or FrameDocument |
| Transfer apply | New FrameDocument revision and appended record atomically | package, baseline record, current frame revision | source package/road revision or history |
| Migration | New target revisions/manifest/migration record atomically | preserved legacy raw and classifier result | legacy source/raw store |
| Viewer/output | Session/output artifact | exact document/result revisions | either domain document or result |

Violation of these boundaries is a G0 architecture failure and blocks merge/release regardless of
feature-level numerical results.
