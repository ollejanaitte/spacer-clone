# Quantity Formula Trace (Development)

UNVERIFIED DEVELOPMENT ONLY — NOT FOR DESIGN OR CONSTRUCTION

- webHeight = girderDepth - topFlangeThickness - bottomFlangeThickness
- topFlangeArea = topFlangeWidth * topFlangeThickness
- bottomFlangeArea = bottomFlangeWidth * bottomFlangeThickness
- webArea = webThickness * webHeight
- volumePerGirder component = area * bridgeLength
- totalMainGirderSteelVolume = totalSectionArea * bridgeLength * girderCount
- deckVolume = width * bridgeLength * deckThickness
- crossBeamCount = floor(bridgeLength / crossBeamSpacing) + 1
- overhang = (width - (girderCount - 1) * girderSpacing) / 2
- weight = volume * userUnitWeight (USER_PROVIDED_UNVERIFIED)
- paintAreaGeometricEstimate: exposed I faces excl. deck contact top (development estimate)
- pavementVolume: NOT_AVAILABLE without canonical pavement inputs
