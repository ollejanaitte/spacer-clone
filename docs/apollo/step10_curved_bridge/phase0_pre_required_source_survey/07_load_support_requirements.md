# Load and Support Requirements for Curved Bridges

## Current Capability

### Load Types Supported

| Load | Status |
|------|--------|
| Dead load (self weight) | ✅ IMPLEMENTED |
| Appurtenance load (pavement, railing) | ✅ IMPLEMENTED |
| Live load (moving load MVP) | ✅ PARTIAL (straight only) |
| Wind load | ✅ IMPLEMENTED (simplified) |
| Seismic load | ✅ IMPLEMENTED (response spectrum) |
| Temperature load | ✅ IMPLEMENTED (uniform temp) |
| Support settlement | ✅ IMPLEMENTED |

### Support Conditions

- Fixed bearing: UX, UY, UZ constrained (or user-selected DOFs)
- Movable bearing: UZ only (or UY+UZ for guided)
- Support coordinate system: Global X/Y/Z only

## What's Needed for Curved Bridge

### Centrifugal Load (遠心力)

**NOT IMPLEMENTED — P0 blocker.**

Required by Japanese standards (道路橋示方書・共通編):

- Magnitude: C = (W × V²) / (127 × R) [kN]
- W = design vehicle weight [kN]
- V = design speed [km/h]
- R = radius of curvature [m]
- Load direction: radial outward, horizontal
- Point of application: 1.8m above pavement surface
- Distribution: applied to the entire bridge length on curved sections
- Load combination: considered with live load (full or partial)

### Braking Force Distribution on Curve

- Braking force acts tangentially along the alignment
- On curved alignment, braking force has both longitudinal and lateral components
- Distribution to bearings depends on curvature and bearing arrangement
- Current: braking force is longitudinal only

### Bearing Constraint Direction

**NOT IMPLEMENTED — P0 blocker.**

Curved bridges require bearings defined in radial/tangential coordinate system:

- **Fixed bearing**: Constrains radial (R), tangential (T), and vertical (V) directions
- **Movable bearing**: Constrains radial (R) and vertical (V), free in tangential (T)
- **Guide bearing**: Constrains radial (R) and vertical (V), free in tangential (T) (with guided movement)
- **One-way movable**: Vertical (V) only, free in radial (R) and tangential (T)

The bearing coordinate system rotates with the alignment. Each bearing has a unique local R-T-V system based on the alignment tangent at that station.

### Multi-Directional Bearing

- Some bearings allow rotation about radial axis (pot bearing, spherical bearing)
- Bearing stiffness in each direction (elastic bearing pads)
- Current: bearings are rigid constraints (fixed or free), no stiffness modeling

### Temperature Load Distribution on Curve

- Temperature expansion/contraction on curved bridge causes radial displacement
- Thermal forces in bearings and substructures depend on curvature
- Current: uniform temperature expansion in straight direction only

## Priority Summary

| Item | Priority | Reason |
|------|----------|--------|
| Centrifugal load | **P0** | Required by Japanese standards; no curved bridge analysis is valid without it |
| Bearing constraint direction | **P0** | Structural model is incorrect without radial/tangential bearing definition |
| Braking force on curve | **P1** | Less critical for design but affects bearing design |
| Multi-directional bearing stiffness | **P1** | Needed for accurate force distribution |
| Temperature on curve | **P2** | Can be approximated with manual calculation initially |