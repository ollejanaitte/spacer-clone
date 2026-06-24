# Intermediate Result Model

## Purpose

Define the **canonical computed state** produced by the liner calculation pipeline. Every downstream consumer — 2D rendering, 3D preview, CAD export, reports, and frame model generation — must read exclusively from this model, never re-derive geometry from raw domain input or UI state.

This document is the **highest-priority** design artifact for the liner module and the single source of truth for computed geometry and frame-generation metadata.

## Scope

- Structure, field definitions, and versioning of intermediate results.
- Lifecycle: creation, invalidation, partial updates, full replacement.
- Serialization for debugging and optional caching (not primary persistence).
- Indexing and lookup conventions (by station, by grid id, by segment id).
- Provenance metadata: which domain revision produced which result revision.
- Frame-generation hints consumed by [frame_model_mapping.md](frame_model_mapping.md).

## Out of Scope

- User-editable domain entities ([domain_model.md](domain_model.md)).
- FEM-specific structures (`nodes`, `members` in `project.json`) — those are outputs of [frame_model_mapping.md](frame_model_mapping.md).
- UI view state (zoom, selection, panel visibility).
- Analysis results (displacements, member forces).
- Formatted station labels (generated at UI/report boundary per [station_rules.md](station_rules.md)).

## Assumptions

- Intermediate results are **immutable snapshots** per calculation pass; updates replace the whole snapshot or clearly versioned subtrees.
- The calculation core writes intermediate results; UI and export modules are read-only consumers.
- Station is the primary indexing parameter along the alignment; global XYZ is derived.
- Internal coordinates use double precision; display rounding is applied only at UI/export boundaries ([unit_and_precision_policy.md](unit_and_precision_policy.md)).
- Numeric station values are stored in meters; `stationLabel` strings are never persisted in core results.

## Design Topics

### 1. Top-level container

```ts
type LinerIntermediateResult = {
  schemaVersion: "0.2.0";
  computedAt: string;           // ISO 8601
  sourceRevision: string;       // SHA-256 of canonical domain JSON (see §12)
  linerModelId: string;         // namespace for generated frame entity IDs
  coordinatePolicyId: string;   // reference to applied policy snapshot
  horizontal: HorizontalGeometryResult;
  vertical: VerticalGeometryResult;
  stations: StationTableResult;
  grid: GridResult;             // points, lines, cells (see §5–§7)
  spans: SpanResult[];
  piers: PierResult[];
  frameHints: FrameGenerationHintResult;
  sections: SectionSliceResult[];  // optional cross-section samples
  diagnostics: ComputationDiagnostic[];
  dependencyGraph: DependencySnapshot;  // see [line_dependency_graph.md](line_dependency_graph.md)
};
```

### 2. Horizontal geometry result

| Field | Description |
| --- | --- |
| `totalLength` | Physical length along alignment (m) |
| `segments` | Resolved segment geometry with start/end station, azimuth, curvature |
| `sampledPoints` | Dense polyline at configurable spacing for rendering and CAD |
| `piPoints` | Resolved intersection points (if PI-based input converted) |

Each sampled point:

```ts
type AlignmentSamplePoint = {
  physicalDistance: number; // cumulative arc length from origin (m)
  displayedStation: number; // after station equations
  x: number;
  y: number;
  azimuth: number;      // rad, tangent direction
  curvature: number;    // 1/m, signed (+ left, − right per [coordinate_system_policy.md](coordinate_system_policy.md))
  segmentId: string;
  localFrame: LocalFrame; // T, N, B at sample
};
```

### 3. Vertical geometry result

Vertical components are split explicitly ([profile_rules.md](profile_rules.md)):

| Field | Description |
| --- | --- |
| `profileElevation` | Alignment profile Z(s) from grade/parabolic segments |
| `segments` | Resolved profile segments with grade, PVC, PVI, PVT |
| `sampledPoints` | Station → elevation pairs (profile axis only) |
| `gradeBreaks` | Locations of grade changes |

```ts
type ProfileSamplePoint = {
  physicalDistance: number;
  displayedStation: number;
  profileElevation: number;   // Z on profile axis (m)
  grade: number;              // dimensionless slope dZ/d(physical distance)
  segmentId: string;
};
```

### 4. Station table result

Unified station index resolving equations. See [station_rules.md](station_rules.md) for formal mapping.

```ts
type StationTableEntry = {
  entryId: string;            // stable row id for disambiguation
  displayedStation: number;   // chainage shown to user (m)
  physicalDistance: number;   // cumulative arc length from origin (m)
  equationId?: string;
  sortIndex: number;          // monotonic; breaks ties when displayedStation duplicates
  note?: string;
};

type StationTableResult = {
  entries: StationTableEntry[];
  originDisplayedStation: number;
  increasingDirection: "forward" | "backward";
};
```

