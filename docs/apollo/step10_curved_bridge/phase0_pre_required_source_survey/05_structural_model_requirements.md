# Structural Model Requirements for Curved Bridges

## Current Capability: PARTIAL

### Bridge Layout Schema

The Apollo bridge structure module (`frontend/src/apollo/bridgeStructure/`) has:

- `BridgeStructure` type: pier layout, span arrangement, skew angles, bearing offsets
- `GirderSystem` type: girder spacing, overhang, cross-section type
- `Bearing` type: bearing location, type (fixed/movable), direction
- Span/pier definition with station-based positioning

### Frame Generation Hints

`frontend/src/liner/core/types.ts` defines `FrameGenerationHintResult`:

- Node positions based on alignment station
- Element connectivity
- Support conditions at bearing locations
- Cross-section assignment hints

**Critical limitation**: The frame generation hints generate **straight grid only**. Nodes are placed on a straight alignment projection. No curvature is considered in node placement or element orientation.

## What's Needed for Curved Bridge

### Node Generation on Curved Alignment

- Nodes must be placed at precise (X, Y, Z) coordinates on the curved girder line
- Node spacing along girder arc (not chord) for correct mass distribution
- Multiple girder lines require separate node sets for each girder
- Cross beam nodes must align with girder nodes at diaphragm locations

### Member Local Axis Alignment

- Each member's local x-axis must follow the tangent direction at that node
- For curved girders, member local axes rotate continuously along the span
- Current assumption: members are straight between nodes (chord elements). This is acceptable for discretized curved girders.
- Local y/z axes must align with principal axes of the cross-section (radial/vertical)

### Cross Member Direction

- Cross beams connect adjacent girders at diaphragm locations
- Direction: along radial line (not perpendicular to girder tangent)
- Cross beam member orientation must account for curvature

### Bearing Direction

- Fixed bearings: radial direction constraint (tangent to the curve)
- Movable bearings: tangential direction (perpendicular to radial)
- Guide bearings: tangential direction only
- Current implementation: fixed/movable in global X/Y only. No radial/tangential concept.

### Eccentricity and Rigid Zone

- Bearing eccentricity from girder centerline
- Rigid link elements between bearing node and girder node
- Rigid zone length at pier/girder connection

### Multi-Girder System with Curvature

- 2-girder system: inner and outer girders have different radii
- Multi-girder system (3+): each girder has unique radius and arc length
- Cross beams connecting girders of different lengths
- Varying curvature if alignment has compound curves or clothoids

## Gap Summary

| Feature | Status |
|---------|--------|
| Bridge layout (span/pier/skew) | ✅ PARTIAL (straight only) |
| Section assignment | ✅ PARTIAL (straight only) |
| Frame generation hints | ✅ PARTIAL (straight grid only) |
| Node generation on curve | ❌ NOT IMPLEMENTED |
| Curved member local axis | ❌ NOT IMPLEMENTED |
| Cross beam direction | ❌ NOT IMPLEMENTED |
| Radial/tangential bearing | ❌ NOT IMPLEMENTED |
| Eccentricity / rigid zone | ❌ NOT IMPLEMENTED |
| Multi-girder curvature | ❌ NOT IMPLEMENTED |

All of these are **BLOCKED** without proper geometry rules (see 04_alignment_geometry_requirements.md). The Apollo bridge structure module handles straight bridges only. No curved frame generation logic exists anywhere in the repository.