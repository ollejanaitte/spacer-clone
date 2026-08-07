# GEOMETRY_CONVENTIONS — 単位・座標系・方向規約

| Convention | Value | Source |
|------------|-------|--------|
| Length base unit | m | types.ts ToleranceConfig |
| Angle base unit | rad (azimuth radians from +X) | types.ts CoordinateSystemMarker |
| Station unit | m | types.ts station |
| Coordinate X/Y | global XY plane (right-hand) | types.ts Vec2 |
| Horizontal alignment start | (0,0) or user origin | - |
| Azimuth range | [0, 2π) | - |
| Left/Right sign | left = positive curvature | arc.ts signedArcCurvature |
| Clothoid sign | right = -1, left = +1 | clothoid.ts clothoidCurvatureAt |
| Tolerance (length) | 1e-6 m | tolerances.ts |
| Tolerance (coordinate) | 1e-6 m | tolerances.ts |
| Tolerance (azimuth) | 1e-8 rad | tolerances.ts |
| Fail-closed | NaN/Inf => 0 or raise | clothoid.ts radiusToCurvature |