**Duplicate displayed stations:** When station equations produce equal `displayedStation` values, APIs and UI resolve rows by `sortIndex` ascending. Lookup by displayed station returns the row whose physical-distance interval contains the query point; if ambiguous at an equation boundary, the row with lower `sortIndex` wins at exact equality.

### 5. Local frame

```ts
type Vec3 = { x: number; y: number; z: number };

type LocalFrame = {
  tangent: Vec3;    // unit T, horizontal projection normalized
  normal: Vec3;     // unit N, left of T in plan (+90° CCW from T)
  binormal: Vec3;   // unit B = T × N (+Z for bridge workflows)
};
```

Computed at every grid point and alignment sample. Superelevation (post-MVP) rotates N/B about T; until then N is horizontal left normal.

### 6. Grid point result

Primary deliverable for frame model mapping:

```ts
type GridPointResult = {
  id: string;               // stable grid node id, e.g. GP-{linerModelId}-{li}-{ti}
  gridDefinitionId: string;
  physicalDistance: number;
  displayedStation: number;
  offset: number;           // transverse offset from alignment (m), signed (+ left)
  x: number;
  y: number;
  z: number;
  localFrame: LocalFrame;
  labels: {
    longitudinalIndex: number;
    transverseIndex: number;
  };
  source: GridPointSource;
  roles: GridPointRole[];
  zProvenance: ZProvenance;
  memberGroupKey?: string;  // resolved key for [frame_model_mapping.md](frame_model_mapping.md) rules
};

type GridPointSource = {
  alignmentId: string;
  stationRuleId?: string;
  spanId?: string;
  pierId?: string;
  crossSectionTemplateId?: string;
  longitudinalLineId?: string;
  transverseLineId?: string;
  gridLineId?: string;
};

type GridPointRole =
  | "main_girder"
  | "cross_girder"
  | "pier_line"
  | "bearing"
  | "edge"
  | "virtual"
  | "construction_only";

type ZProvenance = {
  profileElevation: number;
  crossfallOffset: number;      // 0 until superelevation MVP
  structuralReferenceOffset: number;
  sectionDepthOffset: number;
  girderEccentricity: number;
  // z = sum of components; stored for audit
};
```

**Ordering guarantee:** `grid.points[]` is sorted by `labels.longitudinalIndex` ascending, then `labels.transverseIndex` ascending. When station equations cause duplicate displayed stations, `physicalDistance` and `sortIndex` from the station table determine longitudinal ordering — not displayed station alone.

### 7. Grid line and cell results

```ts
type GridLineResult = {
  id: string;
  gridDefinitionId: string;
  direction: "longitudinal" | "transverse";
  index: number;              // line index in that direction
  pointIds: string[];         // ordered GridPointResult ids along the line
  role: GridPointRole;
  spanId?: string;
  pierId?: string;
};

type GridCellResult = {
  id: string;
  cornerPointIds: [string, string, string, string]; // CCW in plan
  spanId?: string;
};

type GridResult = {
  points: GridPointResult[];
  lines: GridLineResult[];
  cells: GridCellResult[];
};
```

### 8. Span and pier results

```ts
type SpanResult = {
  id: string;
  startPhysicalDistance: number;
  endPhysicalDistance: number;
  startDisplayedStation: number;
  endDisplayedStation: number;
  pierIdStart?: string;
  pierIdEnd?: string;
};

type PierResult = {
  id: string;
  physicalDistance: number;
  displayedStation: number;
  skewAngleRad: number;       // pier line vs alignment normal
  bearingOffsets?: { transverseIndex: number; offset: number }[];
  supportLinePointIds: string[];  // grid points on pier line
};
```

### 9. Frame generation hints

Consumed by the mapper; not written to `project.json` directly:

```ts
type FrameGenerationHintResult = {
  defaultMemberGroupKey: string;
  memberGroupRules: MemberGroupRule[];  // see [domain_model.md](domain_model.md)
  supportTemplates: SupportTemplateHint[];
  connectivityMode: "longitudinal_only" | "transverse_only" | "grid_full";
};

type MemberGroupRule = {
  key: string;
  match: { role?: GridPointRole; direction?: "longitudinal" | "transverse"; transverseIndex?: number; spanId?: string };
  materialId: string;
  sectionId: string;
};

type SupportTemplateHint = {
  templateId: string;
  pierId?: string;
  physicalDistance?: number;
  nodeRoles: GridPointRole[];
  dof: { ux: boolean; uy: boolean; uz: boolean; rx: boolean; ry: boolean; rz: boolean };
  coordinateSystem: "global" | "local_pier";
};
```

### 10. Section slice result (optional MVP)

Samples at stations for report/CAD cross-section views:

```ts
type SectionSliceResult = {
  physicalDistance: number;
  displayedStation: number;
  width: number;
  leftEdge: { offset: number; z: number };
  rightEdge: { offset: number; z: number };
  templateId: string;
};
```

