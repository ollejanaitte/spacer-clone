# G0-A Current Geometry Reproduction and Coordinate Audit

## Reference Image
No reference image file was attached to this prompt. All analysis is based on code inspection of the current main branch at SHA 0add521.

## Haunch Contact Analysis

### Coordinate Datums

| Datum | Formula | Value (2m girder, 0.22m deck) | Source |
|-------|---------|-------------------------------|--------|
| girderCenterZ | -girderDepth/2 | -1.0m | bridgeStructureSolids.ts:74 |
| topFlangeUpperZ | girderCenterZ + girderDepth/2 | 0.0m | bridgeStructureSolids.ts:95 |
| haunchBottomZ | topFlangeUpperZ | 0.0m | haunchGeometry.ts:151 |
| haunchTopZ | topFlangeUpperZ + haunchHeight | haunchHeight | haunchGeometry.ts:152 |
| deckCenterZ | deckThickness / 2 | 0.11m | bridgeStructureSolids.ts:372 |
| deckBottomZ | deckCenterZ - deckThickness/2 | 0.0m | Derived |
| deckTopZ | deckCenterZ + deckThickness/2 | 0.22m | Derived |

### Finding: Haunch and Deck Overlap

The deck solid is positioned with center at Z = deckThickness/2, meaning the deck extends from Z=0 (bottom) to Z=deckThickness (top). The haunch solid extends from Z=0 (top flange upper face) to Z=haunchHeight.

**Both solids occupy Z ∈ [0, min(haunchHeight, deckThickness)] — they overlap.**

The haunch should sit on top of the girder top flange (Z=0) and the deck should sit on top of the haunch. Therefore the deck bottom should be at Z=haunchHeight, not Z=0.

**Verdict: DATUM_MISMATCH — deck bottom does not account for haunch height.**

### Additional Finding: Haunch Display Width

For TRAPEZOID haunches, the display width is `(topWidth + bottomWidth) / 2` (appurtenanceHaunchSolids.ts:73). This is an average-width box approximation, not a true trapezoidal prism. The quantity/load models use the exact trapezoidal area. This is a known limitation (documented in Step 4-C closeout).

## Cross-Frame Topology Analysis

### V-Shape Sway Bracing

| Component | Exists? | Count per Girder Bay | Source |
|-----------|---------|---------------------|--------|
| Left diagonal (leftTop → centerBottom) | YES | 1 | bridgeStructureSolids.ts:715 |
| Right diagonal (rightTop → centerBottom) | YES | 1 | bridgeStructureSolids.ts:716 |
| Horizontal bottom chord (leftBottom → rightBottom) | **NO** | 0 | — |
| Horizontal top chord (leftTop → rightTop) | NO | 0 | — |

### Finding: Missing Horizontal Bottom Chord

The V-shaped cross-frame has only 2 diagonal members. There is no horizontal member connecting the left and right lower attachment points. In typical bridge engineering, a V-shaped cross-frame (also called a "V-type cross-frame" or "V-brace") includes a bottom chord (horizontal member) connecting the two girder web attachment points at the bottom of the V.

The existing cross beam (横桁) is in a different position: its Z origin is at `-girderDepth/2 + crossBeamDepth/2`, which is the lower half of the girder. The cross beam is a separate entity and does not serve as the V-brace bottom chord.

**Verdict: MISSING_HORIZONTAL_MEMBER — V-shaped cross-frame lacks a bottom chord member.**

## Cross Beam vs. Sway Bracing Station Comparison

| Aspect | Cross Beam | Sway Bracing |
|--------|-----------|--------------|
| Station range | [0, crossBeamCount-1] | [1, crossBeamCount-2] |
| Station condition | All stations | index % swayBracingInterval === 0 |
| Z position | -girderDepth/2 + crossBeamDepth/2 | upperZ (near top flange) to centerZ (near bottom flange) |
| Vertical span | Lower half of girder | Full girder depth |

Cross beams and sway bracing are at different stations (not the same station), except when they happen to coincide. The cross beam is at ALL stations, while sway bracing is at a subset determined by `swayBracingInterval`.