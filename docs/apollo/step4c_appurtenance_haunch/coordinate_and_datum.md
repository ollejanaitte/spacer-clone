# Coordinate and Datum (C1)

Local CRS (unbound until Step 4-E):
- +X station increase
- +Y right looking +station (DEC-S4-0007)
- +Z up

Appurtenance:
- Y = declared transverseOffset (centerline, DEC-S4C-0001)
- Z datum = deck top face (= `deckThickness` in existing solids convention)
- centerZ = deckTop + height/2

Haunch (DEC-S4-0009 / DEC-S4C-0002):
- Y = owning main girder offset from `deriveMainGirderOffsets`
- bottom Z = top flange upper face (= 0)
- top Z = bottom + height (= deck soffit)
- Never derived from mesh
