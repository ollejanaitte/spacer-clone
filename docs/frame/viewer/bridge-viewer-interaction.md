# bridge-viewer-interaction.md

<!-- DOC-AUTHORITY:START -->
> **Authority:** ACTIVE VIEWER REFERENCE
> Viewer behavior is presentation/session behavior, not Frame domain or result truth, and Viewer is not formal Frame.DRAFT. Current facts and target gaps are governed by [`../../scoping/stage5_frame_analysis_scope.md`](../../scoping/stage5_frame_analysis_scope.md) and [`../../planning/stage6-10/stage10_gap_migration_sequence.md`](../../planning/stage6-10/stage10_gap_migration_sequence.md).
<!-- DOC-AUTHORITY:END -->

Specification of the Three.js viewer used in Step 4 "Line Setting 3D" of the bridge wizard.

## 1. Layer Structure

```text
Scene
 ├ NodeLayer        (FEM nodes, SphereGeometry)
 ├ ElementLayer     (FEM members, LineSegments)
 ├ LineLayer        (BridgeLine, 3D line)
 ├ LoadLayer        (ArrowHelper)
 ├ InteractionLayer (invisible mesh for click hit testing)
 └ Grid + Axes
```

All layers are grouped as `THREE.Group` and are also reused to redisplay the FEM model nodes and members generated in Step 6.

## 2. Drawing Modes

- `view`: camera operation only (OrbitControls).
- `draw_line`: first click sets the start, second click sets the end, and a `BridgeLine` is added.
- `select`: select an existing line or node (highlight).
- `delete`: delete the selected target.

## 3. Line Type Colors

| Type | Color | Hex |
| --- | --- | --- |
| traffic | green | `#22a06b` |
| load | red | `#c0392b` |
| reference | gray | `#7f8c8d` |
| selected | yellow | `#f1c40f` |

## 4. Snap

```pseudo
threshold = 0.5  // m
candidates = []
for node in fem_nodes:
    candidates.append(node.position)
for p in candidates:
    if distance(click_point, p) < threshold:
        snap_target = p
        break
```

In Step 4 where the FEM nodes are not yet generated, grid points `(x_grid, 0, z_grid)` (5 m pitch) are used as candidates.

## 5. Camera and Controls

- `PerspectiveCamera(fov=45, near=0.01, far=10000)`
- `OrbitControls`: `enableDamping=true`, `dampingFactor=0.08`
- Fit: compute a box enclosing all nodes and call `fitCameraToBox`.

## 6. Raycaster

- Update `pointer.x/y` on `pointermove`.
- On `click`, call `raycaster.intersectObjects([LineLayer, NodeLayer])`.
- Return the `userData.lineId` / `userData.nodeId` of the hit object.

## 7. FEM Drawing in Step 6

- Display the generated `nodes / members / supports` in `NodeLayer / ElementLayer / SupportLayer`.
- Redraw the existing `BridgeLine`s in `LineLayer`.
- Show the camera fit and the legend.
