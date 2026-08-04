# F1-D 3D Unknown Member — Verdict

## Investigation Summary

The "unknown large brown/gray transverse member" visible in the 3D viewer near cross beams was identified as the **cross beam (横桁)**.

## Trace Results

| Property | Value |
|----------|-------|
| Member kind | `cross_beam` |
| Visualization role | `CrossBeam` |
| Data source | `input.crossBeamSpacing` from Apolo Bridge Structure Input Draft |
| Position | `-girderDepth/2 + crossBeamDepth/2` (top of girder web) |
| Dimensions | `depth = max(girderDepth * 0.35, 0.1)`, `width = max(webThickness, 0.02)` |
| Color | Brown (default cross beam material) |
| STL group | `cross-beams` |

## Verdict: NO CORRECTION NEEDED

The cross beam position and shape are correct per the structural design:
- Cross beams connect girder webs near the top flange — standard practice
- Centroid at `-girderDepth/2 + crossBeamDepth/2` places it at top-of-web
- The prominent appearance is due to cross beam depth being 35% of girder depth
- Sway bracing diagonals, upper/lower lateral bracing are separate members with correct positions
- Visualization, STL export, and quantity models all use the same geometry data

## Formal Status

NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED (unchanged)
STRUCTURAL_ENGINEERING_CORRECTNESS: NOT_AUTHORIZED (unchanged)
The cross beam geometry reflects the user's input parameters and defaults. Human engineering review would be required for formal structural approval.