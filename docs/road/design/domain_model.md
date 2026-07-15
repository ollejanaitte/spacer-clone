# Domain Model

<!-- DOC-AUTHORITY:START -->
> **Authority:** ACTIVE REFERENCE
> Current implementation facts are governed by [`../../scoping/stage4_road_design_scope.md`](../../scoping/stage4_road_design_scope.md). Target ownership and contracts are governed by [`../../planning/stage6-10/README.md`](../../planning/stage6-10/README.md); `RoadDesignDocument` is the target road source of truth.
<!-- DOC-AUTHORITY:END -->

## Purpose

Define the semantic entities users edit in the Linear Coordinate Calculation System — independent of UI widgets, rendering, and frame analysis FEM details.

## Scope

- Entity definitions: project, alignment, horizontal/vertical segments, station equation, grid definition, cross-section template, pier, span, generation settings.
- Identifiers, relationships, and cardinality.
- Validation constraints at the domain level (see [validation_rules.md](validation_rules.md)).
- Mapping hints to intermediate results (not the intermediate structure itself).

## Out of Scope

- Computed geometry caches (see [intermediate_result_model.md](intermediate_result_model.md)).
- FEM nodes, members, supports (see [frame_model_mapping.md](../legacy-integration/frame_model_mapping.md)).
- UI form field binding (see [input_ui_behavior.md](../ui/input_ui_behavior.md)).

## Assumptions

- Entities use stable string `id` fields, consistent with `project.json` conventions.
- Domain model is edited by the user; derived geometry is never edited directly.
- One liner project may contain multiple alignments post-MVP; MVP assumes one primary alignment per `LinerProject`.

## Design Topics

### Core entities (MVP)

| Entity | Description |
| --- | --- |
| `LinerProject` | Root container, metadata, `linerModelId`, units reference |
| `HorizontalAlignment` | Ordered list of horizontal segments |
| `HorizontalSegment` | Straight, circular arc, clothoid |
| `VerticalAlignment` | Profile segments tied to physical distance range |
| `VerticalSegment` | Grade line, parabolic vertical curve |
| `StationEquation` | Chainage discontinuity at a physical distance |
| `GridDefinition` | Longitudinal/transverse spacing, bounds, role defaults |
| `CrossSectionTemplate` | Lane width, offsets, structural reference, depth offsets |
| `Span` | Span boundaries along alignment |
| `Pier` | Pier line at station, skew angle, bearing offsets |
| `GenerationSettings` | Connectivity, memberGroupRules, support templates, default material/section |

### GenerationSettings (expanded)

```ts
type GenerationSettings = {
  connectivity: "longitudinal_only" | "transverse_only" | "grid_full";
  defaultMaterialId: string;
  defaultSectionId: string;
  memberGroupRules: MemberGroupRule[];  // see frame_model_mapping.md
  supportTemplates: SupportTemplateHint[];
};
```

Default single material/section applies when no rule matches; rules are the core model for bridge grids.

### Relationships

```text
LinerProject
  ├── HorizontalAlignment (1)
  ├── VerticalAlignment (1)
  ├── StationEquation[] (0..N)
  ├── GridDefinition[] (1..N)
  ├── CrossSectionTemplate[] (0..N)
  ├── Span[] (0..N)
  ├── Pier[] (0..N)
  └── GenerationSettings (1)
```

### Invariants

- Horizontal segments form a continuous chain (gaps are errors unless station equation documents them).
- Vertical segments cover station ranges without overlap.
- Grid definitions reference a valid alignment station range.
- Pier physical distances fall within alignment length.

## Open Questions

- Superelevation entity vs. cross-section template field?
- Multiple alignments in MVP?

## Related Documents

- [intermediate_result_model.md](intermediate_result_model.md)
- [frame_model_mapping.md](../legacy-integration/frame_model_mapping.md)
- [project_file_format.md](../legacy-integration/project_file_format.md)
- [station_rules.md](station_rules.md)
- [profile_rules.md](profile_rules.md)
- [geometry_core.md](geometry_core.md)
- [docs/frame/modeler/bridge-domain-model.md](../../frame/modeler/bridge-domain-model.md)

## Pre-Implementation Checklist

- [x] Entity list expanded for MVP (pier, span, memberGroupRules).
- [ ] ER diagram or TypeScript type sketch reviewed.
- [ ] Validation rules cross-referenced per entity.
- [ ] Extension points noted for post-MVP curve types.
