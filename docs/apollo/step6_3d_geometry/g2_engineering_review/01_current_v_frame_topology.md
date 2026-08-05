# Current V-Frame Topology

## Data Model

| Entity | File | Description |
|--------|------|-------------|
| `crossFrameAttachment` | `bridgeStructure/crossFrameAttachmentTypes.ts` | User input: pattern, attachment depths |
| `SwayBracing` | `generateBsdd.ts:233-261` | BSDD entity generated per sway station |
| `BraceMember` | `generateBsdd.ts:252-258` | 2 per bay per station (diagonals) |
| `buildBracingMember` | `bridgeStructureSolids.ts:485-536` | Creates solid geometry for each BraceMember |

## Current Topology (V pattern)

```
     leftTop ──── rightTop        (upperZ = -topFlangeThickness/2)
        ╲       ╱
         ╲     ╱
          ╲   ╱
           ╲ ╱
         midBottom                (centerZ = -centerNodeDepthFromGirderTop)
```

- **2 diagonal members** per girder pair per sway station
- No horizontal member at bottom
- `leftTop = [station, leftY, upperZ]`
- `rightTop = [station, rightY, upperZ]`
- `midBottom = [station, midY, centerZ]`
- `leftBottom / rightBottom` nodes exist in the geometry but have NO member connecting them

## Default Values (2.0m girder)

| Parameter | Default | Value |
|-----------|---------|-------|
| upperAttachmentDepthFromGirderTop | topFlangeThickness/2 | 0.0125m |
| lowerAttachmentDepthFromGirderTop | girderDepth - bottomFlangeThickness/2 | 1.985m |
| centerNodeDepthFromGirderTop | null (falls back to lower) | 1.985m |
| upperZ | 0 - upperDepth | -0.0125m |
| centerZ | 0 - centerDepth | -1.985m |
| BRACING_MEMBER_DIAMETER_M | (legacy cylinder fallback) | 0.08m |
| L-angle dimensions | legA=0.075, legB=0.075, thickness=0.009 | (if enabled) |

## Existing Cross Beam Position

- Cross beam origin Z: `-girderDepth/2 + crossBeamDepth/2` ≈ -0.825m (for 2m girder with 0.35×0.35 cross beam)
- Sway bracing centerZ: -1.985m (near bottom of girder)
- Cross beam and sway bracing are at **different stations** (cross beam at every station, sway at subset)
- Cross beam is a **separate entity** (CrossBeam, not BraceMember)