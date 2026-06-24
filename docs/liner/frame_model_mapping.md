# Frame Model Mapping

## Purpose

Specify the deterministic transformation from `LinerIntermediateResult` grid points and generation settings into the existing frame analysis input model: `nodes`, `members`, `supports`, and optionally initial `loadCases` placeholders.

This document is a **highest-priority** design artifact and the **source of truth** for node/member/support generation rules. Merge and tagging policy is defined in [integration_with_frame_model.md](integration_with_frame_model.md).

## Scope

- Node generation from `GridPointResult[]`.
- Member connectivity rules (longitudinal, transverse, or both).
- Member local axis orientation and section alignment.
- Support placement at pier lines, span boundaries, and template rows.
- Material and section assignment via `memberGroupRules`.
- ID naming conventions and collision avoidance with user-defined entities.
- Reverse traceability: frame entity → source grid point id.

## Out of Scope

- Geometry computation (see [geometry_core.md](geometry_core.md)).
- Load case population beyond optional placeholders.
- Analysis execution and result mapping.
- Merge/replace algorithm details ([integration_with_frame_model.md](integration_with_frame_model.md)).
- Bridge wizard generator logic — MVP keeps liner mapper **separate**; share only low-level JSON entity helpers if needed ([integration_with_frame_model.md](integration_with_frame_model.md) §10).

## Assumptions

- Input intermediate results are complete and contain no `error`-level diagnostics.
- Generation settings and `frameHints` specify connectivity mode, member group rules, and support templates.
- Frame model uses right-handed global coordinates consistent with [coordinate_system_policy.md](coordinate_system_policy.md).
- SI units match [docs/04_input_schema.md](../04_input_schema.md).
- Current `project.schema.json` does not allow `meta` on nodes/members (`additionalProperties: false`); traceability uses ID namespace + `linerTrace` table until schema extension ([integration_with_frame_model.md](integration_with_frame_model.md)).

## Design Topics

### 1. Mapper interface

```ts
type FrameModelMappingInput = {
  intermediate: LinerIntermediateResult;
  settings: GenerationSettings;
  existingProject?: ProjectJson;
};

type FrameModelMappingOutput = {
  nodes: Node[];
  members: Member[];
  supports: Support[];
  linerTrace: LinerTraceEntry[];   // parallel trace table for project.json
  removedIds?: string[];
  diagnostics: ComputationDiagnostic[];
};

function mapToFrameModel(input: FrameModelMappingInput): FrameModelMappingOutput;
```

Pure function; no side effects. Runs in TypeScript on the frontend in MVP.

### 2. Node mapping

Each `GridPointResult` → one `Node`:

| Intermediate | Frame model |
| --- | --- |
| `id` | Encoded in node `id`; referenced in `linerTrace` |
| `x`, `y`, `z` | `x`, `y`, `z` |
| `labels` | Optional `label`: `"L{li}T{ti}"` |

**ID scheme:**

```text
N_LINER_{linerModelId}_{longitudinalIndex:03d}_{transverseIndex:03d}
```

Example: `N_LINER_lm-bridge-01_002_001` for liner model `lm-bridge-01`, longitudinal index 2, transverse index 1.

Readable labels remain separate from IDs to avoid collision when multiple liner models coexist.

### 3. Member connectivity

Controlled by `frameHints.connectivityMode` (or `GenerationSettings.connectivity`):

| Mode | Rule |
| --- | --- |
| `longitudinal_only` | Connect adjacent points same transverse index, increasing longitudinal index |
| `transverse_only` | Connect adjacent points same longitudinal index, increasing transverse index |
| `grid_full` | Both directions |
| `custom` | User-defined rules (post-MVP) |

```pseudo
for each transverse index ti:
  for each consecutive longitudinal pair (i, i+1):
    if both points lack role "virtual" OR settings include virtual:
      members.append(link(grid[i,ti], grid[i+1,ti], direction=longitudinal))

for each longitudinal index li:
  for each consecutive transverse pair (j, j+1):
    members.append(link(grid[li,j], grid[li,j+1], direction=transverse))
```

