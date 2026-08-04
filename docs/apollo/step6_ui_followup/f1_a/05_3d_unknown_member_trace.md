# 3D Unknown Member Trace (UFX-09)

## Symptom
A large brown or gray transverse member visible near cross beams.
The member appears to span across girders at a horizontal orientation.

## Investigation

### All Transverse/Bracing Members in Visualization

| Member | Kind | Position | Color | Data Source |
|--------|------|----------|-------|-------------|
| Cross Beam (横桁) | `cross_beam` | Top of girder web: `-girderDepth/2 + crossBeamDepth/2` | Brown | `input.crossBeamSpacing` |
| Sway Bracing (対傾構) | `bracing` | Diagonal V-pattern between girder pairs | Gray | `input.swayBracingInterval` + attachment depths |
| Lower Lateral (下横構) | `bracing` | X-pattern at bottom flange mid-thickness | Gray | `input.lateralBracingEnabled` |
| Upper Lateral (上横構) | `bracing` | X-pattern at top flange mid-thickness | Gray | `input.upperLateralBracingEnabled` |

### Cross Beam Position Details

Cross beams are positioned at:
```
z = -girderDepth/2 + crossBeamDepth/2
```
This places the cross beam center at the **top of the girder web** (negative z is upward in the visualization coordinate system). This is the correct structural position for cross beams — they connect girder webs at the top flange level.

The cross beam dimensions are:
- `depth = max(girderDepth * 0.35, 0.1)` — proportional to girder depth
- `width = max(webThickness, 0.02)` — narrow transverse width
- `length = rightOffset - leftOffset` — spans between outer girder faces

### Identification

The "unknown member" is most likely the **cross beam** rendered at the top of web. Its large size comes from `depth = girderDepth * 0.35`, which for a typical 2m girder gives 0.7m — a substantial transverse rectangular box.

### Verdict
The cross beam shape and position are correct per the structural design:
- Cross beams connect girder webs near the top flange — this is standard practice
- Position `-girderDepth/2 + crossBeamDepth/2` places the centroid at top-of-web
- Sway bracing diagonals connect from upper to lower attachment points between cross beam stations
- Lateral bracing sits at flange levels

### No Correction Needed
The visualization accurately reflects the input design parameters. The member is not misplaced. The appearance of being "in the wrong position" is due to cross beam depth being 35% of girder depth, making it visually prominent.