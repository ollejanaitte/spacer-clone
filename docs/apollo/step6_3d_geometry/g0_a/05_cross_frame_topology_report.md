# G0-A Cross-Frame Topology Report

## Current V-Shape Topology

The V-shaped sway bracing (対傾構) generates exactly **2 diagonal BraceMember entities per girder bay per station**:

```
Left:  [leftTopNode] → [centerBottomNode]
Right: [rightTopNode] → [centerBottomNode]
```

There is **no horizontal bottom chord** connecting `[leftBottomNode] → [rightBottomNode]`.

## Missing Horizontal Member Analysis

| Aspect | Detail |
|--------|--------|
| Current entities | 2 diagonals (leftTop→centerBottom, rightTop→centerBottom) |
| Expected minimum for V-frame | 2 diagonals + 1 bottom chord (leftBottom→rightBottom) |
| Structural role | Bottom chord resists tension/compression, completes triangulated frame |
| Structural justification | A V-brace without bottom chord is not a triangulated truss — the diagonals alone create a single triangle with the girder web as the base, but this lacks a dedicated horizontal member connecting the two girder webs. |
| Existing cross beam | Positioned at `-girderDepth/2 + crossBeamDepth/2` (lower half of girder), NOT at the sway bracing center node level |
| Lower lateral bracing | At `bottomConnectionZ = -girderDepth + bottomFlangeThickness/2`, which is lower than the sway center node |

## Entity and Schema Analysis

| Question | Answer |
|----------|--------|
| Can SwayBracing carry horizontal BraceMember? | Yes — BraceMember array per SwayBracing has no directional constraint |
| Does schema need change? | **NO** — an additional BraceMember entity can be added to the existing `swayBraceMembers` array in `generateBsdd.ts` |
| Can existing project data be regenerated? | Yes — IDs are deterministic via stableId; regeneration produces the new member |
| Does quantity need update? | Yes — steel weight for the new member must be counted |
| Does load need update? | The new member would carry dead load; current dead load model would need extension |
| Does STL export need update? | Yes — new `buildBracingMember` call in the visualization/stl pipeline |
| Does Viewer need update? | Yes — new member must be rendered |

## Cross Beam vs. Sway Bracing Station

- Cross beams are at EVERY station: `index = 0, 1, 2, ..., crossBeamCount-1`
- Sway bracings are at a SUBSET of stations: `index % swayBracingInterval === 0`
- They share stations only when `swayBracingInterval === 1`
- When `swayBracingInterval === 2` (default), sway bracing is at every 2nd intermediate station, cross beam is at all stations

This means cross beams and sway bracing are on DIFFERENT stations in the default configuration, so the cross beam cannot serve as the V-brace bottom chord.