**Member ID scheme:**

```text
M_LINER_{linerModelId}_{direction}_{longitudinalIndex:03d}_{transverseIndex:03d}
```

Skip zero-length members (diagnostic warning `LINER_FRAME_ZERO_LENGTH_MEMBER`).

### 4. Member local axis orientation

Frame analysis uses member local axes for stiffness, releases, and loads. Convention aligns with [coordinate_system_policy.md](coordinate_system_policy.md) and existing `orientationVector` in `project.schema.json`.

**Local x-axis:** From node I → node J (always).

**Local y/z axes:**

| Member direction | orientationVector (global) | Notes |
| --- | --- | --- |
| Longitudinal girder | `{ x: 0, y: 0, z: 1 }` | Weak axis vertical unless section dictates swap |
| Transverse girder | `{ x: 0, y: 0, z: 1 }` | Same default |
| Skewed transverse (pier skew ≠ 0) | Pier-line binormal or `{ x: 0, y: 0, z: 1 }` | Use pier `skewAngleRad` to rotate reference vector about local x |
| Curved alignment | Average of `localFrame.binormal` at I and J | For longitudinal members on curves |

Exactly one of `orientationVector` or `orientationNode` per member (schema `not` constraint). MVP uses `orientationVector` only.

**Curved longitudinal member:** orientationVector = normalize(B_I + B_J).

### 5. Material and section assignment

Default single `materialId` / `sectionId` from settings applies when no rule matches.

**memberGroupRules** (from `frameHints` or `GenerationSettings`):

```ts
type MemberGroupRule = {
  key: string;
  match: {
    direction?: "longitudinal" | "transverse";
    role?: GridPointRole;
    transverseIndex?: number;
    spanId?: string;
  };
  materialId: string;
  sectionId: string;
};
```

Resolution order:

1. Rule with most specific match (span + role + direction + index).
2. Role-based rule (e.g., `cross_girder` → lighter section).
3. Direction default (longitudinal vs transverse).
4. Global default from settings.

Diagnostic `LINER_FRAME_MISSING_SECTION` if resolved material/section ID not found in project.

### 6. Support templates and pier lines

Supports are generated from `frameHints.supportTemplates` and `PierResult` entities — not only min/max longitudinal rows.

| Template | Behavior |
| --- | --- |
| `fixed_both_ends` | Fixed at min/max longitudinal index, all transverse indices |
| `pinned_both_ends` | Pinned at boundaries |
| `fixed_start_only` | Fixed at min longitudinal index only |
| `pier_line` | Supports at grid points listed in `PierResult.supportLinePointIds` |
| `bearing_at_pier` | Pinned at pier line; optional bearing offset creates auxiliary node (post-MVP) |
| `none` | No supports generated |

**Pier line support selection:**

- Filter grid points with role `pier_line` or `main_girder` at pier `physicalDistance`.
- Skewed pier: support DOF may be expressed in pier-local axes (`coordinateSystem: "local_pier"`); map to global DOF flags per template.
- Bearing offset from girder node: duplicate node at offset along pier normal (post-MVP).

**DOF flags:** Per [docs/04_input_schema.md](../04_input_schema.md) support schema (`ux`, `uy`, `uz`, `rx`, `ry`, `rz` booleans).

### 7. Grid ordering requirements

Mapper assumes `grid.points[]` sorted by:

1. `labels.longitudinalIndex` ascending
2. `labels.transverseIndex` ascending

When station equations create duplicate displayed stations, ordering follows `physicalDistance` from station table — geometry core must emit consistent indices ([geometry_core.md](geometry_core.md) §7).

### 8. Worked example — numeric expected output

