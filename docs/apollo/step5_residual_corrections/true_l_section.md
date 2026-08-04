# Step 5-R R2 — True L-section polygon

## Geometry

Canonical sharp-corner L polygon:

`(0,0) → (legA,0) → (legA,t) → (t,t) → (t,legB) → (0,legB)`

Area: `A = legA·t + legB·t − t²` (corner square counted once)  
Volume: `V = A · memberLength`

Viewer and STL both extrude this single polygon along the member axis.
Two-plate BoxGeometry approximation is removed.

## Schema

`1.4.0-development` adds `lateralAngleSection.orientation`.  
Migration from 1.3.0 defaults orientation to `LEG_A_ALONG_LOCAL_Y` without inventing dimensions.
`sectionImplementation: 2` marks true L polygon solids.

## Authorization

ER_002_IMPLEMENTATION_STATUS: TRUE_L_GEOMETRY_IMPLEMENTED  
ER_002_ENGINEERING_AUTHORIZATION: PENDING_HUMAN_ENGINEERING_REVIEW  
Catalog dims remain CAT-S5-LAT-UNVERIFIED / SHARP_CORNER_DEVELOPMENT.
