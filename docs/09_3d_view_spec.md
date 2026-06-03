# Three.js 3D View Specification

## Purpose

The Three.js viewer provides minimal visual confirmation of model geometry, supports, loads, labels, selection, and deformed shape.

## Inputs

Viewer inputs:

- `project.json` compatible model object.
- Selected load case ID.
- Optional analysis result JSON.
- Selected entity state.
- Viewer settings.

Viewer output events:

- Entity selected.
- Empty space selected.
- Camera changed.

## Node Display

Requirements:

- Draw each node as a small point or sphere.
- Default node color must be visually distinct from members.
- Selected node uses highlight color.
- Nodes with supports may use an additional support symbol.

MVP does not require editable node dragging.

## Member Line Display

Requirements:

- Draw each member as a straight line from `nodeI` to `nodeJ`.
- Selected member uses highlight color and thicker line.
- Invalid member references must not crash the viewer; show warning state if possible.
- Member color may be uniform in MVP.

## Support Symbols

Requirements:

- Draw support symbols at constrained nodes.
- Fixed support can be represented by a simple triad, block, or cone glyph.
- Partial restraints should be visible in property panel; detailed DOF glyphs are optional for MVP.

## Load Arrows

Requirements:

- Draw nodal load force arrows for selected load case.
- Draw nodal moment glyphs as curved arrows or circular markers if practical.
- Draw uniform member loads as repeated arrows or a simplified distributed load glyph.
- Use scale normalization so arrows are visible for small and large loads.

MVP must at least show direction and relative magnitude for force and distributed load vectors.

## Member and Node Labels

Requirements:

- Toggle node labels.
- Toggle member labels.
- Labels show entity IDs.
- Labels should face camera where possible.
- Labels may be hidden automatically when too dense.

## Deformed Shape

Requirements:

- Display deformed member lines when displacement results exist.
- Use selected load case result.
- Deformation scale can be auto or manual.
- Undeformed model remains visible as faint reference.

MVP can draw deformed members as straight lines between displaced end nodes. Curved beam deformation is optional.

## Display Scale

Viewer settings:

- `loadScale`: number.
- `deformationScale`: number or `auto`.
- `nodeSize`: number.
- `labelSize`: number.

Auto deformation scale:

- Compute model bounding box diagonal.
- Compute maximum translational displacement.
- Scale maximum displacement to a visible fraction of the diagonal.
- If max displacement is zero, do not show deformed shape.

## Camera Controls

Required:

- Orbit.
- Pan.
- Zoom.
- Fit to model.
- Standard views: XY, XZ, YZ, isometric.

Use `OrbitControls` or equivalent.

## Selection Highlight

Requirements:

- Click node to select node.
- Click member to select member.
- Selected entity updates React state.
- React state can also select an entity and update viewer highlight.
- Multiple selection is out of MVP.

## Scene Helpers

Recommended:

- Global axes helper.
- Grid helper toggle.
- Bounding box fit.

## Performance

MVP target:

- Smooth interaction for at least 1,500 nodes and 2,500 members.
- Avoid one React component per rendered primitive if it harms performance.
- Use batched geometry where practical.

## Out of Scope

- Mesh rendering.
- Section shape rendering.
- CAD snapping.
- In-view editing.
- Animation timeline.
- DXF rendering.
