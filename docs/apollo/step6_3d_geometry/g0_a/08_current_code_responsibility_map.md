# G0-A Current Code Responsibility Map

## Haunch

| Operation | Owner File | Function | Change Required for Fix |
|-----------|-----------|----------|------------------------|
| Canonical input | `bridgeStructure/types.ts` | deckThickness, haunchDims | NO |
| BSDD generation | `bridgeStructure/generateBsdd.ts` | — | NO |
| Haunch geometry param | `bridgeStructure/haunchGeometry.ts` | deriveHaunchGeometries | NO |
| Haunch Viewer solid | `visualization/appurtenanceHaunchSolids.ts` | buildHaunchSolid | NO |
| Deck Viewer solid | `visualization/bridgeStructureSolids.ts` | deck solid builder | **YES** — deck center Z must shift by haunchHeight |
| Haunch STL | `export/apolloStlExport.ts` | buildBoxGeometry | NO |
| Deck STL | `export/apolloStlExport.ts` | buildBoxGeometry | **YES** — matches Viewer fix |
| Haunch quantity | `quantity/appurtenanceHaunchQuantities.ts` | — | NO |
| Deck quantity | `quantity/quantityModel.ts` | — | NO |

## Cross-Frame (Sway Bracing)

| Operation | Owner File | Function | Change Required for Fix |
|-----------|-----------|----------|------------------------|
| Canonical input | `bridgeStructure/types.ts` | swayBracingInterval | NO |
| Cross-frame attachment input | `bridgeStructure/crossFrameAttachmentTypes.ts` | ApolloCrossFrameAttachmentDraft | NO |
| Cross-frame pattern definition | `bridgeStructure/crossFrameAttachmentTypes.ts` | CrossFramePattern ("V") | NO (horizontal member can be added within "V" pattern) |
| BSDD SwayBracing generation | `bridgeStructure/generateBsdd.ts` | sway bracing generation | **YES** — add 3rd BraceMember (horizontal) |
| BraceMember visualization | `visualization/bridgeStructureSolids.ts` | buildBracingMember | **YES** — call buildBracingMember for horizontal member |
| BraceMember STL | `export/apolloStlExport.ts` | buildBracingGeometry | NO (reuses existing BraceMember SolidGeometryParameter) |
| BraceMember quantity | `quantity/quantityModel.ts` | — | **YES** — count the new member in steel weight |
| BraceMember load | `loads/` | — | **YES** — add dead load for new member (or mark as future) |
| Cross beam solid | `visualization/bridgeStructureSolids.ts` | buildCrossBeamSolid | NO (separate entity, different station)