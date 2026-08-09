# Alignment Geometry Requirements for Curved Bridges

## Current Capability: FULLY IMPLEMENTED (Liner Module)

The `liner` module (`frontend/src/liner/`) provides complete road alignment geometry:

- **Horizontal alignment types**: Single circular arc, clothoid (spiral), compound curve, straight line
- **Station/offset system**: Station (chainage) along alignment, perpendicular offset
- **3D coordinate system**: (X, Y, Z) for any station + offset + elevation
- **Local frame**: Tangent (T), Normal (N), Binormal (B) unit vectors at any point
- **Superelevation**: Cross-slope banking based on design speed and radius
- **Cross slope**: Normal crown and superelevated sections
- **Width change**: Variable width along alignment (transition zones)

Key implementation files:
- `frontend/src/liner/geometry.ts` — Core alignment geometry functions
- `frontend/src/liner/alignment.ts` — Alignment data structures
- `frontend/src/liner/core/types.ts` — Type definitions including `AlignmentGeometry`

## What's Needed for Curved Bridge (GAP)

### Girder Line Offset from Centerline

Curved bridges typically have multiple girders at different radial offsets from the road centerline. The geometry for each girder line must be computed:

- Girder line = road centerline offset by a constant radial distance (not constant perpendicular offset)
- Each girder in a multi-girder system has a different radius
- For 2-girder system: inner girder (R - L/2), outer girder (R + L/2) where L is girder spacing
- For multi-girder: each girder position depends on cross-section layout

**Current liner module limitation**: The offset function offsets perpendicular to the tangent, not in the radial direction. For curved alignment, radial offset ≠ perpendicular offset.

### Radial Direction Determination

- Structural analysis requires radial vectors at each node
- Radial direction = direction from curvature center to the point (perpendicular to tangent)
- Used for: bearing direction, cross beam direction, centrifugal load direction
- Available from liner geometry: normal (N) vector is the radial direction for horizontal curves

### Cross Beam Direction Angle

- Cross beams (diaphragms) on curved girders are not perpendicular to the girder tangent
- Cross beam direction = angle between chord line and radial line
- Must account for curvature to determine correct cross beam orientation
- Cross beam spacing measured along girder arc length, not chord length

### End Diaphragm Angle

- End diaphragms at abutments/pier follow the bearing line direction
- On curved bridges, end diaphragm angle depends on subtended angle and skew angle
- Skew angle definition for curved bridges is different from straight bridges

## Gap Summary

| Item | Status |
|------|--------|
| Road alignment geometry | ✅ FULLY IMPLEMENTED |
| Superelevation / cross slope | ✅ FULLY IMPLEMENTED |
| Station/offset/3D coord | ✅ FULLY IMPLEMENTED |
| Local frame (T/N/B) | ✅ FULLY IMPLEMENTED |
| Girder line offset (radial) | ❌ NOT IMPLEMENTED |
| Cross beam direction angle | ❌ NOT IMPLEMENTED |
| End diaphragm angle | ❌ NOT IMPLEMENTED |
| Bearing direction (radial/tangential) | ❌ NOT IMPLEMENTED |

The road alignment geometry is ready. What's missing is the **bridge geometry layer** on top of it. A new module (or extension of liner) is needed to compute curved-bridge-specific geometry from the underlying road alignment.