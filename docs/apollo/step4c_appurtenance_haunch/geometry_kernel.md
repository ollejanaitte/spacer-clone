# Geometry Kernel (C1)

Modules:
- `geometryFormulas.ts` — shared L/A/V/W formulas + formula IDs
- `appurtenanceGeometry.ts` — BridgeAppurtenanceModel → AppurtenanceGeometry
- `haunchGeometry.ts` — RcDeckHaunchModel → HaunchGeometry

Rules:
- PROVIDED models only; EXPLICIT_NONE/NOT_PROVIDED never generate geometry
- No mesh / AABB dependency
- No invented unit weights
- Volume available without unitWeight; weight → NOT_AVAILABLE when gamma missing
- SI units (m, m², m³, kN, kN/m³)

## Decisions

| ID | Decision |
|----|----------|
| DEC-S4C-0001 | Appurtenance transverseOffset = cross-section centerline (development-only) |
| DEC-S4C-0002 | Haunch Z: bottom = top flange upper face (Z=0 solids convention); top = Z+height (= deck soffit) |