**Input:** 3 longitudinal × 3 transverse grid, straight alignment along +X, 10 m longitudinal spacing, transverse offsets −5, 0, +5 m, flat profile Z = 10.0 m, `linerModelId = "gc06"`, connectivity `grid_full`, pinned both ends.

**Nodes (9):**

| ID | x | y | z |
| --- | ---: | ---: | ---: |
| `N_LINER_gc06_000_000` | 0 | −5 | 10 |
| `N_LINER_gc06_000_001` | 0 | 0 | 10 |
| `N_LINER_gc06_000_002` | 0 | 5 | 10 |
| `N_LINER_gc06_001_000` | 10 | −5 | 10 |
| `N_LINER_gc06_001_001` | 10 | 0 | 10 |
| `N_LINER_gc06_001_002` | 10 | 5 | 10 |
| `N_LINER_gc06_002_000` | 20 | −5 | 10 |
| `N_LINER_gc06_002_001` | 20 | 0 | 10 |
| `N_LINER_gc06_002_002` | 20 | 5 | 10 |

**Longitudinal members (6):** `M_LINER_gc06_L_000_000` (000_000→001_000), …, `M_LINER_gc06_L_002_001` (001_001→002_001).

**Transverse members (6):** `M_LINER_gc06_T_000_000` (000_000→000_001), …, `M_LINER_gc06_T_002_001` (002_001→002_002).

**Supports (6 pinned):** All nodes at longitudinal index 0 and 2 (`ux,uy,uz,rx,ry,rz` = false except as pinned template defines — typically restrain translations at boundaries).

Full fixture: `examples/liner/gc-06-intermediate.json` → `examples/liner/gc-06-project.generated.json` ([test_plan_geometry.md](test_plan_geometry.md)).

### 9. Validation after mapping

| Check | Action | Code |
| --- | --- | --- |
| Duplicate node IDs | Error | `LINER_FRAME_DUPLICATE_ID` |
| Member references missing node | Error | `LINER_FRAME_MISSING_NODE` |
| Zero-length member | Warning or skip | `LINER_FRAME_ZERO_LENGTH_MEMBER` |
| Disconnected graph | Warning | `LINER_FRAME_DISCONNECTED` |
| Missing material/section | Error | `LINER_FRAME_MISSING_SECTION` |
| Schema validation | Error | `LINER_FRAME_SCHEMA_INVALID` |

### 10. Traceability

Each mapped entity gets a `linerTrace` entry (stored in project, not on node object until schema extension):

```ts
type LinerTraceEntry = {
  frameEntityId: string;
  frameEntityType: "node" | "member" | "support";
  gridPointId?: string;
  memberDirection?: "longitudinal" | "transverse";
  physicalDistance?: number;
  displayedStation?: number;
  offset?: number;
  sourceRevision: string;
};
```

UI "inspect node" resolves:

```text
Node N_LINER_gc06_002_001 → GridPoint GP-gc06-002-001 → Station 20.0, Offset 0.0
```

## Open Questions

- Allow diagonal bracing members in MVP?
- Member release flags at boundaries?
- Auto-generate separate structural lines for guardrails vs. girders?

## Related Documents

- [integration_with_frame_model.md](integration_with_frame_model.md)
- [intermediate_result_model.md](intermediate_result_model.md)
- [geometry_core.md](geometry_core.md)
- [coordinate_system_policy.md](coordinate_system_policy.md)
- [domain_model.md](domain_model.md)
- [docs/04_input_schema.md](../04_input_schema.md)
- [test_plan_geometry.md](test_plan_geometry.md)
- [error_handling.md](error_handling.md)

## Pre-Implementation Checklist

- [x] ID naming scheme finalized with `linerModelId` namespace.
- [x] Connectivity modes defined for MVP subset.
- [x] Member local axis convention documented.
- [x] Support templates mapped to DOF JSON shape including pier lines.
- [x] Worked example with numeric expected output documented.
- [ ] Merge/replace algorithm verified in integration doc.
- [ ] Golden test: intermediate JSON → project JSON fixture planned.