### 11. Diagnostics

Non-fatal computation notes. Error codes defined in [error_handling.md](error_handling.md).

```ts
type ComputationDiagnostic = {
  level: "info" | "warning" | "error";
  code: string;             // e.g. LINER_GEOM_ZERO_LENGTH_SEGMENT
  messageKey?: string;      // i18n key for UI
  entityType?: string;
  entityId?: string;
  entityPath?: string;      // e.g. "alignments[0].segments[2].radius"
  field?: string;
  station?: number;
  physicalDistance?: number;
};
```

### 12. Source revision and traceability

`sourceRevision` is computed as:

```text
SHA-256( canonicalJson(domainInputWithoutComputedFields) )
```

Canonical JSON rules:

1. UTF-8 encoding.
2. Keys sorted lexicographically at every object level.
3. No whitespace; numbers in shortest decimal representation.
4. Exclude `computedAt`, cached intermediate blobs, and UI-only fields.

Each grid point and frame-mapped entity must be traceable:

```text
Node N_LINER_{linerModelId}_002_001
  → gridPointId GP-{linerModelId}-002-001
  → physicalDistance 20.0, displayedStation 20.0, offset -5.0
  → source.spanId SP-01, role main_girder
```

Traceability storage in `project.json` is defined in [integration_with_frame_model.md](integration_with_frame_model.md) (`linerTrace` table).

### 13. Invalidation and partial results

| Subtree | Invalidated when |
| --- | --- |
| `horizontal` | Any horizontal segment or station equation changes |
| `vertical` | Any profile segment changes |
| `stations` | Horizontal or station equation changes |
| `grid`, `spans`, `piers`, `frameHints` | Horizontal, vertical, grid definition, cross-section, pier, or span changes |
| `sections` | Profile or cross-section template changes |
| Frame model (external) | Any grid change, or generation-settings / material rule change without geometry change |

Policy detail and propagation examples in [line_dependency_graph.md](line_dependency_graph.md) and [recalculation_policy.md](recalculation_policy.md).

### 14. Consumer contract

| Consumer | Required fields | Resampling |
| --- | --- | --- |
| Plan view renderer | `horizontal.sampledPoints`, `grid.points` (XY) | **Fixed** — uses `sampledPoints` only |
| Profile view renderer | `stations`, `vertical.sampledPoints` | **Fixed** |
| CAD export | `horizontal`, `vertical`, `grid`, `sections` | **Fixed** — see [cad_output_spec.md](cad_output_spec.md) |
| Report | All tables derivable from above | **Fixed** |
| Frame model mapper | `grid`, `spans`, `piers`, `frameHints`, `coordinatePolicyId` | N/A |
| 3D preview (post-MVP) | `grid`, `horizontal.sampledPoints` | **Fixed** |

**Rule:** No consumer may call geometry algorithms directly on domain input. Re-sampling at a different density is allowed only through the calculation pipeline ([calculation_pipeline.md](calculation_pipeline.md)), never ad-hoc in render/CAD modules.

### 15. Versioning

- `schemaVersion` semver on intermediate result root.
- **0.2.0** adds `grid` container, local frames, provenance, span/pier entities, and `frameHints`.
- Breaking changes require mapper and test updates per [schema_migration_policy.md](schema_migration_policy.md).
- `sourceRevision` enables UI to detect stale cached views.

## Open Questions

- Maximum expected grid point count and flat vs. nested array storage?
- Binary snapshot format for large models?
- Superelevation rotation of local frame — intermediate field shape when added?

## Related Documents

- [geometry_core.md](geometry_core.md)
- [calculation_pipeline.md](calculation_pipeline.md)
- [recalculation_policy.md](recalculation_policy.md)
- [line_dependency_graph.md](line_dependency_graph.md)
- [frame_model_mapping.md](frame_model_mapping.md)
- [integration_with_frame_model.md](integration_with_frame_model.md)
- [station_rules.md](station_rules.md)
- [profile_rules.md](profile_rules.md)
- [rendering_strategy.md](rendering_strategy.md)
- [cad_output_spec.md](cad_output_spec.md)
- [report_output_spec.md](report_output_spec.md)
- [error_handling.md](error_handling.md)

## Pre-Implementation Checklist

- [ ] Type definitions reviewed by geometry and FEM stakeholders.
- [ ] Every output path traced to intermediate result fields (no bypass).
- [ ] Invalidation matrix complete for all domain entity types.
- [ ] Golden fixture: small alignment with expected intermediate JSON snapshot ([test_plan_geometry.md](test_plan_geometry.md)).
- [ ] Diagnostic codes catalog started ([error_handling.md](error_handling.md)).
- [ ] Version bump procedure documented alongside [schema_migration_policy.md](schema_migration_policy.md).
