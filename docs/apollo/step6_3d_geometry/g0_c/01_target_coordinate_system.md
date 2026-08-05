# G0-C Target Geometry Design

## Haunch Fix: Deck Center Z Shift

**Current:** `deckCenterZ = deckThickness / 2`  
**Target:** `deckCenterZ = haunchHeight + deckThickness / 2`

**Effect:**
- Deck bottom shifts from Z=0 to Z=haunchHeight (deck sits ON TOP of haunch)
- Deck top shifts from Z=deckThickness to Z=haunchHeight + deckThickness
- No change to haunch position (Z=0 to Z=haunchHeight)
- No change to deck geometry dimensions
- No change to quantity calculation

**File changes needed:**
- `bridgeStructureSolids.ts` line 372: `localFrame: longitudinalFrame([midpointX, 0, haunchHeight + input.deckThickness / 2])`
- Haunch height must be read from the same draft used by the deck builder

**Acceptance:** AC-GEO-001 through AC-GEO-005

## Cross-Frame Fix: Add Bottom Chord

**Current:** 2 BraceMembers per girder bay per sway station  
**Target:** 3 BraceMembers per girder bay per sway station (2 diagonals + 1 horizontal bottom chord)

**Bottom chord endpoints:**
```
leftBottom  = [x, leftY,  centerZ]
rightBottom = [x, rightY, centerZ]
```

Where centerZ = `-centerNodeDepthFromGirderTop` (same as the existing center node Z).

**File changes needed:**
- `generateBsdd.ts`: add 3rd BraceMember entity per girder pair
- `bridgeStructureSolids.ts`: call `buildBracingMember` for the horizontal member
- `appurtenanceHaunchQuantities.ts` or `quantityModel.ts`: count the new member in steel weight

**Display label:** "対傾構下弦材" + index

**Schema change:** NONE — BraceMember array has no directional limitation

**Acceptance:** AC-GEO-006 through AC-GEO-012