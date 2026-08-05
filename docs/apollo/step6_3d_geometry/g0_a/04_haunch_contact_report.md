# G0-A Haunch Contact Report

## Current State

The haunch solid sits on the girder top flange upper face (Z=0) and extends upward by `haunchHeight`.
The deck solid has its center at Z = deckThickness/2, extending from Z=0 to Z=deckThickness.

**The haunch and deck overlap** in the region Z ∈ [0, min(haunchHeight, deckThickness)].

This means:
- If haunchHeight = 0.15m and deckThickness = 0.22m, the overlap region is Z ∈ [0, 0.15m]
- In the Viewer, this appears as haunch blocks visually inside the deck volume
- The STL export will have intersecting/overlapping solids
- The quantities are computed separately (haunch volume ≠ deck volume), so no double-counting

## Root Cause

The deck solid builder (`bridgeStructureSolids.ts:372`) places the deck at Z = deckThickness/2 without accounting for haunch height. The haunch solid builder (`haunchGeometry.ts:151`) places the haunch from Z=0.

## Fix Direction

The deck bottom should be at Z = haunchHeight (top of haunch), and the deck should extend from there upward by deckThickness. This means:
- deckCenterZ = haunchHeight + deckThickness/2
- deckBottomZ = haunchHeight
- deckTopZ = haunchHeight + deckThickness

This is a visualization-only fix — the canonical data (bridgeStructure input) stores deckThickness and haunchHeight as separate values, and the quantity model computes deck volume separately from haunch volume.

## Contact Quality Assessment

| Contact | Expected | Actual | Fixable? |
|---------|----------|--------|----------|
| Haunch bottom ↔ Top flange upper | 0 = 0 | 0 = 0 | Already CONNECTED |
| Haunch top ↔ Deck bottom | haunchTop = deckBottom | haunchTop=0.15, deckBottom=0 | YES |
| Deck top | — | deckThickness | OK |