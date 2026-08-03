# BridgeAppurtenanceModel

Slots: LEFT_CURB, RIGHT_CURB, LEFT_WALL_RAILING, RIGHT_WALL_RAILING, MEDIAN, OPTIONAL_BARRIER.

Fields: appurtenanceId, type, side, startStation, endStation, transverseOffset, crossSection{shape,width,height}, materialRef, unitWeight (USER_PROVIDED_UNVERIFIED), status UNVERIFIED_DEVELOPMENT_ONLY, designAuthorization NOT_AUTHORIZED.

Source of truth: Apollo input. Not projected into BSSD (no contract slot). Stable IDs via `projectScopeId:BridgeAppurtenance:SLOT`.
