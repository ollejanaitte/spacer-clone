# bridge-fem-generator.md

Conversion specification from the Bridge Domain Model (semantic model) to the existing `project.schema.json` (FEM model).

## 1. Overall Flow

```text
BridgeProject
  ├── CrossSection -> transverse y coordinate series
  ├── Spans        -> bridge axis x coordinate series
  ├── BridgeLine   -> kept as is (FEM node linkage is a future extension)
  ├── BridgeLoad   -> converted to NodalLoad / MemberLoad
  └── GenerationSettings -> reuse the existing Material / Section
```

## 2. Coordinate Generation

### 2.1 Transverse y_positions

Compute the y coordinates from `CrossSection` as follows. The layout is symmetric about y=0 in the center.

```text
half_lane_total = lane_count * lane_width / 2
y_left  = -(half_lane_total + median_width/2 + sidewalk_width + barrier_width)
y_right = +half_lane_total + median_width/2 + sidewalk_width + barrier_width
```

`y_positions` is the following point list (duplicates removed):

1. `y_left` (outer edge of the barrier)
2. `y_left + barrier_width` (carriageway boundary / sidewalk edge, inner sidewalk edge)
3. `-half_lane_total - median_width/2` (outer edge of lanes)
4. `-median_width/2` (median edge)
5. `+median_width/2` (median edge)
6. `+half_lane_total + median_width/2` (outer edge of lanes)
7. `y_right - barrier_width` (sidewalk edge)
8. `y_right` (outer edge of the barrier)

When `lane_count` is large, lane centerlines evenly distributed as main girder candidates are inserted between points 1 and 8. The final list has at least 5 points: left edge, main girder candidate, center, main girder candidate, right edge.

### 2.2 Bridge Axis x_positions

```pseudo
x_positions = [0.0]
x = 0
for span in spans:
    for i in 1..mesh_division:
        x_positions.append(x + span.length * i / mesh_division)
    x += span.length
```

The end of the series is the bridge length = sum(spans.length).

## 3. Node Generation

```pseudo
for xi, x in enumerate(x_positions):
  for yi, y in enumerate(y_positions):
    node_id = f"N_BC_{xi:03d}_{yi:03d}"   # prefix to avoid collisions
    nodes.append({ id, x, y, z: 0 })
```

Node IDs must be unique (by `(yi, xi)`).

## 4. Member Generation

### 4.1 Bridge Axis (x direction)

Connect consecutive nodes at the same `yi`.

```pseudo
for yi in 0..yCount-1:
  for xi in 0..xCount-2:
    members.append(Member(nodeI, nodeJ, materialId, sectionId))
```

### 4.2 Transverse (y direction)

Connect consecutive nodes at the same `xi`.

```pseudo
for xi in 0..xCount-1:
  for yi in 0..yCount-2:
    members.append(Member(nodeI, nodeJ, materialId, sectionId))
```

## 5. Support Generation

Minimum implementation as a simple bridge:

```text
x = 0.0            (left abutment)
x = bridge length  (right abutment)
each intermediate support x = span boundary
```

For each x position, the nodes at the two end y values (the first main girder position from each end) get:

- Left end (x=0): `uy, uz, rx, ry, rz` (vertical and rotational restraint, x is free)
- Intermediate support: `uz, rx, ry, rz` (vertical and rotational restraint)
- Right end (x=bridge length): `uy, uz, rx, ry, rz`

In the MVP the two end `y_position`s are used, i.e. the nodes where `yi == 0` and `yi == yCount-1`.

## 6. Load Conversion

| `BridgeLoad.type` | Converted to | Notes |
| --- | --- | --- |
| `self_weight` | Nodal load (-Z direction) | `magnitude / nodeCount` is applied uniformly to every node (MVP: converted with g=9.81) |
| `distributed` | MemberLoads | Applied to the members in the x range near the line referenced by `line_id` at `magnitude` kN/m |
| `vehicle` | NodalLoads | Applied at a representative node on the line referenced by `line_id` as `magnitude` kN |

In the MVP, the formal live load calculation of the Road Bridge Specification is out of scope. Metadata is held in `bridgeLoadNotes` inside the project and is fully implemented in a later phase.

## 7. Constraints (Required Validation)

```text
- No duplicate node IDs (all node IDs unique)
- No isolated nodes (every node is the endpoint of at least one member)
- Element length > 0 (very small distances are excluded)
- No zero supports
- span.length > 0
- mesh_division >= 1
- lane_width > 0
```

On validation failure, raise `BridgeFemGenerationError` and return HTTP 400.

## 8. Output

- `project: { id, name, ... }`
- `units` following the existing convention
- `nodes, materials, sections, members, supports`
- `loadCases, nodalLoads, memberLoads`
- `analysisSettings` (existing default)
- `bridgeMeta: { ... excerpt of BridgeProject ... }` (optional, for review)

## 9. Connection to the Existing Analysis Engine

The generated `project` data can be parsed by `backend.engine.parse_model` and is passed directly to `run_analysis` / `run_eigen_analysis`. The FEM engine itself is not modified.
