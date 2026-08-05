# G1 Haunch-Deck Contact Implementation

## G1-A Applicability

The G0 H-A recommendation (single deck Z offset) required validation. Investigation found:
- Haunch height is **per-girder variable** in the data model (`ApolloHaunchGirderDraft.item.height`)
- The deck builder (`buildDeckSolid`) receives `ResolvedBridgeStructureInput` which had NO haunch fields

### Verdict
A naive single-offset fix (using arbitrary height) would be unsafe. Implemented a **max-haunch-height** approach:
- `resolveHaunchTopOffset(config)` computes the maximum PROVIDED haunch height across all girders
- Returns 0 when no haunch is provided (preserves existing datum)
- The deck solid center Z = `deckThickness/2 + maxHaunchHeight`

This is structurally correct: the deck soffit is a single plane that sits on top of the tallest haunch. All haunches terminate at the same deck soffit plane.

**G1_APPLICABILITY_VERDICT: PASS** (max-haunch-height approach; not a naive single value)

## Implementation

| File | Change |
|------|--------|
| `bridgeStructureSolids.ts` | Added `haunchHeight` to `ResolvedBridgeStructureInput`; added `resolveHaunchTopOffset`; deck center Z now `deckThickness/2 + haunchHeight` |

## Geometry Before/After

| Datum | Before | After |
|-------|--------|-------|
| deckCenterZ | deckThickness/2 | deckThickness/2 + maxHaunchHeight |
| deckBottomZ | 0 | maxHaunchHeight |
| deckTopZ | deckThickness | maxHaunchHeight + deckThickness |
| haunchBottomZ | 0 | 0 |
| haunchTopZ | haunchHeight | haunchHeight |
| topFlangeUpperZ | 0 | 0 |

For haunchHeight=0.15, deckThickness=0.22: deck bottom shifts from 0 to 0.15, eliminating overlap with haunch (which spans 0 to 0.15).

## Quantity Non-Regression
- Deck dimensions (length, width, thickness) unchanged
- Haunch dimensions unchanged
- Quantity calculation reads canonical values, not visualization Z position
- No quantity change

## Viewer/STL Parity
- Both use the same `ApolloSolidGeometryParameter.localFrame` from `buildDeckSolid`
- STL `buildBoxGeometry` reads the solid's localFrame origin → automatic parity
- No separate data sources

## Save/Reload
- No schema change
- No canonical data change
- Visualization derives haunch height from existing draft at render time
- Save/reload unaffected